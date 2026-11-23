import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Server, Cloud } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { hardware } from '../../services/hardwareController';
import { SafetyParser } from '../../services/commandParser';
import { eventBus } from '../../services/eventBus';

const ai = new GoogleGenAI({ 
  apiKey: 'DUMMY_GEMINI_KEY', // Replaced by server proxy securely
  httpOptions: {
    baseUrl: window.location.origin + '/api/gemini'
  }
});

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export function VoiceAssistant({ onError }: { onError?: (msg: string) => void }) {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [provider, setProvider] = useState<'gemini' | 'ollama'>('gemini');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  
  // Ollama fallback refs
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'es-ES';
        
        recognitionRef.current.onresult = async (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          if (transcript.trim()) {
            setStatus('Thinking...');
            handleOllamaRequest(transcript);
          }
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech Recognition Error", event.error);
          setStatus('Error');
        };
      }
    }
  }, []);

  const handleOllamaRequest = async (text: string) => {
    try {
      // Very basic prompt matching for demonstration
      let commandJson = null;
      let textLower = text.toLowerCase();
      
      if (textLower.includes("mueve el eje x") || textLower.includes("mover en x")) {
         commandJson = { action: 'move', axis: 'X', distance: 50 };
      } else if (textLower.includes("apagar el motor") || textLower.includes("detener")) {
         commandJson = { action: 'stop' };
      } else if (textLower.includes("girar husillo") || textLower.includes("encender husillo")) {
         commandJson = { action: 'tool', toolState: 'on' };
      }

      let responseText = "Comando procesado por Ollama de forma en local.";

      if (commandJson) {
         try {
           console.log("🤖 Ollama Intent:", commandJson);
           const gcode = SafetyParser.validateAndGenerate(commandJson as any);
           await hardware.sendCommand(gcode);
           responseText = "Ejecutando la acción física a través de Ollama de forma segura.";
         } catch (e: any) {
           responseText = "Ollama intentó un movimiento pero fue bloqueado por seguridad.";
         }
      }
      
      // We could also call the actual Ollama POST via fetch here if running locally:
      // const res = await fetch('/api/chat', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ prompt: text }) });
      // const data = await res.json();
      // responseText = data.response;
      
      setStatus('Speaking...');
      speakOllamaText(responseText);
    } catch (e) {
      setStatus('Error');
    }
  };

  const speakOllamaText = (text: string) => {
    if (!synthRef.current) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.onend = () => setStatus('Listening...');
    synthRef.current.speak(utterance);
  };

  const startVoice = async () => {
    if (provider === 'ollama') {
       if (!recognitionRef.current) {
         if (onError) onError("Browser doesn't support Web Speech API for local model.");
         return;
       }
       try {
         recognitionRef.current.start();
         setIsActive(true);
         setStatus('Listening...');
       } catch (e) {
         console.error(e);
       }
       return;
    }

    // Gemini
    try {
      setStatus('Initializing...');
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      
      const playbackCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      playbackContextRef.current = playbackCtx;
      nextStartTimeRef.current = playbackCtx.currentTime;

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { channelCount: 1, sampleRate: 16000 } 
      });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are Nexus Core AI, an industrial CNC monitoring assistant. Give very concise, technical responses in Spanish. If the user asks you to move the robot or change states, use the executeIndustrialCommand function. Instead of direct GCode, use this strict JSON structure: { action: 'move', axis: 'X', distance: 100 }.",
          tools: [
            {
              functionDeclarations: [
                {
                  name: "executeIndustrialCommand",
                  description: "Ejecuta comandos físicos o de control en el robot de forma segura.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      commandJson: {
                        type: Type.STRING,
                        description: "A JSON string representing the command format: { action: 'move'|'stop'|'tool'|'home', axis?: 'X'|'Y'|'Z', distance?: number, toolState?: 'on'|'off', feedrate?: number }"
                      }
                    },
                    required: ["commandJson"]
                  }
                },
                {
                  name: "modifyLaboratory",
                  description: "Agrega nuevas máquinas o componentes al laboratorio de ensamblaje 3D.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      type: {
                        type: Type.STRING,
                        description: "El tipo de componente a agregar: 'cnc', 'robot', 'motor', 'servo', 'valve', 'roller', 'prototype'"
                      },
                      label: {
                        type: Type.STRING,
                        description: "Un nombre descriptivo opcional para el componente."
                      }
                    },
                    required: ["type"]
                  }
                }
              ]
            }
          ]
        },
        callbacks: {
          onopen: () => {
            setStatus('Listening...');
            
            const sourceInfo = audioCtx.createMediaStreamSource(stream);
            sourceNodeRef.current = sourceInfo;
            const processorNode = audioCtx.createScriptProcessor(4096, 1, 1);
            processorNodeRef.current = processorNode;
            
            processorNode.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                let s = Math.max(-1, Math.min(1, inputData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              const buffer = new ArrayBuffer(pcm16.length * 2);
              const view = new DataView(buffer);
              for (let i = 0; i < pcm16.length; i++) {
                view.setInt16(i * 2, pcm16[i], true);
              }
              const base64Data = arrayBufferToBase64(buffer);
              
              sessionPromise.then((session: any) => {
                session.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
            
            sourceInfo.connect(processorNode);
            processorNode.connect(audioCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             if (message.serverContent?.interrupted) {
               nextStartTimeRef.current = playbackCtx.currentTime;
             }

             const functionCalls = message.serverContent?.modelTurn?.parts?.filter(p => p.functionCall);
             if (functionCalls && functionCalls.length > 0) {
                for (const part of functionCalls) {
                   if (part.functionCall?.name === 'executeIndustrialCommand') {
                      const commandJson = part.functionCall.args?.commandJson as string;
                      if (commandJson) {
                         let gcode = '';
                         let success = true;
                         try {
                           console.log("🤖 AI Requested Action:", commandJson);
                           gcode = SafetyParser.parseLLMOutput(commandJson);
                           console.log("🦾 Safety Parser Generated:", gcode);
                           await hardware.sendCommand(gcode);
                         } catch (e) {
                           console.error("Safety Violation Blocked:", e);
                           success = false;
                         }
                         
                         // Respond to the function call so the model knows it worked
                         sessionPromise.then((session: any) => {
                            const payload = {
                               clientContent: {
                                  turns: [{
                                     role: 'user',
                                     parts: [{
                                        functionResponse: {
                                           id: part.functionCall!.id,
                                           name: "executeIndustrialCommand",
                                           response: { result: success ? "success" : "blocked by safety constraints", gcode_sent: gcode }
                                        }
                                     }]
                                  }],
                                  turnComplete: true
                               }
                            };
                            if (session.send) {
                               session.send(payload);
                            } else if (session.sendRealtimeInput) {
                               session.sendRealtimeInput(payload);
                            }
                         });
                      }
                    } else if (part.functionCall?.name === 'modifyLaboratory') {
                       const { type, label } = part.functionCall.args as any;
                       console.log("🤖 AI Requested Lab Mod:", type, label);
                       eventBus.emit('add-machine', { type, extraData: { label } });
                       
                       sessionPromise.then((session: any) => {
                          const payload = {
                             clientContent: {
                                turns: [{
                                   role: 'user',
                                   parts: [{
                                      functionResponse: {
                                         id: part.functionCall!.id,
                                         name: "modifyLaboratory",
                                         response: { result: "success", component_added: type }
                                      }
                                   }]
                                }],
                                turnComplete: true
                             }
                          };
                          if (session.send) session.send(payload);
                          else if (session.sendRealtimeInput) session.sendRealtimeInput(payload);
                       });
                    }
                }
             }

             const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (base64Audio) {
               setStatus('Speaking...');
               const buffer = base64ToArrayBuffer(base64Audio);
               const int16Array = new Int16Array(buffer);
               const float32Array = new Float32Array(int16Array.length);
               for (let i = 0; i < int16Array.length; i++) {
                 float32Array[i] = int16Array[i] / 32768.0;
               }
               const audioBuffer = playbackCtx.createBuffer(1, float32Array.length, 24000);
               audioBuffer.copyToChannel(float32Array, 0);

               const source = playbackCtx.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(playbackCtx.destination);
               
               if (nextStartTimeRef.current < playbackCtx.currentTime) {
                 nextStartTimeRef.current = playbackCtx.currentTime;
               }
               source.start(nextStartTimeRef.current);
               nextStartTimeRef.current += audioBuffer.duration;
               
               source.onended = () => {
                 if (playbackCtx.currentTime >= nextStartTimeRef.current - 0.1) {
                   setStatus('Listening...');
                 }
               };
             }
          },
          onclose: () => {
            stopVoice();
          },
          onerror: (error) => {
            console.error("Live API error: ", error);
            if (onError) onError(`Voice Agent Connection Error: ${error?.message || 'Unknown'}`);
            setStatus('Error');
            stopVoice();
          }
        }
      });
      
      sessionRef.current = sessionPromise;
      setIsActive(true);

    } catch(err: any) {
      console.error(err);
      if (onError) onError(`Microphone Access Error: ${err?.message || 'Permission denied'}`);
      setStatus('No Mic Access');
      setIsActive(false);
    }
  };

  const stopVoice = () => {
    setIsActive(false);
    setStatus('Idle');
    
    if (provider === 'ollama') {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (synthRef.current) synthRef.current.cancel();
      return;
    }

    if (processorNodeRef.current) processorNodeRef.current.disconnect();
    if (sourceNodeRef.current) sourceNodeRef.current.disconnect();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    if (playbackContextRef.current) playbackContextRef.current.close().catch(() => {});
    
    if (sessionRef.current) {
       sessionRef.current.then((s: any) => s?.close()).catch(console.error);
       sessionRef.current = null;
    }
  };

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
      {(isExpanded || isActive) && (
        <div className="flex items-center gap-2 bg-black/85 border border-slate-700 backdrop-blur-md rounded-full px-2 py-1.5 shadow-xl">
          <div className="flex bg-slate-900 border border-slate-700/80 rounded-full overflow-hidden">
            <button
              type="button"
              onClick={() => {
                if (!isActive) setProvider('gemini');
              }}
              className={`px-2.5 py-1 flex items-center gap-1.5 text-[11px] font-mono font-medium transition-all ${
                provider === 'gemini'
                  ? 'bg-blue-600/30 text-white'
                  : 'text-slate-400 hover:text-white'
              } ${isActive && provider !== 'gemini' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Cloud size={12} /> Gemini
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isActive) setProvider('ollama');
              }}
              className={`px-2.5 py-1 flex items-center gap-1.5 text-[11px] font-mono font-medium transition-all ${
                provider === 'ollama'
                  ? 'bg-emerald-600/30 text-white'
                  : 'text-slate-400 hover:text-white'
              } ${isActive && provider !== 'ollama' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Server size={12} /> Ollama
            </button>
          </div>

          {isActive && (
            <div className="px-2.5 py-1 rounded-full flex items-center gap-2 bg-slate-900/90 border border-slate-700">
              <span
                className={`w-2 h-2 rounded-full ${
                  status === 'Listening...'
                    ? 'bg-rose-500 animate-pulse'
                    : status === 'Speaking...'
                      ? 'bg-blue-500 animate-bounce'
                      : 'bg-amber-400'
                }`}
              />
              <span className="font-mono text-[11px] text-white whitespace-nowrap">
                {status}
              </span>
            </div>
          )}

          {!isActive && (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              title="Minimizar asistente de voz"
              className="px-2 py-1 text-[10px] font-mono text-slate-400 hover:text-white"
            >
              ×
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          if (isActive) {
            stopVoice();
          } else if (!isExpanded) {
            setIsExpanded(true);
          } else {
            startVoice();
          }
        }}
        title={
          isActive
            ? 'Detener Agente de Voz'
            : isExpanded
              ? `Iniciar Voz (${provider})`
              : 'Abrir Asistente de Voz'
        }
        aria-label={isActive ? 'Detener Agente de Voz' : 'Asistente de Voz'}
        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg ${
          isActive
            ? 'bg-rose-600 hover:bg-rose-500 border border-rose-400 text-white'
            : provider === 'ollama'
              ? 'bg-slate-950/90 hover:bg-emerald-600/20 border border-emerald-500/50 text-emerald-400'
              : 'bg-slate-950/90 hover:bg-blue-600/20 border border-blue-500/50 text-blue-400'
        }`}
      >
        {isActive ? <MicOff size={18} /> : <Mic size={18} />}
      </button>
    </div>
  );
}
