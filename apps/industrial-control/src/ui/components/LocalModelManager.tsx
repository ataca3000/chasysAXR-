import { useState, useEffect } from 'react';
import { Download, Play, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react';

interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

export function LocalModelManager() {
  const [localModels, setLocalModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  const fetchModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/ollama/api/tags');
      if (!res.ok) throw new Error("Could not reach Ollama. Is it running?");
      const data = await res.json();
      setLocalModels(data.models || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const pullModel = async (modelName: string) => {
    try {
      setPulling(modelName);
      setProgress('Starting download...');
      
      const response = await fetch('/api/ollama/api/pull', {
        method: 'POST',
        body: JSON.stringify({ name: modelName, stream: true }),
      });

      if (!response.body) throw new Error("No response body from Ollama.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const status = JSON.parse(line);
            if (status.status) setProgress(status.status + (status.completed ? ` (${Math.round((status.completed / status.total) * 100)}%)` : ''));
          } catch (e) {
            // Partial JSON chunk, ignore
          }
        }
      }
      
      setProgress('Success!');
      setTimeout(() => {
        setPulling(null);
        fetchModels();
      }, 2000);
      
    } catch (err: any) {
      setError(`Failed to pull ${modelName}: ${err.message}`);
      setPulling(null);
    }
  };

  const deleteModel = async (modelName: string) => {
    if (!confirm(`Are you sure you want to delete ${modelName}?`)) return;
    try {
      await fetch('/api/ollama/api/delete', {
        method: 'DELETE',
        body: JSON.stringify({ name: modelName }),
      });
      fetchModels();
    } catch (err: any) {
      setError(`Failed to delete: ${err.message}`);
    }
  };

  const recommendedModels = [
    { name: 'llama3.1:8b', label: 'Llama 3.1 (8B) - El Estándar' },
    { name: 'qwen2.5:7b', label: 'Qwen 2.5 (7B) - Muy Potente' },
    { name: 'deepseek-v2.5', label: 'DeepSeek v2.5 - Excelente Chat' },
    { name: 'mistral-nemo', label: 'Mistral Nemo (12B) - Calidad Superior' },
    { name: 'codestral', label: 'Codestral - Programación Pro' },
    { name: 'gemma2:9b', label: 'Gemma 2 (9B) - Google SOTA' },
    { name: 'phi3:mini', label: 'Phi-3 Mini (3.8B) - Ultraligero' },
    { name: 'moondream', label: 'Moondream (Vision) - Análisis Imagen' },
    { name: 'nomic-embed-text', label: 'Nomic Embed - Vectores/RAG' }
  ];

  const [customModel, setCustomModel] = useState('');

  return (
    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6 backdrop-blur-xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Download className="text-google-blue" size={24} />
            Gestor de Modelos Locales
          </h2>
          <p className="text-slate-400 text-sm mt-1">Implementa modelos Llama, Mistral y más de forma directa mediante Ollama.</p>
        </div>
        <button 
          onClick={fetchModels}
          className="bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-mono transition-colors border border-white/10"
        >
          ACTUALIZAR ESTADO
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-4 rounded-lg mb-6 flex items-center gap-3 text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
          <a href="https://ollama.com" target="_blank" rel="noreferrer" className="underline ml-auto">Instalar Ollama</a>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Modelos Recomendados */}
        <div>
          <h3 className="text-slate-500 font-bold text-[10px] tracking-widest uppercase mb-3">MODELOS RECOMENDADOS</h3>
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {recommendedModels.map(model => {
              const isDownloaded = localModels.some(m => m.name.startsWith(model.name));
              const isPulling = pulling === model.name;

              return (
                <div key={model.name} className="bg-black/40 border border-white/5 rounded-lg p-3 flex items-center justify-between group hover:border-white/20 transition-all">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white">{model.label}</div>
                    <div className="text-[10px] text-slate-500 font-mono uppercase">{model.name}</div>
                  </div>
                  
                  {isDownloaded ? (
                    <div className="flex items-center gap-2 text-google-green text-[10px] font-bold">
                      <CheckCircle2 size={14} /> INSTALADO
                    </div>
                  ) : (
                    <button 
                      onClick={() => pullModel(model.name)}
                      disabled={!!pulling}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-2 ${isPulling ? 'bg-google-blue/20 text-google-blue' : 'bg-google-blue text-white hover:bg-blue-600 shadow-[0_0_10px_rgba(66,133,244,0.3)]'}`}
                    >
                      {isPulling ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      {isPulling ? 'BAJANDO' : 'INSTALAR'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-white/5 border border-dashed border-white/10 rounded-lg">
             <h4 className="text-[9px] text-slate-500 font-bold tracking-widest uppercase mb-2">Instalación Manual</h4>
             <div className="flex gap-2">
                <input 
                  type="text" 
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="nombre-modelo:tag"
                  className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-google-blue/50"
                />
                <button 
                  onClick={() => {
                    if (customModel.trim()) {
                      pullModel(customModel.trim());
                      setCustomModel('');
                    }
                  }}
                  disabled={!!pulling || !customModel.trim()}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-[10px] font-bold transition-colors disabled:opacity-50"
                >
                  PULL
                </button>
             </div>
          </div>
        </div>

        {/* Modelos Instalados */}
        <div>
          <h3 className="text-slate-500 font-bold text-[10px] tracking-widest uppercase mb-3">INSTALADOS EN LOCAL</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="text-slate-500 animate-spin" size={24} />
              </div>
            ) : localModels.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-white/10 rounded-lg text-slate-500 text-sm">
                No hay modelos instalados
              </div>
            ) : (
              localModels.map(model => (
                <div key={model.name} className="bg-white/5 border border-white/5 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <Play size={12} className="text-google-green" />
                      {model.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      SIZE: {(model.size / (1024 * 1024 * 1024)).toFixed(2)} GB | MODIFIED: {new Date(model.modified_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteModel(model.name)}
                    className="p-2 text-slate-500 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {pulling && (
        <div className="mt-6 pt-6 border-t border-white/10">
           <div className="flex justify-between items-end mb-2">
              <div className="text-sm text-google-blue font-bold flex items-center gap-2">
                 <Loader2 size={16} className="animate-spin" />
                 DESCARGANDO {pulling.toUpperCase()}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">{progress}</div>
           </div>
           <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-google-blue shadow-[0_0_10px_rgba(66,133,244,0.5)] transition-all duration-300" 
                style={{ width: progress.includes('%') ? progress.split('(')[1].split('%')[0] + '%' : '100%' }}
              />
           </div>
        </div>
      )}
    </div>
  );
}
