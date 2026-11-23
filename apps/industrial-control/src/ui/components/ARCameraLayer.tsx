import { ReactNode } from "react";
import { JarvisAR } from "./JarvisAR";
import {
  ARThermalHeatmapShader,
  ThermalShaderPalette,
} from "./ARThermalHeatmapShader";
import { useTelemetry } from "../../store/telemetryStore";

interface Props {
  isActive: boolean;
  temperature?: number | null;
  vibration?: number | null;
  load?: number | null;
  heatmapEnabled?: boolean;
  heatmapOpacity?: number;
  heatmapPalette?: ThermalShaderPalette;
  children?: ReactNode;
}

export function ARCameraLayer({
  isActive,
  temperature,
  vibration,
  load,
  heatmapEnabled = true,
  heatmapOpacity = 0.68,
  heatmapPalette = "ironbow",
  children,
}: Props) {
  const { currentTelemetry } = useTelemetry();

  if (!isActive) return <>{children}</>;

  const rawTemp = temperature !== undefined ? temperature : currentTelemetry.temperature;
  const rawVib = vibration !== undefined ? vibration : currentTelemetry.vibration;
  const rawLoad = load !== undefined ? load : currentTelemetry.load;

  const liveTemp = rawTemp ?? 22;
  const liveVib = rawVib ?? 0;
  const liveLoad = rawLoad ?? 0;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-xl">
      {/* Live Multi-Camera Optical Feed */}
      <JarvisAR />

      {/* GPU GLSL Heat-Map Shader Overlay mapped to Real-Time Telemetry */}
      <ARThermalHeatmapShader
        temperature={liveTemp}
        vibration={liveVib}
        load={liveLoad}
        opacity={heatmapOpacity}
        palette={heatmapPalette}
        enabled={heatmapEnabled}
      />

      {/* Compact Thermal Scale Calibration Bar */}
      {heatmapEnabled && (
        <div className="absolute bottom-3 left-3 z-30 bg-slate-950/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 flex items-center gap-2.5 text-[10px] font-mono text-slate-200">
          <span className="text-slate-400">20°C</span>
          <div
            className={`w-20 h-1.5 rounded-full ${
              heatmapPalette === "arctic"
                ? "bg-gradient-to-r from-slate-900 via-cyan-500 to-white"
                : "bg-gradient-to-r from-indigo-950 via-rose-500 to-amber-200"
            }`}
          />
          <span
            className={`tabular-nums font-bold ${
              rawTemp !== null && liveTemp > 800 ? "text-rose-400" : "text-amber-300"
            }`}
          >
            {rawTemp !== null ? `${liveTemp.toFixed(1)}°C` : "-- °C"}
          </span>
        </div>
      )}

      {children}
    </div>
  );
}
