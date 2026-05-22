import { RotateCcw, AlertTriangle } from 'lucide-react';

export function PredictiveMaintenanceView() {
  return (
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
  );
}
