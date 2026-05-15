import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: 'DUMMY_GEMINI_KEY', // Replaced securely by the local server proxy
  httpOptions: {
    baseUrl: window.location.origin + '/api/gemini'
  }
});

export async function getAgentRecommendations(
  telemetry: any,
  machineStatus: string
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
  "gcode": ["M05", "G04 P2000"] // Un arreglo (array) de strings, cada uno un comando de código G (G-code) para acciones correctivas, o un arreglo vacío si no se necesita.
}

Sé muy técnico, conciso y responde en español como un sistema proactivo. No incluyas nada más que el JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    if (response.text) {
        const parsed = JSON.parse(response.text);
        return {
            html: parsed.html || '<p>Análisis completado pero sin formato esperado.</p>',
            gcode: parsed.gcode || []
        }
    }
    return { html: '<p>No se pudo generar el análisis.</p>', gcode: [] };
  } catch (error: any) {
    console.error('Error fetching Gemini recommendations:', error);
    throw new Error(`Error en la comunicación con el servicio de IA: ${error.message || 'Desconocido'}`);
  }
}
