import { Router } from "express";
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

    // If Ollama did not produce a result, try Gemini fallback if configured
    if (!result) {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey) {
        try {
          // Quick fallback to Google Generative Language REST API (basic usage)
          const modelName = process.env.GEMINI_MODEL || "text-bison-001";
          const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generate?key=${geminiKey}`;
          const payload = {
            prompt: { text: `System: You are Jarvis. Return ONLY JSON. Context: ${JSON.stringify(currentScene)}. User: ${prompt}` },
            temperature: 0.2,
            maxOutputTokens: 512,
          };

          const gemRes = await axios.post(url, payload, { timeout: 15000 });

          // Try to extract a reasonable text result; if uncertain, attach full response
          const textOutput = (gemRes.data?.candidates && gemRes.data.candidates[0]?.content) || gemRes.data?.output || gemRes.data;
          result = { message: textOutput };
        } catch (ge) {
          console.warn("Gemini fallback failed:", ge?.message || ge);
          // no-op, will return error below
        }
      }

      if (!result) {
        return res.status(500).json({ error: 'No local AI backend is available. Inicia Ollama localmente en el puerto 11434, o configura GEMINI_API_KEY para fallback.' });
      }
    }

    if (result) {
      await saveChatLog(prompt, result, req);
      return res.json({ result });
    }

    res.status(404).json({ error: 'No response generated' });
  } catch (error) {
    console.error('AI chat API Error:', error);
    res.status(500).json({ error: 'Failed to process request.' });
  }
});

// Simple vision analysis stub: accepts { imageBase64: string }
router.post('/vision', async (req, res) => {
  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

    // NOTE: This is a stub. Replace with real vision model call or edge detector.
    // Example response simulating object detection + simple recommendation.
    const detections = [
      { label: 'object', confidence: 0.92, bbox: [0.12, 0.34, 0.2, 0.15] },
      { label: 'defect', confidence: 0.67, bbox: [0.55, 0.2, 0.1, 0.18] },
    ];

    const recommendation = {
      action: 'inspect',
      reason: 'Detected potential defect with confidence > 0.6',
    };

    return res.json({ ok: true, detections, recommendation });
  } catch (err: any) {
    console.error('Vision stub error:', err);
    return res.status(500).json({ error: String(err?.message || err) });
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

// G-Code validation currently disabled for local-only deployments
router.post('/gcode/validate', async (_req, res) => {
  res.status(501).json({
    error: 'G-Code validation is disabled in this local-only configuration.',
  });
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
