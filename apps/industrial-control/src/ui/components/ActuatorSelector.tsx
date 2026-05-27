import React, { useState, useRef, useEffect } from "react";
import {
  ActuatorConfig,
  ACTUATOR_CONFIGS,
} from "../../server/routes/actuators";
import { ArduinoMonitor } from "./ArduinoMonitor";
import { eventBus } from "../../services/eventBus";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

export const ActuatorSelector: React.FC = () => {
  const [selectedActuator, setSelectedActuator] = useState<ActuatorConfig>(
    ACTUATOR_CONFIGS[0],
  );
  const [isOverheated, setIsOverheated] = useState(false); // Estado para Three.js
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<
    { role: "user" | "jarvis"; text: string }[]
  >([]);
  const [commandsFromJarvis, setCommandsFromJarvis] = useState<string[]>([]);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const mcpUrl = "http://localhost:3001/sse"; // URL del túnel Ngrok o local
  const mcpClientRef = useRef<Client | null>(null);
  const [executingMcpTool, setExecutingMcpTool] = useState<string | null>(null);
  const MAX_RETRIES = 2;
  const [mcpStatus, setMcpStatus] = useState<
    "connected" | "disconnected" | "simulated"
  >("disconnected");
  const [latestTelemetry, setLatestTelemetry] = useState<any>(null);

  // Suscribirse a la telemetría en tiempo real que emite el ArduinoMonitor
  useEffect(() => {
    const unsub = eventBus.on("telemetry-update", (data: any) => {
      setLatestTelemetry(data);
    });
    return unsub;
  }, []);

  const handleActuatorChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const newConfig = ACTUATOR_CONFIGS.find(
      (config: ActuatorConfig) => config.id === event.target.value,
    );
    if (newConfig) {
      setSelectedActuator(newConfig);
    }
  };

  // Conecta al servidor MCP si no está conectado
  const ensureMcpConnected = async () => {
    if (mcpClientRef.current) return mcpClientRef.current;
    try {
      const transport = new SSEClientTransport(new URL(mcpUrl));
      const client = new Client({ name: "GoPilot-Frontend", version: "1.0.0" });
      await client.connect(transport);
      mcpClientRef.current = client;
      setMcpStatus("connected");
      return client;
    } catch (err) {
      console.error("Error conectando a MCP:", err);
      setMcpStatus("simulated");
      return null;
    }
  };

  const handleChatSubmit = async (
    customPrompt?: string,
    retryCount: number = 0,
  ) => {
    const promptText = customPrompt || chatInput.trim();
    // Permitir el envío si es un prompt automático (reintento) aunque isSendingChat sea true
    if (!promptText || (isSendingChat && !customPrompt)) return;

    if (!customPrompt) {
      setChatHistory((prev) => [...prev, { role: "user", text: promptText }]);
      setChatInput("");
    }

    setIsSendingChat(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          history: chatHistory.map((msg) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.text }],
          })),
          currentScene: {
            activeActuator: {
              id: selectedActuator.id,
              name: selectedActuator.name,
              sensorsConfigured: selectedActuator.sensorMappings,
            },
            mcpStatus: mcpStatus,
            telemetry: latestTelemetry,
            isOverheated: isOverheated,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const jarvisMessage = data.result.message || "No message from Jarvis.";
      const actions = data.result.actions || [];

      setChatHistory((prev) => [
        ...prev,
        { role: "jarvis", text: jarvisMessage },
      ]);

      // PROCESAMIENTO AUTOMÁTICO DE ACCIONES
      for (const action of actions) {
        try {
          if (action.type === "mcp_tool") {
            const client = await ensureMcpConnected();
            if (!client) throw new Error("Servidor MCP local no disponible.");

            setExecutingMcpTool(action.tool);
            try {
              console.log(`Ejecutando herramienta MCP: ${action.tool}`);
              await client.callTool({
                name: action.tool,
                arguments: action.params,
              });
            } finally {
              setExecutingMcpTool(null);
            }
          } else if (action.type === "execute_gcode") {
            setCommandsFromJarvis([action.params.gcode]);
          }
        } catch (actionError: any) {
          console.error(`Error en acción ${action.type}:`, actionError);

          // REPORTAR ERROR DE VUELTA A GEMINI
          // Enviamos un prompt automático para que la IA sepa que falló
          const errorFeedback = `[SISTEMA]: La acción "${action.tool || action.type}" falló. Error: ${actionError.message}. Informa al usuario y sugiere una solución.`;

          setChatHistory((prev) => [
            ...prev,
            { role: "user", text: errorFeedback },
          ]);

          if (retryCount < MAX_RETRIES) {
            // Llamada recursiva incrementando el contador de reintentos
            await handleChatSubmit(errorFeedback, retryCount + 1);
          } else {
            setChatHistory((prev) => [
              ...prev,
              {
                role: "jarvis",
                text: "⚠️ Se alcanzó el límite de reintentos automáticos para esta acción. Por favor, revisa la conexión del hardware.",
              },
            ]);
          }
          break; // Salimos del bucle de acciones si una falla críticamente
        }
      }
    } catch (error) {
      console.error("Error enviando chat a Jarvis:", error);
      setChatHistory((prev) => [
        ...prev,
        { role: "jarvis", text: "Error al comunicarse con Jarvis." },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleCommandExecuted = (command: string) => {
    // Opcional: Registrar que un comando de Jarvis fue ejecutado
    console.log(`Jarvis command executed: ${command}`);
    // Si solo quieres que se ejecuten una vez y luego se borren, puedes filtrar aquí
    setCommandsFromJarvis((prev) => prev.filter((cmd) => cmd !== command));
  };

  return (
    <div className="p-6 bg-slate-900 min-h-screen flex flex-col gap-6">
      {/* Selector de Actuador */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-lg flex items-center gap-4">
        <label
          htmlFor="actuator-select"
          className="text-slate-300 font-bold text-sm"
        >
          Seleccionar Actuador:
        </label>
        <select
          id="actuator-select"
          value={selectedActuator.id}
          onChange={handleActuatorChange}
          className="bg-slate-800 text-white p-2 rounded-lg border border-slate-700 focus:ring-blue-500 focus:border-blue-500"
        >
          {ACTUATOR_CONFIGS.map((config: ActuatorConfig) => (
            <option key={config.id} value={config.id}>
              {config.name}
            </option>
          ))}
        </select>
        <p className="text-slate-500 text-sm italic">
          {selectedActuator.description}
        </p>
      </div>

      {/* Chat con Jarvis */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-lg flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Jarvis AI Assistant</h3>
          {isOverheated && (
            <span className="text-rose-500 text-[10px] font-bold animate-pulse px-2 py-0.5 border border-rose-500/30 rounded bg-rose-500/5">
              ⚠️ OVERHEAT
            </span>
          )}
          <div
            className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
              mcpStatus === "connected"
                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                : mcpStatus === "simulated"
                  ? "bg-amber-500/10 border-amber-500/50 text-amber-400 animate-pulse"
                  : "bg-slate-500/10 border-slate-500/50 text-slate-400"
            }`}
          >
            MCP SERVER: {mcpStatus.toUpperCase()}
          </div>
        </div>
        <div className="h-48 overflow-y-auto bg-black p-2 rounded font-mono text-xs text-slate-300">
          {chatHistory.map((msg, i) => (
            <div
              key={i}
              className={
                msg.role === "user" ? "text-blue-400" : "text-green-400"
              }
            >
              {msg.role === "user" ? "Tú: " : "Jarvis: "}
              {msg.text}
            </div>
          ))}
          {isSendingChat && (
            <div className="text-slate-500 animate-pulse">
              Jarvis está pensando...
            </div>
          )}
          {executingMcpTool && (
            <div className="text-amber-500 animate-pulse font-bold mt-1">
              ⚙️ Ejecutando Herramienta MCP: {executingMcpTool}...
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") handleChatSubmit();
            }}
            placeholder="Habla con Jarvis..."
            className="flex-grow bg-slate-800 text-white p-2 rounded-lg border border-slate-700 focus:ring-blue-500 focus:border-blue-500"
            disabled={isSendingChat}
          />
          <button
            onClick={() => handleChatSubmit()}
            className={`p-2 rounded-lg transition-all ${
              isSendingChat
                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
            disabled={isSendingChat}
          >
            Enviar
          </button>
        </div>
      </div>

      {/* Monitor de Arduino (ahora dinámico) */}
      <ArduinoMonitor
        onAlert={setIsOverheated}
        currentActuatorConfig={selectedActuator}
        commandsToExecute={commandsFromJarvis}
        onCommandExecuted={handleCommandExecuted}
      />
      {/* Aquí iría tu componente de Three.js, recibiendo isOverheated */}
      {/* <ThreeDScene isOverheated={isOverheated} /> */}
    </div>
  );
};
