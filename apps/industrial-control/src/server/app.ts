import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";
import apiRoutes from "./routes/api";

dotenv.config();

const app = express();

app.use(express.json());

app.set("trust proxy", 1); // Correcto para Google Cloud Run / GCLB

// Session middleware for auth flows
app.use(
  session({
    secret: process.env.SESSION_SECRET || "gopilot_industrial_dev_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

// Mount API routes
app.use("/api", apiRoutes);

// Proxy Gemini API to hide the API key from the client
const geminiProxy = createProxyMiddleware({
  target: "https://generativelanguage.googleapis.com",
  changeOrigin: true,
  ws: true, // Enable websocket proxy
  pathRewrite: { "^/api/gemini": "" },
  on: {
    proxyReq: (proxyReq) => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        proxyReq.setHeader("x-goog-api-key", apiKey);
      }
    },
  },
});

// Proxy para Ollama Local (evita problemas de puertos/CORS)
const ollamaProxy = createProxyMiddleware({
  target: "http://localhost:11434",
  changeOrigin: true,
  pathRewrite: { "^/api/ollama": "" },
});

// Interceptor para asegurar que la API Key se adjunte también como query param si es necesario
const geminiInterceptor = (req: any, _res: any, next: any) => {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (req.url.includes("key=")) {
    req.url = req.url.replace(/key=[^&]*/, `key=${apiKey}`);
  } else if (apiKey && req.method === "GET") {
    // Solo añadir a la URL en GET si no viene en los headers
    const separator = req.url.includes("?") ? "&" : "?";
    req.url = `${req.url}${separator}key=${apiKey}`;
  }
  // Aseguramos que el header siempre viaje
  if (apiKey) req.headers["x-goog-api-key"] = apiKey;
  next();
};

app.use("/api/gemini", geminiInterceptor, geminiProxy);
app.use("/api/ollama", ollamaProxy);

export { app, geminiProxy };
