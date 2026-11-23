import { useEffect, useRef, useState } from "react";
import {
  Thermometer,
  Camera,
  Sliders,
  Sparkles,
  Flame,
  Eye,
  RotateCcw,
} from "lucide-react";

type FilterCapId =
  | "grayscale_tint"
  | "thermal_ironbow"
  | "thermal_arctic"
  | "hotspot_gray"
  | "rgb_red"
  | "rgb_green"
  | "rgb_blue"
  | "rgb_custom";

interface FilterCapDef {
  id: FilterCapId;
  label: string;
  shortDesc: string;
  r: number;
  g: number;
  b: number;
  grayMix: number; // 0..1
  contrast: number;
  mode: "rgb_gray" | "ironbow" | "arctic" | "hotspot_gray";
}

const FILTER_CAPS: FilterCapDef[] = [
  {
    id: "grayscale_tint",
    label: "Matiz Grisáceo",
    shortDesc: "Desaturado técnico neutro",
    r: 1.0,
    g: 1.0,
    b: 1.05,
    grayMix: 0.92,
    contrast: 1.15,
    mode: "rgb_gray",
  },
  {
    id: "thermal_ironbow",
    label: "Térmico Ironbow",
    shortDesc: "Mapa infrarrojo FLIR",
    r: 1.0,
    g: 1.0,
    b: 1.0,
    grayMix: 0,
    contrast: 1.1,
    mode: "ironbow",
  },
  {
    id: "hotspot_gray",
    label: "Grisáceo + Hotspot",
    shortDesc: "Fondo gris con picos de calor",
    r: 1.0,
    g: 1.0,
    b: 1.0,
    grayMix: 0.95,
    contrast: 1.1,
    mode: "hotspot_gray",
  },
  {
    id: "thermal_arctic",
    label: "Térmico Ártico",
    shortDesc: "Gradiente frío/cian/blanco",
    r: 1.0,
    g: 1.0,
    b: 1.0,
    grayMix: 0,
    contrast: 1.15,
    mode: "arctic",
  },
  {
    id: "rgb_red",
    label: "Filtro R (Rojo)",
    shortDesc: "Aislamiento canal rojo",
    r: 1.6,
    g: 0.15,
    b: 0.15,
    grayMix: 0,
    contrast: 1.2,
    mode: "rgb_gray",
  },
  {
    id: "rgb_green",
    label: "Filtro G (Verde)",
    shortDesc: "Aislamiento canal verde",
    r: 0.15,
    g: 1.6,
    b: 0.15,
    grayMix: 0,
    contrast: 1.2,
    mode: "rgb_gray",
  },
  {
    id: "rgb_blue",
    label: "Filtro B (Azul)",
    shortDesc: "Aislamiento canal azul",
    r: 0.15,
    g: 0.2,
    b: 1.65,
    grayMix: 0,
    contrast: 1.2,
    mode: "rgb_gray",
  },
  {
    id: "rgb_custom",
    label: "RGB Manual",
    shortDesc: "Ajuste fino R/G/B + matiz",
    r: 1.0,
    g: 1.0,
    b: 1.0,
    grayMix: 0.35,
    contrast: 1.05,
    mode: "rgb_gray",
  },
];

function ironbowLut(v: number): [number, number, number] {
  if (v < 64) return [v * 1.4, 8, Math.min(255, 60 + v * 2.2)];
  if (v < 128) {
    const t = (v - 64) / 64;
    return [90 + t * 140, 8 + t * 35, 200 - t * 110];
  }
  if (v < 196) {
    const t = (v - 128) / 68;
    return [230 + t * 25, 43 + t * 145, 90 - t * 75];
  }
  const t = (v - 196) / 59;
  return [255, 188 + t * 67, 15 + t * 225];
}

function arcticLut(v: number): [number, number, number] {
  if (v < 85) {
    const t = v / 85;
    return [8, 20 + t * 65, 60 + t * 140];
  }
  if (v < 175) {
    const t = (v - 85) / 90;
    return [8 + t * 60, 85 + t * 135, 200 + t * 45];
  }
  const t = (v - 175) / 80;
  return [68 + t * 187, 220 + t * 35, 245 + t * 10];
}

export function ThermalImagingView() {
  const [activeCap, setActiveCap] = useState<FilterCapId>("grayscale_tint");
  const [rGain, setRGain] = useState(1.0);
  const [gGain, setGGain] = useState(1.0);
  const [bGain, setBGain] = useState(1.05);
  const [grayMix, setGrayMix] = useState(0.92);
  const [contrast, setContrast] = useState(1.15);
  const [hotspotThreshold, setHotspotThreshold] = useState(185);
  const [useLiveCamera, setUseLiveCamera] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<string>("Simulador Térmico Activo");

  const [probeTemp, setProbeTemp] = useState<number>(64.2);
  const [zoneStats, setZoneStats] = useState({
    spindle: 618,
    motorZ: 92,
    coolant: 38,
    psu: 49,
    hotspotPct: 4.2,
  });

  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const settingsRef = useRef({
    activeCap,
    rGain,
    gGain,
    bGain,
    grayMix,
    contrast,
    hotspotThreshold,
    useLiveCamera,
  });

  useEffect(() => {
    settingsRef.current = {
      activeCap,
      rGain,
      gGain,
      bGain,
      grayMix,
      contrast,
      hotspotThreshold,
      useLiveCamera,
    };
  }, [activeCap, rGain, gGain, bGain, grayMix, contrast, hotspotThreshold, useLiveCamera]);

  const applyCap = (cap: FilterCapDef) => {
    setActiveCap(cap.id);
    setRGain(cap.r);
    setGGain(cap.g);
    setBGain(cap.b);
    setGrayMix(cap.grayMix);
    setContrast(cap.contrast);
  };

  // Manage live camera toggle
  useEffect(() => {
    let cancelled = false;
    const stopStream = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    if (!useLiveCamera) {
      stopStream();
      setCameraStatus("Simulador Térmico Activo");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("Cámara no soportada — usando simulador");
      setUseLiveCamera(false);
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment", width: { ideal: 640 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraStatus("Cámara en Vivo + Filtrado RGB");
      })
      .catch(() => {
        setCameraStatus("Sin acceso a cámara — modo simulador");
        setUseLiveCamera(false);
      });

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [useLiveCamera]);

  // Real-time pixel pipeline loop
  useEffect(() => {
    const W = 320;
    const H = 200;
    if (!offscreenCanvasRef.current) {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      offscreenCanvasRef.current = c;
    }
    const offscreen = offscreenCanvasRef.current;
    const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
    const dispCanvas = displayCanvasRef.current;
    const dispCtx = dispCanvas?.getContext("2d");
    if (!offCtx || !dispCtx || !dispCanvas) return;

    let rafId = 0;
    let time = 0;
    let statTick = 0;

    const renderFrame = () => {
      time += 0.03;
      const cfg = settingsRef.current;
      const capDef = FILTER_CAPS.find((c) => c.id === cfg.activeCap) || FILTER_CAPS[0];

      // 1. Acquire source frame (live video or animated thermal industrial scene)
      const video = videoRef.current;
      if (cfg.useLiveCamera && video && video.readyState >= 2) {
        offCtx.drawImage(video, 0, 0, W, H);
      } else {
        // Draw procedural CNC spindle + rails + moving thermal hotspot
        offCtx.fillStyle = "#182230";
        offCtx.fillRect(0, 0, W, H);

        // Background frame girders
        offCtx.fillStyle = "#2b394d";
        offCtx.fillRect(28, 22, 264, 24);
        offCtx.fillRect(36, 22, 22, 155);
        offCtx.fillRect(262, 22, 22, 155);
        offCtx.fillStyle = "#3a4b63";
        offCtx.fillRect(25, 165, 270, 18);

        // Moving carriage + spindle hotspot
        const cx = 160 + Math.sin(time * 0.9) * 65;
        const cy = 96 + Math.cos(time * 0.6) * 14;

        const g1 = offCtx.createRadialGradient(cx, cy, 4, cx, cy, 58);
        g1.addColorStop(0, "rgba(255, 245, 220, 1)");
        g1.addColorStop(0.28, "rgba(245, 130, 45, 0.92)");
        g1.addColorStop(0.65, "rgba(180, 50, 70, 0.55)");
        g1.addColorStop(1, "rgba(24, 34, 48, 0)");
        offCtx.fillStyle = g1;
        offCtx.beginPath();
        offCtx.arc(cx, cy, 58, 0, Math.PI * 2);
        offCtx.fill();

        // Secondary motor heat signature
        const g2 = offCtx.createRadialGradient(54, 40, 2, 54, 40, 32);
        g2.addColorStop(0, "rgba(255, 190, 110, 0.9)");
        g2.addColorStop(0.6, "rgba(140, 65, 90, 0.45)");
        g2.addColorStop(1, "rgba(24, 34, 48, 0)");
        offCtx.fillStyle = g2;
        offCtx.beginPath();
        offCtx.arc(54, 40, 32, 0, Math.PI * 2);
        offCtx.fill();
      }

      // 2. Fast pixel buffer RGB / grayscale / thermal LUT pass
      const imgData = offCtx.getImageData(0, 0, W, H);
      const data = imgData.data;
      let hotCount = 0;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i] * cfg.rGain;
        let g = data[i + 1] * cfg.gGain;
        let b = data[i + 2] * cfg.bGain;

        // Contrast centered around 128
        r = (r - 128) * cfg.contrast + 128;
        g = (g - 128) * cfg.contrast + 128;
        b = (b - 128) * cfg.contrast + 128;

        const lum = Math.max(0, Math.min(255, 0.299 * r + 0.587 * g + 0.114 * b));
        if (lum >= cfg.hotspotThreshold) hotCount++;

        if (capDef.mode === "ironbow") {
          const [lr, lg, lb] = ironbowLut(lum);
          data[i] = lr;
          data[i + 1] = lg;
          data[i + 2] = lb;
        } else if (capDef.mode === "arctic") {
          const [lr, lg, lb] = arcticLut(lum);
          data[i] = lr;
          data[i + 1] = lg;
          data[i + 2] = lb;
        } else if (capDef.mode === "hotspot_gray") {
          if (lum >= cfg.hotspotThreshold) {
            const [lr, lg, lb] = ironbowLut(lum);
            data[i] = lr;
            data[i + 1] = lg;
            data[i + 2] = lb;
          } else {
            const gray = lum * 0.88;
            data[i] = gray * 0.96;
            data[i + 1] = gray * 0.98;
            data[i + 2] = Math.min(255, gray * 1.04);
          }
        } else {
          // rgb_gray: mix RGB gains with grayscale tint ("matiz grisáceo")
          const mix = cfg.grayMix;
          const outR = r * (1 - mix) + lum * mix * 0.97;
          const outG = g * (1 - mix) + lum * mix * 0.99;
          const outB = b * (1 - mix) + lum * mix * 1.04;
          data[i] = Math.max(0, Math.min(255, outR));
          data[i + 1] = Math.max(0, Math.min(255, outG));
          data[i + 2] = Math.max(0, Math.min(255, outB));
        }
      }

      offCtx.putImageData(imgData, 0, 0);
      dispCtx.imageSmoothingEnabled = true;
      dispCtx.drawImage(offscreen, 0, 0, dispCanvas.width, dispCanvas.height);

      statTick++;
      if (statTick % 24 === 0) {
        const pct = (hotCount / (W * H)) * 100;
        setZoneStats({
          spindle: Math.round(590 + Math.sin(time * 0.7) * 45 + pct * 6),
          motorZ: Math.round(88 + Math.cos(time * 0.5) * 8),
          coolant: Math.round(37 + Math.sin(time * 0.3) * 2),
          psu: Math.round(48 + Math.cos(time * 0.4) * 3),
          hotspotPct: Number(pct.toFixed(1)),
        });
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleCanvasPointerMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    const offscreen = offscreenCanvasRef.current;
    if (!canvas || !offscreen) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * offscreen.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * offscreen.height);
    const ctx = offscreen.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const px = ctx.getImageData(
      Math.max(0, Math.min(offscreen.width - 1, x)),
      Math.max(0, Math.min(offscreen.height - 1, y)),
      1,
      1,
    ).data;
    const lum = 0.299 * px[0] + 0.587 * px[1] + 0.114 * px[2];
    setProbeTemp(Number((22 + (lum / 255) * 640).toFixed(1)));
  };

  return (
    <div className="xl:col-span-3 flex flex-col gap-5">
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      {/* Top Quick Filter Caps Bar */}
      <div className="glass-panel p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <Thermometer size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide uppercase">
                VISIÓN TÉRMICA & FILTRADO RGB RÁPIDO
              </h2>
              <p className="text-[11px] font-mono text-slate-400">
                Caps instantáneos • Matiz grisáceo técnico • Detección de hotspots
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
              {cameraStatus}
            </span>
            <button
              onClick={() => setUseLiveCamera(!useLiveCamera)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-colors ${
                useLiveCamera
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-slate-900 border-slate-700 text-slate-200 hover:border-blue-500"
              }`}
            >
              <Camera size={14} />
              {useLiveCamera ? "Usar Simulador" : "Cámara en Vivo"}
            </button>
          </div>
        </div>

        {/* Fast Filter Caps Row */}
        <div className="flex flex-wrap gap-2">
          {FILTER_CAPS.map((cap) => {
            const active = activeCap === cap.id;
            return (
              <button
                key={cap.id}
                onClick={() => applyCap(cap)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1.5 ${
                  active
                    ? "bg-blue-600 border-blue-400 text-white shadow-sm"
                    : "bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white"
                }`}
                title={cap.shortDesc}
              >
                {cap.mode === "ironbow" || cap.mode === "hotspot_gray" ? (
                  <Flame size={12} className={active ? "text-amber-300" : "text-rose-400"} />
                ) : cap.id === "grayscale_tint" ? (
                  <Eye size={12} className="text-slate-300" />
                ) : (
                  <Sparkles size={12} />
                )}
                <span>{cap.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split: Processed Viewport + Fine RGB/Grayscale Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glass-panel p-4 flex flex-col gap-3">
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black aspect-[16/10]">
            <canvas
              ref={displayCanvasRef}
              width={640}
              height={400}
              onMouseMove={handleCanvasPointerMove}
              className="w-full h-full object-cover cursor-crosshair"
            />
            <div className="absolute top-3 left-3 bg-slate-950/90 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 flex items-center gap-3">
              <span>
                CAP:{" "}
                <strong className="text-blue-400">
                  {FILTER_CAPS.find((c) => c.id === activeCap)?.label}
                </strong>
              </span>
              <span className="text-slate-600">|</span>
              <span className="tabular-nums">
                SONDA PUNTERO: <strong className="text-amber-400">{probeTemp} °C</strong>
              </span>
            </div>
            <div className="absolute bottom-3 right-3 bg-slate-950/90 border border-slate-700/80 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-300 tabular-nums">
              Hotspot área: {zoneStats.hotspotPct}%
            </div>
          </div>

          {/* Thermal Palette Legend */}
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span>20 °C</span>
            <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-slate-800 via-indigo-600 via-rose-500 to-amber-200" />
            <span>680 °C+</span>
          </div>
        </div>

        {/* Right Controls: RGB Channels + Matiz Grisáceo + Thermal Zones */}
        <div className="flex flex-col gap-5">
          <div className="glass-panel p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-1.5">
                <Sliders size={13} className="text-blue-400" /> Ajuste RGB & Matiz Grisáceo
              </h3>
              <button
                onClick={() => applyCap(FILTER_CAPS[0])}
                className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RotateCcw size={10} /> Reset
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">Matiz Grisáceo (Desaturación)</span>
                  <span className="text-white tabular-nums">{Math.round(grayMix * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={grayMix}
                  onChange={(e) => {
                    setGrayMix(parseFloat(e.target.value));
                    if (activeCap !== "hotspot_gray") setActiveCap("rgb_custom");
                  }}
                  className="w-full accent-slate-400"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-rose-400">Canal R (Rojo)</span>
                  <span className="text-white tabular-nums">{Math.round(rGain * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={rGain}
                  onChange={(e) => {
                    setRGain(parseFloat(e.target.value));
                    setActiveCap("rgb_custom");
                  }}
                  className="w-full accent-rose-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-emerald-400">Canal G (Verde)</span>
                  <span className="text-white tabular-nums">{Math.round(gGain * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={gGain}
                  onChange={(e) => {
                    setGGain(parseFloat(e.target.value));
                    setActiveCap("rgb_custom");
                  }}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-blue-400">Canal B (Azul)</span>
                  <span className="text-white tabular-nums">{Math.round(bGain * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={bGain}
                  onChange={(e) => {
                    setBGain(parseFloat(e.target.value));
                    setActiveCap("rgb_custom");
                  }}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">Contraste</span>
                  <span className="text-white tabular-nums">{contrast.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="2.2"
                  step="0.05"
                  value={contrast}
                  onChange={(e) => setContrast(parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-amber-400">Umbral Hotspot</span>
                  <span className="text-white tabular-nums">{hotspotThreshold}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="245"
                  step="5"
                  value={hotspotThreshold}
                  onChange={(e) => setHotspotThreshold(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="glass-panel p-4">
            <h3 className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider mb-3 border-b border-slate-800 pb-2">
              Estado de Zonas Térmicas
            </h3>
            <div className="space-y-2.5 font-mono text-xs tabular-nums">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-slate-300">SPINDLE / CABEZAL</span>
                <span className={zoneStats.spindle > 640 ? "text-rose-400 font-bold" : "text-amber-400 font-bold"}>
                  {zoneStats.spindle} °C
                </span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-slate-300">MOTORES EJE Z</span>
                <span className="text-orange-400 font-bold">{zoneStats.motorZ} °C</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-slate-300">REFRIGERANTE</span>
                <span className="text-cyan-400 font-bold">{zoneStats.coolant} °C</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-slate-300">FUENTE DE PODER</span>
                <span className="text-emerald-400 font-bold">{zoneStats.psu} °C</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
