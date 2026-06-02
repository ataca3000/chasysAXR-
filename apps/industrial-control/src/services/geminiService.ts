export async function getAgentRecommendations(
  telemetry: any,
  machineStatus: string,
): Promise<{ html: string; gcode: string[] }> {
  const prompt = `Eres un Agente de IA Industrial Experto operando un panel de control avanzado para fresadoras CNC y cortadoras de plasma.
Estás monitoreando sensores térmicos y láser en tiempo real de una línea de producción.

Datos de Telemetría Actual:
- Estado General: ${machineStatus}
- Temperatura de Husillo/Cabezal: ${telemetry.temperature}°C (Peligro > 800°C)
- Vibración Estructural: ${telemetry.vibration} mm/s (Advertencia > 5 mm/s)
- Carga de Trabajo: ${telemetry.load}%

Proporciona un análisis en formato JSON estricto con las siguientes claves:
{
  "html": "El análisis estructurado en HTML (solo etiquetas <b>, <ul>, <li>, <p> sin clase, sin formato markdown \`\`\`) detallando predicción de fallos y mantenimiento.",
  "gcode": ["M05", "G04 P2000"]
}

Sé muy técnico, conciso y responde en español como un sistema proactivo. No incluyas nada más que el JSON.`;

  const model =
    localStorage.getItem('agentBackendModel') ||
    import.meta.env.VITE_OLLAMA_MODEL ||
    'mistral';

  try {
    const response = await fetch('/api/ollama/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        format: 'json',
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Local model error ${response.status}`);
    }

    const data = await response.json();
    return {
      html:
        typeof data.html === 'string'
          ? data.html
          : typeof data.output === 'string'
          ? data.output
          : '<p>Respuesta vacía del modelo local.</p>',
      gcode: Array.isArray(data.gcode) ? data.gcode : [],
    };
  } catch (error: any) {
    console.error('Error fetching local model recommendations:', error);
    return {
      html: '<p>Error en la comunicación con el modelo local.</p>',
      gcode: [],
    };
  }
}
