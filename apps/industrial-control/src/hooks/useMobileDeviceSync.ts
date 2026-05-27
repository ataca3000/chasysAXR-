import { useState, useEffect, useRef } from "react";

interface MobileDevice {
  id: string;
  name: string;
  type: "camera" | "sensor" | "mobile";
  connected: boolean;
  lastSeen: number;
}

interface DeviceConnection {
  dataChannel: RTCDataChannel | null;
  peerConnection: RTCPeerConnection | null;
}

export function useMobileDeviceSync() {
  const [connectedDevices, setConnectedDevices] = useState<MobileDevice[]>([]);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isListening, setIsListening] = useState(false);
  const connectionsRef = useRef<Map<string, DeviceConnection>>(new Map());
  const signalingServerRef = useRef<WebSocket | null>(null);
  const deviceIdRef = useRef<string>(Math.random().toString(36).substring(7));

  // Initialize WebSocket signaling server for device discovery
  const initSignaling = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const signalingUrl = `${protocol}//${window.location.host}/api/device-sync`;

    signalingServerRef.current = new WebSocket(signalingUrl);

    signalingServerRef.current.onopen = () => {
      setIsListening(true);
      // Register this device
      signalingServerRef.current?.send(
        JSON.stringify({
          type: "register",
          deviceId: deviceIdRef.current,
          deviceName: "GoPilot Control PC",
          capabilities: ["camera-receiver", "sensor-receiver", "commander"],
        }),
      );
    };

    signalingServerRef.current.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      handleSignalingMessage(message);
    };

    signalingServerRef.current.onerror = (error) => {
      console.error("Signaling error:", error);
      setIsListening(false);
    };
  };

  // Handle signaling messages for WebRTC setup
  const handleSignalingMessage = async (message: any) => {
    const { type, from, data } = message;

    switch (type) {
      case "device-discovered":
        // New device found on network
        setConnectedDevices((prev) => {
          const exists = prev.find((d) => d.id === from);
          if (exists) {
            return prev.map((d) =>
              d.id === from ? { ...d, lastSeen: Date.now() } : d,
            );
          }
          return [
            ...prev,
            {
              id: from,
              name: data.deviceName,
              type: data.type || "mobile",
              connected: false,
              lastSeen: Date.now(),
            },
          ];
        });
        break;

      case "offer":
        // Receive WebRTC offer from mobile
        await handleWebRTCOffer(from, data.offer);
        break;

      case "answer":
        // Receive WebRTC answer
        await handleWebRTCAnswer(from, data.answer);
        break;

      case "ice-candidate":
        // Add ICE candidate
        const conn = connectionsRef.current.get(from);
        if (conn?.peerConnection && data.candidate) {
          try {
            await conn.peerConnection.addIceCandidate(
              new RTCIceCandidate(data.candidate),
            );
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
        }
        break;

      case "device-left":
        // Device disconnected
        disconnectDevice(from);
        break;
    }
  };

  // Initiate connection to mobile device
  const connectToDevice = async (deviceId: string) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    });

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log("Received remote stream:", event.streams[0]);
      setCameraStream(event.streams[0]);

      // Mark device as connected
      setConnectedDevices((prev) =>
        prev.map((d) => (d.id === deviceId ? { ...d, connected: true } : d)),
      );
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        signalingServerRef.current?.send(
          JSON.stringify({
            type: "ice-candidate",
            to: deviceId,
            data: { candidate: event.candidate },
          }),
        );
      }
    };

    // Create data channel for commands
    const dataChannel = peerConnection.createDataChannel("device-control", {
      ordered: true,
    });
    setupDataChannel(dataChannel, deviceId);

    // Create offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Send offer to mobile device
    signalingServerRef.current?.send(
      JSON.stringify({
        type: "offer",
        to: deviceId,
        data: { offer: peerConnection.localDescription },
      }),
    );

    // Store connection
    connectionsRef.current.set(deviceId, {
      peerConnection,
      dataChannel,
    });
  };

  // Handle WebRTC offer from mobile
  const handleWebRTCOffer = async (
    from: string,
    offer: RTCSessionDescriptionInit,
  ) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    });

    peerConnection.ontrack = (event) => {
      setCameraStream(event.streams[0]);
      setConnectedDevices((prev) =>
        prev.map((d) => (d.id === from ? { ...d, connected: true } : d)),
      );
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        signalingServerRef.current?.send(
          JSON.stringify({
            type: "ice-candidate",
            to: from,
            data: { candidate: event.candidate },
          }),
        );
      }
    };

    peerConnection.ondatachannel = (event) => {
      setupDataChannel(event.channel, from);
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    signalingServerRef.current?.send(
      JSON.stringify({
        type: "answer",
        to: from,
        data: { answer: peerConnection.localDescription },
      }),
    );

    connectionsRef.current.set(from, {
      peerConnection,
      dataChannel: null,
    });
  };

  // Handle WebRTC answer
  const handleWebRTCAnswer = async (
    from: string,
    answer: RTCSessionDescriptionInit,
  ) => {
    const conn = connectionsRef.current.get(from);
    if (conn?.peerConnection) {
      await conn.peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer),
      );
    }
  };

  // Setup data channel for device commands
  const setupDataChannel = (dataChannel: RTCDataChannel, deviceId: string) => {
    dataChannel.onopen = () => {
      console.log(`Data channel opened for device ${deviceId}`);
    };

    dataChannel.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleDeviceMessage(deviceId, data);
    };

    dataChannel.onclose = () => {
      console.log(`Data channel closed for device ${deviceId}`);
      disconnectDevice(deviceId);
    };

    // Update reference
    const conn = connectionsRef.current.get(deviceId);
    if (conn) {
      conn.dataChannel = dataChannel;
    }
  };

  // Handle messages from connected device
  const handleDeviceMessage = (deviceId: string, data: any) => {
    console.log(`Message from device ${deviceId}:`, data);
    // Handle sensor data, commands, etc.
  };

  // Send command to device
  const sendCommandToDevice = (deviceId: string, command: any) => {
    const conn = connectionsRef.current.get(deviceId);
    if (conn?.dataChannel && conn.dataChannel.readyState === "open") {
      conn.dataChannel.send(JSON.stringify(command));
    }
  };

  // Disconnect device
  const disconnectDevice = (deviceId: string) => {
    const conn = connectionsRef.current.get(deviceId);
    if (conn?.peerConnection) {
      conn.peerConnection.close();
    }
    connectionsRef.current.delete(deviceId);

    setConnectedDevices((prev) =>
      prev.map((d) => (d.id === deviceId ? { ...d, connected: false } : d)),
    );
    setCameraStream(null);
  };

  // Generate connection QR code
  const generateQRCode = () => {
    const connectionString = JSON.stringify({
      deviceId: deviceIdRef.current,
      host: window.location.host,
      protocol: window.location.protocol.replace(":", ""),
    });
    return connectionString;
  };

  // Initialize on mount
  useEffect(() => {
    initSignaling();

    return () => {
      signalingServerRef.current?.close();
      connectionsRef.current.forEach((conn) => {
        conn.peerConnection?.close();
      });
    };
  }, []);

  return {
    connectedDevices,
    cameraStream,
    isListening,
    connectToDevice,
    disconnectDevice,
    sendCommandToDevice,
    generateQRCode,
  };
}

export default useMobileDeviceSync;
