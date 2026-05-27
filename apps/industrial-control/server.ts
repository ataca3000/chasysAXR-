import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware } from "http-proxy-middleware";
import { app, geminiProxy } from "./src/server/app";
import setupDeviceSyncServer from "./src/server/deviceSync";

async function startServer() {
  const PORT = 3000;

  // Ollama Proxy to allow frontend to communicate with local Ollama instance
  const ollamaProxy = createProxyMiddleware({
    target: "http://localhost:11434",
    changeOrigin: true,
    pathRewrite: {
      "^/api/ollama": "",
    },
    on: {
      error: (_err, _req, res) => {
        (res as any)
          .status(503)
          .json({
            error:
              "Ollama is not running. Please start Ollama on your machine.",
          });
      },
    },
  });
  app.use("/api/ollama", ollamaProxy);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Setup Device Sync WebSocket server for mobile device connections
  setupDeviceSyncServer(server);

  // REQUIRED for http-proxy-middleware to handle websocket upgrades!
  server.on("upgrade", (req, socket, head) => {
    if (req.url?.startsWith("/api/gemini")) {
      // Apply the same URL interceptor logic for WS upgrades
      const apiKey = process.env.GEMINI_API_KEY || "";
      if (req.url.includes("key=")) {
        req.url = req.url.replace(/key=[^&]*/, `key=${apiKey}`);
      } else if (apiKey) {
        const separator = req.url.includes("?") ? "&" : "?";
        req.url = `${req.url}${separator}key=${apiKey}`;
      }
      geminiProxy.upgrade(req, socket as any, head);
    }
  });
}

startServer();
