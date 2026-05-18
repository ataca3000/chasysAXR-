import { Router } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

dotenv.config();

const router = Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const s3Client = new S3Client({
  region: process.env.AWS_REGION || process.env.VITE_AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/network-info", (_req, res) => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  let localIp = '';
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        localIp = net.address;
        break;
      }
    }
    if (localIp) break;
  }
  
  res.json({ ip: localIp || 'localhost' });
});

router.post("/chat", async (req, res) => {
  try {
    const { prompt, history, currentScene } = req.body;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: 'user', parts: [{ text: `User Prompt: ${prompt}
      
HISTORY:
${JSON.stringify(history)}

CURRENT SCENE STATE:
${JSON.stringify(currentScene)}
` }] }],
      config: {
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

    res.json({ result: JSON.parse(response.text || "{}") });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "Failed to process request." });
  }
});

export default router;

// S3 presign endpoint (server-side). The frontend should call this to get a PUT presigned URL.
router.post('/s3/presign', async (req, res) => {
  try {
    const { key, contentType, expiresIn } = req.body;
    if (!process.env.S3_BUCKET) return res.status(400).json({ error: 'S3_BUCKET env not set' });

    const cmd = new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, ContentType: contentType });
    const url = await getSignedUrl(s3Client, cmd, { expiresIn: expiresIn || 900 });
    res.json({ url });
  } catch (err: any) {
    console.error('S3 presign error:', err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});
