import { Router } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import axios from 'axios';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

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

// --- Authentication routes: Google, GitHub, magic-email ---
// Note: session middleware must be applied in server.ts so `req.session` is available.

// Magic link: request a token emailed to the user (development: token logged)
router.post('/auth/magic', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const token = crypto.randomBytes(24).toString('hex');
  const expires = Date.now() + 15 * 60 * 1000; // 15 min

  // store in session for demo; production should persist
  (req as any).session.magic = { email, token, expires };

  const link = `${req.protocol}://${req.get('host')}/api/auth/magic/verify?token=${token}`;

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
        subject: 'Your GoPilot magic login link',
        text: `Use this link to login: ${link}`,
      });
    } catch (err) {
      console.error('Email send failed:', err);
    }
  } else {
    console.log('Magic login link (dev):', link);
  }

  res.json({ ok: true });
});

router.get('/auth/magic/verify', (req, res) => {
  const { token } = req.query;
  const sess = (req as any).session?.magic;
  if (!sess || !token) return res.status(400).send('Invalid or expired token');
  if (sess.token !== token || Date.now() > sess.expires) return res.status(400).send('Invalid or expired token');

  // create session user
  (req as any).session.user = { provider: 'magic', email: sess.email };
  delete (req as any).session.magic;

  // redirect to app root
  res.redirect('/');
});

// Google OAuth start
router.get('/auth/google', (_req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirect = `${_req.protocol}://${_req.get('host')}/api/auth/google/callback`;
  const scope = encodeURIComponent('openid email profile');
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  res.redirect(url);
});

router.get('/auth/google/callback', async (req, res) => {
  try {
    const code = req.query.code as string;
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: `${req.protocol}://${req.get('host')}/api/auth/google/callback`,
      grant_type: 'authorization_code'
    }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    const accessToken = tokenRes.data.access_token;
    const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
    const user = userRes.data;
    (req as any).session.user = { provider: 'google', email: user.email, name: user.name };
    res.redirect('/');
  } catch (err) {
    console.error('Google OAuth error', err);
    res.status(500).send('Authentication failed');
  }
});

// GitHub OAuth start
router.get('/auth/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirect = `${req.protocol}://${req.get('host')}/api/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&scope=user:email`;
  res.redirect(url);
});

router.get('/auth/github/callback', async (req, res) => {
  try {
    const code = req.query.code as string;
    const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }, { headers: { Accept: 'application/json' } });

    const accessToken = tokenRes.data.access_token;
    const userRes = await axios.get('https://api.github.com/user', { headers: { Authorization: `Bearer ${accessToken}` } });
    const emailsRes = await axios.get('https://api.github.com/user/emails', { headers: { Authorization: `Bearer ${accessToken}` } });
    const primaryEmail = (emailsRes.data || []).find((e: any) => e.primary)?.email || (emailsRes.data[0]?.email);
    (req as any).session.user = { provider: 'github', email: primaryEmail, name: userRes.data.name || userRes.data.login };
    res.redirect('/');
  } catch (err) {
    console.error('GitHub OAuth error', err);
    res.status(500).send('Authentication failed');
  }
});

// Simple route to get current session user
router.get('/auth/me', (req, res) => {
  res.json({ user: (req as any).session.user || null });
});

// Logout route
router.post('/auth/logout', (req, res) => {
  (req as any).session.destroy((err: any) => {
    if (err) {
      console.error('Logout failed:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});
