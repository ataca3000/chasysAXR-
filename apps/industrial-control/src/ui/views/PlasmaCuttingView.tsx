import { Zap } from 'lucide-react';

export function PlasmaCuttingView() {
  return (
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
  );
}
