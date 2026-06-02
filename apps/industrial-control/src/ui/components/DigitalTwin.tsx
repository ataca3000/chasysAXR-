import { useMemo, useRef, useState, memo, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Box, Cylinder, Grid, ContactShadows, Environment, Html, Sphere, Sparkles, Edges, Center } from '@react-three/drei';
import { EffectComposer, N8AO } from '@react-three/postprocessing';
import * as THREE from 'three';
import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// @ts-ignore
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { usePinch } from '@use-gesture/react';

function Tooltip({ position, text, status, value, unit, history, dataKey, color, arMode, forceExpanded = false, onClose }: any) {
  const [expanded, setExpanded] = useState(forceExpanded);

  if (!arMode) {
    return (
      <Html position={position} center className="pointer-events-none z-50">
        <div className="bg-slate-900/90 text-slate-100 p-2 rounded-lg text-xs font-mono border border-slate-700 shadow-lg whitespace-nowrap min-w-[max-content] backdrop-blur-md text-left">
          <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-blue-400">{text}</div>
          <div className="text-slate-400">Status: <span className="text-white">{status}</span></div>
        </div>
      </Html>
    );
  }

  const statusLevel = status === 'CRITICAL' || status?.includes('CRITICAL') ? 'critical' : 'nominal';
  const isExpanded = expanded || forceExpanded;

  return (
    <Html position={position} center className={`transition-all duration-300 pointer-events-auto ${isExpanded ? 'z-50' : 'z-40'}`}>
       <div
         onClick={(e) => { e.stopPropagation(); if(!forceExpanded) setExpanded(!expanded); }}
         className={`cursor-pointer backdrop-blur-md border rounded-lg shadow-lg flex flex-col overflow-hidden transition-all duration-300 ${statusLevel === 'critical' ? 'bg-rose-900/90 border-rose-500' : 'bg-slate-900/90 border-slate-700'} ${isExpanded ? 'w-48' : 'w-auto'}`}
       >
          <div className="p-2 flex items-center justify-between gap-2 whitespace-nowrap">
             <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${statusLevel === 'critical' ? 'bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]'}`} />
                 <div>
                   <div className="text-[10px] text-slate-300 font-bold leading-none mb-1">{text}</div>
                   <div className="text-sm text-white font-mono leading-none">
                     {value !== undefined ? (typeof value === 'number' ? value.toFixed(1) : value) : status} {unit && <span className="text-slate-400 text-xs">{unit}</span>}
                   </div>
                 </div>
             </div>
             {forceExpanded && onClose && (
                 <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-slate-400 hover:text-white p-1">X</button>
             )}
          </div>
          {isExpanded && history && history.length > 0 && dataKey && (
            <div className="bg-slate-950 p-2 border-t border-slate-800" onClick={(e) => e.stopPropagation()}>
               <div className="text-[9px] text-slate-500 mb-1 font-mono flex justify-between">
                 <span>TREND PAST 20s</span>
                 {!forceExpanded && (
                    <span className="text-white hover:text-slate-300 cursor-pointer" onClick={() => setExpanded(false)}>X</span>
                 )}
               </div>
               <div className="h-16 w-full mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                      <YAxis domain={['auto', 'auto']} hide />
                      <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
               </div>
            </div>
          )}
       </div>
    </Html>
  );
}

// Memoizamos el componente para evitar re-renders innecesarios si la telemetría no cambia drásticamente
export const CustomCNC = memo(function CustomCNC({ position, label, telemetry, arMode, history, enabledSensors = [] }: any) {
  const isCriticalVib = telemetry?.vibration > 5;

  // Sensor absence checks
  const isMissingTemp = enabledSensors.includes('thermal') && (telemetry?.temperature === undefined || telemetry?.temperature === 0);
  const isMissingVib = enabledSensors.includes('vibration') && (telemetry?.vibration === undefined || telemetry?.vibration === 0);
  const isMissingLoad = enabledSensors.includes('load') && (telemetry?.load === undefined || telemetry?.load === 0);
  const isMissingFlow = enabledSensors.includes('flow') && (telemetry?.flow === undefined || telemetry?.flow === 0);

  const gantryColor = "#94a3b8"; 
  const motorColor = isCriticalVib ? "#f59e0b" : "#64748b"; 
  const nodeColor = isCriticalVib ? "#f59e0b" : "#64748b"; 

  const gantryRef = useRef<THREE.Group>(null);
  const weldLightRef = useRef<THREE.PointLight>(null);
  const heatMapMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const motorMatRef1 = useRef<THREE.MeshStandardMaterial>(null);
  const motorMatRef2 = useRef<THREE.MeshStandardMaterial>(null);
  const nodeMatRef1 = useRef<THREE.MeshStandardMaterial>(null);
  const nodeMatRef2 = useRef<THREE.MeshStandardMaterial>(null);

  const scratchTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#666'; // Base roughness
      ctx.fillRect(0, 0, 1024, 1024);
      
      // Scratches
      for (let i = 0; i < 1500; i++) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.9})`;
          ctx.lineWidth = Math.random() * 4;
          ctx.beginPath();
          const x = Math.random() * 1024;
          const y = Math.random() * 1024;
          ctx.moveTo(x, y);
          ctx.lineTo(x + (Math.random() - 0.5) * 80, y + (Math.random() - 0.5) * 80);
          ctx.stroke();
      }
      
      // Smudges / grease
      for (let i = 0; i < 400; i++) {
          ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.8})`;
          ctx.beginPath();
          ctx.arc(Math.random() * 1024, Math.random() * 1024, Math.random() * 15 + 5, 0, Math.PI * 2);
          ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }, []);

  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [clickedPart, setClickedPart] = useState<string | null>(null);

  const handlePointerOver = (e: any, part: string) => {
    e.stopPropagation();
    if (arMode) document.body.style.cursor = 'pointer';
    setHoveredPart(part);
  };
  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    if (arMode) document.body.style.cursor = 'auto';
    setHoveredPart(null);
  };
  const handleClick = (e: any, part: string) => {
    if (arMode) {
      e.stopPropagation();
      setClickedPart(clickedPart === part ? null : part);
    }
  };

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (gantryRef.current) {
      // Avanza y retrocede a lo largo del eje Z en los rieles tipo via
      const zPos = Math.sin(t * 0.8) * 4;
      
      const vib = telemetry?.vibration || 0;
      // Real-time vibration shake effect
      const shakeBase = vib > 5 ? (vib * 0.02) : (vib * 0.002);
      const xShake = (Math.random() - 0.5) * shakeBase * 2;
      const yShake = (Math.random() - 0.5) * shakeBase * 2;

      gantryRef.current.position.set(xShake, yShake, zPos);
      
      // Control de la intensidad de la luz roja de soldadura
      if (weldLightRef.current) {
        // La soldadura es intensa al pasar por el centro donde está el poste amarillo (Z=0)
        const dist = Math.abs(zPos);
        const isCritical = telemetry?.temperature > 800 || telemetry?.vibration > 5;
        const baseIntensity = isCritical ? 30 : 15;
        const flickerRate = isCritical ? 20 : 5;

        if (dist < 1) {
          weldLightRef.current.intensity = (1 - dist) * baseIntensity + Math.random() * flickerRate;
        } else {
          weldLightRef.current.intensity = Math.random() > 0.9 ? Math.random() * (flickerRate / 2) : 0;
        }
        weldLightRef.current.color.set(isCritical ? '#ff0000' : '#ef4444');
      }

      // Heatmap material update
      if (heatMapMaterialRef.current && telemetry) {
         // Modify emission based on temperature telemetry (range approx 300 to 1000)
         const normalizedTemp = Math.min(Math.max((telemetry.temperature - 300) / 600, 0), 1);
         // Pulse the heatmap
         const pulse = 1 + Math.sin(t * 8) * 0.3;
         heatMapMaterialRef.current.emissiveIntensity = normalizedTemp * 3 * pulse;
         // Transition color from orange to intense red based on temp
         const r = 1;
         const g = 0.5 * (1 - normalizedTemp);
         const b = 0;
         heatMapMaterialRef.current.emissive.setRGB(r, g, b);
      }

      // Motor and nodes pulsing based on vibration
      const motorEmissiveBase = 1 + (vib / 10) * 8; // Reacts to vibration
      const pulse = 1 + Math.sin(t * 20) * 0.8 * (vib / 5); // higher vibration = more pulse
      const currentEmissive = Math.max(0, motorEmissiveBase * pulse);
      
      if (motorMatRef1.current) motorMatRef1.current.emissiveIntensity = currentEmissive;
      if (motorMatRef2.current) motorMatRef2.current.emissiveIntensity = currentEmissive;
      if (nodeMatRef1.current) nodeMatRef1.current.emissiveIntensity = currentEmissive;
      if (nodeMatRef2.current) nodeMatRef2.current.emissiveIntensity = currentEmissive;
    }
  });

  return (
    <group position={position} onPointerMissed={() => setClickedPart(null)}>
      {/* Rieles Tipo Via (a lo largo del eje Z) - Make them look more metallic */}
      <group onPointerOver={(e) => handlePointerOver(e, 'rails')} onPointerOut={handlePointerOut} onClick={(e) => handleClick(e, 'rails')}>
        <Box args={[0.3, 0.2, 12]} position={[-2, 0.1, 0]}>
          <meshStandardMaterial color={clickedPart === 'rails' ? '#3b82f6' : "#1a1a1a"} metalness={0.9} roughnessMap={scratchTexture} bumpMap={scratchTexture} bumpScale={0.06} roughness={0.3} />
          <Edges scale={1.01} color={clickedPart === 'rails' ? '#60a5fa' : "#64748b"} />
        </Box>
        <Box args={[0.3, 0.2, 12]} position={[2, 0.1, 0]}>
          <meshStandardMaterial color={clickedPart === 'rails' ? '#3b82f6' : "#1a1a1a"} metalness={0.9} roughnessMap={scratchTexture} bumpMap={scratchTexture} bumpScale={0.06} roughness={0.3} />
          <Edges scale={1.01} color={clickedPart === 'rails' ? '#60a5fa' : "#64748b"} />
        </Box>

        {/* Optimización: Si tienes cientos de travesaños, aquí deberías usar <Instances> */}
        <group>
          {Array.from({length: 15}).map((_, i) => (
            <Box key={i} args={[4.4, 0.1, 0.3]} position={[0, 0.05, -7 + i]}>
                <meshStandardMaterial color="#2d2d2d" metalness={0.8} roughness={0.5} />
            </Box>
          ))}
        </group>

        {(hoveredPart === 'rails' || clickedPart === 'rails') && (
          <Tooltip
             position={[0, 0.5, 0]} 
             text="LINEAR GUIDE RAILS" 
             status="Nominal" 
             forceExpanded={clickedPart === 'rails'}
             onClose={() => setClickedPart(null)}
          />
        )}
      </group>

      {/* Poste Cónico a Soldar (Mapa de Calor Térmico) */}
      <group onPointerOver={(e) => handlePointerOver(e, 'workpiece')} onPointerOut={handlePointerOut} onClick={(e) => handleClick(e, 'workpiece')}>
        <Cylinder args={[0.2, 0.6, 2, 32]} position={[0, 1, 0]}>
          <meshStandardMaterial 
            ref={heatMapMaterialRef}
            color={clickedPart === 'workpiece' ? '#fde047' : "#fcd34d"} 
            metalness={0.6} 
            roughness={0.4} 
            emissive="#b45309" 
            emissiveIntensity={0.2} 
          />
          {clickedPart === 'workpiece' && <Edges scale={1.01} color="#eab308" />}
        </Cylinder>
        
        {/* Base for the cone */}
        <Cylinder args={[0.8, 0.8, 0.1, 32]} position={[0, 0.05, 0]}>
           <meshStandardMaterial color="#333" metalness={0.8} roughness={0.6} />
           <Edges scale={1.05} color="#94a3b8" />
        </Cylinder>
        {(hoveredPart === 'workpiece' || clickedPart === 'workpiece') && (
          <Tooltip 
             position={[1, 1, 0]} 
             text="TARGET WORKPIECE" 
             status={isMissingTemp ? "SENSOR ABSENT (Check Pin)" : `Temp: ${telemetry?.temperature?.toFixed(1) || 0}°C`} 
             value={isMissingTemp ? "ERR" : telemetry?.temperature}
             unit={isMissingTemp ? "" : "°C"}
             history={isMissingTemp ? [] : history}
             dataKey="temperature"
             color={isMissingTemp ? "#f59e0b" : "#f43f5e"}
             forceExpanded={clickedPart === 'workpiece'}
             onClose={() => setClickedPart(null)}
          />
        )}
      </group>

      {/* Estructura Móvil del CNC (Gantry) */}
      <group 
        ref={gantryRef}
        onPointerOver={(e) => handlePointerOver(e, 'gantry')}
        onPointerOut={handlePointerOut}
        onClick={(e) => handleClick(e, 'gantry')}
      >
        {(hoveredPart === 'gantry' || clickedPart === 'gantry') && (
          <Tooltip 
             position={[0, 5, 0]} 
             text="MAIN GANTRY" 
             status={isMissingLoad ? "LOAD SENSOR MISSING" : `Load: ${telemetry?.load?.toFixed(1) || 0}%`} 
             value={isMissingLoad ? "NA" : telemetry?.load}
             unit={isMissingLoad ? "" : "%"}
             history={isMissingLoad ? [] : history}
             dataKey="load"
             color={isMissingLoad ? "#f59e0b" : "#3b82f6"}
             forceExpanded={clickedPart === 'gantry'}
             onClose={() => setClickedPart(null)}
          />
        )}
        {/* Piernas de la grúa sobre rieles (Truss styling) */}
        <group position={[-2, 2, 0]}>
          <Box args={[0.4, 4, 1.2]}>
             <meshStandardMaterial color={clickedPart === 'gantry' ? '#60a5fa' : gantryColor} metalness={1} roughnessMap={scratchTexture} bumpMap={scratchTexture} bumpScale={0.05} />
             <Edges scale={1.01} color="#475569" />
          </Box>
          <Box args={[0.45, 0.2, 1.3]} position={[0, -1.8, 0]}><meshStandardMaterial color="#ef4444" metalness={0.7} roughness={0.3} /></Box>
          {/* Tracks / Wheels enclosure */}
          <Box args={[0.6, 0.6, 1.6]} position={[0, -1.8, 0]}>
             <meshStandardMaterial color="#111" metalness={1} roughnessMap={scratchTexture} bumpMap={scratchTexture} bumpScale={0.03} />
             <Edges scale={1.01} color="#334155" />
          </Box>
        </group>

        <group position={[2, 2, 0]}>
          <Box args={[0.4, 4, 1.2]}>
             <meshStandardMaterial color={clickedPart === 'gantry' ? '#60a5fa' : gantryColor} metalness={1} roughnessMap={scratchTexture} bumpMap={scratchTexture} bumpScale={0.05} />
             <Edges scale={1.01} color="#475569" />
          </Box>
          <Box args={[0.45, 0.2, 1.3]} position={[0, -1.8, 0]}><meshStandardMaterial color="#ef4444" metalness={0.7} roughness={0.3} /></Box>
          <Box args={[0.6, 0.6, 1.6]} position={[0, -1.8, 0]}>
             <meshStandardMaterial color="#111" metalness={1} roughnessMap={scratchTexture} bumpMap={scratchTexture} bumpScale={0.03} />
             <Edges scale={1.01} color="#334155" />
          </Box>
        </group>
        
        {/* Motores Neón en las bases */}
        <Box args={[0.4, 0.4, 1.8]} position={[-2, 0.3, 0]}>
           <meshStandardMaterial ref={motorMatRef1} color="#111" emissive={motorColor} emissiveIntensity={1} roughnessMap={scratchTexture} bumpMap={scratchTexture} bumpScale={0.05} />
        </Box>
        <Box args={[0.4, 0.4, 1.8]} position={[2, 0.3, 0]}>
           <meshStandardMaterial ref={motorMatRef2} color="#111" emissive={motorColor} emissiveIntensity={1} roughnessMap={scratchTexture} bumpMap={scratchTexture} bumpScale={0.05} />
        </Box>

        {/* Puente Superior (doble viga para más realismo) */}
        <Box args={[4.4, 0.6, 0.4]} position={[0, 4, -0.3]}>
           <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughnessMap={scratchTexture} bumpMap={scratchTexture} bumpScale={0.05} />
           <Edges scale={1.01} color="#475569" />
        </Box>
        <Box args={[4.4, 0.6, 0.4]} position={[0, 4, 0.3]}>
           <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughnessMap={scratchTexture} bumpMap={scratchTexture} bumpScale={0.05} />
           <Edges scale={1.01} color="#475569" />
        </Box>

        {/* Cabezal de Soldadura Central */}
        <group 
          position={[0, 3.5, 0]}
          onPointerOver={(e) => handlePointerOver(e, 'weldhead')}
          onPointerOut={handlePointerOut}
          onClick={(e) => handleClick(e, 'weldhead')}
        >
          {(hoveredPart === 'weldhead' || clickedPart === 'weldhead') && (
            <Tooltip 
               position={[1, 0, 0]} 
               text="WELD/LASER HEAD" 
               status={telemetry?.temperature > 800 ? "CRITICAL HEAT DETECTED" : "ACTIVE - Emitting"} 
               value={telemetry?.temperature}
               unit="°C"
               history={history}
               dataKey="temperature"
               color="#f43f5e"
               forceExpanded={clickedPart === 'weldhead'}
               onClose={() => setClickedPart(null)}
            />
          )}
          {/* Unidad Z */}
          <Box args={[0.8, 1.2, 0.9]} position={[0, 0.2, 0]}>
             <meshStandardMaterial color={clickedPart === 'weldhead' ? '#3b82f6' : "#1f1f1f"} metalness={0.7} roughness={0.3} />
             {clickedPart === 'weldhead' && <Edges scale={1.02} color="#93c5fd" />}
          </Box>
          {/* Brazo extensor o cilindro guiado Z */}
          <Cylinder args={[0.15, 0.15, 2]} position={[0, -0.8, 0]}>
            <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
          </Cylinder>
          {/* Punta de inyector/láser */}
          <Cylinder args={[0.08, 0.15, 0.4]} position={[0, -1.9, 0]}>
            <meshStandardMaterial color="#444" metalness={0.8} roughness={0.5} />
          </Cylinder>
          <Cylinder args={[0.02, 0.05, 0.5]} position={[0, -2.2, 0]}>
             <meshStandardMaterial color="#fff" emissive="#3b82f6" emissiveIntensity={8} />
          </Cylinder>
          <pointLight ref={weldLightRef} position={[0, -2.4, 0]} color="#3b82f6" distance={8} />
        </group>

        {/* Nodos de seguimiento neon y cajas de control superior */}
        <group onPointerOver={(e) => handlePointerOver(e, 'nodes')} onPointerOut={handlePointerOut} onClick={(e) => handleClick(e, 'nodes')}>
          <Sphere args={[0.1]} position={[-2, 4.5, 0]}>
             <meshStandardMaterial ref={nodeMatRef1} color="#111" emissive={nodeColor} emissiveIntensity={1} />
          </Sphere>
          <Sphere args={[0.1]} position={[2, 4.5, 0]}>
             <meshStandardMaterial ref={nodeMatRef2} color="#111" emissive={nodeColor} emissiveIntensity={1} />
          </Sphere>
          <Box args={[0.6, 0.4, 0.6]} position={[-1.5, 4.5, 0]}>
             <meshStandardMaterial color={clickedPart === 'nodes' ? '#3b82f6' : "#111"} roughnessMap={scratchTexture} bumpMap={scratchTexture} bumpScale={0.06} />
             {clickedPart === 'nodes' && <Edges scale={1.05} color="#60a5fa" />}
          </Box>
          {(hoveredPart === 'nodes' || clickedPart === 'nodes') && (
            <Tooltip 
               position={[-1.5, 5, 0]} 
               text="TRACKING NODES" 
               status={isMissingVib ? "VIBRATION SENSOR DISCONNECTED" : "Operational"}
               value={isMissingVib ? "MISSING" : telemetry?.vibration} 
               unit={isMissingVib ? "" : "mm/s"}
               history={isMissingVib ? [] : history}
               dataKey="vibration"
               color={isMissingVib ? "#f59e0b" : "#eab308"}
               forceExpanded={clickedPart === 'nodes'}
               onClose={() => setClickedPart(null)}
            />
          )}
        </group>
      </group>

      {/* Floating static tooltips when not interacting directly - only show if nothing is clicked or if we want them always on */}
      {arMode && telemetry && history && !clickedPart && (
         <group>
           <Tooltip 
             position={[0, 4.5, 1]} 
             text="SPINDLE HEAT" 
             value={isMissingTemp ? "ERR" : telemetry.temperature} 
             unit={isMissingTemp ? "" : "°C"} 
             status={isMissingTemp ? "ABSENT" : (telemetry.temperature > 800 ? "CRITICAL" : "NOMINAL")} 
             history={isMissingTemp ? [] : history} 
             dataKey="temperature" 
             color={isMissingTemp ? "#f59e0b" : "#f43f5e"} 
             arMode={arMode} 
           />
           <Tooltip 
             position={[-1.5, 2.5, 1.5]} 
             text="GANTRY LOAD" 
             value={isMissingLoad ? "NA" : telemetry.load} 
             unit={isMissingLoad ? "" : "%"} 
             status={isMissingLoad ? "ABSENT" : (telemetry.load > 85 ? "CRITICAL" : "NOMINAL")} 
             history={isMissingLoad ? [] : history} 
             dataKey="load" 
             color={isMissingLoad ? "#f59e0b" : "#3b82f6"} 
             arMode={arMode} 
           />
           <Tooltip 
             position={[1.5, 0.5, 1]} 
             text="VIBRATION" 
             value={isMissingVib ? "ERR" : telemetry.vibration} 
             unit={isMissingVib ? "" : "mm/s"} 
             status={isMissingVib ? "ABSENT" : (telemetry.vibration > 5 ? "CRITICAL" : "NOMINAL")} 
             history={isMissingVib ? [] : history} 
             dataKey="vibration" 
             color={isMissingVib ? "#f59e0b" : "#eab308"} 
             arMode={arMode} 
           />
           {isMissingFlow && (
             <Tooltip 
               position={[0, 0.5, -2]} 
               text="FLOW SENSOR" 
               value="MISSING" 
               status="CHECK CONNECTION" 
               color="#f59e0b" 
               arMode={arMode} 
             />
           )}
         </group>
      )}

      <Html position={[0, 6, 0]} center>
        <div className="bg-slate-900/90 text-slate-100 px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap border border-slate-700 backdrop-blur-md shadow-lg">
          {label}
        </div>
      </Html>
    </group>
  );
});

/**
 * Componente para visualización de modelos industriales externos.
 * Soporta STL (geometría pura) y GLB/GLTF (escenas completas).
 */
const IndustrialModel = memo(({ url }: { url: string }) => {
  const isGLTF = url.toLowerCase().endsWith('.glb') || url.toLowerCase().endsWith('.gltf');
  const loader = isGLTF ? GLTFLoader : STLLoader;
  
  // useLoader maneja el almacenamiento en caché por URL automáticamente
  const result = useLoader(loader as any, url);

  const model = useMemo(() => {
    let object: THREE.Object3D;
    
    if (isGLTF) {
      // GLTF devuelve una escena con jerarquía
      object = (result as any).scene.clone();
    } else {
      // STL devuelve solo geometría; creamos el mesh con material de acero industrial
      const material = new THREE.MeshStandardMaterial({ 
        color: '#94a3b8', 
        metalness: 0.8, 
        roughness: 0.2,
        name: 'Industrial_Steel'
      });
      object = new THREE.Mesh(result as THREE.BufferGeometry, material);
    }

    // Optimizamos sombras para todos los sub-componentes
    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return object;
  }, [result, isGLTF]);

  return <primitive object={model} />;
});

export default function DigitalTwin({ telemetry, arMode = false, history, enabledSensors = [], modelUrl }: { 
  telemetry: any, 
  arMode?: boolean, 
  history?: any[], 
  enabledSensors?: string[],
  modelUrl?: string 
}) {
  const vibrStatus = telemetry.vibration > 5 ? 'warning' : 'ok';
  const tempStatus = telemetry.temperature > 800 ? 'warning' : 'ok';
  
  // const baseColor = vibrStatus === 'warning' || tempStatus === 'warning' ? '#cc4444' : '#2d3748';

  const [sceneScale, setSceneScale] = useState(1);

  const bind = usePinch(({ offset: [s] }) => {
    if (arMode) {
      setSceneScale(s);
    }
  }, {
    scaleBounds: { min: 0.1, max: 5 }, modifierKey: "ctrlKey"
  });

  const handleZoomIn = () => setSceneScale(s => Math.min(5, s + 0.1));
  const handleZoomOut = () => setSceneScale(s => Math.max(0.1, s - 0.1));

  return (
    <div {...(arMode ? bind() as any : {})} className={`w-full h-full rounded-xl overflow-hidden relative border ${arMode ? 'bg-transparent border-transparent touch-none' : 'bg-slate-50 backdrop-blur-sm border-slate-300 shadow-inner'}`}>
      <div className={`absolute top-4 left-4 z-10 font-mono text-sm tracking-wider flex flex-col gap-1 p-2 rounded-md ${arMode ? 'bg-slate-900 shadow-lg text-slate-100 border border-slate-700' : 'text-slate-600'}`}>
        <span className="font-bold">[ MODE: 3D DIGITAL TWIN ]</span>
        <span className={vibrStatus === 'warning' ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>STATUS: {vibrStatus === 'warning' ? 'ANOMALY DETECTED' : 'OPERATIONAL'}</span>
      </div>
      
      {arMode && (
         <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2 bg-slate-900/80 p-2 rounded-lg border border-slate-700 backdrop-blur-md shadow-lg">
            <span className="text-[10px] text-slate-400 font-mono text-center mb-1">SCALE</span>
            <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded text-lg font-bold">+</button>
            <span className="text-xs text-white font-mono text-center py-1">{sceneScale.toFixed(1)}x</span>
            <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded text-lg font-bold">-</button>
         </div>
      )}

      <Canvas camera={{ position: [-8, 6, 8], fov: 45 }}>
        
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 10, 5]} intensity={1} color="#ffdddd" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#aa0000" />
        <pointLight position={[10, 0, 0]} intensity={2} color={tempStatus === 'warning' ? '#e11d48' : '#3b82f6'} distance={5} />

        <group scale={[sceneScale, sceneScale, sceneScale]}>
          <Grid renderOrder={-1} position={[0, -0.01, 0]} infiniteGrid fadeDistance={20} sectionColor="#94a3b8" cellColor="#cbd5e1" />

          {/* Industrial Dust Particles */}
          <Sparkles count={800} scale={15} size={1.5} speed={0.4} opacity={0.2} color="#64748b" />

          {/* Floor */}
          <Box args={[30, 0.1, 30]} position={[0, -0.1, 0]}>
           <meshStandardMaterial color="#f8fafc" metalness={0.1} roughness={0.8} transparent opacity={0.8} />
          </Box>

          <Suspense fallback={<Html center><div className="bg-slate-900/90 text-white p-3 rounded-lg font-mono text-[10px] border border-blue-500 animate-pulse">STREAMING_GEOMETRY...</div></Html>}>
            {modelUrl ? (
               <Center top>
                 <IndustrialModel url={modelUrl} />
               </Center>
            ) : (
              <CustomCNC
                position={[0, 0, 0]} 
                label="AUTOMATA 1"
                status={vibrStatus} 
                telemetry={telemetry}
                arMode={arMode}
                history={history}
                enabledSensors={enabledSensors}
              />
            )}
          </Suspense>
          
          <ContactShadows position={[0, 0, 0]} opacity={0.6} scale={20} blur={2} far={10} color="#ff0000" />
        </group>
        
        <Environment preset="city" />
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} enableZoom={!arMode} />
        
        <EffectComposer>
          <N8AO aoRadius={1} intensity={2} color="#000000" />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
