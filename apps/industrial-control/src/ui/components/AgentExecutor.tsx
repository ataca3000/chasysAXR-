import { useState } from "react";
import { Cpu, Play } from "lucide-react";
import { dispatchAgentCommand, AgentCommandResult } from "../../agents/core";
import { hardware } from "../../services/hardwareController";

interface AgentExecutorProps {
  currentTelemetry: any;
}

export function AgentExecutor({ currentTelemetry }: AgentExecutorProps) {
  const [analysis, setAnalysis] = useState<AgentCommandResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dispatchAgentCommand({
        type: "ai",
        payload: { telemetry: currentTelemetry }
      });
      if (result) setAnalysis(result);
    } catch (err: any) {
      setError(err.message || "Error al ejecutar el agente IA");
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!analysis?.gcode?.length) return;
    setExecuting(true);
    try {
      for (const command of analysis.gcode) {
        await hardware.sendCommand(command);
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    } catch (err: any) {
      setError(err.message || "Error al ejecutar la secuencia de comandos");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-black/40 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h4 className="text-sm font-semibold text-white">Copilot Agent Pipeline</h4>
          <p className="text-[11px] text-slate-400">Análisis inteligente y ejecución de comandos para el gemelo digital.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-google-blue hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-[11px] font-semibold transition"
          >
            <Cpu size={14} className="mr-1" /> ANALIZAR
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-300 text-[12px]">
          <span className="w-3 h-3 rounded-full bg-google-blue animate-pulse"></span>
          Generando recomendaciones del agente...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/5 p-3 text-rose-200 text-xs">
          {error}
        </div>
      ) : analysis ? (
        <div className="space-y-4">
          <div className="prose prose-invert prose-sm max-w-none text-slate-200" dangerouslySetInnerHTML={{ __html: analysis.html }} />
          {analysis.gcode.length > 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">G-code sugerido</span>
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={executing}
                  className="bg-google-green hover:bg-emerald-500 text-black text-[11px] font-semibold px-3 py-1 rounded-lg"
                >
                  <Play size={14} className="mr-1" /> {executing ? "EJECUTANDO..." : "EJECUTAR"}
                </button>
              </div>
              <div className="font-mono text-[11px] text-slate-200 space-y-1">
                {analysis.gcode.map((cmd, index) => (
                  <div key={index} className="rounded-xl bg-black/60 p-2">{cmd}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-slate-400 text-[12px]">Ejecuta el análisis del agente para recibir recomendaciones operativas y comandos inteligentes.</div>
      )}
    </div>
  );
}
