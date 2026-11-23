import { Compass, Gauge, Activity, Radio, Thermometer, Smartphone, Power, Link2 } from "lucide-react";
import { mobileSensorStore, useMobileSensors } from "../../store/mobileSensorStore";

export function MobileSensorsPanel() {
  const sensors = useMobileSensors();

  const handleToggle = () => {
    if (sensors.enabled) {
      mobileSensorStore.stop();
    } else {
      mobileSensorStore.start();
    }
  };

  // Bubble offset clamped within 36px circle radius for the spirit level visualizer
  const maxAngle = 30;
  const bubbleX = Math.max(-1, Math.min(1, sensors.level.rollDeg / maxAngle)) * 34;
  const bubbleY = Math.max(-1, Math.min(1, sensors.level.pitchDeg / maxAngle)) * 34;

  return (
    <div className="glass-panel p-4 flex flex-col gap-4 border border-slate-800 bg-[#090e18]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
            <Smartphone size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              SENSORES REALES DEL DISPOSITIVO MÓVIL
            </h3>
            <p className="text-[11px] font-mono text-slate-400">
              {sensors.statusMessage}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={sensors.bridgeToTelemetry}
              onChange={(e) => mobileSensorStore.setBridgeToTelemetry(e.target.checked)}
              className="accent-blue-500"
            />
            <Link2 size={12} className="text-blue-400" />
            <span>Enviar a Telemetría Principal</span>
          </label>

          <button
            type="button"
            onClick={handleToggle}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border transition-colors ${
              sensors.enabled
                ? "bg-rose-600/20 border-rose-500/50 text-rose-300 hover:bg-rose-600/35"
                : "bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500"
            }`}
          >
            <Power size={13} />
            {sensors.enabled ? "DETENER SENSORES" : "ACTIVAR SENSORES REALES"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 font-mono">
        {/* 1. Giroscopio */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-blue-400 font-bold flex items-center gap-1.5 uppercase">
              <Compass size={13} /> Giroscopio (IMU)
            </span>
            <StatusBadge status={sensors.capabilities.gyroscope} />
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center my-1">
            <div className="bg-slate-900 border border-slate-800 rounded p-1.5">
              <div className="text-[9px] text-slate-500">YAW α</div>
              <div className="text-xs font-bold text-white tabular-nums">
                {sensors.gyro.alpha !== null ? `${sensors.gyro.alpha}°` : "---"}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded p-1.5">
              <div className="text-[9px] text-slate-500">PITCH β</div>
              <div className="text-xs font-bold text-white tabular-nums">
                {sensors.gyro.beta !== null ? `${sensors.gyro.beta}°` : "---"}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded p-1.5">
              <div className="text-[9px] text-slate-500">ROLL γ</div>
              <div className="text-xs font-bold text-white tabular-nums">
                {sensors.gyro.gamma !== null ? `${sensors.gyro.gamma}°` : "---"}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 flex justify-between">
            <span>Vel. Angular:</span>
            <span className="text-slate-200 tabular-nums">
              {sensors.gyro.rateX !== null
                ? `${sensors.gyro.rateX} / ${sensors.gyro.rateY ?? 0} / ${sensors.gyro.rateZ ?? 0} °/s`
                : "Sin lectura"}
            </span>
          </div>
        </div>

        {/* 2. Nivel Digital (Inclinación) */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
          <div className="relative w-20 h-20 rounded-full border-2 border-slate-700 bg-slate-900 shrink-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border border-dashed border-slate-600" />
            <div
              className={`w-4 h-4 rounded-full absolute transition-transform duration-75 ${
                sensors.capabilities.orientationLevel === "active"
                  ? sensors.level.isLevel
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                    : "bg-amber-400"
                  : "bg-slate-600"
              }`}
              style={{
                transform: `translate(${bubbleX.toFixed(1)}px, ${bubbleY.toFixed(1)}px)`,
              }}
            />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-emerald-400 font-bold flex items-center gap-1 uppercase">
                <Gauge size={13} /> Nivel
              </span>
              <StatusBadge status={sensors.capabilities.orientationLevel} />
            </div>
            <div className="text-sm font-bold text-white tabular-nums">
              {sensors.capabilities.orientationLevel === "active"
                ? `${sensors.level.totalTiltDeg.toFixed(1)}° inclinación`
                : "---"}
            </div>
            <div className="text-[10px] text-slate-400">
              {sensors.capabilities.orientationLevel === "active"
                ? sensors.level.isLevel
                  ? "NIVELADO (±1.5°)"
                  : `P:${sensors.level.pitchDeg}° R:${sensors.level.rollDeg}°`
                : "Esperando giroscopio"}
            </div>
          </div>
        </div>

        {/* 3. Proximidad Real + Vibración IMU */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-amber-400 font-bold flex items-center gap-1.5 uppercase">
              <Radio size={13} /> Proximidad & Vibración
            </span>
            <StatusBadge status={sensors.capabilities.proximity} />
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[9px] text-slate-500 uppercase">Proximidad Física</div>
              <div className="text-sm font-bold text-white tabular-nums">
                {sensors.proximity.distanceCm !== null
                  ? `${sensors.proximity.distanceCm.toFixed(1)} cm`
                  : sensors.proximity.near !== null
                    ? sensors.proximity.near
                      ? "CERCA"
                      : "DESPEJADO"
                    : "---"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-slate-500 uppercase">Vibración IMU</div>
              <div className="text-sm font-bold text-cyan-300 tabular-nums">
                {sensors.accel.vibrationRms !== null
                  ? `${sensors.accel.vibrationRms.toFixed(2)} mm/s`
                  : "---"}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 leading-tight">
            {sensors.proximity.sourceNote}
          </div>
        </div>

        {/* 4. Temperatura & Batería Real */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-rose-400 font-bold flex items-center gap-1.5 uppercase">
              <Thermometer size={13} /> Temperatura & Energía
            </span>
            <StatusBadge status={sensors.capabilities.temperature} />
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[9px] text-slate-500 uppercase">Térmico Real</div>
              <div className="text-sm font-bold text-white tabular-nums">
                {sensors.thermal.ambientCelsius !== null
                  ? `${sensors.thermal.ambientCelsius.toFixed(1)} °C`
                  : "---"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-slate-500 uppercase flex items-center justify-end gap-1">
                <Activity size={10} /> Batería
              </div>
              <div className="text-sm font-bold text-emerald-300 tabular-nums">
                {sensors.thermal.batteryLevelPct !== null
                  ? `${sensors.thermal.batteryLevelPct}% ${
                      sensors.thermal.batteryCharging ? "⚡" : ""
                    }`
                  : "---"}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 leading-tight">
            {sensors.thermal.sourceNote}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label =
    status === "active"
      ? "ACTIVO"
      : status === "unsupported"
        ? "NO EXPUESTO"
        : status === "error"
          ? "ERROR"
          : "EN ESPERA";
  const cls =
    status === "active"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
      : status === "unsupported"
        ? "bg-slate-900 text-slate-500 border-slate-800"
        : "bg-blue-500/15 text-blue-300 border-blue-500/30";
  return (
    <span className={`px-1.5 py-0.5 rounded border text-[9px] font-mono ${cls}`}>
      {label}
    </span>
  );
}
