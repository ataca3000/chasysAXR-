import { WebSocket, WebSocketServer } from "ws";

interface RegisteredDevice {
  id: string;
  name: string;
  capabilities: string[];
  ws: WebSocket;
  lastSeen: number;
}

export function setupDeviceSyncServer(server: any) {
  const _wss = new WebSocketServer({ path: "/api/device-sync", server });
  const devices = new Map<string, RegisteredDevice>();

  _wss.on("connection", (ws: WebSocket) => {
    console.log("New WebSocket connection for device sync");

    ws.on("message", (data: string) => {
      try {
        const message = JSON.parse(data);
        handleMessage(ws, message, devices, _wss);
      } catch (error) {
        console.error("Error parsing message:", error);
        ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      }
    });

    ws.on("close", () => {
      console.log("Device disconnected");
      // Find and remove device
      for (const [id, device] of devices.entries()) {
        if (device.ws === ws) {
          devices.delete(id);
          // Notify others that device left
          broadcastToAll(_wss, devices, {
            type: "device-left",
            from: id,
          });
          break;
        }
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  // Periodic cleanup of stale devices
  setInterval(() => {
    const now = Date.now();
    for (const [id, device] of devices.entries()) {
      if (now - device.lastSeen > 30000) {
        // 30 second timeout
        device.ws.close();
        devices.delete(id);
      }
    }
  }, 10000);

  return _wss;
}

function handleMessage(
  ws: WebSocket,
  message: any,
  devices: Map<string, RegisteredDevice>,
  wss: WebSocketServer,
) {
  const { type, from, to, deviceId, deviceName, capabilities, data } = message;

  switch (type) {
    case "register":
      // Register new device
      if (deviceId && deviceName) {
        devices.set(deviceId, {
          id: deviceId,
          name: deviceName,
          capabilities: capabilities || [],
          ws,
          lastSeen: Date.now(),
        });

        console.log(`Device registered: ${deviceName} (${deviceId})`);

        // Send confirmation
        ws.send(
          JSON.stringify({
            type: "registered",
            deviceId,
          }),
        );

        // Notify all other devices about this new device
        broadcastToAll(wss, devices, {
          type: "device-discovered",
          from: deviceId,
          data: { deviceName, capabilities },
        });
      }
      break;

    case "offer":
    case "answer":
    case "ice-candidate":
      // Forward WebRTC signaling messages
      if (to && devices.has(to)) {
        const targetDevice = devices.get(to);
        if (targetDevice) {
          targetDevice.ws.send(
            JSON.stringify({
              type,
              from: from || deviceId,
              data,
            }),
          );
        }
      }
      break;

    case "heartbeat":
      // Update last seen time
      if (from && devices.has(from)) {
        const device = devices.get(from);
        if (device) {
          device.lastSeen = Date.now();
        }
      }
      break;

    case "list-devices":
      // Send list of available devices
      const deviceList = Array.from(devices.values()).map((d) => ({
        id: d.id,
        name: d.name,
        capabilities: d.capabilities,
      }));
      ws.send(
        JSON.stringify({
          type: "device-list",
          devices: deviceList,
        }),
      );
      break;
  }
}

function broadcastToAll(
  wss: WebSocketServer,
  devices: Map<string, RegisteredDevice>,
  message: any,
) {
  const data = JSON.stringify(message);
  for (const device of devices.values()) {
    if (device.ws.readyState === 1) {
      // WebSocket.OPEN
      device.ws.send(data);
    }
  }
}

export default setupDeviceSyncServer;
