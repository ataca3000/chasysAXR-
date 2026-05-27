import { Thermometer } from 'lucide-react';

export function ThermalImagingView() {
  return (
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
  );
}
