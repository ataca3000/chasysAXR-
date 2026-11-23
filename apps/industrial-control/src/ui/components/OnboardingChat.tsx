import { useState } from "react";
import {
  Cpu,
  Check,
  ChevronRight,
  X,
  Boxes,
  Thermometer,
  Activity,
  Gauge,
  Camera,
  Sliders,
  Sparkles,
} from "lucide-react";
import { assemblyStore } from "../../store/assemblyStore";

export interface MachineProfile {
  machineType: "cnc" | "plasma" | "laser" | "other" | null;
  machineName: string;
  sensors: string[];
  description: string;
  hasArduino: boolean;
  preset?: "cnc_gantry" | "arm_3dof" | "rotary_station";
  aiMode?: "gemini" | "ollama" | "hybrid";
  completed: boolean;
}

interface OnboardingChatProps {
  onComplete: (profile: MachineProfile) => void;
  onSkip: () => void;
}

const MACHINE_PRESETS: Array<{
  type: "cnc" | "plasma" | "laser" | "other";
  preset: "cnc_gantry" | "arm_3dof" | "rotary_station";
  label: string;
  subtitle: string;
  defaultSensors: string[];
}> = [
  {
    type: "cnc",
    preset: "cnc_gantry",
    label: "Pórtico CNC / Fresadora",
    subtitle: "Ejes lineales X/Y/Z + cabezal helicoidal",
    defaultSensors: ["thermal", "vibration", "load"],
  },
  {
    type: "other",
    preset: "arm_3dof",
    label: "Brazo Robótico 3-DOF",
    subtitle: "Articulaciones rotatorias + servo muñeca",
    defaultSensors: ["load", "vibration", "thermal"],
  },
  {
    type: "plasma",
    preset: "rotary_station",
    label: "Estación Rotatoria / Plasma",
    subtitle: "Mesa indexada 360° + actuador lineal",
    defaultSensors: ["thermal", "pressure", "flow"],
  },
  {
    type: "laser",
    preset: "cnc_gantry",
    label: "Cortadora Láser / Prototipo XR",
    subtitle: "Control de ejes con cámara sin fondo",
    defaultSensors: ["thermal", "camera"],
  },
];

const SENSOR_OPTIONS = [
  { id: "thermal", label: "Térmico IR", desc: "Temperatura en tiempo real", icon: Thermometer },
  { id: "vibration", label: "Acelerómetro", desc: "Vibración y desgaste", icon: Activity },
  { id: "load", label: "Carga / Torque", desc: "Esfuerzo de actuadores", icon: Gauge },
  { id: "flow", label: "Caudal / Presión", desc: "Refrigerante o gas", icon: Sliders },
  { id: "camera", label: "Cámara AR / RGB", desc: "Superposición XR sin fondo", icon: Camera },
];

export function OnboardingChat({ onComplete, onSkip }: OnboardingChatProps) {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [machineName, setMachineName] = useState("Célula Prototipo 01");
  const [hasArduino, setHasArduino] = useState(true);
  const [aiMode, setAiMode] = useState<"gemini" | "ollama" | "hybrid">("hybrid");
  const [sensors, setSensors] = useState<string[]>(["thermal", "vibration", "load", "camera"]);

  const activePreset = MACHINE_PRESETS[selectedPresetIdx];

  const toggleSensor = (id: string) => {
    setSensors((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleSelectMachine = (idx: number) => {
    setSelectedPresetIdx(idx);
    setSensors(MACHINE_PRESETS[idx].defaultSensors);
  };

  const handleFinish = () => {
    assemblyStore.loadPreset(activePreset.preset);
    onComplete({
      machineType: activePreset.type,
      machineName: machineName.trim() || activePreset.label,
      sensors,
      description: `${machineName} (${activePreset.label}) — Control: ${hasArduino ? "Arduino/WebSerial" : "Simulación"}`,
      hasArduino,
      preset: activePreset.preset,
      aiMode,
      completed: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070b12] text-slate-200 flex flex-col overflow-y-auto">
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#0f1623] px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
            <Cpu size={20} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">
              BIENVENIDO A 1/0 iAGNT // CONFIGURACIÓN INICIAL
            </h1>
            <p className="text-xs font-mono text-slate-400">
              Prepara tu estructura 3D, ejes automatizados, sensores y controlador antes de entrar al panel
            </p>
          </div>
        </div>

        <button
          onClick={onSkip}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs font-mono text-slate-300 hover:text-white transition-colors"
        >
          <span>Saltar al Panel</span>
          <X size={14} />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: Guided Configuration Steps */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Structure & Machine Preset */}
          <section className="bg-[#0f1623] border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
                1. Estructura Base & Cinemática Inicial
              </h2>
              <span className="text-[11px] font-mono text-slate-400">Se carga en Estudio XR/3D</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {MACHINE_PRESETS.map((item, idx) => {
                const selected = idx === selectedPresetIdx;
                return (
                  <button
                    key={item.label}
                    onClick={() => handleSelectMachine(idx)}
                    className={`p-3.5 rounded-xl border text-left transition-colors flex items-start gap-3 ${
                      selected
                        ? "bg-blue-600/15 border-blue-500 text-white"
                        : "bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <Boxes
                      size={18}
                      className={`mt-0.5 shrink-0 ${selected ? "text-blue-400" : "text-slate-500"}`}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{item.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{item.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5">
                Nombre o Identificador de Estación
              </label>
              <input
                type="text"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                placeholder="Ej. Fresadora Prototipo X1"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </section>

          {/* Step 2: Multi-select Sensors */}
          <section className="bg-[#0f1623] border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
                2. Sensores y Visión Activos (Selección Múltiple)
              </h2>
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                {sensors.length} seleccionados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {SENSOR_OPTIONS.map((sensor) => {
                const active = sensors.includes(sensor.id);
                const Icon = sensor.icon;
                return (
                  <button
                    key={sensor.id}
                    onClick={() => toggleSensor(sensor.id)}
                    className={`p-3 rounded-xl border text-left transition-colors flex flex-col gap-1.5 ${
                      active
                        ? "bg-emerald-500/10 border-emerald-500/60 text-white"
                        : "bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon size={15} className={active ? "text-emerald-400" : "text-slate-500"} />
                      {active && <Check size={14} className="text-emerald-400" />}
                    </div>
                    <div className="text-xs font-semibold text-slate-100">{sensor.label}</div>
                    <div className="text-[11px] text-slate-400">{sensor.desc}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 3: Controller & AI Mode */}
          <section className="bg-[#0f1623] border border-slate-800 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h2 className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider mb-2.5">
                3. Enlace de Hardware
              </h2>
              <div className="space-y-2">
                <button
                  onClick={() => setHasArduino(true)}
                  className={`w-full p-2.5 rounded-lg border text-left text-xs transition-colors ${
                    hasArduino
                      ? "bg-blue-600/15 border-blue-500 text-white"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                >
                  <div className="font-semibold">Arduino / ESP32 / PLC (Web Serial)</div>
                  <div className="text-[11px] text-slate-400">Habilita exportación de firmware y puerto USB</div>
                </button>
                <button
                  onClick={() => setHasArduino(false)}
                  className={`w-full p-2.5 rounded-lg border text-left text-xs transition-colors ${
                    !hasArduino
                      ? "bg-blue-600/15 border-blue-500 text-white"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                >
                  <div className="font-semibold">Solo Gemelo Digital & Prototipado</div>
                  <div className="text-[11px] text-slate-400">Simulación de ejes sin placa física conectada</div>
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider mb-2.5">
                4. Motor de Análisis IA
              </h2>
              <div className="space-y-2">
                {(
                  [
                    ["hybrid", "Híbrido (Cloud + Local)", "Máxima disponibilidad automática"],
                    ["gemini", "Gemini Cloud API", "Análisis espacial y visión avanzada"],
                    ["ollama", "Ollama Local (Port 11434)", "Ejecución 100% privada en red local"],
                  ] as const
                ).map(([key, title, desc]) => (
                  <button
                    key={key}
                    onClick={() => setAiMode(key)}
                    className={`w-full p-2 rounded-lg border text-left text-xs transition-colors ${
                      aiMode === key
                        ? "bg-blue-600/15 border-blue-500 text-white"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      <Sparkles size={12} className="text-blue-400" /> {title}
                    </div>
                    <div className="text-[11px] text-slate-400">{desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Live Configuration Preview */}
        <aside className="bg-[#0f1623] border border-slate-800 rounded-xl p-5 flex flex-col gap-4 sticky top-6">
          <div className="border-b border-slate-800 pb-3">
            <div className="text-[11px] font-mono text-blue-400 uppercase tracking-wider">
              Resumen de Perfil
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5">
              {machineName.trim() || "Sin nombre"}
            </h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Estructura 3D</span>
              <span className="text-white text-right">{activePreset.label}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Controlador</span>
              <span className="text-emerald-400">
                {hasArduino ? "Arduino / WebSerial" : "Modo Virtual"}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Backend IA</span>
              <span className="text-cyan-300 uppercase">{aiMode}</span>
            </div>
            <div className="pt-1">
              <span className="text-slate-400 block mb-2">Sensores Habilitados</span>
              <div className="flex flex-wrap gap-1.5">
                {sensors.length > 0 ? (
                  sensors.map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 text-[11px]"
                    >
                      {s.toUpperCase()}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500">Ninguno</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleFinish}
            className="mt-2 w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg"
          >
            <span>Aplicar y Abrir Estudio</span>
            <ChevronRight size={16} />
          </button>

          <button
            onClick={onSkip}
            className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
          >
            Continuar con configuración por defecto
          </button>
        </aside>
      </div>
    </div>
  );
}