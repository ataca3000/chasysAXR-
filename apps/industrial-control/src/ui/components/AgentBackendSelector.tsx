import { useEffect, useState } from 'react';
import { checkLocalBackendHealth } from '../../services/agentBackend';

export function AgentBackendSelector() {
  const [backend, setBackend] = useState<string>(() => localStorage.getItem('agentBackend') || (import.meta.env.VITE_AGENT_BACKEND as any) || 'ollama');
  const [model, setModel] = useState<string>(() => localStorage.getItem('agentBackendModel') || (import.meta.env.VITE_OLLAMA_MODEL as any) || 'mistral');
  const [localHealthy, setLocalHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    if (backend === 'ollama' || backend === 'local') {
      checkLocalBackendHealth().then((ok) => { if (mounted) setLocalHealthy(ok); });
    } else {
      setLocalHealthy(null);
    }
    return () => { mounted = false; };
  }, [backend]);

  function save(b: string, m: string) {
    localStorage.setItem('agentBackend', b);
    localStorage.setItem('agentBackendModel', m);
    setBackend(b);
    setModel(m);
  }

  return (
    <div className="glass-panel p-3 mb-3">
      <h4 className="text-xs text-google-blue font-mono font-bold uppercase mb-2">Agent Backend</h4>
      <div className="flex gap-2 items-center">
        <select value={backend} onChange={(e) => save(e.target.value, model)} className="p-2 bg-black/40 text-sm">
          <option value="ollama">Ollama (Local)</option>
          <option value="local">Local (Proxy)</option>
        </select>

        <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="model (ej: mistral)" className="p-2 bg-black/40 text-sm flex-1" />
        <button onClick={() => save(backend, model)} className="px-3 py-2 bg-emerald-600 text-white text-xs">Guardar</button>
      </div>

      {localHealthy !== null && (
        <div className="mt-2 text-xs">
          Local backend: {localHealthy ? <span className="text-green-400">Disponible</span> : <span className="text-rose-400">No disponible</span>}
        </div>
      )}

      <div className="mt-2 text-[10px] text-slate-400">
        Usa Ollama local para privacidad y disponibilidad. Inicia Ollama en el puerto 11434 para que funcione correctamente.
      </div>
    </div>
  );
}