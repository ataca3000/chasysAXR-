import { Activity, Cpu, Zap } from 'lucide-react';
import DigitalTwin from '../components/DigitalTwin';
import { CameraFeeds } from '../components/CameraFeeds';
import { TelemetryChart } from '../components/TelemetryCharts';
import { VisionAnalyzer } from '../components/VisionAnalyzer';
import { HardwareControl } from '../components/HardwareControl';
import { AgentExecutor } from '../components/AgentExecutor';
import { AgentBackendSelector } from '../components/AgentBackendSelector';
import { ARCameraLayer } from '../components/ARCameraLayer';
import { hardware } from '../../services/hardwareController';

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
  aiInsights
}: CommandCenterViewProps) {
  return (
    <div className="xl:col-span-3 grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
      {/* Main Visualizer (3D Digital Twin) */}
      <div className="xl:col-span-2 flex flex-col gap-6 h-full">
        <div className="flex-1 glass-panel !bg-[#ebda88] !border-dotted !rounded-[20px] !border-[#17ddee] relative min-h-[300px] md:min-h-[400px]">
          
          {/* Jarvis AR HUD & Multi-Camera */}
          <ARCameraLayer isActive={arModeActive} />
          
          <div className="absolute inset-0 z-20 pointer-events-auto">
            <DigitalTwin telemetry={currentTelemetry} arMode={arModeActive} history={telemetryHistory} enabledSensors={enabledSensors} />
          </div>
        </div>

        {/* Cameras Feed Panel */}
        <CameraFeeds telemetry={currentTelemetry} />

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
          <TelemetryChart 
            data={telemetryHistory} 
            dataKey="temperature" 
            color={currentTelemetry.temperature > 800 ? "#e11d48" : "#94a3b8"} 
            label="SENSOR ADAPTATIVO 1" 
          />
          <TelemetryChart 
            data={telemetryHistory} 
            dataKey="vibration" 
            color={currentTelemetry.vibration > 5 ? "#e11d48" : "#94a3b8"} 
            label="SENSOR ADAPTATIVO 2" 
          />
        </div>
      </div>

      {/* AI Panel & Logs */}
      <div className="flex flex-col gap-6 h-full">
        
        <VisionAnalyzer />

        <AgentBackendSelector />

        <AgentExecutor currentTelemetry={currentTelemetry} />

        {/* Real-time Dials */}
        <div className="glass-panel p-5 shrink-0">
          <h3 className="text-[10px] text-google-blue font-mono font-bold tracking-widest mb-4 flex items-center gap-2 uppercase">
            <Activity size={14} /> REAL-TIME TELEMETRY
          </h3>
          
          <div className="space-y-5">
            <MetricBar label="CARGA OPERACIONAL" value={currentTelemetry.load} max={100} unit="%" color="bg-google-blue" />
            <MetricBar label="NIVEL TERMICO" value={currentTelemetry.temperature} max={1000} unit=" °C" color={currentTelemetry.temperature > 800 ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" : "bg-orange-500"} />
            <MetricBar label="NIVEL ACÚSTICO/VIBRACIÓN" value={currentTelemetry.vibration} max={10} unit="" color={currentTelemetry.vibration > 5 ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" : "bg-cyan-500"} />
          </div>
        </div>

        {/* Serial Hardware Port Control */}
        <div className="h-64">
           <HardwareControl />
        </div>

        {/* AI Agent Analysis */}
        <div className="glass-panel !bg-[#ffffff] !border-0 p-5 flex-1 flex flex-col min-h-[250px] border-t-2 border-t-google-blue">
          <h3 className="text-sm text-white font-bold mb-4 flex items-center gap-2 shrink-0">
            <Cpu size={16} className="text-google-blue" /> GEMINI AI COMMAND ASSOCIATE
          </h3>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar text-sm text-slate-300 leading-relaxed">
            {loadingAi ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-google-blue"></div>
                <p className="font-mono text-xs">Evaluando requerimientos sensoriales y de operación...</p>
              </div>
            ) : aiInsights ? (
              <div className="flex flex-col h-full">
                 <div className="prose prose-invert prose-sm max-w-none text-slate-200 mb-4" dangerouslySetInnerHTML={{ __html: aiInsights.html }} />
                 {aiInsights.gcode && aiInsights.gcode.length > 0 && (
                    <div className="mt-auto bg-black border border-white/10 rounded-lg p-3 shrink-0 shadow-inner">
                       <h4 className="text-[10px] text-google-blue font-mono font-bold tracking-widest mb-2 flex items-center"><Zap size={12} className="mr-1" /> RECOMENDACIÓN SECUENCIA IA</h4>
                       <div className="bg-black/60 text-google-green font-mono text-xs p-2 rounded mb-3 overflow-x-auto">
                          {aiInsights.gcode.map((g: string, i: number) => <div key={i}>{g}</div>)}
                       </div>
                       <button 
                         onClick={async (e) => {
                            const btn = e.currentTarget;
                            const oldHtml = btn.innerHTML;
                            btn.disabled = true;
                            btn.innerHTML = 'EJECUTANDO...';
                            btn.classList.add('opacity-75', 'cursor-not-allowed');
                            
                            for (const cmd of aiInsights.gcode) {
                               await hardware.sendCommand(cmd);
                               await new Promise(r => setTimeout(r, 600));
                            }
                            
                            btn.innerHTML = '¡COMPLETADO!';
                            btn.classList.replace('bg-google-blue', 'bg-google-green');
                            btn.classList.replace('hover:bg-blue-600', 'hover:bg-green-600');
                            
                            setTimeout(() => {
                               btn.innerHTML = oldHtml;
                               btn.disabled = false;
                               btn.classList.remove('opacity-75', 'cursor-not-allowed');
                               btn.classList.replace('bg-google-green', 'bg-google-blue');
                               btn.classList.replace('hover:bg-green-600', 'hover:bg-blue-600');
                            }, 2000);
                         }}
                         className="w-full bg-google-blue hover:bg-blue-600 text-white text-[10px] font-bold font-mono tracking-widest py-2 rounded transition-colors flex items-center justify-center">
                         <Cpu size={14} className="mr-2" /> EJECUTAR EN MÁQUINA
                       </button>
                    </div>
                 )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 text-center px-4">
                <Cpu className="w-12 h-12 mb-3 opacity-50" />
                <p>Agent is standing by. Request an analysis for proactive line evaluation.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricBar({ label, value, max, unit, color }: { label: string, value: number, max: number, unit: string, color: string }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1 font-mono uppercase tracking-wider">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-bold">{value.toFixed(1)}{unit}</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-300 ease-out`} 
          style={{ width: `${percentage}%` }} 
        />
      </div>
    </div>
  );
}
