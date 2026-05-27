import { GoogleGenerativeAI } from "@google/generative-ai"; // Importación corregida para el SDK de Gemini

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt, history, currentScene } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: "GEMINI_API_KEY faltante",
      message:
        "Puedes obtener una clave GRATIS en Google AI Studio (Gemini 1.5 Flash no cuesta nada) " +
        "o cambiar al modo local con Ollama en la configuración del agente.",
      link: "https://aistudio.google.com/",
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Configuramos el modelo con las declaraciones de herramientas del servidor MCP
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      tools: [
        {
          functionDeclarations: [
            {
              name: "send_serial_command",
              description:
                "Envía un comando G-Code o texto al hardware local vía puerto serie.",
              parameters: {
                type: "OBJECT",
                properties: {
                  port: {
                    type: "STRING",
                    description: "Puerto COM o /dev/tty",
                  },
                  command: {
                    type: "STRING",
                    description: "Comando G-Code (ej: G01 X10)",
                  },
                },
                required: ["port", "command"],
              },
            },
            {
              name: "publish_mqtt_message",
              description:
                "Publica un mensaje en un broker MQTT para control industrial remoto.",
              parameters: {
                type: "OBJECT",
                properties: {
                  brokerUrl: {
                    type: "STRING",
                    description: "URL del broker (mqtt://...)",
                  },
                  topic: { type: "STRING", description: "Tópico de control" },
                  payload: {
                    type: "STRING",
                    description: "Mensaje JSON o texto",
                  },
                },
                required: ["brokerUrl", "topic", "payload"],
              },
            },
          ],
        },
      ],
    });

    const systemInstruction = `You are JARVIS-CPS, an industrial cyber-physical assistant. 
    Analyze the current 3D scene: ${JSON.stringify(currentScene)}.
    You can trigger local industrial actions using MCP tools.
    Respond ONLY with a JSON object: { 
      "message": "text explanation", 
      "actions": [
        { "type": "mcp_tool", "tool": "tool_name", "params": { ... } },
        { "type": "execute_gcode", "params": { "gcode": "G0..." } }
      ] 
    }`;

    const chat = model.startChat({
      history: history || [],
      generationConfig: {
        maxOutputTokens: 1000,
        responseMimeType: "application/json",
      },
    });

    const result = await chat.sendMessage(
      `${systemInstruction}\n\nUser: ${prompt}`,
    );
    const responseText = result.response.text();

    return res.status(200).json({ result: JSON.parse(responseText) });
  } catch (error) {
    console.error("Gemini Proxy Error:", error);
    return res.status(500).json({
      error: "Failed to communicate with Gemini",
      details: error.message,
    });
  }
}
