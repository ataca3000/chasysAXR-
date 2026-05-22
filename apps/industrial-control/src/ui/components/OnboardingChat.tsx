import { useState, useRef, useEffect } from "react";
import { Send, ChevronRight, Zap, Cog, MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface MachineProfile {
  machineType: "cnc" | "plasma" | "laser" | "other" | null;
  machineName: string;
  sensors: string[];
  description: string;
  hasArduino: boolean;
  completed: boolean;
}

interface ChatMessage {
  id: string;
  role: "gopilot" | "user";
  content: string;
  options?: string[];
  action?: string;
}

interface OnboardingChatProps {
  onComplete: (profile: MachineProfile) => void;
  onSkip: () => void;
}

const MACHINE_TYPES = {
  cnc: {
    label: "CNC/Fresadora",
    emoji: "⚙️",
    sensors: ["thermal", "vibration", "load", "spindle-rpm"],
  },
  plasma: {
    label: "Cortadora de Plasma",
    emoji: "⚡",
    sensors: ["thermal", "pressure", "arc-voltage", "flow-rate"],
  },
  laser: {
    label: "Cortadora Láser",
    emoji: "🔴",
    sensors: ["thermal", "power-output", "cooling-temp", "air-assist"],
  },
  other: { label: "Otra máquina", emoji: "🔧", sensors: [] },
};

const SENSOR_RECOMMENDATIONS = {
  thermal: {
    name: "Sensor Térmico",
    icon: "🌡️",
    description: "Monitorea temperatura en tiempo real",
  },
  vibration: {
    name: "Acelerómetro",
    icon: "📊",
    description: "Detecta vibraciones anormales",
  },
  load: {
    name: "Sensor de Carga",
    icon: "⚖️",
    description: "Mide esfuerzo operacional",
  },
  ultrasonic: {
    name: "Sensor Ultrasónico",
    icon: "📡",
    description: "Proximidad y medición de distancia",
  },
  camera: {
    name: "Cámara USB",
    icon: "📹",
    description: "Visión por computadora",
  },
  pressure: {
    name: "Sensor de Presión",
    icon: "💨",
    description: "Monitoreo de presión",
  },
};

export function OnboardingChat({ onComplete, onSkip }: OnboardingChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "gopilot",
      content:
        "¡Hola! Soy **GoPilot**, tu asistente inteligente para control industrial. 👋\n\nEstoy aquí para ayudarte a configurar y monitorear tu máquina. Primero, déjame aprender sobre ti.",
      options: ["Comencemos 🚀", "Saltar este paso"],
      action: "start",
    },
  ]);

  const [currentStep, setCurrentStep] = useState<
    | "greeting"
    | "machine-type"
    | "machine-name"
    | "arduino"
    | "sensors"
    | "summary"
  >("greeting");
  const [machineProfile, setMachineProfile] = useState<MachineProfile>({
    machineType: null,
    machineName: "",
    sensors: [],
    description: "",
    hasArduino: false,
    completed: false,
  });

  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleUserResponse = async (response: string) => {
    if (isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: response,
    };

    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");
    setIsLoading(true);

    // Simulate thinking delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    let nextMessage: ChatMessage | null = null;

    switch (currentStep) {
      case "greeting":
        if (response.includes("Comencemos") || response.includes("🚀")) {
          setCurrentStep("machine-type");
          nextMessage = {
            id: Date.now().toString() + "1",
            role: "gopilot",
            content:
              "¿Qué tipo de máquina tienes? Esto me ayudará a personalizar mis recomendaciones.",
            options: Object.entries(MACHINE_TYPES).map(
              ([key, value]) => `${value.emoji} ${value.label}`,
            ),
            action: "select-machine",
          };
        } else {
          onSkip();
          return;
        }
        break;

      case "machine-type":
        const selected = Object.entries(MACHINE_TYPES).find(([_, value]) =>
          response.includes(value.label),
        );
        if (selected) {
          const [machineKey] = selected;
          setMachineProfile((prev) => ({
            ...prev,
            machineType: machineKey as any,
          }));
          setCurrentStep("machine-name");
          nextMessage = {
            id: Date.now().toString() + "1",
            role: "gopilot",
            content: `¡Excelente! Detecté que tienes una ${selected[1].label}.\n\n¿Cuál es el **nombre o modelo** de tu máquina? (ej: "Haas VF-4", "Hypertherm Powermax", etc.)`,
            action: "input-machine-name",
          };
        }
        break;

      case "machine-name":
        setMachineProfile((prev) => ({ ...prev, machineName: response }));
        setCurrentStep("arduino");
        nextMessage = {
          id: Date.now().toString() + "1",
          role: "gopilot",
          content: `Perfecto, ${response}. 📝\n\n¿Tienes **Arduino o microcontrolador** conectado a tu máquina? Esto me ayuda a generar código personalizado.`,
          options: ["Sí, tengo Arduino ✅", "No, aún no 🚫"],
          action: "arduino-check",
        };
        break;

      case "arduino":
        const hasArduino = response.includes("Sí");
        setMachineProfile((prev) => ({ ...prev, hasArduino }));
        setCurrentStep("sensors");
        const sensorOptions = machineProfile.machineType
          ? MACHINE_TYPES[
              machineProfile.machineType as keyof typeof MACHINE_TYPES
            ].sensors
          : [];
        nextMessage = {
          id: Date.now().toString() + "1",
          role: "gopilot",
          content: `Genial. ${hasArduino ? "Podré generar código específico para tu Arduino. 🤖" : "Te ayudaré a integrar uno después. 🔌"}\n\n¿Qué **sensores** tienes o quieres agregar?`,
          options: [
            ...sensorOptions.map(
              (s) =>
                `${SENSOR_RECOMMENDATIONS[s as keyof typeof SENSOR_RECOMMENDATIONS]?.icon || "📡"} ${SENSOR_RECOMMENDATIONS[s as keyof typeof SENSOR_RECOMMENDATIONS]?.name || s}`,
            ),
            "Ninguno por ahora ⏭️",
          ],
          action: "select-sensors",
        };
        break;

      case "sensors":
        const selectedSensors = Object.keys(SENSOR_RECOMMENDATIONS).filter(
          (key) =>
            response.includes(
              SENSOR_RECOMMENDATIONS[key as keyof typeof SENSOR_RECOMMENDATIONS]
                .name,
            ),
        );
        setMachineProfile((prev) => ({
          ...prev,
          sensors: selectedSensors.length > 0 ? selectedSensors : prev.sensors,
          description: `Máquina: ${machineProfile.machineName}. Sensores: ${selectedSensors.length > 0 ? selectedSensors.join(", ") : "Ninguno"}`,
        }));
        setCurrentStep("summary");
        nextMessage = {
          id: Date.now().toString() + "1",
          role: "gopilot",
          content: `¡Perfecto! Aquí está tu perfil:\n\n**Máquina:** ${machineProfile.machineName}\n**Tipo:** ${machineProfile.machineType && MACHINE_TYPES[machineProfile.machineType].label}\n**Arduino:** ${machineProfile.hasArduino ? "✅ Sí" : "❌ No"}\n**Sensores:** ${selectedSensors.length > 0 ? selectedSensors.join(", ") : "Ninguno"}\n\n¿Empezamos?`,
          options: ["Sí, comenzar 🚀", "Editar perfil ✏️"],
          action: "confirm",
        };
        break;

      case "summary":
        if (response.includes("comenzar") || response.includes("🚀")) {
          const finalProfile: MachineProfile = {
            ...machineProfile,
            completed: true,
          };
          setMachineProfile(finalProfile);
          onComplete(finalProfile);
          return;
        } else {
          setCurrentStep("machine-type");
          nextMessage = {
            id: Date.now().toString() + "1",
            role: "gopilot",
            content: "Claro, volvamos al inicio. ¿Qué tipo de máquina tienes?",
            options: Object.entries(MACHINE_TYPES).map(
              ([_, value]) => `${value.emoji} ${value.label}`,
            ),
            action: "select-machine",
          };
        }
        break;
    }

    if (nextMessage) {
      setMessages((prev) => [...prev, nextMessage]);
    }
    setIsLoading(false);
  };

  const handleOptionClick = (option: string) => {
    handleUserResponse(option);
  };

  const progress =
    [
      "greeting",
      "machine-type",
      "machine-name",
      "arduino",
      "sensors",
      "summary",
    ].indexOf(currentStep) / 6;

  return (
    <motion.div
      className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="bg-black/40 backdrop-blur-sm border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">GoPilot Setup</h1>
            <p className="text-xs text-gray-400">Configuración inicial</p>
          </div>
        </div>
        <button
          onClick={onSkip}
          title="Cerrar onboarding"
          className="p-2 hover:bg-white/10 rounded-lg transition text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-800">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
          initial={{ width: "0%" }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                  message.role === "user"
                    ? "bg-purple-600 text-white"
                    : "bg-slate-800 text-slate-100 border border-slate-700"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {/* Options */}
                {message.options && message.role === "gopilot" && (
                  <div className="mt-4 space-y-2">
                    {message.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleOptionClick(option)}
                        disabled={isLoading}
                        className="w-full text-left px-3 py-2 text-sm bg-white/10 hover:bg-white/20 rounded transition disabled:opacity-50 flex items-center justify-between group"
                      >
                        <span>{option}</span>
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            className="flex justify-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-lg">
              <div className="flex gap-2">
                <motion.div
                  className="w-2 h-2 bg-purple-400 rounded-full"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                />
                <motion.div
                  className="w-2 h-2 bg-purple-400 rounded-full"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="w-2 h-2 bg-purple-400 rounded-full"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {currentStep === "machine-name" && (
        <div className="border-t border-white/10 bg-black/40 backdrop-blur-sm px-6 py-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && userInput.trim()) {
                  handleUserResponse(userInput);
                }
              }}
              placeholder="Escribe el nombre de tu máquina..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              disabled={isLoading}
            />
            <button
              onClick={() => userInput.trim() && handleUserResponse(userInput)}
              disabled={isLoading || !userInput.trim()}
              title="Enviar mensaje"
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 transition flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default OnboardingChat;
