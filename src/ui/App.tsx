import { useState, useEffect, useRef } from 'react';
import { Activity, Thermometer, Cpu, AlertTriangle, Zap, CheckCircle2, RotateCcw, MonitorSmartphone, X, Wrench, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DigitalTwin from './components/DigitalTwin';
import { TelemetryChart } from './components/TelemetryCharts';
import { getAgentRecommendations } from '../services/geminiService';
import { CameraFeeds } from './components/CameraFeeds';
import { HardwareControl } from './components/HardwareControl';
import { VisionAnalyzer } from './components/VisionAnalyzer';
import { ARCameraLayer } from './components/ARCameraLayer';
import { hardware } from '../services/hardwareController';
import { VoiceAssistant } from './components/VoiceAssistant';
import { AssemblyLab } from './components/AssemblyLab';
import { MobileScanner } from './components/MobileScanner';
import { LocalModelManager } from './components/LocalModelManager';
import { JarvisCompanion } from './components/JarvisCompanion';

export default function App() {
  const isMobileScanner = window.location.search.includes('role=mobile-cam');
  if (isMobileScanner) {
    return <MobileScanner />;
  }

  const [telemetryHistory, setTelemetryHistory] = useState<any[]>([]);
  const [currentTelemetry, setCurrentTelemetry] = useState({ temperature: 300, vibration: 1.2, load: 45 });
  const [aiInsights, setAiInsights] = useState<{html: string, gcode: string[]} | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [arModeActive, setArModeActive] = useState(false);
  const [kioskMode, setKioskMode] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [enabledSensors, setEnabledSensors] = useState<string[]>(['thermal', 'vibration', 'load']);

  const toggleSensorLibrary = (sensor: string) => {
    setEnabledSensors(prev => 
      prev.includes(sensor) ? prev.filter(s => s !== sensor) : [...prev, sensor]
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

  const [activeView, setActiveView] = useState('command_center');

  const [isCriticalAlarm, setIsCriticalAlarm] = useState(false);
  const lastHardwareUpdateRef = useRef<number>(0);

  const watchdogRef = useRef<number | null>(null);

  // Hook real-time events from hardware to React State
  useEffect(() => {
    hardware.onSensorData = (data) => {
      lastHardwareUpdateRef.current = Date.now();
      setIsCriticalAlarm(false); // Clear disconnected state if we get data
      
      const newTemp = data.temp !== undefined ? data.temp : data.temperature;
      const newVib = data.vib !== undefined ? data.vib : data.vibration;
      const newLoad = data.load !== undefined ? data.load : undefined;

      if (newTemp !== undefined || newVib !== undefined || newLoad !== undefined) {
         setCurrentTelemetry(prev => ({
           temperature: newTemp !== undefined ? newTemp : prev.temperature,
           vibration: newVib !== undefined ? newVib : prev.vibration,
           load: newLoad !== undefined ? newLoad : prev.load
         }));
      }
    };
    
    hardware.onError = (errText) => {
      setSystemError(`Hardware Error: ${errText}`);
    };

    // Watchdog timer: If hardware connected but no data for 5 seconds, trigger critical alarm
    watchdogRef.current = window.setInterval(() => {
      if (lastHardwareUpdateRef.current > 0 && Date.now() - lastHardwareUpdateRef.current > 5000) {
         setIsCriticalAlarm(true);
      }
    }, 1000);

    return () => {
       if (watchdogRef.current) clearInterval(watchdogRef.current);
    }
  }, []);

  const isCritical = isCriticalAlarm || currentTelemetry.temperature > 800 || currentTelemetry.vibration > 5 || currentTelemetry.load > 85;

  // We removed the local `setInterval` simulator so we can rely purely on the hardware Controller for telemetry.
  // This satisfies the "replace the current simulated data" requirement.
  
  // Make sure we have some initial telemetry history to prevent crash.
  useEffect(() => {
    const initialData = Array.from({ length: 20 }).map((_, i) => ({
      time: i.toString(),
      temperature: 300,
      vibration: 1,
      load: 40
    }));
    setTelemetryHistory(initialData);
  }, []);

  // Update history based on currentTelemetry changes (so both simulator and hardware populate history)
  useEffect(() => {
    let timeRaw = new Date().getTime();
    setTelemetryHistory(prev => {
      const newPoint = {
        time: timeRaw.toString().slice(-6), 
        temperature: currentTelemetry.temperature,
        vibration: currentTelemetry.vibration,
        load: currentTelemetry.load
      };
      const newData = [...prev, newPoint];
      if (newData.length > 20) newData.shift();
      return newData;
    });
  }, [currentTelemetry]);


  const fetchAiAnalysis = async () => {
    setLoadingAi(true);
    setSystemError(null);
    try {
      const status = currentTelemetry.temperature > 800 ? "ALERTA CRÍTICA" : "NORMAL";
      const insights = await getAgentRecommendations(currentTelemetry, status);
      setAiInsights(insights);
    } catch (err: any) {
      setSystemError(err.message || 'Error occurred while contacting Gemini AI.');
      setAiInsights({ html: '<p class="text-rose-600">Analysis failed due to connection error. Please try again.</p>', gcode: [] });
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className={`min-h-screen bg-zinc-950 text-slate-300 font-sans flex flex-col md:flex-row overflow-hidden relative ${kioskMode ? 'fixed inset-0 z-50 p-2 lg:p-4 bg-black' : ''}`}>
      
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
                <p className="text-sm font-mono mt-1 opacity-90">{systemError}</p>
              </div>
              <button 
                onClick={() => setSystemError(null)} 
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
              <h1 className="font-bold text-xl tracking-tight leading-tight text-white drop-shadow-sm font-display uppercase">1/0 Goopilot iAgnt</h1>
              <p className="text-[10px] text-google-blue font-mono tracking-[0.2em] font-semibold">AI CO-PILOT SYSTEM</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2 flex-grow">
            <NavItem active={activeView === 'command_center'} onClick={() => setActiveView('command_center')} icon={<Activity size={18} />} label="COMMAND CENTER" />
            <NavItem active={activeView === 'thermal_imaging'} onClick={() => setActiveView('thermal_imaging')} icon={<Thermometer size={18} />} label="VISIÓN ESPECTRAL" />
            <NavItem active={activeView === 'plasma_cutting'} onClick={() => setActiveView('plasma_cutting')} icon={<Zap size={18} />} label="INTEGRACIÓN LIBRERÍAS" />
            <NavItem active={activeView === 'predictive_maint'} onClick={() => setActiveView('predictive_maint')} icon={<RotateCcw size={18} />} label="SENSÓRICA & MONITOREO" />
            <NavItem active={activeView === 'assembly_lab'} onClick={() => setActiveView('assembly_lab')} icon={<Wrench size={18} />} label="LÍNEA DE PRODUCCIÓN" />
            <NavItem active={activeView === 'ai_models'} onClick={() => setActiveView('ai_models')} icon={<Cpu size={18} />} label="AI MODELS (LOCAL)" />
            <NavItem active={activeView === 'jarvis_companion'} onClick={() => setActiveView('jarvis_companion')} icon={<Bot size={18} />} label="JARVIS COMPANION (3D)" />
          </nav>

          <div className="mt-auto relative z-10">
            <div className={`p-4 rounded-lg border ${isCritical ? 'bg-black/60 border-google-red/50 shadow-[0_0_15px_rgba(234,67,53,0.15)]' : 'bg-black/40 border-white/10'}`}>
              <h4 className={`text-xs mb-1 font-mono ${isCritical ? 'text-google-red font-semibold' : 'text-slate-400'}`}>SYSTEM STATUS</h4>
              <div className="flex items-center gap-2">
                {isCritical ? <AlertTriangle className="text-google-red w-5 h-5 drop-shadow-[0_0_5px_rgba(234,67,53,0.4)]" /> : <CheckCircle2 className="text-google-green w-5 h-5" />}
                <span className={`font-semibold ${isCritical ? 'text-google-red drop-shadow-[0_0_2px_rgba(234,67,53,0.3)]' : 'text-slate-300'}`}>
                   {isCritical ? "ATENCIÓN REQUERIDA" : "OPERANDO (ADAPTATIVO)"}
                </span>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
               <h4 className="text-[10px] text-slate-500 mb-2 font-mono font-bold tracking-widest uppercase">LIBRERÍAS DE SENSORES</h4>
               <div className="grid grid-cols-2 gap-2">
                  <SensorChip label="TERMICO" active={enabledSensors.includes('thermal')} onClick={() => toggleSensorLibrary('thermal')} />
                  <SensorChip label="VIBRO" active={enabledSensors.includes('vibration')} onClick={() => toggleSensorLibrary('vibration')} />
                  <SensorChip label="CARGA" active={enabledSensors.includes('load')} onClick={() => toggleSensorLibrary('load')} />
                  <SensorChip label="CAUDAL" active={enabledSensors.includes('flow')} onClick={() => toggleSensorLibrary('flow')} />
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
               <h2 className="text-4xl font-black tracking-widest text-white font-display uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">KIOSCO LÍNEA DE PRODUCCIÓN</h2>
             </div>
             <div className="flex gap-4">
                <button 
                  onClick={toggleKioskMode} 
                  className="px-8 py-4 bg-black border-2 border-white/20 rounded-xl text-2xl font-bold text-slate-300 hover:bg-white/5 transition-all shadow-sm">
                  SALIR DEL KIOSCO
                </button>
             </div>
          </div>
          
          <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 min-h-0">
             {/* 3D Visualizer - 2/3 width */}
             <div className="flex-[2] glass-panel border-2 border-slate-200 rounded-2xl relative overflow-hidden flex flex-col shadow-sm">
               <div className="absolute top-4 left-4 z-30 bg-white/90 border border-slate-200 p-3 rounded-lg backdrop-blur-md shadow-sm">
                 <h3 className="text-slate-700 font-mono font-bold text-xl"><Activity className="inline mr-2 mt(-1) w-6 h-6 text-slate-500"/> SINCRONIZACIÓN SENSORIAL</h3>
               </div>
                <div className="flex-1 relative z-20 pointer-events-auto">
                  <DigitalTwin telemetry={currentTelemetry} arMode={arModeActive} history={telemetryHistory} enabledSensors={enabledSensors} />
                </div>
               <ARCameraLayer isActive={arModeActive} />
             </div>
             
             {/* Large Telemetry & Controls - 1/3 width */}
             <div className="flex-1 flex flex-col gap-6">
                <div className="glass-panel p-8 rounded-2xl flex-1 flex flex-col justify-center gap-10">
                   <KioskMetric label="CARGA OPERACIONAL" value={currentTelemetry.load} max={100} unit="%" isCritical={currentTelemetry.load > 85} />
                   <KioskMetric label="NIVEL TÉRMICO" value={currentTelemetry.temperature} max={1000} unit="°C" isCritical={currentTelemetry.temperature > 800} />
                   <KioskMetric label="VIBRACIÓN LOCAL" value={currentTelemetry.vibration} max={10} unit="mm/s" isCritical={currentTelemetry.vibration > 5} />
                </div>
                
                <div className="grid grid-cols-2 gap-4 shrink-0 h-[220px]">
                  <button 
                    onClick={() => setArModeActive(!arModeActive)} 
                    className={`rounded-2xl border border-white/10 text-2xl font-black tracking-wider transition-all flex flex-col items-center justify-center gap-2 font-display ${arModeActive ? 'bg-google-blue text-white shadow-[0_0_20px_rgba(66,133,244,0.4)]' : 'bg-black/60 text-slate-300 hover:bg-white/5'}`}>
                    <Activity size={40} />
                    {arModeActive ? 'AR ON' : 'AR OFF'}
                  </button>
                  <button 
                    onClick={fetchAiAnalysis}
                    disabled={loadingAi}
                    className="rounded-2xl border border-white/10 bg-black/60 text-google-blue hover:bg-white/5 text-2xl font-black tracking-wider transition-all flex flex-col items-center justify-center gap-2 font-display disabled:opacity-50">
                    <Cpu size={40} />
                    {loadingAi ? 'WAIT...' : 'AI CHECK'}
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
            <h2 className="text-2xl font-semibold tracking-tight text-white font-display uppercase text-neon-google">CNC TELEMETRY & SUPERVISION</h2>
          </div>
          <div className="flex gap-3">
             <button 
              onClick={toggleKioskMode}
              className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-all border ${
                kioskMode ? 'bg-white/10 text-slate-200 border-white/20 shadow-sm' : 'bg-black/40 text-slate-300 border-white/10 hover:bg-white/5 hover:border-white/20 hover:shadow-sm'
              }`}
            >
              <MonitorSmartphone size={16} />
              {kioskMode ? 'EXIT KIOSK MODE' : 'PLANT FLOOR KIOSK'}
            </button>
            <button 
              onClick={() => setArModeActive(!arModeActive)}
              className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-all border ${
                arModeActive ? 'bg-google-blue text-white border-google-blue shadow-[0_0_10px_rgba(66,133,244,0.3)]' : 'bg-black/40 text-slate-300 border-white/10 hover:bg-white/5 hover:border-white/20 hover:shadow-sm'
              }`}
            >
              <Activity size={16} />
              {arModeActive ? 'AR MAPPING ACTIVE' : 'INIT AR OVERLAY'}
            </button>
            <button 
              onClick={fetchAiAnalysis}
              disabled={loadingAi}
              className="bg-black hover:bg-white/5 border border-white/10 px-4 py-2 rounded-md font-medium text-sm text-google-blue flex items-center gap-2 disabled:opacity-50 shadow-sm transition-all"
            >
              <Cpu size={16} />
              {loadingAi ? 'ANALYZING...' : 'GEMINI AI ANALYSIS'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
          
          {activeView === 'command_center' && (
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
                                  {aiInsights.gcode.map((g, i) => <div key={i}>{g}</div>)}
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
          )}

          {activeView === 'thermal_imaging' && (
            <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              <div className="glass-panel p-6 flex flex-col items-center justify-center relative bg-black/60">
                 <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-900/40 via-transparent to-transparent animate-pulse"></div>
                 <Thermometer size={64} className="mb-4 text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]" />
                 <h2 className="text-2xl font-display text-white font-bold tracking-widest mb-2 z-10 uppercase">THERMAL CORTEX INITIALIZING</h2>
                 <p className="text-slate-400 text-sm max-w-md text-center z-10 font-mono">Calibrating infrared sensor array. Establishing handshake with Modbus thermal probes. Waiting for environmental baseline...</p>
                 <div className="w-full max-w-sm h-1 bg-white/10 mt-6 rounded overflow-hidden">
                    <div className="h-full bg-rose-500 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_10px_rgba(244,63,94,0.8)]" style={{width: '60%'}}></div>
                 </div>
              </div>
              <div className="glass-panel p-6 relative">
                 <h3 className="text-google-blue font-mono text-[10px] uppercase font-bold tracking-widest mb-6 border-b border-white/10 pb-3">THERMAL ZONES STATUS</h3>
                 <div className="space-y-5 font-mono text-xs">
                    <div className="flex justify-between items-center p-3 rounded bg-white/5 border border-white/5"><span className="text-slate-300">SPINDLE CASING</span><span className="text-rose-500 font-bold animate-pulse text-sm shadow-[0_0_15px_rgba(244,63,94,0.2)]">842 °C</span></div>
                    <div className="flex justify-between items-center p-3 rounded bg-white/5 border border-white/5"><span className="text-slate-300">Z-AXIS MOTORS</span><span className="text-orange-500 text-sm font-bold">145 °C</span></div>
                    <div className="flex justify-between items-center p-3 rounded bg-white/5 border border-white/5"><span className="text-slate-300">COOLANT RESERVOIR</span><span className="text-cyan-500 text-sm font-bold">42 °C</span></div>
                    <div className="flex justify-between items-center p-3 rounded bg-white/5 border border-white/5"><span className="text-slate-300">POWER SUPPLY UNIT</span><span className="text-emerald-500 text-sm font-bold">55 °C</span></div>
                 </div>
              </div>
            </div>
          )}

          {activeView === 'plasma_cutting' && (
            <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              <div className="glass-panel p-6 flex flex-col items-center justify-center relative bg-black/60 border-yellow-500/20">
                 <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-900/20 via-transparent to-transparent animate-pulse"></div>
                 <Zap size={64} className="mb-4 text-yellow-500 animate-[pulse_0.5s_infinite] drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                 <h2 className="text-2xl font-display text-yellow-500 font-bold tracking-widest mb-2 z-10 uppercase">PLASMA IGNITION OFFLINE</h2>
                 <p className="text-slate-400 text-sm max-w-md text-center z-10 font-mono">Gas pressure below operational threshold. Please check argon/nitrogen mix supply lines. Safety interlock engaged.</p>
                 <button className="mt-8 border border-yellow-500/50 hover:border-yellow-400 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 px-6 py-3 rounded-lg font-display text-sm tracking-widest font-bold transition-all shadow-[0_0_10px_rgba(234,179,8,0.2)]">OVERRIDE INTERLOCK</button>
              </div>
              <div className="glass-panel p-6">
                 <h3 className="text-yellow-500 font-mono text-[10px] tracking-widest font-bold mb-6 border-b border-white/10 pb-3 uppercase">PLASMA PARAMETERS</h3>
                 <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-2 font-mono"><span>CURRENT (A)</span><span className="text-slate-200">0 / 120 A</span></div>
                      <div className="h-1 bg-white/10 rounded"><div className="h-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]" style={{width: '0%'}}></div></div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-2 font-mono"><span>GAS PRESSURE</span><span className="text-slate-200">12 / 85 PSI</span></div>
                      <div className="h-1 bg-white/10 rounded"><div className="h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" style={{width: '14%'}}></div></div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-2 font-mono"><span>WATER SHIELD FLOW</span><span className="text-slate-200">OFF</span></div>
                      <div className="h-1 bg-white/10 rounded"><div className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" style={{width: '0%'}}></div></div>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeView === 'predictive_maint' && (
            <div className="xl:col-span-3 flex flex-col h-full glass-panel p-6">
              <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                <RotateCcw size={36} className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                <div>
                  <h2 className="text-2xl font-display text-white font-bold tracking-widest uppercase">PREDICTIVE MAINTENANCE AI</h2>
                  <p className="text-slate-400 text-xs font-mono">Powered by Ultron LLM Analysis</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs flex-1">
                 <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-5 flex flex-col shadow-[0_0_15px_rgba(244,63,94,0.1)] relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/20 blur-2xl"></div>
                   <div className="text-rose-400 font-bold tracking-widest mb-3 flex items-center gap-1"><AlertTriangle size={14}/> URGENT</div>
                   <div className="text-white text-lg font-display mb-1 font-bold">SPINDLE BEARINGS</div>
                   <div className="text-slate-300 mb-4 mt-auto leading-relaxed">Vibration signature indicates 92% probability of failure in next 48h.</div>
                   <button className="w-full mt-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-400 font-bold py-2.5 rounded transition-all">ORDER REPLACEMENT</button>
                 </div>
                 
                 <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-5 flex flex-col relative overflow-hidden">
                   <div className="text-orange-400 font-bold tracking-widest mb-3">WARNING</div>
                   <div className="text-white text-lg font-display mb-1 font-bold">X-AXIS LEAD SCREW</div>
                   <div className="text-slate-300 mb-4 mt-auto leading-relaxed">Lubrication viscosity low. Backlash increased by 0.02mm over last 100 cycles.</div>
                   <button className="w-full mt-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-400 font-bold py-2.5 rounded transition-all">SCHEDULE LUBE</button>
                 </div>

                 <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 flex flex-col relative overflow-hidden">
                   <div className="text-emerald-400 font-bold tracking-widest mb-3">OPTIMAL</div>
                   <div className="text-white text-lg font-display mb-1 font-bold">Y/Z ACTUATORS</div>
                   <div className="text-slate-300 mb-4 mt-auto leading-relaxed">Operating within normal parameters. Estimated remaining life: 14,000h.</div>
                   <div className="mt-2 text-center text-emerald-400 font-bold bg-emerald-500/20 py-2.5 rounded border border-emerald-500/30">NO ACTION REQUIRED</div>
                 </div>
              </div>
            </div>
          )}

          {activeView === 'assembly_lab' && (
            <AssemblyLab />
          )}

          {activeView === 'ai_models' && (
            <div className="xl:col-span-3">
              <LocalModelManager />
            </div>
          )}

          {activeView === 'jarvis_companion' && (
            <div className="xl:col-span-3 h-[calc(100vh-120px)]">
              <JarvisCompanion />
            </div>
          )}
        </div>
      </main>
      )}
      <VoiceAssistant onError={(msg) => setSystemError(msg)} />
    </div>
  );
}

// Helpers
function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all border font-mono font-medium tracking-wide ${
      active 
        ? 'bg-white/10 text-white border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
        : 'text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200'
    }`}>
      {icon}
      <span>{label}</span>
    </button>
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

function KioskMetric({ label, value, max, unit, isCritical }: { label: string, value: number, max: number, unit: string, isCritical: boolean }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="flex flex-col gap-2">
       <div className="flex justify-between items-end">
          <span className="text-sm font-bold tracking-widest text-slate-400 font-mono">{label}</span>
          <span className={`text-5xl font-display font-black tracking-tighter ${isCritical ? 'text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]' : 'text-slate-200'}`}>
             {value.toFixed(1)}<span className="text-3xl ml-1 text-slate-500 font-sans tracking-normal">{unit}</span>
          </span>
       </div>
       <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden shadow-inner">
         <div 
           className={`h-full transition-all duration-300 ease-out ${isCritical ? 'bg-rose-500 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.8)]' : 'bg-google-blue shadow-[0_0_10px_rgba(66,133,244,0.6)]'}`} 
           style={{ width: `${percentage}%` }} 
         />
       </div>
    </div>
  );
}

function SensorChip({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`px-2 py-1 rounded text-[8px] font-bold tracking-tighter border transition-all ${
        active 
        ? 'bg-google-blue/20 border-google-blue text-white shadow-[0_0_5px_rgba(66,133,244,0.3)]' 
        : 'bg-black/40 border-white/10 text-slate-500 hover:border-white/20'
      }`}
    >
      {label}
    </button>
  );
}
