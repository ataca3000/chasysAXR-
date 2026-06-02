import { useState } from "react";
import {
  useSituationalState,
  buildSituationalPrompt,
  analyzeSituationalState,
} from "../../awareness";

export function AwarenessPanel() {
  const state = useSituationalState();
  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const machines = Object.values(state.machines);
  const alerts = state.alerts.slice(0, 10);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const result = await analyzeSituationalState();
      setAnalysis(result.message || JSON.stringify(result, null, 2));
    } catch (error: any) {
      setAnalysis(`Error: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-black/60 border border-white/10 rounded-3xl shadow-lg backdrop-blur">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              Situational Awareness
            </h2>
            <p className="text-sm text-slate-400">
              Vista industrial de máquinas, sensores y alertas.
            </p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="rounded-2xl bg-google-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-google-blue/90 disabled:opacity-50"
          >
            {loading ? "Analizando..." : "IA Recomienda"}
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-4">
            <h3 className="text-sm text-slate-300 uppercase tracking-[0.3em] mb-3">
              Máquinas
            </h3>
            <div className="space-y-3">
              {machines.length === 0 ? (
                <div className="text-slate-500">
                  No hay máquinas detectadas aún.
                </div>
              ) : (
                machines.map((machine) => (
                  <div
                    key={machine.id}
                    className="rounded-2xl border border-white/5 p-3 bg-slate-950/70"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-white font-semibold">
                          {machine.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          ID: {machine.id}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-[11px] rounded-full ${machine.status === "critical" ? "bg-rose-500/15 text-rose-300" : machine.status === "warning" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}
                      >
                        {machine.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                      {machine.sensors.slice(-4).map((reading) => (
                        <div
                          key={reading.id}
                          className="rounded-xl bg-slate-900/80 p-2"
                        >
                          <div className="text-slate-400">{reading.type}</div>
                          <div className="text-white font-semibold">
                            {reading.value.toFixed(1)} {reading.unit}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-[11px] text-slate-500">
                      Actualizado:{" "}
                      {new Date(machine.lastUpdate).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-white/5 border border-white/10 rounded-3xl p-4">
            <h3 className="text-sm text-slate-300 uppercase tracking-[0.3em] mb-3">
              Alertas
            </h3>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-slate-500">No hay alertas activas.</div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-2xl p-3 border ${alert.level === "critical" ? "border-rose-500/30 bg-rose-500/10" : alert.level === "warning" ? "border-amber-500/30 bg-amber-500/10" : "border-slate-600 bg-slate-900/80"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white font-semibold text-sm">
                        {alert.level.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(alert.ts).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm mt-2">
                      {alert.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="bg-white/5 border border-white/10 rounded-3xl p-4">
          <h3 className="text-sm text-slate-300 uppercase tracking-[0.3em] mb-3">
            Resumen IA
          </h3>
          <div className="min-h-[140px] rounded-3xl bg-slate-950/80 p-4 text-sm text-slate-300 overflow-auto">
            {analysis
              ? analysis
              : 'Presiona "IA Recomienda" para generar recomendaciones con el estado situacional actual.'}
          </div>
        </section>
      </div>
    </div>
  );
}

export default AwarenessPanel;
