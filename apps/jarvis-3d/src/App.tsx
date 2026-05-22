import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Grid } from "@react-three/drei";
import { useState, useRef, useEffect } from "react";
import { Send, Terminal, Loader2, Bot, User, Settings, Mic, MicOff, Volume2, VolumeX, Database, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ShapeData {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  wireframe?: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "jarvis";
  content: string;
}

function ShapeRenderer({ shape }: { shape: ShapeData }) {
  const meshProps = {
    position: shape.position,
    rotation: shape.rotation,
    scale: shape.scale,
  };

  const materialProps = {
    color: shape.color,
    wireframe: shape.wireframe,
    roughness: 0.2,
    metalness: 0.8,
  };

  switch (shape.type) {
    case "box":
      return (
        <mesh {...meshProps}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      );
    case "sphere":
      return (
        <mesh {...meshProps}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      );
    case "cylinder":
      return (
        <mesh {...meshProps}>
          <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      );
    case "cone":
      return (
        <mesh {...meshProps}>
          <coneGeometry args={[0.5, 1, 32]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      );
    case "torus":
      return (
        <mesh {...meshProps}>
          <torusGeometry args={[0.5, 0.2, 16, 100]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      );
    default:
      return null;
  }
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      role: "jarvis",
      content: "System online. I am Jarvis, your 3D engineering and design companion. What shall we build today?",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [shapes, setShapes] = useState<ShapeData[]>([
    // Initial blank canvas or maybe a starting plinth
    {
      id: "base",
      type: "cylinder",
      position: [0, -0.5, 0],
      rotation: [0, 0, 0],
      scale: [4, 0.1, 4],
      color: "#222222",
    }
  ]);
  
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [backendMode, setBackendMode] = useState<"gemini" | "ollama">("gemini");
  const [ollamaEndpoint, setOllamaEndpoint] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3");
  const [showSettings, setShowSettings] = useState(false);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speak = (text: string) => {
    if (!isVoiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const jarvisVoice = voices.find(v => v.name.toLowerCase().includes('uk') || v.name.toLowerCase().includes('male'));
    if (jarvisVoice) utterance.voice = jarvisVoice;
    utterance.pitch = 0.8;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const toggleListen = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage(transcript);
    };

    recognition.start();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      let result;

      if (backendMode === "ollama") {
        const promptSystem = `You are Jarvis, a collaborative engineering and design companion focused on 3D prototyping and product creation.
The user wants to modify a 3D scene. You MUST respond with ONLY a valid JSON object matching this schema, no markdown, no other text:
{
  "message": "your companion response text",
  "shapes": [
    { "id": "string", "type": "box|sphere|cylinder|cone|torus", "position": [0,0,0], "rotation": [0,0,0], "scale": [1,1,1], "color": "#hexadecimal" }
  ]
}
Return the full updated array of shapes.
Current shapes: ${JSON.stringify(shapes)}
User Request: ${userMessage}`;
        
        const response = await fetch(`${ollamaEndpoint}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: ollamaModel,
            prompt: promptSystem,
            format: "json",
            stream: false
          })
        });
        if (!response.ok) throw new Error("Ollama generation failed.");
        const data = await response.json();
        result = JSON.parse(data.response);
      } else {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: userMessage,
            history: messages,
            currentScene: shapes,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to communicate with Jarvis core.");
        }

        const data = await response.json();
        result = data.result;
      }

      if (result.message) {
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: "jarvis", content: result.message },
        ]);
        if (isVoiceEnabled) {
          speak(result.message);
        }
      }

      if (result.shapes) {
        setShapes(result.shapes);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "jarvis", content: "Error: Connection to generation core failed." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#020408] text-slate-300 font-sans flex flex-col overflow-hidden select-none">
      {/* Top Navigation / Status */}
      <header className="h-14 border-b border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center border border-cyan-500/40">
            <div className="w-3 h-3 bg-cyan-400 animate-pulse rounded-full shadow-[0_0_10px_#22d3ee]"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-400 font-bold leading-none">Active Companion</span>
            <span className="text-lg font-light tracking-tight text-white">JARVIS <span className="font-black">CORE</span></span>
          </div>
        </div>
        <div className="flex items-center gap-8 text-[11px] font-mono tracking-widest">
          <div className="flex gap-2"><span className="opacity-40">COMPUTE:</span> <span className="text-cyan-400">{backendMode === 'gemini' ? 'CLOUD' : 'EDGE'}</span></div>
          <div className="flex gap-2"><span className="opacity-40">LATENCY:</span> <span className="text-emerald-400">0.02ms</span></div>
          <div className="flex gap-2"><span className="opacity-40">SYNC:</span> <span className="text-cyan-400">STABLE</span></div>
          <div className="flex gap-2"><span className="opacity-40">VISION:</span> <span className="text-cyan-400">SCANNING AR</span></div>
          <button onClick={() => setShowSettings(true)} className="p-1 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-white">
            <Settings size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Engineering Data & Research */}
        <aside className="w-64 border-r border-white/5 bg-gradient-to-b from-black/20 to-transparent flex flex-col p-4 z-20 shrink-0">
          <div className="mb-6">
            <h3 className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-3">Research Synthesis</h3>
            <div className="space-y-2">
              <div className="p-2 rounded bg-white/5 border border-white/10">
                <div className="text-[11px] text-white font-medium">Kinematics Data v3.1</div>
                <div className="text-[9px] opacity-60">Source: JARVIS internal</div>
              </div>
              <div className="p-2 rounded bg-white/5 border border-white/10">
                <div className="text-[11px] text-white font-medium">Structural Integrity Lab</div>
                <div className="text-[9px] opacity-60">Project: Mark IV</div>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-3">Workspace Data</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] mb-1"><span className="opacity-60">Objects in Scene</span><span className="text-white">{shapes.length}</span></div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-cyan-500" style={{ width: `${Math.min(shapes.length * 10, 100)}%` }}></div></div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1"><span className="opacity-60">Rendering Load</span><span className="text-white">Normal</span></div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-purple-500 w-[30%]"></div></div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main 3D Viewport */}
        <section className="flex-1 relative bg-[radial-gradient(circle_at_center,_#111827_0%,_#020408_100%)] flex items-center justify-center overflow-hidden">
          {/* UI Grid Lines */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div>
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle, transparent 20%, #000 80%)" }}></div>
          
          <div className="absolute inset-0 z-10 w-full h-full">
            <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
              <ambientLight intensity={0.2} />
              <directionalLight position={[10, 10, 5]} intensity={1} color="#ffffff" />
              <pointLight position={[-10, -10, -5]} intensity={0.5} color="#00ffcc" />
              
              <Environment preset="city" />
              
              <Grid infiniteGrid fadeDistance={20} sectionColor="#1c1c1c" cellColor="#0a0a0a" position={[0, -0.5, 0]} />

              <group position={[0, 0, 0]}>
                {shapes.map((shape) => (
                  <ShapeRenderer key={shape.id} shape={shape} />
                ))}
              </group>
              
              <ContactShadows resolution={1024} scale={20} blur={2} opacity={0.5} far={10} color="#000000" />
              <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
            </Canvas>
          </div>

          {/* Floating Overlay UI */}
          <div className="absolute top-8 left-8 p-4 border-l-2 border-cyan-500 bg-black/40 backdrop-blur-md z-20 pointer-events-none">
            <p className="text-[10px] text-cyan-500 uppercase tracking-widest font-bold">Vision Scan</p>
            <p className="text-sm text-white max-w-[200px]">Surface detected: Holographic workspace. Aligning grid...</p>
          </div>
        </section>

        {/* Right Sidebar: AI Companion Interface */}
        <aside className="w-80 border-l border-white/5 bg-black/40 backdrop-blur-xl flex flex-col z-30 shrink-0">
          <div className="p-6 flex-1 flex flex-col h-full overflow-hidden">
            <div className="mb-6 flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-600 to-purple-600 p-[2px]">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                  <div className="w-4 h-4 rounded-sm bg-white/90 rotate-45"></div>
                </div>
              </div>
              <div>
                <div className="text-white font-bold text-sm">JARVIS CORE</div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Collaborating
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-4 custom-scrollbar pr-2 mb-4 h-0 min-h-0">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div className={`text-[10px] uppercase tracking-widest mb-1 ${m.role === "jarvis" ? "text-cyan-500" : "text-white/40"}`}>
                      {m.role === "jarvis" ? "JARVIS" : "USER"}
                    </div>
                    <div className={`p-3 text-sm leading-relaxed ${
                      m.role === "jarvis" 
                        ? "bg-white/5 rounded-tr-2xl rounded-bl-2xl rounded-br-2xl border border-white/10 text-white" 
                        : "bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 rounded hover:bg-cyan-500/20"
                    }`}>
                      {m.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-start"
                >
                  <div className="text-[10px] uppercase tracking-widest mb-1 text-cyan-500">
                    JARVIS
                  </div>
                  <div className="p-3 text-sm leading-relaxed bg-white/5 rounded-tr-2xl rounded-bl-2xl rounded-br-2xl border border-white/10 text-white flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-cyan-500" />
                    <span className="text-white/60 animate-pulse">Processing data...</span>
                  </div>
                </motion.div>
              )}
              <div ref={endOfMessagesRef} />
            </div>

            {/* Chat Input */}
            <div className="mt-auto shrink-0 relative">
              <div className="flex items-center gap-2 mb-3">
                <button 
                  type="button"
                  onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                  className={`flex items-center gap-1 text-[9px] uppercase font-bold px-2 py-1.5 rounded transition-colors ${isVoiceEnabled ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'bg-white/5 text-white/40 border border-white/10 hover:text-white/80'}`}
                >
                  {isVoiceEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                  Voice Ready
                </button>
                <button 
                  type="button"
                  onClick={toggleListen}
                  className={`flex items-center gap-1 text-[9px] uppercase font-bold px-2 py-1.5 rounded transition-all ${isListening ? 'bg-red-500/20 text-red-400 border border-red-500/40 ring-1 ring-red-500/50' : 'bg-white/5 text-white/40 border border-white/10 hover:text-white/80'}`}
                >
                  {isListening ? (
                    <>
                      <Mic size={12} className="animate-pulse text-red-500" />
                      Listening...
                    </>
                  ) : (
                    <>
                      <MicOff size={12} />
                      Dictation
                    </>
                  )}
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <input 
                  type="text" 
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={isLoading}
                  placeholder="Collaborate with ideas..." 
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-xs focus:outline-none focus:border-cyan-500/50 text-white disabled:opacity-50"
                  />
                <button 
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center opacity-40 hover:opacity-100 disabled:opacity-20 text-cyan-400 transition-opacity"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </aside>
      </main>

      {/* Bottom Controls: Timeline & Playback */}
      <footer className="h-20 bg-black/60 border-t border-white/10 backdrop-blur-md flex items-center px-8 gap-10 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 cursor-pointer text-white">
            <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 uppercase font-mono tracking-tighter">Evolution Time</span>
            <span className="text-xs text-white font-mono">LIVE</span>
          </div>
        </div>
        
        <div className="flex-1 flex items-center gap-2">
          <div className="h-1 flex-1 bg-white/10 rounded-full relative">
            <div className="absolute left-0 top-0 h-full bg-cyan-500 w-full rounded-full animate-pulse"></div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-4 border-cyan-500"></div>
            {/* Timeline Markers */}
            <div className="absolute left-[10%] top-[-4px] w-[1px] h-3 bg-white/30"></div>
            <div className="absolute left-[25%] top-[-4px] w-[1px] h-3 bg-white/30"></div>
            <div className="absolute left-[50%] top-[-4px] w-[1px] h-3 bg-white/30"></div>
            <div className="absolute left-[75%] top-[-4px] w-[1px] h-3 bg-white/30"></div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-cyan-500 uppercase">Current Workspace</span>
            <span className="text-xs text-white">Prototype_Delta_3D</span>
          </div>
          <div className="flex gap-2">
            <div className="w-10 h-10 border border-white/10 rounded bg-white/5 flex items-center justify-center text-white/60 hover:text-white cursor-pointer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
            </div>
            <div className="w-10 h-10 border border-white/10 rounded bg-cyan-500 text-black flex items-center justify-center font-bold text-xs cursor-pointer hover:bg-cyan-400">
              EXP
            </div>
          </div>
        </div>
      </footer>

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-lg w-[400px] shadow-2xl relative">
            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-white/40 hover:text-white/80">
              <X size={16} />
            </button>
            <h2 className="text-cyan-400 text-sm font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
              <Settings size={16} />
              System Configuration
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-white/60 uppercase tracking-widest mb-2">Compute Backend</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setBackendMode('gemini')}
                    className={`flex-1 py-2 text-xs border rounded flex flex-col items-center gap-1 ${backendMode === 'gemini' ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'}`}
                  >
                    <Database size={16} />
                    Gemini Cloud
                  </button>
                  <button 
                    onClick={() => setBackendMode('ollama')}
                    className={`flex-1 py-2 text-xs border rounded flex flex-col items-center gap-1 ${backendMode === 'ollama' ? 'bg-purple-500/10 border-purple-500/50 text-purple-400' : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'}`}
                  >
                    <Database size={16} />
                    Local Edge (Ollama)
                  </button>
                </div>
              </div>

              {backendMode === 'ollama' && (
                <>
                  <div>
                    <label className="block text-[10px] text-white/60 uppercase tracking-widest mb-1">Ollama Endpoint</label>
                    <input 
                      type="text" 
                      value={ollamaEndpoint}
                      onChange={e => setOllamaEndpoint(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded py-2 px-3 text-xs text-white focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/60 uppercase tracking-widest mb-1">Ollama Model</label>
                    <input 
                      type="text" 
                      value={ollamaModel}
                      onChange={e => setOllamaModel(e.target.value)}
                      placeholder="llama3, mistral, etc."
                      className="w-full bg-white/5 border border-white/10 rounded py-2 px-3 text-xs text-white focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <div className="text-[10px] text-orange-400/80 bg-orange-500/10 p-2 rounded border border-orange-500/20">
                    Note: Ensure your local Ollama instance is running and CORS is configured to allow requests from this origin. 
                    Set OLLAMA_ORIGINS="*" before starting ollama.
                  </div>
                </>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShowSettings(false)}
                className="bg-cyan-500 text-black px-4 py-2 rounded text-xs font-bold hover:bg-cyan-400 transition-colors"
               >
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 211, 238, 0.5);
        }
      `}} />
    </div>
  );
}
