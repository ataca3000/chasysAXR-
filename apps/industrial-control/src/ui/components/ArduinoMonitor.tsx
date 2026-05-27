import React, { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle, Activity, Terminal, Send } from "lucide-react";
import { ActuatorConfig } from "../../server/routes/actuators"; // Ruta corregida para src/server/routes
import { eventBus } from "../../services/eventBus";

// Declaración global para el objeto SerialPort de Web Serial API
declare global {
  interface Navigator {
    serial: any; // Using 'any' for simplicity, 'Serial' type could be more specific
  }
  interface Window {
    SerialPort: any; // Using 'any', specific type could be defined if needed
  }
}

interface TempData {
  time: string;
  temp: number;
}

interface ArduinoMonitorProps {
  onAlert?: (highTemp: boolean) => void; // Para avisar a Three.js
  currentActuatorConfig: ActuatorConfig; // La configuración del actuador seleccionada
  commandsToExecute?: string[]; // Nueva prop para comandos G-Code de Jarvis
  onCommandExecuted?: (command: string) => void; // Callback cuando un comando es ejecutado
}

export const ArduinoMonitor: React.FC<ArduinoMonitorProps> = ({
  onAlert,
  currentActuatorConfig,
  commandsToExecute,
  onCommandExecuted,
}) => {
  const [data, setData] = useState<TempData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const portRef = useRef<any>(null);
  const isReadingRef = useRef(false);
  const [sensorData, setSensorData] = useState<{
    [key: string]: number | null;
  }>({});
  const [gcodeCommand, setGcodeCommand] = useState<string>("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [currentError, setCurrentError] = useState<string | null>(null); // Usar el estado de error
  // 1. Escuchar desconexión física (cable desenchufado)
  useEffect(() => {
    const handleDisconnect = (_event: Event) => {
      // Ignorar 'event'
      console.warn("⚠️ Hardware desconectado físicamente");
      setIsConnected(false);
      setCurrentError("Arduino Desconectado: Revisa el cable USB");

      // Log de auditoría automático al backend
      fetch("/api/telemetry/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "HARDWARE_DISCONNECT",
          objectId: "Arduino_Nano_01",
          isRealData: true,
          details: { reason: "Physical unplug detected" },
        }),
      });
    };

    navigator.serial.addEventListener("disconnect", handleDisconnect);
    return () => {
      navigator.serial.removeEventListener("disconnect", handleDisconnect);
      // Cerrar el puerto al desmontar si está abierto
      if (portRef.current && isConnected) {
        // Asegurarse de que `isConnected` es true
        portRef.current
          .close()
          .catch((err: any) =>
            console.error("Error closing port on unmount:", err),
          );
        setIsConnected(false);
        isReadingRef.current = false;
      }
    };
  }, [isConnected]);

  // Efecto para procesar comandos G-Code recibidos de Jarvis
  useEffect(() => {
    if (commandsToExecute && commandsToExecute.length > 0) {
      commandsToExecute.forEach((cmd) => {
        _sendGCode(cmd, true); // Enviar automáticamente, indicando que es de Jarvis
        onCommandExecuted?.(cmd); // Notificar al padre que el comando fue ejecutado
      });
    }
  }, [commandsToExecute, onCommandExecuted]); // Depende de los comandos y el callback

  // Escuchar comandos globales (ej: desde AssemblyLab al instalar)
  useEffect(() => {
    const unsub = eventBus.on("arduino-command", (cmd: string) => {
      if (isConnected) {
        _sendGCode(cmd, true);
      }
    });
    return unsub;
  }, [isConnected]);

  const connectHardware = async () => {
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      portRef.current = port;
      setIsConnected(true);
      setCurrentError(null);
      readData();
    } catch (err: any) {
      // Tipar 'err'
      setCurrentError(err.message || "No se pudo establecer conexión");
    }
  };

  const readData = async () => {
    if (!portRef.current || !portRef.current.readable || isReadingRef.current)
      return;
    isReadingRef.current = true; // Bloquear nuevas lecturas
    const reader = portRef.current.readable.getReader();
    const decoder = new TextDecoder();
    let buffer = ""; // Buffer para manejar mensajes incompletos

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break; // El puerto se cerró
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // La última parte puede estar incompleta

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          setTerminalLogs((prev) => [...prev.slice(-100), `< ${trimmedLine}`]);

          const parts = trimmedLine.split("|");
          const newSensorData: { [key: string]: number | null } = {};
          let primaryGraphSensorValue: number | null = null;

          parts.forEach((part) => {
            const [key, val] = part.split(":") as [string, string];
            if (key && val) {
              const numVal = parseFloat(val);
              if (!isNaN(numVal)) {
                newSensorData[key] = numVal;
                // Si este sensor es el primario para el gráfico
                const sensorInfo = (
                  currentActuatorConfig.sensorMappings as any
                )[key];
                if (sensorInfo && sensorInfo.isPrimaryGraphSensor) {
                  primaryGraphSensorValue = numVal;
                }
              }
            }
          });

          setSensorData((prev) => ({ ...prev, ...newSensorData }));

          // Difusión global de telemetría: Conecta el hardware con el resto de la App
          eventBus.emit("telemetry-update", {
            ...newSensorData,
            timestamp: Date.now(),
          });

          // Actualizar gráfico de línea (si el sensor primario está presente)
          if (primaryGraphSensorValue !== null) {
            // Disparar alerta a Three.js si la temperatura (asumiendo 'T' es temp) es alta
            const tempSensorInfo = currentActuatorConfig.sensorMappings["T"];
            if (
              tempSensorInfo &&
              tempSensorInfo.isPrimaryGraphSensor &&
              primaryGraphSensorValue > 55
            ) {
              onAlert?.(true);
            } else {
              onAlert?.(false);
            }

            const timestamp = new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            setData((prev) => {
              const newData = [
                ...prev,
                { time: timestamp, temp: primaryGraphSensorValue! },
              ];
              return newData.slice(-20);
            });
          }
        }
      } // End of while loop
    } catch (err: any) {
      // Tipar 'err'
      console.error(err);
      setCurrentError("Error en la lectura de datos");
    } finally {
      reader.releaseLock();
      isReadingRef.current = false;
    }
  };

  // Función interna para enviar G-Code, usada por Jarvis y por entrada manual
  const _sendGCode = async (command: string, isAuto = false) => {
    if (!portRef.current || !portRef.current.writable) {
      setTerminalLogs((prev) => [
        ...prev,
        `> ERROR: No se pudo enviar "${command}". Hardware no conectado.`,
      ]);
      return;
    }
    const commandToSend = command.trim() + "\n";
    try {
      const writer = portRef.current.writable.getWriter();
      await writer.write(new TextEncoder().encode(commandToSend));
      setTerminalLogs((prev) => [
        ...prev.slice(-100),
        `> ${commandToSend.trim()} ${isAuto ? "(AUTO)" : ""}`,
      ]);
      writer.releaseLock();
    } catch (err: any) {
      // Tipar 'err'
      console.error("Error enviando G-Code:", err);
      setTerminalLogs((prev) => [
        ...prev,
        `> ERROR: No se pudo enviar comando "${commandToSend.trim()}".`,
      ]);
    }
  };

  // Función para enviar G-Code desde la entrada manual del usuario
  const sendGCode = async () => {
    if (!isConnected || !gcodeCommand.trim()) return;
    _sendGCode(gcodeCommand); // Usar la función interna
    setGcodeCommand(""); // Limpiar el input después de enviar
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl text-white">
      {/* Header de Conexión */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              isConnected
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-rose-500/20 text-rose-400"
            }`}
          >
            {isConnected ? <Activity size={24} /> : <AlertTriangle size={24} />}
          </div>
          <div>
            <h3 className="text-lg font-bold">Telemetría de Actuador</h3>
            <p className="text-sm text-slate-400">
              {isConnected
                ? "🟢 Hardware Sincronizado"
                : currentError
                  ? `🔴 ${currentError}`
                  : typeof navigator !== "undefined" && "serial" in navigator
                    ? "🔴 Esperando Conexión"
                    : "🔴 API Web Serial no soportada"}
            </p>
          </div>
        </div>
        <button
          onClick={connectHardware}
          className={`px-4 py-2 rounded-lg transition-all font-bold ${
            isConnected
              ? "bg-slate-800 text-slate-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500 text-white" // Agregué el `title` aquí
          }`}
          disabled={isConnected}
          title={
            isConnected ? "Hardware ya conectado" : "Conectar al Arduino Nano"
          }
        >
          {isConnected ? "LINK ACTIVO" : "VINCULAR NANO"}
        </button>
      </div>

      {/* Sensores Dinámicos */}
      <div className="grid grid-cols-2 gap-4">
        {(
          Object.entries(currentActuatorConfig.sensorMappings) as [
            string,
            any,
          ][]
        ).map(([key, sensorInfo]) => (
          <div
            key={key}
            className="bg-slate-900/50 p-4 rounded-xl border border-slate-800"
          >
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              {sensorInfo.icon && (
                <sensorInfo.icon
                  size={14}
                  className={key === "SIG" ? "text-blue-400" : ""}
                />
              )}
              {sensorInfo.label.toUpperCase()}
            </div>
            <div className="text-2xl font-mono">
              {isConnected && sensorData[key] !== null ? (
                `${sensorData[key]} ${
                  sensorInfo.unit || currentActuatorConfig.defaultUnit
                }`
              ) : (
                <span className="text-amber-500 animate-pulse">---</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico de Telemetría (solo para el sensor primario) */}
      <div className="h-64 w-full">
        <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
          <Activity size={12} /> Historial de{" "}
          {currentActuatorConfig.sensorMappings["T"]?.label ||
            "Sensor Principal"}
        </h4>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              unit={
                currentActuatorConfig.sensorMappings["T"]?.unit ||
                currentActuatorConfig.defaultUnit
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
              }}
            />
            <Line
              type="monotone"
              dataKey="temp" // Asumimos que 'temp' es el valor del sensor primario para el gráfico
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: "#3b82f6" }}
              animationDuration={300}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Consola G-Code */}
      <div className="bg-black p-4 rounded-xl border border-slate-800 font-mono">
        <div className="flex items-center gap-2 text-blue-400 text-xs mb-2">
          <Terminal size={14} /> <span>SISTEMA DE CONTROL G-CODE</span>
        </div>
        <div className="text-xs text-slate-500 h-20 overflow-y-auto">
          {terminalLogs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <input
            disabled={!isConnected}
            placeholder="Escribir comando (G01 X10...)"
            className="w-full bg-slate-900 border-none text-white text-sm p-2 rounded mt-2 outline-none focus:ring-1 ring-blue-500"
            value={gcodeCommand}
            onChange={(e) => setGcodeCommand(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") sendGCode();
            }}
          />
          <button
            onClick={sendGCode}
            disabled={!isConnected || !gcodeCommand.trim()}
            title="Enviar comando G-Code"
            className={`p-2 rounded-lg transition-all ${
              isConnected && gcodeCommand.trim()
                ? "bg-blue-600 hover:bg-blue-500 text-white"
                : "bg-slate-800 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
