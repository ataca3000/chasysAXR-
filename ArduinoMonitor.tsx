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
import { AlertTriangle, Cpu, Activity, Gauge, Thermometer, Terminal } from "lucide-react";

interface TempData {
  time: string;
  temp: number;
}

interface ArduinoMonitorProps {
  onAlert?: (highTemp: boolean) => void; // Para avisar a Three.js
}

export const ArduinoMonitor: React.FC<ArduinoMonitorProps> = ({ onAlert }) => {
  const [data, setData] = useState<TempData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [airPressure, setAirPressure] = useState<number | null>(null);
  const [motorLoad, setMotorLoad] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const portRef = useRef<SerialPort | null>(null);

  // 1. Escuchar desconexión física (cable desenchufado)
  useEffect(() => {
    const handleDisconnect = (event: Event) => {
      console.warn("⚠️ Hardware desconectado físicamente");
      setIsConnected(false);
      setError("Arduino Desconectado: Revisa el cable USB");

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
    return () =>
      navigator.serial.removeEventListener("disconnect", handleDisconnect);
  }, []);

  const connectHardware = async () => {
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      portRef.current = port;
      setIsConnected(true);
      setError(null);
      readData();
    } catch (err) {
      setError("No se pudo establecer conexión");
    }
  };

  const readData = async () => {
    if (!portRef.current || !portRef.current.readable) return;
    const reader = portRef.current.readable.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        if (text.includes("TEMP:")) {
          const temp = parseFloat(text.split(":")[1]);
          const timestamp = new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          setData((prev) => {
            const newData = [...prev, { time: timestamp, temp }];
            return newData.slice(-20); // Mantener solo los últimos 20 puntos
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      reader.releaseLock();
    }
  };

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${isConnected ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}
          >
            {isConnected ? <Activity size={24} /> : <AlertTriangle size={24} />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              Telemetría de Sensores
            </h3>
            <p className="text-sm text-slate-400">
              {isConnected ? "🟢 Sistema en línea" : "🔴 Sistema desconectado"}
            </p>
          </div>
        </div>
        {!isConnected && (
          <button
            onClick={connectHardware}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all"
          >
            Conectar Nano
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/50 rounded-lg text-rose-500 text-sm flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} unit="°C" />
            <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "8px", color: "#fff" }} />
            <Line
              type="monotone"
              dataKey="temp"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: "#3b82f6" }}
              animationDuration={300}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      </div>

      {/* Consola G-Code */}
      <div className="bg-black p-4 rounded-xl border border-slate-800 font-mono">
        <div className="flex items-center gap-2 text-blue-400 text-xs mb-2">
          <Terminal size={14} /> <span>SISTEMA DE CONTROL G-CODE</span>
        </div>
        <div className="text-xs text-slate-500 h-20 overflow-y-auto">
          {isConnected ? "> Sistema listo para recibir comandos..." : "> Error: Hardware no detectado. Conecta el USB para habilitar consola."}
        </div>
        <input 
          disabled={!isConnected}
          placeholder="Escribir comando (G01 X10...)"
          className="w-full bg-slate-900 border-none text-white text-sm p-2 rounded mt-2 outline-none focus:ring-1 ring-blue-500"
        />
      </div>
    </div>
  );
};
