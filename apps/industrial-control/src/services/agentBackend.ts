function buildPrompt(telemetry: any, machineStatus: string) {
  return `Eres un Agente de IA Industrial Experto operando un panel de control avanzado.\nEstado: ${machineStatus}\nLectura: ${JSON.stringify(telemetry)}\nDevuelve un JSON con keys { html: string, gcode: string[] }.`;
}

export async function getRecommendations(telemetry: any, machineStatus: string) {
  const backend =
    (localStorage.getItem('agentBackend') || import.meta.env.VITE_AGENT_BACKEND || 'ollama').toLowerCase();
  const model =
    localStorage.getItem('agentBackendModel') || import.meta.env.VITE_OLLAMA_MODEL || 'mistral';
  const prompt = buildPrompt(telemetry, machineStatus);

  if (backend === 'ollama' || backend === 'local') {
    try {
      const resp = await fetch('/api/ollama/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, format: 'json', stream: false }),
      });

      if (!resp.ok) {
        throw new Error(`Local model responded with ${resp.status}`);
      }

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
        return {
          html: parsed.html || text,
          gcode: Array.isArray(parsed.gcode) ? parsed.gcode : [],
        };
      } catch {
        return { html: `<pre>${text.substring(0, 500)}</pre>`, gcode: [] };
      }
    } catch (err) {
      console.warn('Local Ollama call failed:', err);
    }
  }

  return { html: '<p>No hay modelo local disponible.</p>', gcode: [] };
}

export async function checkLocalBackendHealth() {
  try {
    const resp = await fetch('/api/ollama/api/models');
    return resp.ok;
  } catch {
    return false;
  }
}

export default { getRecommendations, checkLocalBackendHealth };
