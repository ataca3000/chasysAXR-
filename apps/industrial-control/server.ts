import http from "http";
import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import { app } from "./src/server/app";
import { setupDeviceSyncServer } from "./src/server/deviceSync";

async function startServer() {
  const PORT = Number(process.env.PORT || 3000);
  const server = http.createServer(app);

  // Attach WebSocket signaling for /api/device-sync
  setupDeviceSyncServer(server);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR !== "true",
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
