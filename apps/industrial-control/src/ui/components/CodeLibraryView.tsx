import { useMemo, useState } from "react";
import {
  Code2,
  Copy,
  Check,
  Download,
  Search,
  Cpu,
  Box,
  Terminal,
  Wifi,
} from "lucide-react";
import { useAssemblyStore, AssemblyNode } from "../../store/assemblyStore";

type SnippetCategory = "all" | "dynamic" | "threejs" | "arduino" | "gcode" | "serial_mqtt";

interface CodeSnippet {
  id: string;
  title: string;
  category: Exclude<SnippetCategory, "all">;
  language: string;
  filename: string;
  description: string;
  code: string;
}

function buildDynamicKinematicsTS(nodes: AssemblyNode[]): string {
  const active = nodes.filter((n) => n.automation.enabled && n.automation.mode !== "static");
  return `// Generado automáticamente desde tu escena 3D actual (${nodes.length} piezas)
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function useAssemblyKinematics(refs: Record<string, THREE.Group | null>) {
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
${active
  .map((n) => {
    const a = n.automation;
    const dir = a.inverted ? -1 : 1;
    if (a.mode === "rotate") {
      return `    if (refs["${n.id}"]) refs["${n.id}"]!.rotation.${a.axis} = (t * ${a.speed.toFixed(2)} + ${a.phase.toFixed(2)}) * ${dir};`;
    }
    if (a.mode === "oscillate") {
      return `    if (refs["${n.id}"]) refs["${n.id}"]!.rotation.${a.axis} = THREE.MathUtils.degToRad(${a.amplitude}) * Math.sin(t * ${a.speed.toFixed(2)} + ${a.phase.toFixed(2)}) * ${dir};`;
    }
    if (a.mode === "translate") {
      return `    if (refs["${n.id}"]) refs["${n.id}"]!.position.${a.axis} = Math.sin(t * ${a.speed.toFixed(2)} + ${a.phase.toFixed(2)}) * ${a.amplitude.toFixed(2)} * ${dir};`;
    }
    return `    if (refs["${n.id}"]) {
      refs["${n.id}"]!.rotation.${a.axis} = t * ${(a.speed * 1.6).toFixed(2)} * ${dir};
      refs["${n.id}"]!.position.${a.axis} = Math.sin(t * ${a.speed.toFixed(2)} + ${a.phase.toFixed(2)}) * ${a.amplitude.toFixed(2)} * ${dir};
    }`;
  })
  .join("\n")}
  });
}`;
}

function buildDynamicGCode(nodes: AssemblyNode[]): string {
  const lines = [
    "; Secuencia G-Code generada desde Ensamblaje 3D",
    "G21 ; Unidades en milímetros",
    "G90 ; Posicionamiento absoluto",
    "G28 ; Homing de ejes X Y Z",
    "M3 S12000 ; Activar husillo",
  ];
  nodes.forEach((n, idx) => {
    const x = (n.position[0] * 100).toFixed(2);
    const y = (n.position[2] * 100).toFixed(2);
    const z = (n.position[1] * 100).toFixed(2);
    lines.push(`; Nodo ${idx + 1}: ${n.label} (${n.automation.mode})`);
    lines.push(`G01 X${x} Y${y} Z${z} F${Math.round(n.automation.speed * 800)}`);
  });
  lines.push("M5 ; Detener husillo", "M30 ; Fin de programa");
  return lines.join("\n");
}

const STATIC_SNIPPETS: CodeSnippet[] = [
  {
    id: "three-alpha-xr",
    title: "Three.js Canvas Sin Fondo + WebXR AR",
    category: "threejs",
    language: "tsx",
    filename: "TransparentXRScene.tsx",
    description:
      "Configuración de renderer WebGL con alpha transparente sobre video de cámara en vivo y sesión WebXR.",
    code: `import { Canvas } from "@react-three/fiber";

export function TransparentXRScene({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full h-full">
      <video autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover z-0" />
      <Canvas
        className="relative z-10"
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          gl.xr.enabled = true;
          gl.setClearColor(0x000000, 0); // Fondo 100% transparente
        }}
      >
        {children}
      </Canvas>
    </div>
  );
}`,
  },
  {
    id: "arduino-stepper-cnc",
    title: "Control Paso a Paso Dual (Traslación + Rotación)",
    category: "arduino",
    language: "cpp",
    filename: "cnc_dual_axis.ino",
    description:
      "Firmware base para drivers A4988/TMC2209 con comandos seriales STEP_X, ROT_Y y paro E-STOP.",
    code: `#include <AccelStepper.h>

AccelStepper axisX(AccelStepper::DRIVER, 2, 5); // STEP=2, DIR=5
AccelStepper rotaryY(AccelStepper::DRIVER, 3, 6);

void setup() {
  Serial.begin(115200);
  axisX.setMaxSpeed(1200);
  axisX.setAcceleration(600);
  rotaryY.setMaxSpeed(800);
  rotaryY.setAcceleration(400);
  Serial.println("DUAL_AXIS_READY");
}

void loop() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\\n');
    cmd.trim();
    if (cmd.startsWith("X")) axisX.moveTo(cmd.substring(1).toInt());
    if (cmd.startsWith("R")) rotaryY.moveTo(cmd.substring(1).toInt());
    if (cmd == "STOP") { axisX.stop(); rotaryY.stop(); }
  }
  axisX.run();
  rotaryY.run();
}`,
  },
  {
    id: "webserial-bridge",
    title: "Puente Web Serial API (Navegador → Arduino)",
    category: "serial_mqtt",
    language: "ts",
    filename: "webSerialBridge.ts",
    description: "Conexión USB directa a 115200 baudios sin servidores intermedios.",
    code: `export async function sendSerialGCode(command: string) {
  const nav = navigator as Navigator & { serial?: any };
  if (!nav.serial) throw new Error("Web Serial no soportado en este navegador");

  const port = await nav.serial.requestPort();
  await port.open({ baudRate: 115200 });

  const writer = port.writable.getWriter();
  const payload = new TextEncoder().encode(command.trim() + "\\n");
  await writer.write(payload);
  writer.releaseLock();
}`,
  },
  {
    id: "rgb-grayscale-filter",
    title: "Filtro Rápido Matiz Grisáceo & Hotspot Térmico",
    category: "threejs",
    language: "ts",
    filename: "thermalGrayFilter.ts",
    description: "Kernel de buffer ImageData para aislar picos térmicos sobre fondo grisáceo.",
    code: `export function applyGrayHotspotFilter(data: Uint8ClampedArray, threshold = 185) {
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum >= threshold) {
      data[i] = 255;
      data[i + 1] = Math.max(0, 255 - (lum - threshold) * 2.5);
      data[i + 2] = 20;
    } else {
      const g = lum * 0.88;
      data[i] = g * 0.96;
      data[i + 1] = g * 0.99;
      data[i + 2] = Math.min(255, g * 1.04);
    }
  }
}`,
  },
];

export function CodeLibraryView() {
  const { nodes } = useAssemblyStore();
  const [category, setCategory] = useState<SnippetCategory>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>("dyn-kinematics");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const snippets: CodeSnippet[] = useMemo(() => {
    const dynamicSnippets: CodeSnippet[] = [
      {
        id: "dyn-kinematics",
        title: "Cinemática Ejes 3D (Escena Actual)",
        category: "dynamic",
        language: "tsx",
        filename: "useAssemblyKinematics.ts",
        description:
          "Hook React Three Fiber generado en tiempo real según tus piezas y automatizaciones activas.",
        code: buildDynamicKinematicsTS(nodes),
      },
      {
        id: "dyn-gcode",
        title: "Secuencia G-Code de Ensamblaje Actual",
        category: "dynamic",
        language: "gcode",
        filename: "assembly_sequence.gcode",
        description: "Trayectoria CNC calculada desde las coordenadas actuales del taller XR.",
        code: buildDynamicGCode(nodes),
      },
    ];
    return [...dynamicSnippets, ...STATIC_SNIPPETS];
  }, [nodes]);

  const filtered = snippets.filter((s) => {
    const matchCat = category === "all" || s.category === category;
    const matchSearch =
      !search.trim() ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const activeSnippet =
    filtered.find((s) => s.id === selectedId) || filtered[0] || snippets[0];

  const handleCopy = (snippet: CodeSnippet) => {
    navigator.clipboard.writeText(snippet.code);
    setCopiedId(snippet.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleDownload = (snippet: CodeSnippet) => {
    const blob = new Blob([snippet.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = snippet.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="xl:col-span-3 flex flex-col gap-5 h-[calc(100vh-120px)] min-h-[580px]">
      {/* Header & Search */}
      <div className="glass-panel p-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
            <Code2 size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">
              LIBRERÍA DE CÓDIGO INDUSTRIAL & XR
            </h2>
            <p className="text-[11px] font-mono text-slate-400">
              Generación viva desde tu escena 3D + plantillas listas para copiar o descargar
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar snippet..."
              className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2 shrink-0">
        {(
          [
            ["all", "Todos"],
            ["dynamic", "Dinámico (Escena 3D)"],
            ["threejs", "Three.js & WebXR"],
            ["arduino", "Arduino / Stepper"],
            ["serial_mqtt", "Web Serial & Filtros"],
          ] as [SnippetCategory, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
              category === key
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Master-Detail Code Browser */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">
        {/* Left List */}
        <div className="glass-panel p-3 overflow-y-auto custom-scrollbar space-y-2">
          {filtered.map((s) => {
            const isSel = activeSnippet?.id === s.id;
            const Icon =
              s.category === "dynamic"
                ? Box
                : s.category === "arduino"
                ? Cpu
                : s.category === "serial_mqtt"
                ? Wifi
                : Terminal;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  isSel
                    ? "bg-blue-600/20 border-blue-500 text-white"
                    : "bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <Icon size={13} className="text-blue-400 shrink-0" />
                    {s.title}
                  </span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {s.language}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">{s.description}</p>
              </button>
            );
          })}
        </div>

        {/* Right Code Viewer */}
        {activeSnippet && (
          <div className="lg:col-span-2 glass-panel flex flex-col min-h-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div>
                <div className="text-sm font-semibold text-white">{activeSnippet.title}</div>
                <div className="text-[11px] font-mono text-slate-400">
                  {activeSnippet.filename} • {activeSnippet.description}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(activeSnippet)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-white transition-colors"
                >
                  {copiedId === activeSnippet.id ? (
                    <>
                      <Check size={13} className="text-emerald-400" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy size={13} /> Copiar
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDownload(activeSnippet)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-mono text-white transition-colors"
                >
                  <Download size={13} /> Descargar
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-4 bg-[#060910] font-mono text-xs text-emerald-300 leading-relaxed">
              <pre className="whitespace-pre-wrap">{activeSnippet.code}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
