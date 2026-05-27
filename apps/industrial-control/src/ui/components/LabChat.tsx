import { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  X,
  Minimize2,
  Maximize2,
  Send,
  Loader,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getRecommendations } from "../../services/agentBackend";

interface ChatMessage {
  id: string;
  role: "agent" | "user";
  content: string;
  timestamp: number;
}

export function LabChat() {
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "0",
      role: "agent",
      content:
        "🤖 Soy tu **Agente de Laboratorio IA**. Te ayudaré a optimizar, monitorear y controlar las máquinas. ¿En qué puedo asistirte?",
      timestamp: Date.now(),
    },
  ]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    // Save to localStorage
    localStorage.setItem("labChatMessages", JSON.stringify(messages));
  }, [messages]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("labChatMessages");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading chat history:", e);
      }
    }
  }, []);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userInput,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");
    setIsLoading(true);

    try {
      // Get AI response from agent backend
      const telemetry = {
        temperature: 450 + Math.random() * 300,
        vibration: 2 + Math.random() * 3,
        load: 60 + Math.random() * 30,
      };

      const response = await getRecommendations(
        telemetry,
        "USER_QUERY: " + userInput,
      );

      const agentMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: response.html || "✅ Comando procesado correctamente",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content:
          "❌ Error: No pude procesar tu solicitud. Verifica que el backend esté corriendo.",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (confirm("¿Limpiar historial de chat?")) {
      setMessages([
        {
          id: "0",
          role: "agent",
          content: "🤖 Chat limpio. ¿En qué puedo ayudarte ahora?",
          timestamp: Date.now(),
        },
      ]);
      localStorage.removeItem("labChatMessages");
    }
  };

  if (!isOpen) {
    return (
      <motion.button
        className="fixed bottom-4 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-lg flex items-center justify-center hover:shadow-xl transition z-40 group"
        onClick={() => setIsOpen(true)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
      >
        <MessageCircle className="w-6 h-6" />
        <motion.span
          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          🤖
        </motion.span>
      </motion.button>
    );
  }

  return (
    <motion.div
      className="fixed bottom-4 right-4 w-96 h-[600px] bg-gradient-to-b from-slate-900 to-slate-800 border border-slate-700 rounded-lg shadow-2xl flex flex-col z-40"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-sm px-4 py-3 border-b border-slate-700 flex items-center justify-between rounded-t-lg">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-green-500"
            animate={{ opacity: [0.5, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <h3 className="font-semibold text-white">🤖 Agente Lab IA</h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition"
            title={isMinimized ? "Maximizar" : "Minimizar"}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4" />
            ) : (
              <Minimize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {messages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                initial={{ opacity: 0, x: msg.role === "user" ? 10 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    msg.role === "user"
                      ? "bg-purple-600 text-white"
                      : "bg-slate-700 text-slate-100 border border-slate-600"
                  }`}
                >
                  <div
                    dangerouslySetInnerHTML={{
                      __html: msg.content
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                        .replace(/_(.*?)_/g, "<em>$1</em>")
                        .replace(/\n/g, "<br/>")
                        .replace(/<script/g, "&lt;script"), // Mitigación básica XSS
                    }}
                  />
                  <p className="text-xs opacity-60 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                className="flex justify-start"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="bg-slate-700 border border-slate-600 px-3 py-2 rounded-lg">
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      {!isMinimized && (
        <div className="border-t border-slate-700 bg-slate-800/50 px-3 py-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Pregunta al agente..."
              className="flex-1 bg-slate-700/50 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !userInput.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded px-3 py-2 transition flex items-center gap-1"
            >
              {isLoading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          <button
            onClick={clearChat}
            className="w-full text-xs px-2 py-1 bg-slate-700/50 hover:bg-slate-600/50 text-gray-400 hover:text-gray-300 rounded transition"
          >
            Limpiar historial
          </button>
        </div>
      )}

      {/* Minimized State Info */}
      {isMinimized && (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          💬 Chat minimizado
        </div>
      )}
    </motion.div>
  );
}