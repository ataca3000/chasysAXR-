import { useState } from "react";
import { RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react";

export function PredictiveMaintenanceView() {
  const [replacementOrdered, setReplacementOrdered] = useState(false);
  const [lubeScheduled, setLubeScheduled] = useState(false);

  return (
    <div className="xl:col-span-3 flex flex-col h-full glass-panel p-6">
      <div className="flex items-center gap-4 mb-6 border-b border-slate-800 pb-4">
        <RotateCcw size={32} className="text-cyan-400" />
        <div>
          <h2 className="text-xl font-display text-white font-bold tracking-wider uppercase">
            Mantenimiento Predictivo IA
          </h2>
          <p className="text-slate-400 text-xs font-mono">
            Diagnóstico continuo de vibración, husillo y lubricación de ejes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs flex-1">
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-5 flex flex-col">
          <div className="text-rose-400 font-bold tracking-wider mb-3 flex items-center gap-1.5">
            <AlertTriangle size={14} /> URGENTE
          </div>
          <div className="text-white text-lg font-display mb-1 font-bold">
            RODAMIENTOS DEL HUSILLO
          </div>
          <div className="text-slate-300 mb-4 mt-auto leading-relaxed">
            La firma de vibración indica 92% de probabilidad de desgaste crítico en las próximas 48h.
          </div>
          <button
            onClick={() => setReplacementOrdered(true)}
            disabled={replacementOrdered}
            className={`w-full mt-2 border font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              replacementOrdered
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                : "bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/50 text-rose-300"
            }`}
          >
            {replacementOrdered ? (
              <>
                <CheckCircle2 size={14} /> ORDEN #REP-482 REGISTRADA
              </>
            ) : (
              "SOLICITAR REPUESTO"
            )}
          </button>
        </div>

        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-5 flex flex-col">
          <div className="text-orange-400 font-bold tracking-wider mb-3">ADVERTENCIA</div>
          <div className="text-white text-lg font-display mb-1 font-bold">
            HUSILLO EJE X (TORNILLO)
          </div>
          <div className="text-slate-300 mb-4 mt-auto leading-relaxed">
            Viscosidad de lubricación baja. Holgura aumentó 0.02 mm en los últimos 100 ciclos.
          </div>
          <button
            onClick={() => setLubeScheduled(true)}
            disabled={lubeScheduled}
            className={`w-full mt-2 border font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              lubeScheduled
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                : "bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/50 text-orange-300"
            }`}
          >
            {lubeScheduled ? (
              <>
                <CheckCircle2 size={14} /> CICLO PROGRAMADO (08:00)
              </>
            ) : (
              "PROGRAMAR LUBRICACIÓN"
            )}
          </button>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 flex flex-col">
          <div className="text-emerald-400 font-bold tracking-wider mb-3">ÓPTIMO</div>
          <div className="text-white text-lg font-display mb-1 font-bold">
            ACTUADORES Y / Z
          </div>
          <div className="text-slate-300 mb-4 mt-auto leading-relaxed">
            Operando dentro de parámetros nominales. Vida útil restante estimada: 14,000 h.
          </div>
          <div className="mt-2 text-center text-emerald-300 font-bold bg-emerald-500/20 py-2.5 rounded-lg border border-emerald-500/30">
            SIN ACCIÓN REQUERIDA
          </div>
        </div>
      </div>
    </div>
  );
}
