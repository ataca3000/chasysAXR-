import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware } from "http-proxy-middleware";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI(process.env.GEMINI_API_KEY || "");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Endpoint to get the local network IP so the QR code can use it instead of localhost
  app.get("/api/network-info", (req, res) => {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    let localIp = '';
    
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (net.family === 'IPv4' && !net.internal) {
          localIp = net.address;
          break;
        }
      }
      if (localIp) break;
    }
    
    res.json({ ip: localIp || 'localhost' });
  });

  // Proxy Gemini API to hide the API key from the client
  const geminiProxy = createProxyMiddleware({
    target: 'https://generativelanguage.googleapis.com',
    changeOrigin: true,
    ws: true, // Enable websocket proxy
    pathRewrite: {
      '^/api/gemini': '',
    },
    on: {
      proxyReq: (proxyReq, req, res) => {
        // Add API key header for standard requests
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
          proxyReq.setHeader('x-goog-api-key', apiKey);
        }
      },
      proxyReqWs: (proxyReqWs, req, socket, options, head) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
          proxyReqWs.setHeader('x-goog-api-key', apiKey);
        }
      }
    }
  });

  // Intercept the URL to add the key as a query param for WebSockets since browsers can't set WS headers
  const geminiInterceptor = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (req.url.includes('key=DUMMY_KEY')) {
      req.url = req.url.replace('key=DUMMY_KEY', `key=${apiKey}`);
    } else if (req.url.includes('key=DUMMY_GEMINI_KEY')) {
      req.url = req.url.replace('key=DUMMY_GEMINI_KEY', `key=${apiKey}`);
    } else if (!req.url.includes('key=') && apiKey) {
      const separator = req.url.includes('?') ? '&' : '?';
      req.url = `${req.url}${separator}key=${apiKey}`;
    }
    next();
  };

  app.use('/api/gemini', geminiInterceptor, geminiProxy);

  // Ollama Proxy to allow frontend to communicate with local Ollama instance
  const ollamaProxy = createProxyMiddleware({
    target: 'http://localhost:11434',
    changeOrigin: true,
    pathRewrite: {
      '^/api/ollama': '',
    },
    on: {
      error: (_err, _req, res) => {
        (res as any).status(503).json({ error: "Ollama is not running. Please start Ollama on your machine." });
      }
    }
  });
  app.use('/api/ollama', ollamaProxy);

  // API Route to chat with the design companion (Jarvis)
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, history, currentScene } = req.body;

      const model = ai.getGenerativeModel({
        model: "gemini-2.0-flash", // Using a stable model name
      });

      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `User Prompt: ${prompt}
        
HISTORY:
${JSON.stringify(history)}

CURRENT SCENE STATE:
${JSON.stringify(currentScene)}
` }] }],
        generationConfig: {
          systemInstruction: `You are Jarvis, a collaborative engineering and design companion focused on 3D prototyping and product creation.
The user will give you instructions to create or modify a 3D scene.
Your primary role is to interpret the user's creative requests and return a JSON object that strictly adheres to the schema.
You perceive a blank 3D canvas and populate it with shapes based on the user's prompt. You learn from their preferences.
You can create generic parametric shapes (box, sphere, cylinder, cone, torus).
In the JSON, you MUST provide an array of 'shapes', each with an id, type, position [x,y,z], rotation [x,y,z], scale [x,y,z], and hex color.
You must also provide a 'message' which is your companion response to the user.

Keep your message concise, helpful, and engineering-focused.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              message: {
                type: Type.STRING,
                description: "Your conversational response as the Jarivs-like companion.",
              },
              shapes: {
                type: Type.ARRAY,
                description: "The complete array of shapes that should currently exist in the scene. If modifying, include both the modified and unmodified existing shapes.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING, description: "One of: box, sphere, cylinder, cone, torus" },
                    position: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                    rotation: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                    scale: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                    color: { type: Type.STRING, description: "Hex color code" },
                    wireframe: { type: Type.BOOLEAN, description: "Whether to render as wireframe" }
                  },
                  required: ["id", "type", "position", "rotation", "scale", "color"]
                }
              }
            },
            required: ["message", "shapes"]
          }
        },
      });

      res.json({ result: JSON.parse(response.response.text() || "{}") });
    } catch (error) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: "Failed to process request." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // REQUIRED for http-proxy-middleware to handle websocket upgrades!
  server.on('upgrade', (req, socket, head) => {
    if (req.url?.startsWith('/api/gemini')) {
      // Apply the same URL interceptor logic for WS upgrades since Express middleware doesn't run for upgrades
      const apiKey = process.env.GEMINI_API_KEY || '';
      if (req.url.includes('key=DUMMY_KEY')) {
        req.url = req.url.replace('key=DUMMY_KEY', `key=${apiKey}`);
      } else if (req.url.includes('key=DUMMY_GEMINI_KEY')) {
        req.url = req.url.replace('key=DUMMY_GEMINI_KEY', `key=${apiKey}`);
      } else if (!req.url.includes('key=') && apiKey) {
        const separator = req.url.includes('?') ? '&' : '?';
        req.url = `${req.url}${separator}key=${apiKey}`;
      }
      geminiProxy.upgrade(req, socket as any, head);
    }
  });
}

startServer();
