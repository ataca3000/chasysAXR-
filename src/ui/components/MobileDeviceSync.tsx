import { useState, useEffect, useRef } from "react";
import {
  Smartphone,
  QrCode,
  Wifi,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import QRCode from "qrcode.react";
import useMobileDeviceSync from "../../hooks/useMobileDeviceSync";

export function MobileDeviceSync() {
  const {
    connectedDevices,
    cameraStream,
    isListening,
    connectToDevice,
    disconnectDevice,
    generateQRCode,
  } = useMobileDeviceSync();

  const [showQR, setShowQR] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play();
    }
  }, [cameraStream]);

  const handleDeviceSelect = (deviceId: string) => {
    if (selectedDevice === deviceId) {
      disconnectDevice(deviceId);
      setSelectedDevice(null);
    } else {
      if (selectedDevice) {
        disconnectDevice(selectedDevice);
      }
      connectToDevice(deviceId);
      setSelectedDevice(deviceId);
    }
  };

  const qrValue = generateQRCode();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">
            Dispositivos Móviles
          </h2>
          <div
            className={`w-2 h-2 rounded-full ${isListening ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
          />
        </div>
        <button
          onClick={() => setShowQR(!showQR)}
          className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 rounded-lg text-sm text-purple-300 transition"
        >
          <QrCode className="w-4 h-4" />
          QR
        </button>
      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-slate-900 rounded-lg p-8 max-w-sm"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">
                  Conecta tu teléfono
                </h3>
                <button
                  onClick={() => setShowQR(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-white p-4 rounded-lg flex justify-center mb-4">
                <QRCode
                  value={qrValue}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <p className="text-gray-400 text-sm text-center mb-4">
                Escanea este código desde la app móvil de GoPilot
              </p>

              <div className="bg-slate-800 rounded p-3 mb-4">
                <p className="text-xs text-gray-500 break-all text-center font-mono">
                  {qrValue}
                </p>
              </div>

              <button
                onClick={() => setShowQR(false)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg transition"
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connected Devices List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {connectedDevices.length === 0 ? (
          <div className="col-span-full bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center">
            <Wifi className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400">No hay dispositivos conectados</p>
            <p className="text-xs text-gray-500 mt-2">
              Escanea el código QR con tu teléfono
            </p>
          </div>
        ) : (
          connectedDevices.map((device) => (
            <motion.button
              key={device.id}
              onClick={() => handleDeviceSelect(device.id)}
              className={`p-4 rounded-lg border-2 transition text-left ${
                selectedDevice === device.id
                  ? "bg-purple-600/20 border-purple-500"
                  : device.connected
                    ? "bg-green-600/10 border-green-500"
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white">{device.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {device.connected ? "✅ Conectado" : "⏳ No conectado"}
                  </p>
                </div>
                <div
                  className={`w-3 h-3 rounded-full ${device.connected ? "bg-green-500" : "bg-gray-500"}`}
                />
              </div>
            </motion.button>
          ))
        )}
      </div>

      {/* Camera Stream View */}
      {cameraStream && selectedDevice && (
        <motion.div
          className="bg-black rounded-lg overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full aspect-video bg-black object-cover"
              autoPlay
              playsInline
              muted={isMuted}
            />

            {/* Video Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
              </div>

              <button
                onClick={() => {
                  disconnectDevice(selectedDevice);
                  setSelectedDevice(null);
                }}
                className="p-2 bg-red-600/20 hover:bg-red-600/40 rounded-lg text-red-400 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-slate-900 p-3 text-xs text-gray-400">
            📱 {connectedDevices.find((d) => d.id === selectedDevice)?.name}
          </div>
        </motion.div>
      )}

      {/* Info */}
      <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3 text-sm text-blue-200">
        <p className="mb-1">💡 Conexión P2P Directa</p>
        <p className="text-xs text-blue-300">
          Los dispositivos se conectan directamente vía WiFi sin permisos
          adicionales. Escanea el código QR para emparejar.
        </p>
      </div>
    </div>
  );
}

export default MobileDeviceSync;
