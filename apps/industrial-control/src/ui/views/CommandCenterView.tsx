import { useState } from "react";
import { Activity, Cpu, Eye, Flame, Settings, Zap } from "lucide-react";
import DigitalTwin from "../components/DigitalTwin";
import { CameraFeeds } from "../components/CameraFeeds";
import { TelemetryChart } from "../components/TelemetryCharts";
import { VisionAnalyzer } from "../components/VisionAnalyzer";
import { HardwareControl } from "../components/HardwareControl";
import { AgentExecutor } from "../components/AgentExecutor";
import { AgentBackendSelector } from "../components/AgentBackendSelector";
import { S3Uploader } from "../components/S3Uploader";
import { LoginPanel } from "../components/LoginPanel";
import { ARCameraLayer } from "../components/ARCameraLayer";
import { ThermalShaderPalette } from "../components/ARThermalHeatmapShader";
import { hardware } from "../../services/hardwareController";

interface CommandCenterViewProps {
  arModeActive: boolean;
  currentTelemetry: any;
  telemetryHistory: any[];
  enabledSensors: string[];
  loadingAi: boolean;
  aiInsights: any;
}

export function CommandCenterView({
  arModeActive,
  currentTelemetry,
  telemetryHistory,
  enabledSensors,
  loadingAi,
  aiInsights,
}: CommandCenterViewProps) {
  const [rightTab, setRightTab] = useState<"telemetry" | "vision" | "system">("telemetry");
  const [executingSeq, setExecutingSeq] = useState<"idle" | "running" | "done">("idle");
  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  const [heatmapPalette, setHeatmapPalette] = useState<ThermalShaderPalette>("ironbow");
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.68);

  const handleRunGcode = async () => {
    if (!aiInsights?.gcode?.length || executingSeq === "running") return;
    setExecutingSeq("running");
    for (const cmd of aiInsights.gcode) {
      await hardware.sendCommand(cmd);
      await new Promise((r) => setTimeout(r, 450));
    }
    setExecutingSeq("done");
    setTimeout(() => setExecutingSeq("idle"), 2000);
  };

  return (
    <div className="xl:col-span-3 grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
      {/* Main Visualizer (3D Digital Twin + Transparent AR Layer) */}
      <div className="xl:col-span-2 flex flex-col gap-5 h-full">
        <div className="flex-1 bg-[#070b12] border border-slate-800 rounded-xl relative min-h-[340px] md:min-h-[420px] overflow-hidden">
          <ARCameraLayer
            isActive={arModeActive}
            temperature={currentTelemetry.temperature}
            vibration={currentTelemetry.vibration}
            load={currentTelemetry.load}
            heatmapEnabled={heatmapEnabled}
            heatmapPalette={heatmapPalette}
            heatmapOpacity={heatmapOpacity}
          />
          <div className="absolute inset-0 z-20 pointer-events-auto">
            <DigitalTwin
              telemetry={currentTelemetry}
              arMode={arModeActive}
              history={telemetryHistory}
              enabledSensors={enabledSensors}
            />
          </div>

          {arModeActive && (
            <div className="absolute top-3 right-3 z-30 bg-slate-950/95 border border-slate-700/90 rounded-lg p-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-mono shadow-lg">
              <button
                onClick={() => setHeatmapEnabled(!heatmapEnabled)}
                className={`px-2 py-1 rounded flex items-center gap-1 font-semibold transition-colors ${
                  heatmapEnabled
                    ? "bg-rose-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:text-white"
                }`}
                title="Activar/Desactivar Shader Térmico AR"
              >
                <Flame size={11} /> Shader Térmico
              </button>
              {heatmapEnabled && (
                <>
                  {(
                    [
                      ["ironbow", "Ironbow"],
                      ["hotspot", "Hotspot"],
                      ["arctic", "Ártico"],
                    ] as [ThermalShaderPalette, string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setHeatmapPalette(key)}
                      className={`px-2 py-1 rounded transition-colors ${
                        heatmapPalette === key
                          ? "bg-blue-600 text-white"
                          : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <input
                    type="range"
                    min="0.2"
                    max="1"
                    step="0.05"
                    value={heatmapOpacity}
                    onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                    title="Opacidad del shader térmico AR"
                    className="w-14 accent-rose-500 ml-1"
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Cameras Feed Panel */}
        <CameraFeeds telemetry={currentTelemetry} />

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
          <TelemetryChart
            data={telemetryHistory}
            dataKey="temperature"
            color={(currentTelemetry.temperature ?? 0) > 800 ? "#e11d48" : "#60a5fa"}
            label="SENSOR TÉRMICO PRINCIPAL"
          />
          <TelemetryChart
            data={telemetryHistory}
            dataKey="vibration"
            color={(currentTelemetry.vibration ?? 0) > 5 ? "#e11d48" : "#34d399"}
            label="SENSOR ACÚSTICO / VIBRACIÓN"
          />
        </div>
      </div>

      {/* Organized Tabbed Right Sidebar */}
      <div className="flex flex-col gap-4 h-full">
        <div className="grid grid-cols-3 gap-1 bg-[#0f1623] border border-slate-800 rounded-xl p-1 shrink-0 text-[11px] font-mono">
          <button
            onClick={() => setRightTab("telemetry")}
            className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              rightTab === "telemetry"
                ? "bg-blue-600 text-white font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Activity size={13} /> Telemetría
          </button>
          <button
            onClick={() => setRightTab("vision")}
            className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              rightTab === "vision"
                ? "bg-blue-600 text-white font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Eye size={13} /> Visión & IA
          </button>
          <button
            onClick={() => setRightTab("system")}
            className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              rightTab === "system"
                ? "bg-blue-600 text-white font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Settings size={13} /> Sistema
          </button>
        </div>

        {rightTab === "telemetry" && (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <div className="glass-panel p-5 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[11px] text-blue-400 font-mono font-bold tracking-wider flex items-center gap-2 uppercase">
                  <Activity size={14} /> Telemetría en Tiempo Real
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  {currentTelemetry.distanceCm != null
                    ? `Obs: ${currentTelemetry.distanceCm.toFixed(1)} cm`
                    : "Sin simulación"}
                </span>
              </div>

              <div className="space-y-4">
                <MetricBar
                  label="CARGA OPERACIONAL"
                  value={currentTelemetry.load}
                  max={100}
                  unit="%"
                  color="bg-blue-500"
                />
                <MetricBar
                  label="NIVEL TÉRMICO"
                  value={currentTelemetry.temperature}
                  max={1000}
                  unit=" °C"
                  color={(currentTelemetry.temperature ?? 0) > 800 ? "bg-rose-500" : "bg-orange-500"}
                />
                <MetricBar
                  label="VIBRACIÓN / ACÚSTICA"
                  value={currentTelemetry.vibration}
                  max={10}
                  unit=" mm/s"
                  color={(currentTelemetry.vibration ?? 0) > 5 ? "bg-rose-500" : "bg-cyan-500"}
                />
              </div>
            </div>

            <div className="flex-1 min-h-[280px]">
              <HardwareControl />
            </div>
          </div>
        )}

        {rightTab === "vision" && (
          <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <VisionAnalyzer />
            <AgentExecutor currentTelemetry={currentTelemetry} />

            <div className="glass-panel p-5 flex-1 flex flex-col min-h-[220px] border-t-2 border-t-blue-500">
              <h3 className="text-sm text-white font-bold mb-3 flex items-center gap-2 shrink-0">
                <Cpu size={16} className="text-blue-400" /> DIAGNÓSTICO IA
              </h3>

              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar text-sm text-slate-300 leading-relaxed">
                {loadingAi ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 py-6">
                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-500" />
                    <p className="font-mono text-xs">Evaluando estado sensorial...</p>
                  </div>
                ) : aiInsights ? (
                  <div className="flex flex-col h-full gap-3">
                    <div
                      className="prose prose-invert prose-sm max-w-none text-slate-200"
                      dangerouslySetInnerHTML={{ __html: aiInsights.html }}
                    />
                    {aiInsights.gcode && aiInsights.gcode.length > 0 && (
                      <div className="mt-auto bg-slate-950 border border-slate-800 rounded-lg p-3 shrink-0">
                        <h4 className="text-[10px] text-blue-400 font-mono font-bold tracking-wider mb-2 flex items-center">
                          <Zap size={12} className="mr-1" /> SECUENCIA RECOMENDADA
                        </h4>
                        <div className="bg-black/60 text-emerald-400 font-mono text-xs p-2 rounded mb-3 overflow-x-auto">
                          {aiInsights.gcode.map((g: string, i: number) => (
                            <div key={i}>{g}</div>
                          ))}
                        </div>
                        <button
                          onClick={handleRunGcode}
                          disabled={executingSeq === "running"}
                          className={`w-full text-white text-[11px] font-bold font-mono tracking-wider py-2 rounded-lg transition-colors flex items-center justify-center ${
                            executingSeq === "done"
                              ? "bg-emerald-600"
                              : "bg-blue-600 hover:bg-blue-500"
                          } disabled:opacity-60`}
                        >
                          <Cpu size={14} className="mr-2" />
                          {executingSeq === "running"
                            ? "EJECUTANDO..."
                            : executingSeq === "done"
                            ? "COMPLETADO"
                            : "EJECUTAR EN MÁQUINA"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center px-4 py-6">
                    <Cpu className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-xs">
                      Presiona &quot;ANÁLISIS IA&quot; en la cabecera para evaluar telemetría y generar secuencias.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {rightTab === "system" && (
          <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <AgentBackendSelector />
            <LoginPanel />
            <S3Uploader />
          </div>
        )}
      </div>
    </div>
  );
}

function MetricBar({
  label,
  value,
  max,
  unit,
  color,
}: {
  label: string;
  value: number | null | undefined;
  max: number;
  unit: string;
  color: string;
}) {
  const numericVal = typeof value === "number" && Number.isFinite(value) ? value : null;
  const percentage =
    numericVal !== null ? Math.min(100, Math.max(0, (numericVal / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5 font-mono uppercase tracking-wider">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-100 font-bold tabular-nums">
          {numericVal !== null ? `${numericVal.toFixed(1)}${unit}` : "---"}
        </span>
      </div>
      <div className="h-2 w-full bg-slate-800/90 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
