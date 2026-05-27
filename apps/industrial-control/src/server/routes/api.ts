import { Router } from "express";
import {
  VertexAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google-cloud/vertexai";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import axios from "axios";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { networkInterfaces } from "os";
import { exec } from "child_process";
import { db } from "./firebase"; // Corregido para usar el archivo en la misma carpeta

dotenv.config();

const router = Router();

// Inicialización de Vertex AI (Enterprise Grade)
let vertexAI: VertexAI | null = null;
if (process.env.GOOGLE_CLOUD_PROJECT) {
  vertexAI = new VertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
  });
}

// Helper para registrar/actualizar usuarios en Firestore
async function syncUserToDb(user: {
  email: string;
  name?: string;
  provider: string;
}) {
  if (!db) return;
  try {
    const userRef = db.collection("users").doc(user.email);
    await userRef.set(
      {
        ...user,
        lastLogin: new Date(),
        updatedAt: new Date(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("Error syncing user to Firestore:", error);
  }
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION || process.env.VITE_AWS_REGION || "us-east-1",
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      }
    : undefined,
});

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Check if Ollama is running and has models
router.get("/ollama/status", async (_req, res) => {
  try {
    const response = await axios.get("http://localhost:11434/api/tags", {
      timeout: 2000,
    });
    res.json({ online: true, models: response.data.models });
  } catch (error) {
    res.json({ online: false, error: "Ollama is not reachable" });
  }
});

// Trigger model download from UI
router.post("/ollama/install", async (req, res) => {
  const { model } = req.body;
  const modelName = model || "mistral";

  // Ejecución asíncrona para no bloquear el hilo principal
  exec(`ollama pull ${modelName}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error pulling model: ${error.message}`);
      return;
    }
    console.log(`Model ${modelName} installed/updated`);
  });

  res.json({ message: `Installation of ${modelName} started in background.` });
});

router.get("/network-info", (_req, res) => {
  const nets = networkInterfaces();
  const results = Object.values(nets)
    .flat()
    .filter((net): net is any => net?.family === "IPv4" && !net.internal)
    .map((net) => net.address);

  res.json({ ip: results[0] || "127.0.0.1" });
});

router.post("/chat", async (req, res) => {
  try {
    const { prompt, history, currentScene } = req.body;
    const preferredBackend = process.env.AGENT_BACKEND || "ollama";
    let result = null;
    let errorLog = [];

    // Intento 1: Ollama (si está preferido o como primera opción local)
    if (preferredBackend === "ollama") {
      try {
        const ollamaRes = await axios.post(
          "http://localhost:11434/api/generate",
          {
            model: process.env.VITE_OLLAMA_MODEL || "mistral",
            prompt: `System: You are Jarvis. Return ONLY JSON. Context: ${JSON.stringify(currentScene)}. User: ${prompt}`,
            stream: false,
            format: "json",
          },
          { timeout: 15000 },
        );

        result =
          typeof ollamaRes.data.response === "string"
            ? JSON.parse(ollamaRes.data.response)
            : ollamaRes.data.response;
      } catch (e) {
        errorLog.push("Ollama offline or timed out. Falling back to Gemini...");
      }
    }

    // Intento 2: Vertex AI (Enterprise Cloud)
    if (!result && vertexAI) {
      if (!process.env.GOOGLE_CLOUD_PROJECT) {
        return res.status(500).json({ error: "Cloud AI not configured." });
      }

      const generativeModel = vertexAI.getGenerativeModel({
        model: "gemini-1.5-pro",
        systemInstruction: `Eres Jarvis, un ingeniero de sistemas expertos en Gemelos Digitales e Industria 4.0.
Tu objetivo es gestionar ensambles mecánicos complejos y actuadores dinámicos (brazos robóticos, CNC, láser, extrusores).
El usuario te dará instrucciones en lenguaje natural para realizar tareas de ensamblaje, manipulación o programación.
Tu tarea es interpretar estas instrucciones y generar una secuencia de 'actions' (acciones) que el hardware físico o el gemelo digital puedan ejecutar.

Considera los siguientes tipos de acciones:
- 'move_robot_arm': Mover un brazo robótico a una posición (x, y, z) con una orientación (rx, ry, rz).
- 'pick_part': Recoger una pieza por su ID.
- 'place_part': Colocar una pieza por su ID en una posición (x, y, z).
- 'execute_gcode': Enviar un comando G-Code directamente al hardware.
- 'set_tool_state': Encender/apagar una herramienta (ej. láser, gripper, husillo) o ajustar su potencia/velocidad.
- 'update_digital_twin': Actualizar la representación visual de componentes en el gemelo digital.

Siempre devuelve un JSON que contenga un 'message' conversacional y un array de 'actions'.
Si el usuario menciona un componente específico (ej. "motor_X", "brazo_robotico_1"), usa su ID.
Si el usuario carga un modelo CAD (ej. GLB/STP), asume que los componentes tienen IDs y propiedades.
Prioriza la seguridad industrial y la eficiencia. Si una acción es peligrosa o inviable, explícalo en el 'message'.
No te limites a formas básicas; interpreta IDs de componentes reales y sus propiedades.
Si el usuario cambia el 'cabezal' (tool), ajusta los parámetros de telemetría sugeridos.

Ejemplo de respuesta:
{ "message": "Moví el brazo robótico a la posición de ensamblaje.", "actions": [ { "type": "move_robot_arm", "params": { "x": 100, "y": 50, "z": 20, "rx": 0, "ry": 0, "rz": 90 } }, { "type": "pick_part", "params": { "partId": "pieza_A" } } ] }
`,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
      });

      const userContent = {
        role: "user",
        parts: [
          {
            text: `User Prompt: ${prompt} \n HISTORY: ${JSON.stringify(history)} \n STATE: ${JSON.stringify(currentScene)}`,
          },
        ],
      };

      const streamingResp = await generativeModel.generateContentStream({
        contents: [userContent],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.2, // Baja temperatura para mayor precisión técnica
          topP: 0.8,
          responseMimeType: "application/json",
          // @ts-ignore - Vertex SDK schema structure
          responseSchema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description:
                  "Your conversational response as the industrial assistant.",
              },
              actions: {
                type: "array",
                description:
                  "List of actions to be executed by the hardware or digital twin.",
                items: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: [
                        "move_robot_arm",
                        "pick_part",
                        "place_part",
                        "execute_gcode",
                        "set_tool_state",
                        "update_digital_twin",
                      ],
                      description: "Type of action to perform.",
                    },
                    params: {
                      type: "object",
                      description: "Parameters for the action.",
                      properties: {
                        // Common parameters for robot movement
                        x: { type: "number" },
                        y: { type: "number" },
                        z: { type: "number" },
                        rx: { type: "number" },
                        ry: { type: "number" },
                        rz: { type: "number" },
                        // Parameters for part manipulation
                        partId: { type: "string" },
                        gripperForce: { type: "number" },
                        // Parameters for G-code execution
                        gcode: { type: "string" },
                        // Parameters for tool state
                        toolId: { type: "string" },
                        state: {
                          type: "string",
                          enum: ["on", "off", "set_power", "set_speed"],
                        },
                        value: { type: "number" }, // For power/speed
                        // Parameters for digital twin updates (similar to old shapes)
                        shapes: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              /* existing shape properties */
                            },
                            required: [
                              "id",
                              "type",
                              "position",
                              "rotation",
                              "scale",
                              "color",
                            ],
                          },
                        },
                      },
                    },
                  },
                  required: ["type", "params"],
                },
              },
            },
            required: ["message", "actions"],
          },
        },
      });

      try {
        let fullText = "";
        for await (const item of streamingResp.stream) {
          const chunk = item.candidates?.[0]?.content?.parts?.[0]?.text || "";
          fullText += chunk;
        }

        result = JSON.parse(fullText || "{}");

        // IMPORTANTE: Después de cerrar el stream, guardamos en DB y salimos
        await saveChatLog(prompt, result, req);
        return res.json({ result });
      } catch (streamError) {
        console.error("Stream handling error:", streamError);
        return res.status(500).json({ error: "Stream error" });
      }
    }

    // Si no fue streaming (ej. Ollama), enviamos respuesta normal
    if (result) {
      await saveChatLog(prompt, result, req);
      return res.json({ result });
    }

    res.status(404).json({ error: "No response generated" });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "Failed to process request." });
  }
});

// Endpoint de auditoría para movimientos del Gemelo Digital
router.post("/telemetry/log", async (req, res) => {
  const { action, details, objectId, isRealData, severity } = req.body;
  if (!db) return res.status(500).json({ error: "DB not initialized" });

  await db.collection("audit_logs").add({
    action,
    details: isRealData
      ? details
      : { ...details, status: "SIMULATED_NOT_DETECTED" },
    objectId,
    isRealData: !!isRealData,
    severity: severity || (action.includes("DISCONNECT") ? "CRITICAL" : "INFO"),
    timestamp: new Date(),
    user: (req as any).session?.user?.email || "anonymous",
  });
  res.json({ ok: true });
});

// Helper para persistencia
async function saveChatLog(prompt: string, result: any, req: any) {
  if (db && process.env.FIREBASE_PROJECT_ID) {
    await db
      .collection("chat_logs")
      .add({
        prompt,
        timestamp: new Date(),
        user: (req as any).session?.user?.email || "anonymous",
        response: result.message || "",
      })
      .catch((err) => console.error("Firestore Save Error:", err));
  }
}

// Nuevo Agente especializado en G-Code y Trayectorias CNC
router.post("/gcode/validate", async (req, res) => {
  try {
    const { gcode, machineConfig } = req.body;
    const model = vertexAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      systemInstruction:
        "Eres un validador experto de trayectorias para actuadores industriales. Valida el G-Code adaptándote al tipo de herramienta instalada (Husillo, Extrusor, Láser, Brazo Robótico o Actuador personalizado). Proporciona un análisis de seguridad y eficiencia.",
    });

    const response = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Analiza el siguiente bloque de G-Code para una máquina con estos límites: ${JSON.stringify(machineConfig)}.
          
G-CODE:
${gcode}`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            isValid: { type: "boolean" },
            errors: {
              type: "array",
              items: { type: "string" },
              description: "Errores críticos que impedirían la ejecución.",
            },
            bounds: { type: "object" },
            estimatedTimeMinutes: { type: "number" },
            trajectoryPoints: {
              type: "array",
              items: { type: "array", items: { type: "number" } },
            },
          },
          required: ["isValid", "errors", "bounds"],
        },
      },
    });

    const result = JSON.parse(
      response.response.candidates?.[0].content.parts[0].text || "{}",
    );
    res.json({ result });
  } catch (error) {
    console.error("G-Code Validation Error:", error);
    res.status(500).json({ error: "Failed to validate G-Code." });
  }
});

// S3 presign endpoint (server-side). The frontend should call this to get a PUT presigned URL.
router.post("/s3/presign", async (req, res) => {
  try {
    const { key, contentType, expiresIn } = req.body;
    if (!process.env.S3_BUCKET)
      return res.status(400).json({ error: "S3_BUCKET env not set" });

    const cmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(s3Client, cmd, {
      expiresIn: expiresIn || 900,
    });
    res.json({ url });
  } catch (err: any) {
    console.error("S3 presign error:", err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// --- Authentication routes: Google, GitHub, magic-email ---
// Note: session middleware must be applied in server.ts so `req.session` is available.

// Magic link: request a token emailed to the user (development: token logged)
router.post("/auth/magic", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email required" });

  const token = crypto.randomBytes(24).toString("hex");
  const expires = Date.now() + 15 * 60 * 1000; // 15 min

  // store in session for demo; production should persist
  (req as any).session.magic = { email, token, expires };

  const link = `${req.protocol}://${req.get("host")}/api/auth/magic/verify?token=${token}`;

  // Try to send email if SMTP configured, otherwise log link
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: "Your GoPilot magic login link",
        text: `Use this link to login: ${link}`,
      });
    } catch (err) {
      console.error("Email send failed:", err);
    }
  } else {
    console.log("Magic login link (dev):", link);
  }

  res.json({ ok: true });
});

router.get("/auth/magic/verify", (req, res) => {
  const { token } = req.query;
  const sess = (req as any).session?.magic;
  if (!sess || !token) return res.status(400).send("Invalid or expired token");
  if (sess.token !== token || Date.now() > sess.expires)
    return res.status(400).send("Invalid or expired token");

  // create session user
  (req as any).session.user = { provider: "magic", email: sess.email };

  // Sincronizar con Firestore
  syncUserToDb({ email: sess.email, provider: "magic" });

  delete (req as any).session.magic;

  // redirect to app root
  res.redirect("/");
});

// Google OAuth start
router.get("/auth/google", (_req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirect = `${_req.protocol}://${_req.get("host")}/api/auth/google/callback`;
  const scope = encodeURIComponent("openid email profile");
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  res.redirect(url);
});

router.get("/auth/google/callback", async (req, res) => {
  try {
    const code = req.query.code as string;
    const tokenRes = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: `${req.protocol}://${req.get("host")}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );

    const accessToken = tokenRes.data.access_token;
    const userRes = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const user = userRes.data;
    const userData = {
      provider: "google",
      email: user.email,
      name: user.name,
    };

    (req as any).session.user = userData;

    // Registro de usuario nuevo o actualización
    await syncUserToDb(userData);

    res.redirect("/");
  } catch (err) {
    console.error("Google OAuth error", err);
    res.status(500).send("Authentication failed");
  }
});

// GitHub OAuth start
router.get("/auth/github", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirect = `${req.protocol}://${req.get("host")}/api/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&scope=user:email`;
  res.redirect(url);
});

router.get("/auth/github/callback", async (req, res) => {
  try {
    const code = req.query.code as string;
    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } },
    );

    const accessToken = tokenRes.data.access_token;
    const userRes = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const emailsRes = await axios.get("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const primaryEmail =
      (emailsRes.data || []).find((e: any) => e.primary)?.email ||
      emailsRes.data[0]?.email;
    const userData = {
      provider: "github",
      email: primaryEmail,
      name: userRes.data.name || userRes.data.login,
    };

    (req as any).session.user = userData;

    // Registro de usuario nuevo o actualización
    await syncUserToDb(userData);

    res.redirect("/");
  } catch (err) {
    console.error("GitHub OAuth error", err);
    res.status(500).send("Authentication failed");
  }
});

// Simple route to get current session user
router.get("/auth/me", (req, res) => {
  res.json({ user: (req as any).session.user || null });
});

// Logout route to clear session
router.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Could not log out" });
    }
    res.json({ ok: true });
  });
});

export default router;
