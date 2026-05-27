import { useState, useEffect, useRef } from "react";
// @ts-ignore - qr-scanner may not have types
import { QrScanner } from "qr-scanner";
import { Smartphone, Volume2, VolumeX, X, Loader } from "lucide-react";
import { motion } from "motion/react";

export function MobileClientApp() {
  const [step, setStep] = useState<"scan" | "connecting" | "connected">("scan");
  const [peerConnection, setPeerConnection] =
    useState<RTCPeerConnection | null>(null);
  const [signalingWs, setSignalingWs] = useState<WebSocket | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const deviceIdRef = useRef<string>(Math.random().toString(36).substring(7));
  const qrScannerRef = useRef<any>(null);

  // Initialize camera
  useEffect(() => {
    if (step === "scan") {
      initializeQRScanner();
    }
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
      }
    };
  }, [step]);

  const initializeQRScanner = async () => {
    try {
      const video = document.createElement("video");
      const scanner = new QrScanner(
        video,
        (result) => handleQRScanned(result.data),
        { returnDetailedScanResult: false },
      );
      qrScannerRef.current = scanner;
      scanner.start();
    } catch (error) {
      console.error("Error initializing QR scanner:", error);
    }
  };

  const handleQRScanned = (qrData: string) => {
    try {
      const data = JSON.parse(qrData);
      if (data.deviceId && data.host) {
        setStep("connecting");
        qrScannerRef.current?.stop();
        connectToControlPanel(data);
      }
    } catch (error) {
      console.error("Invalid QR data:", error);
    }
  };

  const connectToControlPanel = async (config: any) => {
    try {
      // Connect to signaling server
      const protocol = config.protocol === "https" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${config.host}/api/device-sync`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        // Register this mobile device
        ws.send(
          JSON.stringify({
            type: "register",
            deviceId: deviceIdRef.current,
            deviceName: `📱 ${navigator.userAgent.split(" ").pop()}`,
            capabilities: ["camera", "sensor"],
          }),
        );
      };

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);

        if (message.type === "offer") {
          // Received offer from control panel
          await handleWebRTCOffer(message.from, message.data.offer, ws);
        } else if (message.type === "ice-candidate") {
          // Add ICE candidate
          if (peerConnection && message.data.candidate) {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(message.data.candidate),
            );
          }
        }
      };

      setSignalingWs(ws);
    } catch (error) {
      console.error("Connection error:", error);
      setStep("scan");
    }
  };

  const handleWebRTCOffer = async (
    from: string,
    offer: RTCSessionDescriptionInit,
    ws: WebSocket,
  ) => {
    try {
      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
      });

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Back camera
        audio: !isMuted,
      });

      // Add tracks to connection
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle data channel
      pc.ondatachannel = (event) => {
        const dc = event.channel;
        setupDataChannel(dc);
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          ws.send(
            JSON.stringify({
              type: "ice-candidate",
              from: deviceIdRef.current,
              to: from,
              data: { candidate: event.candidate },
            }),
          );
        }
      };

      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      ws.send(
        JSON.stringify({
          type: "answer",
          from: deviceIdRef.current,
          to: from,
          data: { answer: pc.localDescription },
        }),
      );

      setPeerConnection(pc);
      setStep("connected");
      setIsStreaming(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("WebRTC error:", error);
      setStep("scan");
    }
  };

  const setupDataChannel = (channel: RTCDataChannel) => {
    channel.onopen = () => console.log("Data channel opened");
    channel.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Command from control panel:", message);
    };
  };

  const disconnect = () => {
    if (peerConnection) {
      peerConnection.close();
    }
    if (signalingWs) {
      signalingWs.close();
    }
    if (qrScannerRef.current) {
      qrScannerRef.current.destroy();
    }
    setStep("scan");
    setPeerConnection(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      {step === "scan" && (
        <motion.div className="p-4 h-screen flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Smartphone className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl font-bold">GoPilot Mobile</h1>
          </div>

          <div className="bg-slate-800 rounded-lg overflow-hidden flex-1 mb-4">
            <video id="qr-video" style={{ width: "100%", height: "100%" }} />
          </div>

          <p className="text-center text-gray-400">
            Escanea el código QR desde la PC
          </p>
        </motion.div>
      )}

      {step === "connecting" && (
        <motion.div className="p-4 h-screen flex flex-col items-center justify-center">
          <Loader className="w-12 h-12 text-purple-400 animate-spin mb-4" />
          <p className="text-xl">Conectando...</p>
          <p className="text-gray-400 text-sm mt-2">Por favor espera</p>
        </motion.div>
      )}

      {step === "connected" && (
        <motion.div className="p-4 h-screen flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">📹 Transmitiendo</h1>
            <button
              onClick={disconnect}
              className="p-2 bg-red-600/20 hover:bg-red-600/40 rounded-lg text-red-400 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-black rounded-lg overflow-hidden flex-1 mb-4">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
              {isMuted ? "Micrófono apagado" : "Micrófono encendido"}
            </button>
          </div>

          {isStreaming && (
            <p className="text-center text-green-400 text-sm mt-4">
              ✅ Transmisión en vivo
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}