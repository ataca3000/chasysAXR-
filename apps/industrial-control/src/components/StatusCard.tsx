export function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="status-card p-4 rounded-2xl border border-slate-700 bg-slate-950/80">
      <div className="text-sm uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}
