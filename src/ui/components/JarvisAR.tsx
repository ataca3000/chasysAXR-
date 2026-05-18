import { useEffect, useRef, useState } from 'react';
import { Scan, Target, Smartphone, Crosshair } from 'lucide-react';

export function JarvisAR() {
  const containerRef = useRef<HTMLDivElement>(null);
  // devices were removed
  const [activeFeeds, setActiveFeeds] = useState<MediaStream[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // AR Calibration state
  const [calibrationPhase, setCalibrationPhase] = useState<'initial' | 'scanning' | 'anchoring' | 'complete'>('initial');
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    // 1. Obtener múltiples cámaras físicas (AR/C4 Mode)
    navigator.mediaDevices.enumerateDevices().then(deviceInfos => {
      const videoDevices = deviceInfos.filter(d => d.kind === 'videoinput');
      // Devices no longer set to state
      
      // Pedir streams para todas las cámaras disponibles (hasta 4)
      const feedPromises = videoDevices.slice(0, 4).map(device => 
        navigator.mediaDevices.getUserMedia({
          video: { deviceId: device.deviceId, width: { ideal: 1280 }, facingMode: 'environment' }
        }).catch(err => {
          console.warn("Error con cámara", device.label, err);
          return null;
        })
      );

      Promise.all(feedPromises).then(streams => {
        setActiveFeeds(streams.filter(Boolean) as MediaStream[]);
        setCalibrationPhase('scanning'); // Auto-start calibration when feeds are ready
      });
    });

    return () => {
      activeFeeds.forEach(s => s.getTracks().forEach(t => t.stop()));
    };
  }, []);

  // Calibration simulation logic
  useEffect(() => {
    if (calibrationPhase === 'scanning') {
      const interval = setInterval(() => {
        setScanProgress(p => {
          const next = p + (Math.random() * 5 + 2);
          if (next >= 100) {
            setCalibrationPhase('anchoring');
            return 100;
          }
          return next;
        });
      }, 150);
      return () => clearInterval(interval);
    } else if (calibrationPhase === 'anchoring') {
      const timer = setTimeout(() => {
        setCalibrationPhase('complete');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [calibrationPhase]);

  // 2. Dibujado de interfas HUD tipo Jarvis (Láser, Temperatura, Human track)
  useEffect(() => {
    if (calibrationPhase !== 'complete') return; // Don't draw HUD until calibrated

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    let time = 0;

    // Aquí irían los boxes reales generados por TensorFlow.js o la lectura de Arduino
    // Por ahora, simulamos los inputs que alimentarían la interfaz
    const mockEntities = [
      { type: 'HUMAN', x: 0.3, y: 0.4, w: 0.15, h: 0.4, temp: '36.5°C', status: 'SAFE', distance: '1.5m' },
      { type: 'CNC_SPINDLE', x: 0.7, y: 0.3, w: 0.2, h: 0.2, temp: '815°C', status: 'CRITICAL', hz: '120Hz', distance: '0.8m' }
    ];

    const drawHUD = () => {
      time += 0.05;
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // Grid y retículas globales
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)'; // Slate-400
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height);
      ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(width/2, height/2, 200, 0, Math.PI*2);
      ctx.stroke();

      // Dibujar Entities (Reemplazable con detecciones reales)
      mockEntities.forEach((ent, i) => {
        const px = ent.x * width + Math.sin(time + i)*5; // Slight drift
        const py = ent.y * height + Math.cos(time + i)*5;
        const pw = ent.w * width;
        const ph = ent.h * height;

        const isCritical = ent.status === 'CRITICAL';
        const pulse = isCritical ? Math.abs(Math.sin(time * 3)) : 1;
        const mainColor = isCritical ? `rgba(225, 29, 72, ${0.4 + pulse * 0.6})` : '#3b82f6'; 

        ctx.setLineDash([8, 4]);

        // Bounding Box Corners
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 2;
        const cl = 20; // Corner length
        ctx.beginPath();
        // Top Left
        ctx.moveTo(px, py + cl); ctx.lineTo(px, py); ctx.lineTo(px + cl, py);
        // Top Right
        ctx.moveTo(px + pw - cl, py); ctx.lineTo(px + pw, py); ctx.lineTo(px + pw, py + cl);
        // Bottom Right
        ctx.moveTo(px + pw, py + ph - cl); ctx.lineTo(px + pw, py + ph); ctx.lineTo(px + pw - cl, py + ph);
        // Bottom Left
        ctx.moveTo(px, py + ph - cl); ctx.lineTo(px, py + ph); ctx.lineTo(px + cl, py + ph);
        ctx.stroke();

        ctx.setLineDash([]);

        // Overlay Box
        ctx.fillStyle = isCritical ? `rgba(225, 29, 72, ${0.1 + pulse * 0.1})` : 'rgba(59, 130, 246, 0.1)';
        ctx.fillRect(px, py, pw, ph);

        // Data Tags
        ctx.fillStyle = mainColor;
        ctx.font = '12px monospace';
        ctx.fillText(`[${ent.type}] ${ent.distance || '1.2m'}`, px, py - 10);
        ctx.fillText(`TMP: ${ent.temp}`, px, py + ph + 15);
        if (ent.hz) ctx.fillText(`VIB: ${ent.hz}`, px, py + ph + 30);
      });

      // UI Scanners
      ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
      const scanY = (Math.sin(time) * 0.5 + 0.5) * height;
      ctx.fillRect(0, scanY, width, 2);

      frameId = requestAnimationFrame(drawHUD);
    };

    const resize = () => {
      canvas.width = containerRef.current?.clientWidth || window.innerWidth;
      canvas.height = containerRef.current?.clientHeight || window.innerHeight;
    };
    
    window.addEventListener('resize', resize);
    resize();
    drawHUD();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frameId);
    };
  }, [calibrationPhase]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-10 bg-slate-900 overflow-hidden rounded-xl border-2 border-slate-700">
      {/* Sistema Multicámara (C4) */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
        {activeFeeds.map((stream, i) => (
          <VideoNode key={stream.id} stream={stream} index={i} total={activeFeeds.length} />
        ))}
        {activeFeeds.length === 0 && (
           <div className="col-span-2 row-span-2 flex items-center justify-center text-slate-400 font-mono flex-col gap-4">
             <Scan className="w-10 h-10 animate-pulse" />
             [AWAITING OPTICAL NODES...]
           </div>
        )}
      </div>

      {/* AR Calibration Overlay */}
      {calibrationPhase !== 'complete' && activeFeeds.length > 0 && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-700 p-8 rounded-2xl shadow-2xl text-center">
            
            {calibrationPhase === 'scanning' && (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                <div className="relative mb-8">
                  <Scan className="w-20 h-20 text-blue-500 animate-pulse" />
                  <Smartphone className="w-8 h-8 text-slate-200 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-bounce" />
                </div>
                <h3 className="text-xl font-black text-white tracking-widest mb-2 font-mono">ENVIRONMENT SCAN</h3>
                <p className="text-slate-400 text-sm mb-6">Move your device slowly left and right to establish a stable AR tracking plane.</p>
                
                <div className="w-full bg-slate-800 rounded-full h-3 mb-2 border border-slate-700 overflow-hidden">
                  <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-out relative overflow-hidden" style={{ width: `${Math.min(100, scanProgress)}%` }}>
                    <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full animate-[shimmer_1.5s_infinite]" />
                  </div>
                </div>
                <div className="text-xs text-blue-400 font-mono tracking-widest">{Math.round(scanProgress)}% MAPPED</div>
              </div>
            )}

            {calibrationPhase === 'anchoring' && (
              <div className="flex flex-col items-center animate-in fade-in duration-300">
                <Crosshair className="w-20 h-20 text-emerald-500 mt-2 mb-8 animate-[spin_3s_linear_infinite]" />
                <h3 className="text-xl font-black text-emerald-400 tracking-widest mb-2 font-mono">PLANE DETECTED</h3>
                <p className="text-slate-300 text-sm">Locking spatial anchors and aligning digital twin models...</p>
              </div>
            )}

            <style>{`
              @keyframes shimmer {
                100% { transform: translateX(100%); }
              }
            `}</style>
          </div>
        </div>
      )}

      {/* Capa Holográfica de IA (Jarvis) */}
      <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-1000 ${calibrationPhase === 'complete' ? 'opacity-100' : 'opacity-0'}`} />

      {/* Botones Flotantes Reales */}
      <div className={`absolute bottom-4 left-4 flex gap-2 transition-opacity duration-500 ${calibrationPhase === 'complete' ? 'opacity-100' : 'opacity-0'}`}>
        <div className="bg-slate-900/80 text-slate-300 font-mono text-xs px-3 py-1 rounded border border-slate-700 backdrop-blur">
          <Target className="inline w-3 h-3 mr-1"/>
          MODO: GOD'S EYE (C4)
        </div>
        <div className="bg-slate-900/80 text-slate-300 font-mono text-xs px-3 py-1 rounded border border-slate-700 backdrop-blur flex items-center">
          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
          SPATIAL ANCHOR: LOCKED
        </div>
      </div>
    </div>
  );
}

function VideoNode({ stream, index, total }: { stream: MediaStream, index: number, total: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const isMain = total === 1 || index === 0;

  return (
    <div className={`relative ${isMain && total % 2 !== 0 ? 'col-span-2 row-span-2' : ''} border border-slate-800/50`}>
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover filter contrast-125 saturate-50" />
      <div className="absolute top-2 left-2 text-[10px] bg-slate-900/80 text-slate-300 px-1 py-0.5 font-mono">
        CAM_0{index + 1} // IR_ENABLED
      </div>
    </div>
  );
}
