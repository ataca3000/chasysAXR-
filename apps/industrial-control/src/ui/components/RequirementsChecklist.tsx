import { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Package,
  Loader,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Requirement {
  id: string;
  label: string;
  description: string;
  status: "pending" | "checking" | "satisfied" | "error";
  action?: string;
}

export function RequirementsChecklist() {
  const [requirements, setRequirements] = useState<Requirement[]>([
    {
      id: "env",
      label: ".env Configurado",
      description: "Variables de entorno (Ollama, API keys)",
      status: "pending",
    },
    {
      id: "ollama",
      label: "Ollama Instalado",
      description: "Motor de IA local (localhost:11434)",
      status: "pending",
    },
    {
      id: "model",
      label: "Modelo IA Descargado",
      description: "Mistral o similar (~5GB)",
      status: "pending",
    },
    {
      id: "backend",
      label: "Backend Node.js",
      description: "Servidor proxy (localhost:3000)",
      status: "pending",
    },
    {
      id: "arduino",
      label: "Arduino/Sensores",
      description: "Opcional: Microcontrolador y sensores",
      status: "pending",
      action: "skip",
    },
    {
      id: "dependencies",
      label: "Librerías instaladas",
      description: "npm dependencies (npm install)",
      status: "pending",
    },
  ]);

  const [allSatisfied, setAllSatisfied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Check requirements on mount
  useEffect(() => {
    checkRequirements();
  }, []);

  const checkRequirements = async () => {
    const updated = [...requirements];

    // 1. Check .env
    try {
      const envCheck = await fetch("/api/check-env");
      const result = await envCheck.json();
      const envReq = updated.find((r) => r.id === "env");
      if (envReq) {
        envReq.status = result.configured ? "satisfied" : "error";
      }
    } catch {
      const envReq = updated.find((r) => r.id === "env");
      if (envReq) envReq.status = "error";
    }

    // 2. Check Ollama
    try {
      const ollamaCheck = await fetch("http://localhost:11434/api/tags", {
        signal: AbortSignal.timeout(3000),
      });
      const ollamaReq = updated.find((r) => r.id === "ollama");
      if (ollamaReq) {
        ollamaReq.status = ollamaCheck.ok ? "satisfied" : "error";
      }

      // 3. Check Model
      if (ollamaCheck.ok) {
        const models = await ollamaCheck.json();
        const modelReq = updated.find((r) => r.id === "model");
        if (modelReq) {
          modelReq.status = models.models?.length > 0 ? "satisfied" : "error";
        }
      }
    } catch {
      const ollamaReq = updated.find((r) => r.id === "ollama");
      const modelReq = updated.find((r) => r.id === "model");
      if (ollamaReq) ollamaReq.status = "error";
      if (modelReq) modelReq.status = "error";
    }

    // 4. Check Backend
    try {
      const backendCheck = await fetch("http://localhost:3000/api", {
        signal: AbortSignal.timeout(2000),
      });
      const backendReq = updated.find((r) => r.id === "backend");
      if (backendReq) {
        backendReq.status = backendCheck.ok ? "satisfied" : "error";
      }
    } catch {
      const backendReq = updated.find((r) => r.id === "backend");
      if (backendReq) backendReq.status = "error";
    }

    // 5. Check Arduino (skip for now, optional)
    const arduinoReq = updated.find((r) => r.id === "arduino");
    if (arduinoReq) {
      arduinoReq.status = "pending"; // User can skip
    }

    // 6. Check npm dependencies
    try {
      const pkgCheck = await fetch("/package.json");
      if (pkgCheck.ok) {
        const depsReq = updated.find((r) => r.id === "dependencies");
        if (depsReq) {
          depsReq.status = "satisfied"; // If app is running, deps are installed
        }
      }
    } catch {
      const depsReq = updated.find((r) => r.id === "dependencies");
      if (depsReq) depsReq.status = "pending";
    }

    setRequirements(updated);

    // Check if all critical requirements are satisfied
    const critical = updated.filter((r) => r.id !== "arduino");
    const allGood = critical.every((r) => r.status === "satisfied");
    setAllSatisfied(allGood);
  };

  const skipRequirement = (id: string) => {
    const updated = requirements.map((r) =>
      r.id === id ? { ...r, status: "satisfied" as const } : r,
    );
    setRequirements(updated);

    const critical = updated.filter((r) => r.id !== "arduino");
    const allGood = critical.every((r) => r.status === "satisfied");
    setAllSatisfied(allGood);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "satisfied":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "checking":
        return <Loader className="w-5 h-5 text-yellow-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const satisfiedCount = requirements.filter(
    (r) => r.status === "satisfied",
  ).length;
  const progress = (satisfiedCount / requirements.length) * 100;

  if (allSatisfied) {
    return null; // Hide checklist once all requirements are satisfied
  }

  return (
    <motion.div
      className="fixed bottom-4 right-4 w-96 max-w-[calc(100%-32px)] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-40"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">Requisitos de Setup</h3>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs px-2 py-1 bg-purple-600/20 hover:bg-purple-600/40 rounded text-purple-300 transition"
        >
          {showDetails ? "Ocultar" : "Ver"}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {satisfiedCount}/{requirements.length} requisitos completados
        </p>
      </div>

      {/* Requirements List */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            className="px-4 py-3 space-y-2 max-h-96 overflow-y-auto custom-scrollbar"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {requirements.map((req, idx) => (
              <motion.div
                key={req.id}
                className={`p-3 rounded-lg border ${
                  req.status === "satisfied"
                    ? "bg-green-900/20 border-green-700/50"
                    : req.status === "error"
                      ? "bg-red-900/20 border-red-700/50"
                      : "bg-slate-800/50 border-slate-700"
                }`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div className="flex items-start gap-2">
                  {getStatusIcon(req.status)}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">
                      {req.label}
                    </p>
                    <p className="text-xs text-gray-400">{req.description}</p>
                  </div>
                  {req.status === "error" && req.action === "skip" && (
                    <button
                      onClick={() => skipRequirement(req.id)}
                      className="text-xs px-2 py-1 bg-yellow-600/20 hover:bg-yellow-600/40 rounded text-yellow-300 transition whitespace-nowrap"
                    >
                      Skip
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-slate-700 space-y-2">
        {requirements.some(
          (r) => r.status === "error" && r.id !== "arduino",
        ) ? (
          <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded">
            ⚠️ Algunos requisitos no están cumplidos. Revisa la documentación.
          </div>
        ) : (
          <div className="text-xs text-green-400 bg-green-900/20 p-2 rounded">
            ✅ Todos los requisitos están listos!
          </div>
        )}
        <button
          onClick={checkRequirements}
          className="w-full text-sm bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition font-semibold"
        >
          Revisar Nuevamente
        </button>
      </div>
    </motion.div>
  );
}