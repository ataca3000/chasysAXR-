import { useState } from "react";
import {
  Activity,
  Thermometer,
  Cpu,
  AlertTriangle,
  Zap,
  CheckCircle2,
  RotateCcw,
  MonitorSmartphone,
  X,
  Wrench,
  Bot,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getRecommendations } from "../services/agentBackend";
import { useOnboardingState } from "../hooks/useOnboardingState";
import { OllamaSetupGuide } from "./components/OllamaSetupGuide";
import { ARCameraLayer } from "./components/ARCameraLayer";
import { VoiceAssistant } from "./components/VoiceAssistant";
import { AssemblyLab } from "./components/AssemblyLab";
import { MobileScanner } from "./components/MobileScanner";
import { LocalModelManager } from "./components/LocalModelManager";
import DigitalTwin from "./components/DigitalTwin";
import { JarvisCompanion } from "./components/JarvisCompanion";
import { CommandCenterView } from "./views/CommandCenterView";
import { ThermalImagingView } from "./views/ThermalImagingView";
import { PlasmaCuttingView } from "./views/PlasmaCuttingView";
import { PredictiveMaintenanceView } from "./views/PredictiveMaintenanceView";
import { useTelemetry, telemetryStore } from "../store/telemetryStore";
import { OnboardingChat } from "./components/OnboardingChat";

export default function App() {
  const isMobileScanner = window.location.search.includes("role=mobile-cam");
  if (isMobileScanner) {
    return <MobileScanner />;
  }

  return (
    <>
      <OllamaSetupGuide />
      <AppContent />
    </>
  );
}

function AppContent() {
  const { currentTelemetry, telemetryHistory, isCriticalAlarm, systemError } =
    useTelemetry();
  const {
    isOnboardingComplete,
    isLoading: onboardingLoading,
    completeOnboarding,
    skipOnboarding,
  } = useOnboardingState();
  const [_showOnboarding, setShowOnboarding] = useState(!isOnboardingComplete);
  const [aiInsights, setAiInsights] = useState<{
    html: string;
    gcode: string[];
  } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [arModeActive, setArModeActive] = useState(false);
  const [kioskMode, setKioskMode] = useState(false);
  const [enabledSensors, setEnabledSensors] = useState<string[]>([
    "thermal",
    "vibration",
    "load",
  ]);

  const toggleSensorLibrary = (sensor: string) => {
    setEnabledSensors((prev) =>
      prev.includes(sensor)
        ? prev.filter((s) => s !== sensor)
        : [...prev, sensor],
    );
  };

  const toggleKioskMode = () => {
    if (!kioskMode) {
      setKioskMode(true);
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch (e) {}
    } else {
      setKioskMode(false);
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (e) {}
    }
  };

  const [activeView, setActiveView] = useState("command_center");

  const isCritical =
    isCriticalAlarm ||
    currentTelemetry.temperature > 800 ||
    currentTelemetry.vibration > 5 ||
    currentTelemetry.load > 85;

  const fetchAiAnalysis = async () => {
    setLoadingAi(true);
    telemetryStore.setSystemError(null);
    try {
      const status =
        currentTelemetry.temperature > 800 ? "ALERTA CRÍTICA" : "NORMAL";
      const insights = await getRecommendations(currentTelemetry, status);
      setAiInsights(insights);
    } catch (err: any) {
      telemetryStore.setSystemError(
        err.message || "Error occurred while contacting the local AI model.",
      );
      setAiInsights({
        html: '<p class="text-rose-600">Analysis failed due to connection error. Please try again.</p>',
        gcode: [],
      });
    } finally {
      setLoadingAi(false);
    }
  };

  // Show onboarding if not complete
  if (!onboardingLoading && !isOnboardingComplete) {
    return (
      <OnboardingChat onComplete={completeOnboarding} onSkip={skipOnboarding} />
    );
  }

  return (
    <div
      className={`min-h-screen bg-zinc-950 text-slate-300 font-sans flex flex-col md:flex-row overflow-hidden relative ${kioskMode ? "fixed inset-0 z-50 p-2 lg:p-4 bg-black" : ""}`}
    >
      <AnimatePresence>
        {systemError && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-2xl"
          >
            <div className="bg-white border border-rose-500 text-rose-700 px-4 py-3 rounded-lg shadow-[0_0_15_rgba(225,29,72,0.2)] flex items-start gap-3 backdrop-blur-md">
              <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-rose-600">System Notification</h4>
                <p className="text-sm font-mono mt-1 opacity-90">
                  {systemError}
                </p>
              </div>
              <button
                onClick={() => telemetryStore.setSystemError(null)}
                className="text-rose-400 hover:text-rose-600 transition-colors p-1"
                title="Dismiss"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background 1/0 watermark */}
      <div className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none z-0 opacity-[0.02]">
        <div className="text-[35vw] font-black font-display leading-none animate-spin-slow text-white tracking-tighter">
          1/0
        </div>
        <div className="absolute bottom-8 font-mono text-xs text-white/50 tracking-[0.3em] uppercase">
          AI Assisted by Gemini & Copilot Agents
        </div>
      </div>

      {/* Sidebar - Hidden in Kiosk Mode for maximum space */}
      {!kioskMode && (
        <aside className="w-full md:w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col p-4 shrink-0 z-10 shadow-sm relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-black/60 border border-white/10 rounded-lg flex items-center justify-center shadow-sm relative overflow-hidden">
              <Cpu className="text-google-blue w-6 h-6 relative z-10" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight leading-tight text-white drop-shadow-sm font-display uppercase">
                1/0 Goopilot iAgnt
              </h1>
              <p className="text-[10px] text-google-blue font-mono tracking-[0.2em] font-semibold">
                AI CO-PILOT SYSTEM
              </p>
            </div>
          </div>

          <nav className="flex flex-col gap-2 flex-grow">
            <NavItem
              active={activeView === "command_center"}
              onClick={() => setActiveView("command_center")}
              icon={<Activity size={18} />}
              label="COMMAND CENTER"
            />
            <NavItem
              active={activeView === "thermal_imaging"}
              onClick={() => setActiveView("thermal_imaging")}
              icon={<Thermometer size={18} />}
              label="VISIÓN ESPECTRAL"
            />
            <NavItem
              active={activeView === "plasma_cutting"}
              onClick={() => setActiveView("plasma_cutting")}
              icon={<Zap size={18} />}
              label="INTEGRACIÓN LIBRERÍAS"
            />
            <NavItem
              active={activeView === "predictive_maint"}
              onClick={() => setActiveView("predictive_maint")}
              icon={<RotateCcw size={18} />}
              label="SENSÓRICA & MONITOREO"
            />
            <NavItem
              active={activeView === "assembly_lab"}
              onClick={() => setActiveView("assembly_lab")}
              icon={<Wrench size={18} />}
              label="LÍNEA DE PRODUCCIÓN"
            />
            <NavItem
              active={activeView === "ai_models"}
              onClick={() => setActiveView("ai_models")}
              icon={<Cpu size={18} />}
              label="AI MODELS (LOCAL)"
            />
            <NavItem
              active={activeView === "jarvis_companion"}
              onClick={() => setActiveView("jarvis_companion")}
              icon={<Bot size={18} />}
              label="JARVIS COMPANION (3D)"
            />
          </nav>

          <div className="mt-auto relative z-10">
            <div
              className={`p-4 rounded-lg border ${isCritical ? "bg-black/60 border-google-red/50 shadow-[0_0_15px_rgba(234,67,53,0.15)]" : "bg-black/40 border-white/10"}`}
            >
              <h4
                className={`text-xs mb-1 font-mono ${isCritical ? "text-google-red font-semibold" : "text-slate-400"}`}
              >
                SYSTEM STATUS
              </h4>
              <div className="flex items-center gap-2">
                {isCritical ? (
                  <AlertTriangle className="text-google-red w-5 h-5 drop-shadow-[0_0_5px_rgba(234,67,53,0.4)]" />
                ) : (
                  <CheckCircle2 className="text-google-green w-5 h-5" />
                )}
                <span
                  className={`font-semibold ${isCritical ? "text-google-red drop-shadow-[0_0_2px_rgba(234,67,53,0.3)]" : "text-slate-300"}`}
                >
                  {isCritical ? "ATENCIÓN REQUERIDA" : "OPERANDO (ADAPTATIVO)"}
                </span>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
              <h4 className="text-[10px] text-slate-500 mb-2 font-mono font-bold tracking-widest uppercase">
                LIBRERÍAS DE SENSORES
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <SensorChip
                  label="TERMICO"
                  active={enabledSensors.includes("thermal")}
                  onClick={() => toggleSensorLibrary("thermal")}
                />
                <SensorChip
                  label="VIBRO"
                  active={enabledSensors.includes("vibration")}
                  onClick={() => toggleSensorLibrary("vibration")}
                />
                <SensorChip
                  label="CARGA"
                  active={enabledSensors.includes("load")}
                  onClick={() => toggleSensorLibrary("load")}
                />
                <SensorChip
                  label="CAUDAL"
                  active={enabledSensors.includes("flow")}
                  onClick={() => toggleSensorLibrary("flow")}
                />
              </div>
            </div>
          </div>
        </aside>
      )}

      {kioskMode ? (
        <main className="flex-1 flex flex-col h-screen overflow-hidden z-20 relative bg-black rounded-2xl shadow-xl border border-white/10">
          <div className="flex justify-between items-center p-6 border-b border-white/10 shrink-0 bg-black/60 backdrop-blur">
            <div className="flex items-center gap-4">
              <MonitorSmartphone className="bg-white/5 text-slate-300 w-12 h-12 p-2 rounded-lg border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
              <h2 className="text-4xl font-black tracking-widest text-white font-display uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                KIOSCO LÍNEA DE PRODUCCIÓN
              </h2>
            </div>
            <div className="flex gap-4">
              <button
                onClick={toggleKioskMode}
                className="px-8 py-4 bg-black border-2 border-white/20 rounded-xl text-2xl font-bold text-slate-300 hover:bg-white/5 transition-all shadow-sm"
              >
                SALIR DEL KIOSCO
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 min-h-0">
            {/* 3D Visualizer - 2/3 width */}
            <div className="flex-[2] glass-panel border-2 border-slate-200 rounded-2xl relative overflow-hidden flex flex-col shadow-sm">
              <div className="absolute top-4 left-4 z-30 bg-white/90 border border-slate-200 p-3 rounded-lg backdrop-blur-md shadow-sm">
                <h3 className="text-slate-700 font-mono font-bold text-xl">
                  <Activity className="inline mr-2 mt(-1) w-6 h-6 text-slate-500" />{" "}
                  SINCRONIZACIÓN SENSORIAL
                </h3>
              </div>
              <div className="flex-1 relative z-20 pointer-events-auto">
                <DigitalTwin
                  telemetry={currentTelemetry}
                  arMode={arModeActive}
                  history={telemetryHistory}
                  enabledSensors={enabledSensors}
                />
              </div>
              <ARCameraLayer isActive={arModeActive} />
            </div>

            {/* Large Telemetry & Controls - 1/3 width */}
            <div className="flex-1 flex flex-col gap-6">
              <div className="glass-panel p-8 rounded-2xl flex-1 flex flex-col justify-center gap-10">
                <KioskMetric
                  label="CARGA OPERACIONAL"
                  value={currentTelemetry.load}
                  max={100}
                  unit="%"
                  isCritical={currentTelemetry.load > 85}
                />
                <KioskMetric
                  label="NIVEL TÉRMICO"
                  value={currentTelemetry.temperature}
                  max={1000}
                  unit="°C"
                  isCritical={currentTelemetry.temperature > 800}
                />
                <KioskMetric
                  label="VIBRACIÓN LOCAL"
                  value={currentTelemetry.vibration}
                  max={10}
                  unit="mm/s"
                  isCritical={currentTelemetry.vibration > 5}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 shrink-0 h-[220px]">
                <button
                  onClick={() => setArModeActive(!arModeActive)}
                  className={`rounded-2xl border border-white/10 text-2xl font-black tracking-wider transition-all flex flex-col items-center justify-center gap-2 font-display ${arModeActive ? "bg-google-blue text-white shadow-[0_0_20px_rgba(66,133,244,0.4)]" : "bg-black/60 text-slate-300 hover:bg-white/5"}`}
                >
                  <Activity size={40} />
                  {arModeActive ? "AR ON" : "AR OFF"}
                </button>
                <button
                  onClick={fetchAiAnalysis}
                  disabled={loadingAi}
                  className="rounded-2xl border border-white/10 bg-black/60 text-google-blue hover:bg-white/5 text-2xl font-black tracking-wider transition-all flex flex-col items-center justify-center gap-2 font-display disabled:opacity-50"
                >
                  <Cpu size={40} />
                  {loadingAi ? "WAIT..." : "AI CHECK"}
                </button>
                <button className="col-span-2 flex-1 rounded-2xl border border-rose-500/30 bg-rose-600/10 text-rose-500 text-3xl font-black shadow-[0_0_15px_rgba(234,67,53,0.2)] hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-4 font-display">
                  <AlertTriangle size={36} /> E-STOP
                </button>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto h-screen custom-scrollbar z-10 relative">
          {/* Header Actions */}
          <div className="flex justify-between items-center mb-6 shrink-0 z-10 relative">
            <div className="flex items-center gap-3">
              {kioskMode && <Cpu className="text-slate-500 w-8 h-8" />}
              <h2 className="text-2xl font-semibold tracking-tight text-white font-display uppercase text-neon-google">
                CNC TELEMETRY & SUPERVISION
              </h2>
            </div>
            <div className="flex gap-3">
              <button
                onClick={toggleKioskMode}
                className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-all border ${
                  kioskMode
                    ? "bg-white/10 text-slate-200 border-white/20 shadow-sm"
                    : "bg-black/40 text-slate-300 border-white/10 hover:bg-white/5 hover:border-white/20 hover:shadow-sm"
                }`}
              >
                <MonitorSmartphone size={16} />
                {kioskMode ? "EXIT KIOSK MODE" : "PLANT FLOOR KIOSK"}
              </button>
              <button
                onClick={() => setArModeActive(!arModeActive)}
                className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-all border ${
                  arModeActive
                    ? "bg-google-blue text-white border-google-blue shadow-[0_0_10px_rgba(66,133,244,0.3)]"
                    : "bg-black/40 text-slate-300 border-white/10 hover:bg-white/5 hover:border-white/20 hover:shadow-sm"
                }`}
              >
                <Activity size={16} />
                {arModeActive ? "AR MAPPING ACTIVE" : "INIT AR OVERLAY"}
              </button>
              <button
                onClick={fetchAiAnalysis}
                disabled={loadingAi}
                className="bg-black hover:bg-white/5 border border-white/10 px-4 py-2 rounded-md font-medium text-sm text-google-blue flex items-center gap-2 disabled:opacity-50 shadow-sm transition-all"
              >
                <Cpu size={16} />
                {loadingAi ? "ANALYZING..." : "GEMINI AI ANALYSIS"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
            {activeView === "command_center" && (
              <CommandCenterView
                arModeActive={arModeActive}
                currentTelemetry={currentTelemetry}
                telemetryHistory={telemetryHistory}
                enabledSensors={enabledSensors}
                loadingAi={loadingAi}
                aiInsights={aiInsights}
              />
            )}

            {activeView === "thermal_imaging" && <ThermalImagingView />}

            {activeView === "plasma_cutting" && <PlasmaCuttingView />}

            {activeView === "predictive_maint" && <PredictiveMaintenanceView />}

            {activeView === "assembly_lab" && <AssemblyLab />}

            {activeView === "ai_models" && (
              <div className="xl:col-span-3">
                <LocalModelManager />
              </div>
            )}

            {activeView === "jarvis_companion" && (
              <div className="xl:col-span-3 h-[calc(100vh-120px)]">
                <JarvisCompanion />
              </div>
            )}
          </div>
        </main>
      )}
      <VoiceAssistant
        onError={(msg: string) => telemetryStore.setSystemError(msg)}
      />
    </div>
  );
}

// Helpers
function NavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all border font-mono font-medium tracking-wide ${
        active
          ? "bg-white/10 text-white border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
          : "text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function KioskMetric({
  label,
  value,
  max,
  unit,
  isCritical,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  isCritical: boolean;
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-end">
        <span className="text-sm font-bold tracking-widest text-slate-400 font-mono">
          {label}
        </span>
        <span
          className={`text-5xl font-display font-black tracking-tighter ${isCritical ? "text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]" : "text-slate-200"}`}
        >
          {value.toFixed(1)}
          <span className="text-3xl ml-1 text-slate-500 font-sans tracking-normal">
            {unit}
          </span>
        </span>
      </div>
      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden shadow-inner">
        <div
          className={`h-full transition-all duration-300 ease-out ${isCritical ? "bg-rose-500 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.8)]" : "bg-google-blue shadow-[0_0_10px_rgba(66,133,244,0.6)]"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function SensorChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded text-[8px] font-bold tracking-tighter border transition-all ${
        active
          ? "bg-google-blue/20 border-google-blue text-white shadow-[0_0_5px_rgba(66,133,244,0.3)]"
          : "bg-black/40 border-white/10 text-slate-500 hover:border-white/20"
      }`}
    >
      {label}
    </button>
  );
}
