import { useEffect, useRef, useState } from "react";
import {
  Usb,
  Cpu,
  ShieldAlert,
  Play,
  Square,
  RotateCcw,
  Sparkles,
  Save,
  Plus,
  Trash2,
  Upload,
  Download,
  Zap,
  Terminal,
  HardDrive,
  Send,
  AlertOctagon,
  CheckCircle2,
} from "lucide-react";
import {
  BOARD_PROFILES,
  CodeLanguage,
  evaluateObstacleSafety,
  getBoardProfile,
} from "../../hardware/boards";
import { FlashProgress } from "../../hardware/flasher";
import { hardware } from "../../services/hardwareController";
import {
  DeviceMemorySlot,
  deviceMemoryStore,
  useDeviceMemorySlots,
} from "../../store/deviceMemoryStore";
import { useTelemetry } from "../../store/telemetryStore";
import { PinoutDigitalTwin } from "../components/PinoutDigitalTwin";
import { MobileSensorsPanel } from "../components/MobileSensorsPanel";

interface GeminiControlResult {
  reply: string;
  safetyAction: string;
  serialCommands: string[];
  generatedCode: string;
  recommendedFilename?: string;
}

export function SerialWorkbenchView() {
  const { currentTelemetry, source } = useTelemetry();
  const memorySlots = useDeviceMemorySlots();

  const [selectedBoardId, setSelectedBoardId] = useState<string>("rpi_pico");
  const activeBoard = getBoardProfile(selectedBoardId);

  const [baudRate, setBaudRate] = useState<number>(activeBoard.defaultBaud);
  const [filterMode, setFilterMode] = useState<"known" | "board" | "all">("known");
  const [usbConnected, setUsbConnected] = useState<boolean>(hardware.isSerialConnected());

  // Safety & obstacle interlock configuration
  const [safetyThresholdCm, setSafetyThresholdCm] = useState<number>(25);
  const [autoEstopEnabled, setAutoEstopEnabled] = useState<boolean>(true);
  const lastInterlockSentAt = useRef<number>(0);

  // Code writer & device memory state
  const [activeSlotId, setActiveSlotId] = useState<string>(
    memorySlots[0]?.id || "slot-pico-obstacle",
  );
  const [slotName, setSlotName] = useState<string>(
    memorySlots[0]?.name || "RPi Pico: Ultrasonido + Servo + WebSerial",
  );
  const [filename, setFilename] = useState<string>(
    memorySlots[0]?.filename || activeBoard.defaultFilename,
  );
  const [language, setLanguage] = useState<CodeLanguage>(
    memorySlots[0]?.language || activeBoard.defaultLanguage,
  );
  const [editorCode, setEditorCode] = useState<string>(memorySlots[0]?.code || "");

  // Fast-flash progress
  const [flashing, setFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState<FlashProgress | null>(null);
  const [flashNotice, setFlashNotice] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  // Serial console logs
  const [serialInput, setSerialInput] = useState("");
  const [serialLogs, setSerialLogs] = useState<string[]>([
    "[USB] Workbench listo. Conecta Arduino (Uno/Nano/Mega/Leonardo), Raspberry Pi Pico o Raspberry Pi UART.",
  ]);

  // Gemini control state
  const [geminiPrompt, setGeminiPrompt] = useState(
    "Evalúa el sensor de obstáculos y genera comandos seguros o firmware de evasión para la placa actual.",
  );
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [geminiResult, setGeminiResult] = useState<GeminiControlResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const appendLog = (line: string) => {
    setSerialLogs((prev) => [...prev.slice(-45), line]);
  };

  useEffect(() => {
    const unsubRaw = hardware.addRawDataListener((raw) => {
      appendLog(`[RX] ${raw}`);
    });
    const unsubConn = hardware.addConnectionListener((connected) => {
      setUsbConnected(connected && hardware.isSerialConnected());
    });
    return () => {
      unsubRaw();
      unsubConn();
    };
  }, []);

  // Obstacle interlock watch: automatically halts motion if real sensor reports hazard
  const safetyAssessment = evaluateObstacleSafety(
    currentTelemetry.distanceCm,
    safetyThresholdCm,
    currentTelemetry.obstacleDetected,
  );

  useEffect(() => {
    if (
      autoEstopEnabled &&
      usbConnected &&
      safetyAssessment.shouldInterlock &&
      Date.now() - lastInterlockSentAt.current > 2000
    ) {
      lastInterlockSentAt.current = Date.now();
      hardware.sendCommand(safetyAssessment.avoidanceCommand);
      appendLog(
        `[INTERLOCK OBSTÁCULO] ${safetyAssessment.label} (${
          currentTelemetry.distanceCm ?? "OBS"
        } cm <= ${safetyThresholdCm} cm) -> TX ${safetyAssessment.avoidanceCommand}`,
      );
    }
  }, [
    autoEstopEnabled,
    usbConnected,
    safetyAssessment.shouldInterlock,
    safetyAssessment.avoidanceCommand,
    safetyAssessment.label,
    currentTelemetry.distanceCm,
    safetyThresholdCm,
  ]);

  const handleSelectBoard = (boardId: string) => {
    setSelectedBoardId(boardId);
    const prof = getBoardProfile(boardId);
    setBaudRate(prof.defaultBaud);

    // Load matching pinned slot if available
    const matching = memorySlots.find((s) => s.boardId === boardId);
    if (matching) {
      loadSlotIntoEditor(matching);
    }
  };

  const loadSlotIntoEditor = (slot: DeviceMemorySlot) => {
    setActiveSlotId(slot.id);
    setSlotName(slot.name);
    setFilename(slot.filename);
    setLanguage(slot.language);
    setEditorCode(slot.code);
    setFlashNotice(null);
  };

  const handleConnectUsb = async () => {
    appendLog(
      `[USB] Solicitando puerto para ${activeBoard.shortLabel} a ${baudRate} baud...`,
    );
    const ok = await hardware.connect({
      boardId: selectedBoardId,
      baudRate,
      filterMode,
    });
    if (ok) {
      setUsbConnected(true);
      const info = hardware.getPortInfo();
      appendLog(
        `[USB OK] Conectado a ${activeBoard.shortLabel} (${baudRate} baud${
          info?.usbVendorId
            ? ` VID:0x${info.usbVendorId.toString(16)}`
            : ""
        }).`,
      );
    } else {
      appendLog("[USB ERROR] No se pudo abrir el puerto USB Serial.");
    }
  };

  const handleDisconnectUsb = async () => {
    await hardware.disconnect();
    setUsbConnected(false);
    appendLog("[USB] Puerto cerrado correctamente.");
  };

  const handleResetPulse = async () => {
    try {
      await hardware.resetBoardPulse();
      appendLog("[USB] Pulso DTR/RTS enviado para reiniciar placa.");
    } catch (err: any) {
      appendLog(`[USB ERROR] ${err?.message || err}`);
    }
  };

  const handleSendSerial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialInput.trim()) return;
    const cmd = serialInput.trim();
    const sent = await hardware.sendCommand(cmd);
    appendLog(sent ? `[TX] ${cmd}` : `[ERROR] No conectado para enviar: ${cmd}`);
    if (sent) setSerialInput("");
  };

  const handleSaveSlot = (asNew = false) => {
    const saved = deviceMemoryStore.saveSlot({
      id: asNew ? undefined : activeSlotId,
      name: asNew ? `${slotName} (Copia)` : slotName,
      boardId: selectedBoardId,
      filename: filename || activeBoard.defaultFilename,
      language,
      code: editorCode,
    });
    setActiveSlotId(saved.id);
    setSlotName(saved.name);
    setFlashNotice({
      type: "ok",
      text: `Guardado en memoria del dispositivo: "${saved.name}" (${new TextEncoder().encode(saved.code).length} bytes).`,
    });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || "");
      const ext = file.name.split(".").pop()?.toLowerCase();
      const detectedLang: CodeLanguage =
        ext === "hex" ? "hex" : ext === "py" ? "python" : "arduino";
      setLanguage(detectedLang);
      setFilename(file.name);
      setEditorCode(content);
      setSlotName(file.name);
      const created = deviceMemoryStore.saveSlot({
        name: file.name,
        boardId: selectedBoardId,
        filename: file.name,
        language: detectedLang,
        code: content,
      });
      setActiveSlotId(created.id);
      setFlashNotice({
        type: "ok",
        text: `Importado "${file.name}" (${content.length} chars) y almacenado en memoria.`,
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleDownloadCode = () => {
    const blob = new Blob([editorCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || activeBoard.defaultFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFastFlash = async () => {
    setFlashNotice(null);

    if (activeBoard.flashProtocol === "stk500v1" && language !== "hex") {
      setFlashNotice({
        type: "error",
        text: "El Fast-Flash STK500v1 directo en Arduino AVR graba binarios Intel .hex. Importa un archivo .hex compilado (Sketch > Export Compiled Binary) o cambia el lenguaje a HEX / usa Raspberry Pi Pico MicroPython.",
      });
      return;
    }

    if (!usbConnected) {
      setFlashNotice({
        type: "error",
        text: "Conecta primero la placa por USB Serial para ejecutar el Fast-Flash.",
      });
      return;
    }

    setFlashing(true);
    try {
      const protocol =
        activeBoard.flashProtocol === "stk500v1"
          ? "stk500v1"
          : "micropython_repl";
      const result = await hardware.fastFlashFirmware(
        protocol,
        editorCode,
        filename || "main.py",
        (p) => setFlashProgress(p),
      );
      setFlashNotice({ type: "ok", text: result.message });
      appendLog(`[FAST-FLASH OK] ${result.message}`);
    } catch (err: any) {
      const msg = err?.message || "Fallo durante el proceso Fast-Flash.";
      setFlashNotice({ type: "error", text: msg });
      appendLog(`[FAST-FLASH ERROR] ${msg}`);
    } finally {
      setFlashing(false);
    }
  };

  const handleAskGemini = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || geminiPrompt).trim();
    if (!promptToSend) return;
    setGeminiLoading(true);
    setGeminiError(null);

    try {
      const res = await fetch("/api/hardware/gemini-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToSend,
          boardId: activeBoard.id,
          boardLabel: activeBoard.name,
          language,
          safetyThresholdCm,
          obstacleTelemetry: {
            distanceCm: currentTelemetry.distanceCm,
            obstacleDetected: currentTelemetry.obstacleDetected,
            zone: currentTelemetry.obstacleZone,
            source,
          },
          currentCode: editorCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error del servidor Gemini.");
      }
      setGeminiResult(data);
    } catch (err: any) {
      setGeminiError(err?.message || "No se pudo consultar Gemini.");
    } finally {
      setGeminiLoading(false);
    }
  };

  const editorBytes = new TextEncoder().encode(editorCode).length;
  const totalBankKb = (deviceMemoryStore.getTotalMemoryBytes() / 1024).toFixed(1);
  const boardCapacityBytes = activeBoard.flashCapacityKb * 1024;
  const flashUsagePct = Math.min(
    100,
    Math.round((editorBytes / Math.max(1024, boardCapacityBytes)) * 100),
  );

  return (
    <div className="xl:col-span-3 flex flex-col gap-5 pb-24">
      {/* Top Bar: USB Serial & Multi-Board Config */}
      <div className="glass-panel p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
            <Usb size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-display">
              CONSOLA USB SERIAL: ARDUINO, RASPBERRY PI & FAST-FLASH GEMINI
            </h2>
            <p className="text-[11px] font-mono text-slate-400">
              {activeBoard.notes}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <select
            aria-label="Seleccionar Placa Hardware"
            value={selectedBoardId}
            onChange={(e) => handleSelectBoard(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-blue-500"
          >
            {BOARD_PROFILES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Seleccionar Baudrate USB"
            value={baudRate}
            onChange={(e) => setBaudRate(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-blue-500"
          >
            {activeBoard.supportedBauds.map((baud) => (
              <option key={baud} value={baud}>
                {baud} baud
              </option>
            ))}
          </select>

          <select
            aria-label="Filtro de Puertos USB"
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="known">VID/PID RPi + Arduino</option>
            <option value="board">Solo {activeBoard.shortLabel}</option>
            <option value="all">Todos los puertos COM/USB</option>
          </select>

          {usbConnected ? (
            <>
              <button
                type="button"
                onClick={handleResetPulse}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 flex items-center gap-1.5 transition-colors"
                title="Enviar pulso DTR/RTS"
              >
                <RotateCcw size={13} /> Reset DTR/RTS
              </button>
              <button
                type="button"
                onClick={handleDisconnectUsb}
                className="px-3 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/40 text-rose-300 flex items-center gap-1.5 transition-colors"
              >
                <Square size={13} /> Desconectar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConnectUsb}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition-colors"
            >
              <Play size={13} /> Conectar USB
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Workbench: Obstacle + Gemini + Logs | Code Writer + Device Memory + Fast-Flash */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Column: Obstacle Detection, Gemini Control, Serial Console */}
        <div className="xl:col-span-5 flex flex-col gap-5">
          {/* Obstacle Detection Radar & Interlock */}
          <div className="glass-panel p-4 flex flex-col gap-3 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldAlert
                  size={16}
                  className={
                    safetyAssessment.level === "critical"
                      ? "text-rose-400"
                      : safetyAssessment.level === "warning"
                        ? "text-amber-400"
                        : "text-emerald-400"
                  }
                />
                <h3 className="text-xs font-bold text-white uppercase font-mono">
                  DETECCIÓN DE OBSTÁCULOS & INTERLOCK
                </h3>
              </div>

              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  safetyAssessment.level === "critical"
                    ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                    : safetyAssessment.level === "warning"
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                      : currentTelemetry.distanceCm === null
                        ? "bg-slate-900 border-slate-700 text-slate-400"
                        : "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                }`}
              >
                {currentTelemetry.distanceCm === null && !currentTelemetry.obstacleDetected
                  ? "SIN SENSOR EN LÍNEA"
                  : safetyAssessment.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="text-[10px] text-slate-400 uppercase">Distancia Real</div>
                <div className="text-2xl font-bold text-white tabular-nums mt-0.5">
                  {currentTelemetry.distanceCm !== null
                    ? `${currentTelemetry.distanceCm.toFixed(1)} cm`
                    : "---"}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Fuente: {source === "usb_serial" ? "Ultrasonido / LiDAR USB" : source === "mobile_sensors" ? "Proximidad Móvil" : "Esperando lectura"}
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>UMBRAL E-STOP</span>
                  <span className="text-white font-bold">{safetyThresholdCm} cm</span>
                </div>
                <input
                  aria-label="Umbral de detección de obstáculos en cm"
                  type="range"
                  min={5}
                  max={150}
                  value={safetyThresholdCm}
                  onChange={(e) => setSafetyThresholdCm(Number(e.target.value))}
                  className="w-full accent-rose-500 my-1"
                />
                <label className="flex items-center gap-1.5 text-[10px] text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoEstopEnabled}
                    onChange={(e) => setAutoEstopEnabled(e.target.checked)}
                    className="accent-rose-500"
                  />
                  <span>Auto M112 (Paro) al detectar</span>
                </label>
              </div>
            </div>
          </div>

          {/* Gemini Hardware & Obstacle Control Console */}
          <div className="glass-panel p-4 flex flex-col gap-3 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
                <Sparkles size={15} className="text-blue-400" />
                CONTROL NAVEGADOR CON GEMINI + OBSTÁCULOS
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                {activeBoard.shortLabel}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                {
                  label: "Evitar Obstáculo",
                  prompt:
                    "Evalúa la lectura actual del sensor de obstáculos y dame la secuencia de comandos segura inmediata.",
                },
                {
                  label: "Generar Código .ino",
                  prompt:
                    "Genera un código Arduino C++ completo con sensor HC-SR04 en pines D7/D6 y servo evasor en D9 compatible con Web Serial.",
                },
                {
                  label: "Generar Pico .py",
                  prompt:
                    "Genera un script MicroPython main.py para Raspberry Pi Pico con lectura de obstáculos y paro automático vía Web Serial.",
                },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setGeminiPrompt(preset.prompt);
                    handleAskGemini(preset.prompt);
                  }}
                  disabled={geminiLoading}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono text-blue-300 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <textarea
              aria-label="Instrucción para controlador Gemini"
              rows={2}
              value={geminiPrompt}
              onChange={(e) => setGeminiPrompt(e.target.value)}
              placeholder="Ej: Mueve el actuador si no hay obstáculos o escribe firmware con alarma en pin D9..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />

            <button
              type="button"
              onClick={() => handleAskGemini()}
              disabled={geminiLoading || !geminiPrompt.trim()}
              className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Sparkles size={14} />
              {geminiLoading ? "CONSULTANDO GEMINI..." : "EJECUTAR ANÁLISIS & COMANDOS GEMINI"}
            </button>

            {geminiError && (
              <div className="bg-rose-950/40 border border-rose-500/40 text-rose-300 rounded-lg p-2.5 text-xs font-mono flex items-start gap-2">
                <AlertOctagon size={14} className="shrink-0 mt-0.5" />
                <span>{geminiError}</span>
              </div>
            )}

            {geminiResult && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-blue-400 font-bold">
                    ACCIÓN: {geminiResult.safetyAction}
                  </span>
                </div>
                <p className="text-slate-200 leading-relaxed">{geminiResult.reply}</p>

                {geminiResult.serialCommands.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {geminiResult.serialCommands.map((cmd, idx) => (
                      <button
                        key={`${cmd}-${idx}`}
                        type="button"
                        onClick={async () => {
                          const sent = await hardware.sendCommand(cmd);
                          appendLog(sent ? `[GEMINI TX] ${cmd}` : `[ERROR] Sin conexión USB para ${cmd}`);
                        }}
                        className="px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px]"
                      >
                        Enviar: {cmd}
                      </button>
                    ))}
                  </div>
                )}

                {geminiResult.generatedCode && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditorCode(geminiResult.generatedCode);
                      if (geminiResult.recommendedFilename) {
                        setFilename(geminiResult.recommendedFilename);
                        setLanguage(
                          geminiResult.recommendedFilename.endsWith(".py")
                            ? "python"
                            : "arduino",
                        );
                      }
                    }}
                    className="w-full py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-colors"
                  >
                    Cargar Firmware Generado en Consola de Código
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Live USB Serial Monitor */}
          <div className="glass-panel p-4 flex flex-col gap-2.5 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5 uppercase">
                <Terminal size={14} className="text-emerald-400" /> Monitor Serial en Vivo
              </span>
              <button
                type="button"
                onClick={() => setSerialLogs([])}
                className="text-[10px] font-mono text-slate-500 hover:text-slate-300"
              >
                Limpiar
              </button>
            </div>

            <div className="bg-[#05080f] border border-slate-800 rounded-lg p-2.5 h-44 overflow-y-auto font-mono text-[11px] space-y-1 custom-scrollbar">
              {serialLogs.map((log, i) => (
                <div
                  key={i}
                  className={
                    log.includes("ERROR") || log.includes("INTERLOCK")
                      ? "text-rose-400"
                      : log.includes("[TX]") || log.includes("[GEMINI TX]")
                        ? "text-blue-400"
                        : "text-emerald-300"
                  }
                >
                  {log}
                </div>
              ))}
            </div>

            <form onSubmit={handleSendSerial} className="flex gap-2">
              <input
                type="text"
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                placeholder="Enviar comando serial (ej. PIN_SET:D9:1, STATUS, M112)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-1"
              >
                <Send size={12} /> TX
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Code Writer Console + Device Memory Slots + Fast-Flash */}
        <div className="xl:col-span-7 glass-panel p-4 flex flex-col gap-3 border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase font-mono">
                ESCRITOR DE CÓDIGO, MEMORIA EN DISPOSITIVO & FAST-FLASH USB
              </h3>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono">
              <HardDrive size={12} className="text-cyan-400" />
              <span className="text-slate-300">
                Banco: {memorySlots.length} slots ({totalBankKb} KB)
              </span>
            </div>
          </div>

          {/* Device Memory Slot Manager */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 font-mono text-xs">
            <select
              aria-label="Seleccionar slot de memoria en dispositivo"
              value={activeSlotId}
              onChange={(e) => {
                const found = memorySlots.find((s) => s.id === e.target.value);
                if (found) loadSlotIntoEditor(found);
              }}
              className="md:col-span-5 bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            >
              {memorySlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.name} ({slot.filename})
                </option>
              ))}
            </select>

            <input
              type="text"
              aria-label="Nombre del archivo en memoria"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="main.py / sketch.ino / build.hex"
              className="md:col-span-3 bg-slate-900 border border-slate-700 text-emerald-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            />

            <select
              aria-label="Formato del código"
              value={language}
              onChange={(e) => setLanguage(e.target.value as CodeLanguage)}
              className="md:col-span-2 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="python">MicroPython (.py)</option>
              <option value="arduino">Arduino (.ino)</option>
              <option value="hex">Intel HEX (.hex)</option>
            </select>

            <div className="md:col-span-2 flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => handleSaveSlot(false)}
                title="Guardar cambios en este slot de memoria"
                className="p-1.5 rounded bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/40 text-blue-300"
              >
                <Save size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleSaveSlot(true)}
                title="Guardar como nuevo slot en memoria"
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                onClick={() => {
                  deviceMemoryStore.deleteSlot(activeSlotId);
                  const next = memorySlots.find((s) => s.id !== activeSlotId);
                  if (next) loadSlotIntoEditor(next);
                }}
                disabled={memorySlots.length <= 1}
                title="Eliminar slot de memoria"
                className="p-1.5 rounded bg-rose-600/15 hover:bg-rose-600/30 disabled:opacity-30 border border-rose-500/30 text-rose-300"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Code Editor */}
          <textarea
            aria-label="Consola editor de código para Arduino y Raspberry Pi"
            value={editorCode}
            onChange={(e) => setEditorCode(e.target.value)}
            spellCheck={false}
            className="flex-1 min-h-[340px] w-full bg-[#050810] border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-emerald-300 leading-relaxed focus:outline-none focus:border-blue-500 custom-scrollbar resize-y"
          />

          {/* Flash Memory Bar & Fast-Flash Actions */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <span className="text-slate-400">
                Uso estimado de Flash ({activeBoard.shortLabel}):{" "}
                <strong className="text-white">
                  {(editorBytes / 1024).toFixed(2)} KB / {activeBoard.flashCapacityKb} KB
                </strong>{" "}
                ({flashUsagePct}%)
              </span>
              <div className="w-40 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all"
                  style={{ width: `${Math.max(2, flashUsagePct)}%` }}
                />
              </div>
            </div>

            {flashProgress && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-cyan-300">
                  <span>{flashProgress.stage}</span>
                  <span>{flashProgress.percent}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all"
                    style={{ width: `${flashProgress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {flashNotice && (
              <div
                className={`rounded-lg px-3 py-2 text-xs font-mono flex items-start gap-2 border ${
                  flashNotice.type === "ok"
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                    : "bg-amber-950/40 border-amber-500/40 text-amber-200"
                }`}
              >
                {flashNotice.type === "ok" ? (
                  <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                ) : (
                  <AlertOctagon size={14} className="shrink-0 mt-0.5" />
                )}
                <span>{flashNotice.text}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ino,.py,.hex,.txt"
                  onChange={handleImportFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5"
                >
                  <Upload size={13} /> Importar .ino/.py/.hex
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCode}
                  className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5"
                >
                  <Download size={13} /> Exportar Archivo
                </button>
              </div>

              <button
                type="button"
                onClick={handleFastFlash}
                disabled={flashing}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Zap size={14} />
                {flashing
                  ? "FLASHEANDO..."
                  : activeBoard.flashProtocol === "stk500v1"
                    ? "FAST-FLASH AVR (.HEX STK500)"
                    : "FAST-FLASH MICROPYTHON (REPL)"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Arduino Nano/Mega/Uno & Raspberry Pi Pinout Digital Twin */}
      <PinoutDigitalTwin
        boardId={selectedBoardId}
        onBoardChange={handleSelectBoard}
        isConnected={usbConnected}
      />

      {/* Real Phone/Device Sensors Panel */}
      <MobileSensorsPanel />
    </div>
  );
}
