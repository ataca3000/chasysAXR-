import React, { useState } from "react";
import { ActuatorConfig, ACTUATOR_CONFIGS } from "../config/actuators";
import { ArduinoMonitor } from "./ArduinoMonitor"; // Asegúrate de que la ruta sea correcta

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

  const handleActuatorChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const newConfig = ACTUATOR_CONFIGS.find(
      (config) => config.id === event.target.value,
    );
    if (newConfig) {
      setSelectedActuator(newConfig);
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isSendingChat) return;

    const userMessage = chatInput.trim();
    setChatHistory((prev) => [...prev, { role: "user", text: userMessage }]);
    setChatInput("");
    setIsSendingChat(true);
    setCommandsFromJarvis([]); // Limpiar comandos anteriores

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessage,
          history: chatHistory.map((msg) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.text }],
          })),
          currentScene: {
            /* TODO: Pasar el estado real de la escena 3D aquí */
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

      const gcodeActions = actions
        .filter((action: any) => action.type === "execute_gcode")
        .map((action: any) => action.params.gcode);

      setCommandsFromJarvis(gcodeActions); // Pasar comandos G-Code al ArduinoMonitor
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
          {ACTUATOR_CONFIGS.map((config) => (
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
        <h3 className="text-lg font-bold text-white">Jarvis AI Assistant</h3>
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
            onClick={handleChatSubmit}
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
