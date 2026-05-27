import { Sphere, Html, Float, Sparkles } from "@react-three/drei";
import { SpatialSuggestion } from "../../services/spatialAnalysisService"; // Verifica que esta sea la ruta real ahora
import { Zap, Activity, Info } from "lucide-react";

interface Props {
  suggestion: SpatialSuggestion;
  onInstall: (suggestion: SpatialSuggestion) => void;
}

export function SuggestionMarker({ suggestion, onInstall }: Props) {
  if (!suggestion.position) return null;

  const isActuator = suggestion.type === "actuator";
  const color = isActuator ? "#6366f1" : "#10b981"; // Indigo para actuadores, Esmeralda para sensores

  return (
    <group position={suggestion.position}>
      <Float speed={3} rotationIntensity={0.4} floatIntensity={0.6}>
        {/* Esfera central tipo 'Core' */}
        <Sphere args={[0.15, 16, 16]}>
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={4}
            transparent
            opacity={0.4}
            wireframe
          />
        </Sphere>

        {/* Aura de partículas */}
        <Sparkles count={15} scale={0.4} size={2} speed={0.4} color={color} />
      </Float>

      {/* Ficha técnica flotante */}
      <Html distanceFactor={8} position={[0, 0.4, 0]} center>
        <div className="bg-slate-900/90 border border-white/10 backdrop-blur-md p-3 rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.5)] w-44 pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-1">
            {isActuator ? (
              <Zap size={12} className="text-indigo-400" />
            ) : (
              <Activity size={12} className="text-emerald-400" />
            )}
            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
              SUGERENCIA IA
            </span>
          </div>
          <div className="text-xs font-black text-white mb-1 uppercase">
            {suggestion.hardware.replace("_", " ")}
          </div>
          <div className="text-[9px] text-slate-400 leading-tight italic">
            "{suggestion.justification}"
          </div>
          {suggestion.suggestedPin && (
            <div className="mt-2 text-[8px] font-mono bg-indigo-500/10 p-1 rounded border border-indigo-500/20 text-indigo-300 text-center">
              AUTO-MAP: {suggestion.suggestedPin}
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onInstall(suggestion);
            }}
            className="mt-3 w-full bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold py-1.5 rounded transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            INSTALAR AHORA
          </button>
        </div>
      </Html>
    </group>
  );
}
