import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, X, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ARPhoneSyncDialog({ isOpen, onClose }: Props) {
  const [networkIp, setNetworkIp] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/network-info')
        .then(res => res.json())
        .then(data => {
          if (data.ip && data.ip !== 'localhost') {
            setNetworkIp(data.ip);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  let currentUrl = window.location.origin;
  
  // If we found a local network IP and we're currently on localhost/127.0.0.1, replace it so the mobile device can reach it
  if (networkIp && (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1'))) {
    currentUrl = `http://${networkIp}:${window.location.port || 3000}`;
  }

  // A fake session ID, could be random per reload
  const sessionId = Math.random().toString(36).substring(2, 10);
  const qrUrl = `${currentUrl}/?role=mobile-cam&session=${sessionId}`;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div 
          initial={{ y: 20, scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: 20, scale: 0.95 }}
          className="bg-slate-900 rounded-xl shadow-[0_0_50px_rgba(66,133,244,0.15)] max-w-md w-full border border-white/10 overflow-hidden"
        >
          <div className="bg-black/60 border-b border-white/10 p-4 flex justify-between items-center">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 tracking-widest font-mono">
              <Smartphone size={18} className="text-google-blue" /> AR VISION PHONE SYNC
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white font-bold p-1 transition-colors">
               <X size={16} />
            </button>
          </div>
          
          <div className="p-6 flex flex-col items-center justify-center text-center">
             <div className="mb-6 p-4 bg-white border border-white/20 rounded-2xl shadow-[0_0_20px_rgba(66,133,244,0.4)] inline-block">
               <QRCodeSVG value={qrUrl} size={180} level="H" includeMargin={false} />
             </div>
             
             <h3 className="text-lg font-bold text-white mb-2">Escanea el Código QR</h3>
             <p className="text-sm text-slate-400 mb-6 max-w-[280px]">
               Sincroniza la cámara de tu smartphone sin instalar apps. Al escanear podrás aportar visión en tiempo real al modelo de datos.
             </p>
             
             <div className="w-full space-y-3">
               <div className="flex items-center gap-3 p-3 bg-white/5 rounded text-left border border-white/5">
                 <div className="bg-google-blue/20 text-google-blue p-2 rounded-full shrink-0 border border-google-blue/30">
                   <Wifi size={16} />
                 </div>
                 <div>
                   <h4 className="text-xs font-bold text-white">Conexión P2P Encriptada</h4>
                   <p className="text-[10px] text-slate-400 font-mono">Video feed se enlazará a tu sesión actual</p>
                 </div>
               </div>
               
               <div className="flex justify-between items-center px-2 pt-2">
                 <span className="text-[10px] font-mono text-google-blue bg-google-blue/10 border border-google-blue/20 px-2 py-1 rounded">ID: {sessionId.toUpperCase()}</span>
                 <span className="text-[10px] font-mono text-google-green flex items-center gap-1 animate-pulse"><div className="w-2 h-2 rounded-full bg-google-green shadow-[0_0_8px_rgba(52,168,83,0.8)]"></div> LISTO PARA SINC</span>
               </div>
             </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
