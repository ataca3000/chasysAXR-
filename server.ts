import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware } from "http-proxy-middleware";
import dotenv from "dotenv";
import session from "express-session";
import apiRoutes from "./src/server/routes/api";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Session middleware for auth flows
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev_secret_change_me",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
    })
  );

  // Mount API routes
  app.use("/api", apiRoutes);

  // Proxy Gemini API to hide the API key from the client
  const geminiProxy = createProxyMiddleware({
    target: 'https://generativelanguage.googleapis.com',
    changeOrigin: true,
    ws: true, // Enable websocket proxy
    pathRewrite: {
      '^/api/gemini': '',
    },
    on: {
      proxyReq: (proxyReq) => {
        // Add API key header for standard requests
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
          proxyReq.setHeader('x-goog-api-key', apiKey);
        }
      },
      proxyReqWs: (proxyReqWs) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
          proxyReqWs.setHeader('x-goog-api-key', apiKey);
        }
      }
    }
  });

  // Intercept the URL to add the key securely
  const geminiInterceptor = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    const apiKey = process.env.GEMINI_API_KEY || '';
    
    // Robust injection: Replace any existing key parameter or append a new one
    if (req.url.includes('key=')) {
      req.url = req.url.replace(/key=[^&]*/, `key=${apiKey}`);
    } else if (apiKey) {
      const separator = req.url.includes('?') ? '&' : '?';
      req.url = `${req.url}${separator}key=${apiKey}`;
    }
    
    // Also inject header just in case proxyReq isn't enough
    req.headers['x-goog-api-key'] = apiKey;
    
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
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // REQUIRED for http-proxy-middleware to handle websocket upgrades!
  server.on('upgrade', (req, socket, head) => {
    if (req.url?.startsWith('/api/gemini')) {
      // Apply the same URL interceptor logic for WS upgrades
      const apiKey = process.env.GEMINI_API_KEY || '';
      if (req.url.includes('key=')) {
        req.url = req.url.replace(/key=[^&]*/, `key=${apiKey}`);
      } else if (apiKey) {
        const separator = req.url.includes('?') ? '&' : '?';
        req.url = `${req.url}${separator}key=${apiKey}`;
      }
      geminiProxy.upgrade(req, socket as any, head);
    }
  });
}

startServer();
