import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function TelemetryChart({ data, dataKey, color, label }: { data: any[], dataKey: string, color: string, label: string }) {
  const hasPoints = data.some((d) => typeof d[dataKey] === "number" && Number.isFinite(d[dataKey]));

  return (
    <div className="w-full h-48 bg-black/40 border border-white/5 rounded-lg p-4 shadow-sm flex flex-col">
      <h3 className="text-white mb-2 font-mono text-sm font-bold tracking-widest shrink-0">{label}</h3>
      {hasPoints ? (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`color-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />
              <XAxis dataKey="time" stroke="#64748b" tick={{fontSize: 10}} tickMargin={5} />
              <YAxis stroke="#475569" tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(val) => Math.round(val).toString()} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f8fafc' }}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#color-${dataKey})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center border border-dashed border-slate-800 rounded-lg px-4">
          <span className="text-xs font-mono text-slate-400">
            Esperando lecturas reales ({dataKey})
          </span>
          <span className="text-[10px] font-mono text-slate-500 mt-1">
            Conecta Arduino / Raspberry Pi por USB Serial, MQTT/WS o Sensores del Celular
          </span>
        </div>
      )}
    </div>
  );
}
