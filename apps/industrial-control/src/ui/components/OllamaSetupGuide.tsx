import { useEffect, useState } from "react";
import { AlertCircle, Download, CheckCircle2, Loader } from "lucide-react";
import { motion } from "motion/react";

interface OllamaStatus {
  running: boolean;
  modelsAvailable: string[];
  loading: boolean;
}

export function OllamaSetupGuide() {
  const [status, setStatus] = useState<OllamaStatus>({
    running: false,
    modelsAvailable: [],
    loading: true,
  });

  useEffect(() => {
    const checkOllamaStatus = async () => {
      try {
        // Check if Ollama is running
        const response = await fetch("http://localhost:11434/api/tags", {
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const data = await response.json();
          setStatus({
            running: true,
            modelsAvailable: data.models?.map((m: any) => m.name) || [],
            loading: false,
          });
        } else {
          setStatus((prev) => ({ ...prev, loading: false }));
        }
      } catch (err) {
        setStatus((prev) => ({ ...prev, loading: false }));
      }
    };

    checkOllamaStatus();
    const interval = setInterval(checkOllamaStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  if (status.loading) {
    return (
      <motion.div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Verificando Ollama...</p>
        </div>
      </motion.div>
    );
  }

  if (!status.running) {
    return (
      <motion.div
        className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="max-w-md bg-slate-800 rounded-lg border-2 border-red-500/50 p-8 shadow-2xl"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
        >
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />

          <h1 className="text-2xl font-bold text-white mb-2 text-center">
            Ollama No Detectado
          </h1>

          <p className="text-gray-300 text-center mb-6">
            Para usar modelos IA locales, necesitas instalar Ollama.
          </p>

          <div className="bg-slate-900 rounded p-4 mb-6">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Instalación Rápida
            </h2>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-400 mb-2">
                  <strong>Windows:</strong> Ejecuta en PowerShell (como admin):
                </p>
                <code className="bg-black px-3 py-2 rounded text-green-400 block text-xs overflow-x-auto">
                  setup-ollama.ps1
                </code>
              </div>

              <div>
                <p className="text-gray-400 mb-2">
                  <strong>Mac/Linux:</strong>
                </p>
                <code className="bg-black px-3 py-2 rounded text-green-400 block text-xs overflow-x-auto">
                  bash setup-ollama.sh
                </code>
              </div>
            </div>
          </div>

          <div className="bg-blue-900/30 border border-blue-600/50 rounded p-3 mb-6">
            <p className="text-blue-200 text-sm">
              O descarga desde{" "}
              <a
                href="https://ollama.ai/download"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                ollama.ai
              </a>{" "}
              e instala manualmente
            </p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded transition"
          >
            Recargar cuando esté listo
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            Tiempo estimado: 2-5 minutos
          </p>
        </motion.div>
      </motion.div>
    );
  }

  if (status.modelsAvailable.length === 0) {
    return (
      <motion.div
        className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="max-w-md bg-slate-800 rounded-lg border-2 border-yellow-500/50 p-8 shadow-2xl"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
        >
          <Download className="w-12 h-12 text-yellow-400 mx-auto mb-4" />

          <h1 className="text-2xl font-bold text-white mb-2 text-center">
            Descarga un Modelo
          </h1>

          <p className="text-gray-300 text-center mb-6">
            Ollama está corriendo pero no tiene modelos IA descargados.
          </p>

          <div className="bg-slate-900 rounded p-4 mb-6">
            <p className="text-gray-400 text-sm mb-3">
              Abre una terminal y ejecuta:
            </p>
            <code className="bg-black px-3 py-2 rounded text-green-400 block text-xs overflow-x-auto">
              ollama pull mistral
            </code>
            <p className="text-gray-500 text-xs mt-2">
              Tiempo: ~10-15 min | Tamaño: ~5GB
            </p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded transition"
          >
            Verificar cuando esté listo
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return null;
}

export default OllamaSetupGuide;
