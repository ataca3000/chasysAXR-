import * as gemini from './geminiService';

function buildPrompt(telemetry: any, machineStatus: string) {
  return `Eres un Agente de IA Industrial Experto operando un panel de control avanzado.\n
Estado: ${machineStatus}\n
Lectura: ${JSON.stringify(telemetry)}\n
Devuelve un JSON con keys { html: string, gcode: string[] }.`;
}

export async function getRecommendations(telemetry: any, machineStatus: string) {
  const backend = (localStorage.getItem('agentBackend') || import.meta.env.VITE_AGENT_BACKEND || 'gemini').toLowerCase();
  if (backend === 'ollama' || backend === 'local') {
    const model = localStorage.getItem('agentBackendModel') || import.meta.env.VITE_OLLAMA_MODEL || 'mistral';
    const prompt = buildPrompt(telemetry, machineStatus);

    try {
      const resp = await fetch(`/api/ollama/run/${encodeURIComponent(model)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (resp.ok) {
        // Ollama may return text or JSON; attempt JSON then fallback to text parse
        const ct = resp.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const j = await resp.json();
          return {
            html: j.html || j.output || '<p>Respuesta vacía del modelo local.</p>',
            gcode: Array.isArray(j.gcode) ? j.gcode : [],
          };
        }
        const text = await resp.text();
        try {
          const parsed = JSON.parse(text);
          return { html: parsed.html || text, gcode: Array.isArray(parsed.gcode) ? parsed.gcode : [] };
        } catch {
          return { html: `<pre>${text.substring(0, 500)}</pre>`, gcode: [] };
        }
      }
    } catch (err) {
      console.warn('Local Ollama call failed, falling back to Gemini:', err);
    }
  }

  // Default: use Gemini cloud proxy
  return gemini.getAgentRecommendations(telemetry, machineStatus);
}

export async function checkLocalBackendHealth() {
  try {
    const resp = await fetch('/api/ollama/models');
    return resp.ok;
  } catch {
    return false;
  }
}

export default { getRecommendations, checkLocalBackendHealth };
