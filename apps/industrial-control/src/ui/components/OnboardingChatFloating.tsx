import { useState, useRef, useEffect } from "react";
import { Send, ChevronRight, X, Loader, MessageCircle } from "lucide-react";
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

interface OnboardingChatFloatingProps {
  onComplete: (profile: MachineProfile) => void;
  onSkip: () => void;
  isVisible: boolean;
  onClose: () => void;
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

const SENSOR_RECOMMENDATIONS: Record<
  string,
  { name: string; icon: string; description: string }
> = {
  thermal: {
    name: "Sensor Térmico",
    icon: "🌡️",
    description: "Monitorea temperatura",
  },
  vibration: {
    name: "Acelerómetro",
    icon: "📊",
    description: "Detecta vibraciones",
  },
  load: { name: "Sensor de Carga", icon: "⚖️", description: "Mide esfuerzo" },
  ultrasonic: {
    name: "Sensor Ultrasónico",
    icon: "📡",
    description: "Proximidad",
  },
};

export function OnboardingChatFloating({
  onComplete,
  onSkip,
  isVisible,
  onClose,
}: OnboardingChatFloatingProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "gopilot",
      content:
        "¡Hola! Soy **GoPilot** 👋 Configuremos tu máquina para empezar.",
      options: ["Comencemos 🚀", "Saltar"],
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

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: response,
    };

    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    let nextMessage: ChatMessage | null = null;

    switch (currentStep) {
      case "greeting":
        if (response.includes("Comencemos") || response.includes("🚀")) {
          setCurrentStep("machine-type");
          nextMessage = {
            id: Date.now().toString() + "1",
            role: "gopilot",
            content: "¿Qué tipo de máquina tienes?",
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
            content: `¿Nombre/modelo de tu máquina?`,
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
          content: `¿Tienes Arduino conectado?`,
          options: ["Sí ✅", "No 🚫"],
          action: "arduino-check",
        };
        break;

      case "arduino":
        const hasArduino = response.includes("Sí");
        setMachineProfile((prev) => ({ ...prev, hasArduino }));
        setCurrentStep("sensors");
        nextMessage = {
          id: Date.now().toString() + "1",
          role: "gopilot",
          content: `¿Qué sensores tienes?`,
          options: Object.values(SENSOR_RECOMMENDATIONS).map(
            (s) => `${s.icon} ${s.name}`,
          ),
          action: "select-sensors",
        };
        break;

      case "sensors":
        const selectedSensors = Object.keys(SENSOR_RECOMMENDATIONS).filter(
          (key) => response.includes(SENSOR_RECOMMENDATIONS[key].name),
        );
        setMachineProfile((prev) => ({
          ...prev,
          sensors: selectedSensors.length > 0 ? selectedSensors : prev.sensors,
          description: `${prev.machineName} - ${selectedSensors.length > 0 ? selectedSensors.join(", ") : "Sin sensores"}`,
        }));
        setCurrentStep("summary");
        nextMessage = {
          id: Date.now().toString() + "1",
          role: "gopilot",
          content: `✅ Perfil creado. ¿Comenzar?`,
          options: ["Sí 🚀", "Editar ✏️"],
          action: "confirm",
        };
        break;

      case "summary":
        if (response.includes("Sí") || response.includes("🚀")) {
          const finalProfile: MachineProfile = {
            ...machineProfile,
            completed: true,
          };
          onComplete(finalProfile);
          return;
        } else {
          setCurrentStep("machine-type");
          nextMessage = {
            id: Date.now().toString() + "1",
            role: "gopilot",
            content: "¿Qué máquina tienes?",
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

  if (!isVisible) {
    return null;
  }

  return (
    <motion.div
      className="fixed bottom-20 right-4 w-96 max-w-[calc(100%-32px)] h-96 bg-slate-900 border border-purple-500/30 rounded-lg shadow-2xl flex flex-col z-45"
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 px-4 py-3 border-b border-purple-500/30 flex items-center justify-between rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">Configuración Inicial</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                  message.role === "user"
                    ? "bg-purple-600 text-white"
                    : "bg-slate-800 text-slate-100 border border-slate-700"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>

                {message.options && message.role === "gopilot" && (
                  <div className="mt-2 space-y-1">
                    {message.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleOptionClick(option)}
                        disabled={isLoading}
                        className="w-full text-left text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition disabled:opacity-50 flex items-center justify-between group"
                      >
                        <span>{option}</span>
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
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
            <div className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                <div
                  className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                />
                <div
                  className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input (for machine name) */}
      {currentStep === "machine-name" && (
        <div className="border-t border-slate-700 bg-slate-800/50 px-3 py-2">
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
              placeholder="Ej: Haas VF-4"
              className="flex-1 bg-slate-700/50 border border-slate-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              disabled={isLoading}
            />
            <button
              onClick={() => userInput.trim() && handleUserResponse(userInput)}
              disabled={isLoading || !userInput.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded px-2 py-1 transition flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}