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
  Code2,
  Sliders,
  Usb,
  Smartphone,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getRecommendations } from "../services/agentBackend";
import { hardware } from "../services/hardwareController";
import { useOnboardingState } from "../hooks/useOnboardingState";
import { OllamaSetupGuide } from "./components/OllamaSetupGuide";
import { ARCameraLayer } from "./components/ARCameraLayer";
import { VoiceAssistant } from "./components/VoiceAssistant";
import { AssemblyLab } from "./components/AssemblyLab";
import { CodeLibraryView } from "./components/CodeLibraryView";
import { MobileScanner } from "./components/MobileScanner";
import { LocalModelManager } from "./components/LocalModelManager";
import VisionTest from "./components/VisionTest";
import AwarenessPanel from "./components/AwarenessPanel";
import DigitalTwin from "./components/DigitalTwin";
import { JarvisCompanion } from "./components/JarvisCompanion";
import { CommandCenterView } from "./views/CommandCenterView";
import { ThermalImagingView } from "./views/ThermalImagingView";
import { PlasmaCuttingView } from "./views/PlasmaCuttingView";
import { PredictiveMaintenanceView } from "./views/PredictiveMaintenanceView";
import { SerialWorkbenchView } from "./views/SerialWorkbenchView";
import { MobileSensorsPanel } from "./components/MobileSensorsPanel";
import { PinoutDigitalTwin } from "./components/PinoutDigitalTwin";
import { useTelemetry, telemetryStore } from "../store/telemetryStore";
import { OnboardingChat, MachineProfile } from "./components/OnboardingChat";

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
    resetOnboarding,
  } = useOnboardingState();

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
  const [activeView, setActiveView] = useState("command_center");

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
      } catch {}
    } else {
      setKioskMode(false);
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } catch {}
    }
  };

  const handleOnboardingDone = (profile: MachineProfile) => {
    if (profile.sensors.length > 0) {
      setEnabledSensors(profile.sensors);
    }
    completeOnboarding(profile);
    setActiveView("assembly_lab");
  };

  const [pinoutBoardId, setPinoutBoardId] = useState("arduino_nano");

  const isCritical =
    isCriticalAlarm ||
    (currentTelemetry.temperature ?? 0) > 800 ||
    (currentTelemetry.vibration ?? 0) > 5 ||
    (currentTelemetry.load ?? 0) > 85 ||
    currentTelemetry.obstacleDetected;

  const fetchAiAnalysis = async () => {
    setLoadingAi(true);
    telemetryStore.setSystemError(null);
    try {
      const status =
        (currentTelemetry.temperature ?? 0) > 800 ? "ALERTA CRÍTICA" : "NORMAL";
      const insights = await getRecommendations(currentTelemetry, status);
      setAiInsights(insights);
    } catch (err: any) {
      telemetryStore.setSystemError(
        err.message || "Error al consultar el modelo IA.",
      );
      setAiInsights({
        html: '<p class="text-rose-400">No se pudo completar el análisis. Revisa el backend IA.</p>',
        gcode: [],
      });
    } finally {
      setLoadingAi(false);
    }
  };

  if (!onboardingLoading && !isOnboardingComplete) {
    return (
      <OnboardingChat
        onComplete={handleOnboardingDone}
        onSkip={skipOnboarding}
      />
    );
  }

  return (
    <div
      className={`min-h-screen bg-[#070b12] text-slate-200 font-sans flex flex-col md:flex-row relative ${
        kioskMode ? "fixed inset-0 z-50 p-2 lg:p-4 bg-[#070b12] overflow-hidden" : ""
      }`}
    >
      <AnimatePresence>
        {systemError && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-2xl"
          >
            <div className="bg-slate-900 border border-rose-500 text-rose-200 px-4 py-3 rounded-lg shadow-xl flex items-start gap-3">
              <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-rose-400">Notificación del Sistema</h4>
                <p className="text-sm font-mono mt-1 opacity-90">{systemError}</p>
              </div>
              <button
                onClick={() => telemetryStore.setSystemError(null)}
                className="text-rose-400 hover:text-white transition-colors p-1"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      {!kioskMode && (
        <aside className="w-full md:w-64 bg-[#0b101b] border-b md:border-b-0 md:border-r border-slate-800/90 flex flex-col p-3 md:p-4 shrink-0 z-10 relative md:h-screen md:sticky md:top-0">
          <div className="flex items-center gap-3 mb-3 md:mb-6">
            <div className="w-10 h-10 bg-blue-600/15 border border-blue-500/30 rounded-lg flex items-center justify-center">
              <Cpu className="text-blue-400 w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight leading-tight text-white font-display">
                1/0 iAgnt Studio
              </h1>
              <p className="text-[10px] text-blue-400 font-mono tracking-widest uppercase">
                Control & XR Assembly
              </p>
            </div>
          </div>

          <nav className="flex flex-row md:flex-col gap-1.5 flex-grow overflow-x-auto md:overflow-y-auto custom-scrollbar pb-1 md:pb-0">
            <NavItem
              active={activeView === "command_center"}
              onClick={() => setActiveView("command_center")}
              icon={<Activity size={16} />}
              label="CENTRO DE CONTROL"
            />
            <NavItem
              active={activeView === "usb_workbench"}
              onClick={() => setActiveView("usb_workbench")}
              icon={<Usb size={16} />}
              label="USB / FLASH ARDUINO & RPI"
            />
            <NavItem
              active={activeView === "mobile_sensors"}
              onClick={() => setActiveView("mobile_sensors")}
              icon={<Smartphone size={16} />}
              label="SENSORES CELULAR & PINES"
            />
            <NavItem
              active={activeView === "assembly_lab"}
              onClick={() => setActiveView("assembly_lab")}
              icon={<Wrench size={16} />}
              label="ENSAMBLAJE XR / 3D"
            />
            <NavItem
              active={activeView === "code_library"}
              onClick={() => setActiveView("code_library")}
              icon={<Code2 size={16} />}
              label="LIBRERÍA DE CÓDIGO"
            />
            <NavItem
              active={activeView === "thermal_imaging"}
              onClick={() => setActiveView("thermal_imaging")}
              icon={<Thermometer size={16} />}
              label="VISIÓN TÉRMICA RGB"
            />
            <NavItem
              active={activeView === "plasma_cutting"}
              onClick={() => setActiveView("plasma_cutting")}
              icon={<Zap size={16} />}
              label="CORTE PLASMA"
            />
            <NavItem
              active={activeView === "predictive_maint"}
              onClick={() => setActiveView("predictive_maint")}
              icon={<RotateCcw size={16} />}
              label="MANTENIMIENTO IA"
            />
            <NavItem
              active={activeView === "ai_models"}
              onClick={() => setActiveView("ai_models")}
              icon={<Cpu size={16} />}
              label="MODELOS IA"
            />
            <NavItem
              active={activeView === "awareness"}
              onClick={() => setActiveView("awareness")}
              icon={<AlertTriangle size={16} />}
              label="CONCIENCIA SITUACIONAL"
            />
            <NavItem
              active={activeView === "jarvis_companion"}
              onClick={() => setActiveView("jarvis_companion")}
              icon={<Bot size={16} />}
              label="COMPANION 3D"
            />
          </nav>

          <div className="hidden md:flex flex-col gap-3 mt-4 pt-3 border-t border-slate-800/80">
            <div
              className={`p-3 rounded-lg border ${
                isCritical
                  ? "bg-rose-950/30 border-rose-500/40"
                  : "bg-slate-900/70 border-slate-800"
              }`}
            >
              <h4
                className={`text-[10px] mb-1 font-mono uppercase ${
                  isCritical ? "text-rose-400 font-semibold" : "text-slate-400"
                }`}
              >
                ESTADO DE LÍNEA
              </h4>
              <div className="flex items-center gap-2 text-xs">
                {isCritical ? (
                  <AlertTriangle className="text-rose-400 w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="text-emerald-400 w-4 h-4 shrink-0" />
                )}
                <span className={isCritical ? "text-rose-300 font-semibold" : "text-slate-200"}>
                  {isCritical ? "ATENCIÓN REQUERIDA" : "OPERANDO NOMINAL"}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
              <h4 className="text-[10px] text-slate-400 mb-2 font-mono font-bold tracking-wider uppercase">
                SENSORES ACTIVOS
              </h4>
              <div className="grid grid-cols-2 gap-1.5">
                <SensorChip
                  label="TÉRMICO"
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

            <button
              onClick={resetOnboarding}
              className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-colors"
            >
              <Sliders size={13} className="text-blue-400" />
              <span>Asistente Inicial</span>
            </button>
          </div>
        </aside>
      )}

      {kioskMode ? (
        <main className="flex-1 flex flex-col h-screen overflow-hidden z-20 relative bg-[#070b12] rounded-2xl shadow-xl border border-slate-800">
          <div className="flex justify-between items-center p-5 border-b border-slate-800 shrink-0 bg-[#0f1623]">
            <div className="flex items-center gap-4">
              <MonitorSmartphone className="bg-slate-900 text-blue-400 w-10 h-10 p-2 rounded-lg border border-slate-700" />
              <h2 className="text-2xl lg:text-3xl font-bold tracking-wider text-white font-display uppercase">
                KIOSCO LÍNEA DE PRODUCCIÓN
              </h2>
            </div>
            <button
              onClick={toggleKioskMode}
              className="px-6 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-slate-200 hover:bg-slate-800 transition-colors"
            >
              SALIR DEL KIOSCO
            </button>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 min-h-0">
            <div className="flex-[2] bg-[#070b12] border border-slate-800 rounded-2xl relative overflow-hidden flex flex-col">
              <ARCameraLayer isActive={arModeActive} />
              <div className="flex-1 relative z-20 pointer-events-auto">
                <DigitalTwin
                  telemetry={currentTelemetry}
                  arMode={arModeActive}
                  history={telemetryHistory}
                  enabledSensors={enabledSensors}
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-6">
              <div className="glass-panel p-6 rounded-2xl flex-1 flex flex-col justify-center gap-8">
                <KioskMetric
                  label="CARGA OPERACIONAL"
                  value={currentTelemetry.load}
                  max={100}
                  unit="%"
                  isCritical={(currentTelemetry.load ?? 0) > 85}
                />
                <KioskMetric
                  label="NIVEL TÉRMICO"
                  value={currentTelemetry.temperature}
                  max={1000}
                  unit="°C"
                  isCritical={(currentTelemetry.temperature ?? 0) > 800}
                />
                <KioskMetric
                  label="VIBRACIÓN LOCAL"
                  value={currentTelemetry.vibration}
                  max={10}
                  unit="mm/s"
                  isCritical={(currentTelemetry.vibration ?? 0) > 5}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 shrink-0 h-[180px]">
                <button
                  onClick={() => setArModeActive(!arModeActive)}
                  className={`rounded-2xl border text-lg font-bold tracking-wider transition-colors flex flex-col items-center justify-center gap-2 font-display ${
                    arModeActive
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-[#0f1623] border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Activity size={28} />
                  {arModeActive ? "AR ACTIVO" : "MODO AR"}
                </button>
                <button
                  onClick={fetchAiAnalysis}
                  disabled={loadingAi}
                  className="rounded-2xl border border-slate-800 bg-[#0f1623] text-blue-400 hover:bg-slate-800 text-lg font-bold tracking-wider transition-colors flex flex-col items-center justify-center gap-2 font-display disabled:opacity-50"
                >
                  <Cpu size={28} />
                  {loadingAi ? "ANALIZANDO..." : "CHECK IA"}
                </button>
                <button
                  onClick={() => hardware.emergencyStop()}
                  className="col-span-2 flex-1 rounded-2xl border border-rose-500/40 bg-rose-600/15 text-rose-400 text-2xl font-black hover:bg-rose-600 hover:text-white transition-colors flex items-center justify-center gap-3 font-display"
                >
                  <AlertTriangle size={28} /> E-STOP
                </button>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 min-w-0 flex flex-col p-3 sm:p-4 md:p-6 overflow-y-visible md:overflow-y-auto h-auto md:h-screen custom-scrollbar z-10 relative">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 md:mb-5 shrink-0">
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white font-display uppercase">
                CNC TELEMETRÍA, VISIÓN & PROTOTIPADO XR
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={toggleKioskMode}
                className="px-3.5 py-2 rounded-lg font-medium text-xs flex items-center gap-2 transition-colors border bg-[#0f1623] text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
              >
                <MonitorSmartphone size={15} />
                MODO KIOSCO
              </button>
              <button
                onClick={() => setArModeActive(!arModeActive)}
                className={`px-3.5 py-2 rounded-lg font-medium text-xs flex items-center gap-2 transition-colors border ${
                  arModeActive
                    ? "bg-blue-600 text-white border-blue-500"
                    : "bg-[#0f1623] text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
                }`}
              >
                <Activity size={15} />
                {arModeActive ? "AR SIN FONDO ACTIVO" : "ACTIVAR AR CÁMARA"}
              </button>
              <button
                onClick={fetchAiAnalysis}
                disabled={loadingAi}
                className="bg-[#0f1623] hover:bg-slate-800 border border-slate-800 px-3.5 py-2 rounded-lg font-medium text-xs text-blue-400 flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <Cpu size={15} />
                {loadingAi ? "ANALIZANDO..." : "ANÁLISIS IA"}
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

            {activeView === "usb_workbench" && <SerialWorkbenchView />}

            {activeView === "mobile_sensors" && (
              <div className="xl:col-span-3 flex flex-col gap-5 pb-24">
                <MobileSensorsPanel />
                <PinoutDigitalTwin
                  boardId={pinoutBoardId}
                  onBoardChange={setPinoutBoardId}
                  isConnected={hardware.isSerialConnected()}
                />
              </div>
            )}

            {activeView === "thermal_imaging" && <ThermalImagingView />}

            {activeView === "plasma_cutting" && <PlasmaCuttingView />}

            {activeView === "predictive_maint" && <PredictiveMaintenanceView />}

            {activeView === "assembly_lab" && (
              <AssemblyLab onOpenCodeLibrary={() => setActiveView("code_library")} />
            )}

            {activeView === "code_library" && <CodeLibraryView />}

            {activeView === "ai_models" && (
              <div className="xl:col-span-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <LocalModelManager />
                  <VisionTest />
                </div>
              </div>
            )}

            {activeView === "awareness" && (
              <div className="xl:col-span-3">
                <AwarenessPanel />
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
      className={`w-max md:w-full flex shrink-0 items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs transition-colors border font-mono font-medium tracking-wide ${
        active
          ? "bg-blue-600/15 text-white border-blue-500/50"
          : "text-slate-400 border-transparent hover:bg-slate-900 hover:text-slate-200"
      }`}
    >
      <span className={active ? "text-blue-400" : "text-slate-500"}>{icon}</span>
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
  value: number | null;
  max: number;
  unit: string;
  isCritical: boolean;
}) {
  const numericVal = typeof value === "number" && Number.isFinite(value) ? value : null;
  const percentage =
    numericVal !== null ? Math.min(100, Math.max(0, (numericVal / max) * 100)) : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-end">
        <span className="text-xs font-bold tracking-widest text-slate-400 font-mono">
          {label}
        </span>
        <span
          className={`text-4xl font-display font-bold tracking-tight tabular-nums ${
            isCritical ? "text-rose-400" : "text-slate-100"
          }`}
        >
          {numericVal !== null ? numericVal.toFixed(1) : "---"}
          <span className="text-2xl ml-1 text-slate-500 font-sans tracking-normal">
            {unit}
          </span>
        </span>
      </div>
      <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-out ${
            isCritical ? "bg-rose-500" : "bg-blue-500"
          }`}
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
      className={`px-2 py-1.5 rounded text-[10px] font-mono font-semibold border transition-colors ${
        active
          ? "bg-blue-600/20 border-blue-500/60 text-blue-200"
          : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
      }`}
    >
      {label}
    </button>
  );
}
