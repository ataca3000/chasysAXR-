import { useState } from 'react';
import { Camera, Maximize, Thermometer, X, Smartphone } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { CustomCNC } from './DigitalTwin';
import { OrbitControls, Environment, PerspectiveCamera, OrthographicCamera } from '@react-three/drei';
import { motion, AnimatePresence } from 'motion/react';
import { ARPhoneSyncDialog } from './ARPhoneSyncDialog';

export function CameraFeeds({ telemetry }: { telemetry?: any }) {
  const isCritical = telemetry?.temperature > 800 || telemetry?.vibration > 5;
  const [expandedCamera, setExpandedCamera] = useState<string | null>(null);
  const [showPhoneSync, setShowPhoneSync] = useState(false);

  const renderCameraContent = (type: string, isExpanded: boolean = false) => {
    switch(type) {
      case 'zenith':
        return (
          <>
            <div className={`absolute inset-0 z-0 ${isExpanded ? 'pointer-events-auto' : 'pointer-events-none'}`}>
              <Canvas>
                <OrthographicCamera makeDefault position={[0, 10, 0]} zoom={isExpanded ? 70 : 35} rotation={[-Math.PI/2, 0, 0]} />
                <ambientLight intensity={1} />
                <directionalLight position={[0, 10, 0]} intensity={2} color="#ffffff" />
                <CustomCNC position={[0, -2, 0]} telemetry={telemetry} label="" />
                {isExpanded && <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />}
                <Environment preset="city" />
              </Canvas>
              <div className="absolute inset-0 bg-blue-900/10 mix-blend-color pointer-events-none border border-blue-500/20"></div>
            </div>
            <div className="absolute inset-0 flex flex-col justify-between p-2 z-10 pointer-events-none">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono bg-slate-900/60 shadow-sm px-1.5 py-0.5 rounded text-white/90">LIVE • REC</span>
                <span className="text-[10px] font-mono text-emerald-400">60fps</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-mono bg-slate-900/80 shadow-sm px-1.5 py-0.5 rounded text-emerald-400 truncate max-w-[80%]">
                  CÁMARA CENITAL (MONITOREO AUTOMATA)
                </span>
                {!isExpanded && <Maximize size={12} className="text-white/50 cursor-pointer pointer-events-auto hover:text-white hover:scale-125 transition-all" onClick={() => setExpandedCamera('zenith')} />}
              </div>
            </div>
          </>
        );
      case 'tray':
        return (
          <>
            <div className={`absolute inset-0 z-0 ${isExpanded ? 'pointer-events-auto' : 'pointer-events-none'}`}>
              <Canvas>
                 <PerspectiveCamera makeDefault position={isExpanded ? [-2.5, 0.5, 3] : [-3, 1, 4]} fov={isExpanded ? 25 : 30} />
                 <ambientLight intensity={0.5} />
                 <pointLight position={[-2, 1, 2]} intensity={2} color="#ffffff" />
                 <CustomCNC position={[0, -1, 0]} telemetry={telemetry} label="" />
                 {isExpanded && <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} minDistance={1} maxDistance={10} />}
              </Canvas>
            </div>
            <div className={`absolute inset-0 flex flex-col justify-between p-2 ${isExpanded ? 'pointer-events-none' : 'z-10 pointer-events-none'}`}>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono bg-slate-900/60 shadow-sm px-1.5 py-0.5 rounded text-white/90">LIVE • REC</span>
                <span className="text-[10px] font-mono text-slate-400">30fps</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-mono bg-slate-900/80 shadow-sm px-1.5 py-0.5 rounded text-white/90 truncate max-w-[80%]">
                  CÁMARA LATERAL (ANÁLISIS SENSORIAL) {isExpanded && " - INTERACTIVO"}
                </span>
                {!isExpanded && <Maximize size={12} className="text-white/50 cursor-pointer pointer-events-auto hover:text-white hover:scale-125 transition-all" onClick={() => setExpandedCamera('tray')} />}
              </div>
            </div>
          </>
        );
      case 'thermal':
        return (
          <>
            <div className={`absolute inset-0 z-0 ${isExpanded ? 'pointer-events-auto' : 'pointer-events-none'}`}>
              <Canvas>
                <PerspectiveCamera makeDefault position={isExpanded ? [3, 4, 3] : [4, 5, 4]} fov={isExpanded ? 30 : 35} />
                <ambientLight intensity={5} color={isCritical ? "#ff0000" : "#ff5500"} />
                <pointLight position={[0, 0, 0]} intensity={10} color={isCritical ? "#ffffff" : "#ffff00"} distance={10} />
                <CustomCNC position={[0, -2, 0]} telemetry={telemetry} label="" />
                {isExpanded && <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />}
              </Canvas>
              <div className="absolute inset-0 mix-blend-overlay bg-gradient-to-tr from-purple-800/40 via-orange-600/40 to-yellow-400/40 pointer-events-none"></div>
            </div>
            <div className={`absolute inset-0 flex flex-col justify-between p-2 ${isExpanded ? 'pointer-events-none' : 'z-10 pointer-events-none'}`}>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono bg-slate-900/60 shadow-sm px-1.5 py-0.5 rounded text-white/90">LIVE • REC</span>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-mono text-amber-500">120fps</span>
                  <span className={`text-[12px] font-mono font-bold mt-1 px-1.5 py-0.5 rounded ${telemetry?.temperature > 800 ? 'bg-rose-600 text-white animate-pulse shadow-md' : 'bg-rose-500 text-white shadow-sm'} flex items-center gap-1`}>
                    <Thermometer size={10} /> MAX {Math.round(telemetry?.temperature || 0)}°C
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-end">
                  <span className="text-[10px] font-mono bg-slate-900/80 shadow-sm px-1.5 py-0.5 rounded text-amber-500 truncate max-w-[80%]">
                  VISIÓN ESPECTRAL TÉRMICA (TIEMPO REAL) {isExpanded && " - INTERACTIVO"}
                </span>
                {!isExpanded && <Maximize size={12} className="text-white/50 cursor-pointer pointer-events-auto hover:text-white hover:scale-125 transition-all" onClick={() => setExpandedCamera('thermal')} />}
              </div>
            </div>
          </>
        )
      default: return null;
    }
  };

  return (
    <>
      <div className="glass-panel p-5 shrink-0 border border-white/5 bg-black/40 backdrop-blur-xl rounded-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm text-google-blue font-bold tracking-widest flex items-center gap-2">
            <Camera size={16} className="text-google-blue" /> SISTEMA DE VISIÓN ARTIFICIAL MULTINODO
          </h3>
          <button 
            onClick={() => setShowPhoneSync(true)}
            className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-3 py-1 rounded text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
          >
            <Smartphone size={14} /> VINCULAR SMARTPHONE AR
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 rounded-lg overflow-hidden relative aspect-video border-[2px] border-slate-300 shadow-sm group hover:border-slate-500 transition-all duration-300">
            {renderCameraContent('zenith')}
          </div>
          <div className="bg-slate-900 rounded-lg overflow-hidden relative aspect-video border-[2px] border-slate-300 shadow-sm group hover:border-slate-500 transition-all duration-300">
            {renderCameraContent('tray')}
          </div>
          <div className="bg-slate-900 rounded-lg overflow-hidden relative aspect-video border-[2px] border-slate-300 shadow-sm group hover:border-slate-500 transition-all duration-300">
            {renderCameraContent('thermal')}
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4 font-mono">
          <span className="text-slate-700 font-bold">INFO:</span> Click maximize icon to enter FULL SCREEN interactive mode.
        </p>
      </div>

      <AnimatePresence>
        {expandedCamera && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12 bg-black/90 backdrop-blur-md"
          >
            <div className="relative w-full h-full max-w-7xl max-h-[80vh] border-4 border-slate-300 rounded-2xl overflow-hidden shadow-2xl bg-slate-900">
               {/* Controls Header */}
               <div className="absolute top-0 left-0 right-0 z-50 p-4 border-b border-white/10 bg-slate-900/60 backdrop-blur flex justify-between items-center pointer-events-auto">
                 <div className="flex items-center gap-3">
                    <span className="text-rose-400 font-mono font-bold text-xl">LIVE FEED</span>
                    <span className="text-white/60 font-mono">| {expandedCamera.toUpperCase()} NODE</span>
                 </div>
                 <button 
                  onClick={() => setExpandedCamera(null)}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white rounded-lg p-2 transition-all hover:scale-110"
                 >
                   <X size={24} />
                 </button>
               </div>
               
               <div className="w-full h-full pt-16">
                 {renderCameraContent(expandedCamera, true)}
               </div>
               
               {/* Overlay scanning effect */}
               <div className="absolute inset-0 z-40 pointer-events-none bg-[linear-gradient(transparent_0%,rgba(255,255,255,0.05)_50%,transparent_100%)] bg-[length:100%_4px] animate-scan" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ARPhoneSyncDialog isOpen={showPhoneSync} onClose={() => setShowPhoneSync(false)} />
    </>
  );
}
