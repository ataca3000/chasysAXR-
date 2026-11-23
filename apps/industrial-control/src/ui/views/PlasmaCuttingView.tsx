import { useState } from "react";
import { Zap, ShieldCheck, ShieldAlert } from "lucide-react";

export function PlasmaCuttingView() {
  const [interlockOverridden, setInterlockOverridden] = useState(false);
  const [currentAmps, setCurrentAmps] = useState(0);
  const [gasPressure, setGasPressure] = useState(12);
  const [waterFlow, setWaterFlow] = useState(false);

  const toggleOverride = () => {
    if (!interlockOverridden) {
      setInterlockOverridden(true);
      setCurrentAmps(85);
      setGasPressure(72);
      setWaterFlow(true);
    } else {
      setInterlockOverridden(false);
      setCurrentAmps(0);
      setGasPressure(12);
      setWaterFlow(false);
    }
  };

  return (
    <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
      <div className="glass-panel p-6 flex flex-col items-center justify-center relative border-yellow-500/20">
        {interlockOverridden ? (
          <ShieldCheck size={56} className="mb-4 text-emerald-400" />
        ) : (
          <Zap size={56} className="mb-4 text-yellow-500" />
        )}
        <h2
          className={`text-2xl font-display font-bold tracking-wider mb-2 uppercase ${
            interlockOverridden ? "text-emerald-400" : "text-yellow-400"
          }`}
        >
          {interlockOverridden ? "PLASMA ARCO LISTO (OVERRIDE)" : "IGNICIÓN PLASMA EN ESPERA"}
        </h2>
        <p className="text-slate-400 text-sm max-w-md text-center font-mono">
          {interlockOverridden
            ? "Bypass manual habilitado. Presión de mezcla argón/nitrógeno estabilizada y flujo de refrigeración activo."
            : "Presión de gas por debajo del umbral nominal. Revisa las líneas de suministro o habilita el modo de prueba."}
        </p>
        <button
          onClick={toggleOverride}
          className={`mt-7 border px-6 py-3 rounded-xl font-mono text-xs tracking-wider font-bold transition-colors flex items-center gap-2 ${
            interlockOverridden
              ? "border-rose-500/50 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
              : "border-yellow-500/50 bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25"
          }`}
        >
          <ShieldAlert size={15} />
          {interlockOverridden ? "RESTAURAR INTERLOCK DE SEGURIDAD" : "HABILITAR OVERRIDE DE PRUEBA"}
        </button>
      </div>

      <div className="glass-panel p-6 flex flex-col justify-between">
        <div>
          <h3 className="text-yellow-400 font-mono text-xs tracking-wider font-bold mb-6 border-b border-slate-800 pb-3 uppercase">
            Parámetros de Corte Plasma
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-2 font-mono tabular-nums">
                <span>CORRIENTE DE ARCO (A)</span>
                <span className="text-slate-100 font-semibold">{currentAmps} / 120 A</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 transition-all duration-300"
                  style={{ width: `${(currentAmps / 120) * 100}%` }}
                />
              </div>
              {interlockOverridden && (
                <input
                  type="range"
                  min="20"
                  max="120"
                  step="5"
                  value={currentAmps}
                  onChange={(e) => setCurrentAmps(parseInt(e.target.value, 10))}
                  className="w-full mt-2 accent-yellow-500"
                />
              )}
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-2 font-mono tabular-nums">
                <span>PRESIÓN DE GAS</span>
                <span className="text-slate-100 font-semibold">{gasPressure} / 85 PSI</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    gasPressure < 45 ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${(gasPressure / 85) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-2 font-mono">
                <span>FLUJO ESCUDO DE AGUA</span>
                <span className={waterFlow ? "text-cyan-400 font-bold" : "text-slate-400"}>
                  {waterFlow ? "ACTIVO (4.2 L/min)" : "DETENIDO"}
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300"
                  style={{ width: waterFlow ? "82%" : "0%" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
