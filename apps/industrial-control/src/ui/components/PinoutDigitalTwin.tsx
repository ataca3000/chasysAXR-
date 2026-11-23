import { useState } from "react";
import { Cpu, Radio, Zap, Activity, Sliders } from "lucide-react";
import {
  BoardPinDefinition,
  getPinoutForBoard,
  PinKind,
  PinLiveState,
} from "../../hardware/pinoutDefinitions";
import { hardware } from "../../services/hardwareController";
import { telemetryStore, useTelemetry } from "../../store/telemetryStore";

interface PinoutDigitalTwinProps {
  boardId: string;
  onBoardChange?: (boardId: string) => void;
  isConnected?: boolean;
}

const PINOUT_TABS = [
  { id: "arduino_nano", label: "Arduino Nano" },
  { id: "arduino_mega", label: "Arduino Mega 2560" },
  { id: "arduino_uno", label: "Arduino Uno" },
  { id: "rpi_pico", label: "RPi Pico RP2040" },
  { id: "rpi_uart", label: "Raspberry Pi 40-Pin" },
];

function getKindBadgeColor(kind: PinKind, active: boolean): string {
  if (active) return "bg-emerald-500 text-slate-950 font-bold border-emerald-300";
  switch (kind) {
    case "power":
      return "bg-rose-500/20 text-rose-300 border-rose-500/40";
    case "gnd":
      return "bg-slate-800 text-slate-400 border-slate-700";
    case "pwm":
      return "bg-cyan-500/15 text-cyan-300 border-cyan-500/40";
    case "analog":
      return "bg-amber-500/15 text-amber-300 border-amber-500/40";
    case "i2c":
      return "bg-indigo-500/20 text-indigo-300 border-indigo-500/40";
    case "spi":
      return "bg-purple-500/20 text-purple-300 border-purple-500/40";
    case "uart":
      return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    case "reset":
      return "bg-orange-500/15 text-orange-300 border-orange-500/40";
    default:
      return "bg-slate-900 text-slate-300 border-slate-700";
  }
}

export function PinoutDigitalTwin({
  boardId,
  onBoardChange,
  isConnected = false,
}: PinoutDigitalTwinProps) {
  const { pinStates, source, lastUpdatedAt } = useTelemetry();
  const layout = getPinoutForBoard(boardId);
  const [selectedPin, setSelectedPin] = useState<BoardPinDefinition | null>(
    layout.pins.find((p) => p.defaultSensorRole) || layout.pins[0] || null,
  );
  const [pwmValue, setPwmValue] = useState(128);
  const [commandStatus, setCommandStatus] = useState<string | null>(null);

  const activePinCount = Object.values(pinStates).filter((p) => p.active).length;

  const isConfigurablePin = (pin: BoardPinDefinition) =>
    !["power", "gnd", "reset"].includes(pin.kind);

  const sendPinDigitalToggle = async (pin: BoardPinDefinition, nextHigh: boolean) => {
    const cmd = `PIN_SET:${pin.id}:${nextHigh ? 1 : 0}`;
    const sent = await hardware.sendCommand(cmd);
    if (sent) {
      telemetryStore.updatePinState({
        pinId: pin.id,
        active: nextHigh,
        mode: "OUTPUT",
        value: nextHigh ? 1 : 0,
        sensorLabel: pin.defaultSensorRole,
        updatedAt: Date.now(),
      });
      setCommandStatus(`Enviado: ${cmd}`);
    } else {
      setCommandStatus(`Sin conexión USB para ${cmd}`);
    }
  };

  const sendPinPwm = async (pin: BoardPinDefinition, value: number) => {
    const clamped = Math.max(0, Math.min(255, value));
    const cmd = `PWM:${pin.id}:${clamped}`;
    const sent = await hardware.sendCommand(cmd);
    if (sent) {
      telemetryStore.updatePinState({
        pinId: pin.id,
        active: clamped > 0,
        mode: "PWM",
        value: clamped,
        sensorLabel: pin.defaultSensorRole,
        updatedAt: Date.now(),
      });
      setCommandStatus(`Enviado: ${cmd}`);
    } else {
      setCommandStatus(`Sin conexión USB para ${cmd}`);
    }
  };

  const leftPins = layout.pins.filter((p) => p.side === "left");
  const rightPins = layout.pins.filter((p) => p.side === "right");
  const topPins = layout.pins.filter((p) => p.side === "top");
  const bottomPins = layout.pins.filter((p) => p.side === "bottom");
  const headerPins = layout.pins.filter((p) => p.side === "header");

  const renderPinButton = (pin: BoardPinDefinition, align: "left" | "right" = "left") => {
    const live: PinLiveState | undefined = pinStates[pin.id];
    const isActive = Boolean(live?.active);
    const isSelected = selectedPin?.id === pin.id && selectedPin?.physicalPin === pin.physicalPin;
    const hasSensor = Boolean(live?.sensorLabel || pin.defaultSensorRole);

    return (
      <button
        key={`${pin.id}-${pin.physicalPin}`}
        type="button"
        onClick={() => setSelectedPin(pin)}
        className={`w-full flex items-center justify-between gap-2 px-2 py-1 rounded border text-[10px] font-mono transition-colors ${
          isSelected
            ? "border-blue-400 bg-blue-600/20 text-white"
            : isActive
              ? "border-emerald-500/60 bg-emerald-950/30 text-emerald-200"
              : "border-slate-800/90 bg-slate-950/80 text-slate-300 hover:border-slate-600"
        } ${align === "right" ? "flex-row-reverse text-right" : ""}`}
      >
        <div className={`flex items-center gap-1.5 min-w-0 ${align === "right" ? "flex-row-reverse" : ""}`}>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isActive
                ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]"
                : hasSensor
                  ? "bg-amber-400/70"
                  : "bg-slate-700"
            }`}
          />
          <span className="truncate font-semibold">{pin.label}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {live ? (
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] border ${
                live.active
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                  : "bg-slate-900 border-slate-700 text-slate-400"
              }`}
            >
              {live.mode === "ANALOG"
                ? `ADC ${live.value}`
                : live.mode === "PWM"
                  ? `PWM ${live.value}`
                  : live.active
                    ? "HIGH"
                    : "LOW"}
            </span>
          ) : pin.defaultSensorRole ? (
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-900 border border-slate-800 text-amber-300/90 truncate max-w-[100px]">
              {pin.defaultSensorRole}
            </span>
          ) : (
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] border uppercase ${getKindBadgeColor(
                pin.kind,
                isActive,
              )}`}
            >
              {pin.kind}
            </span>
          )}
        </div>
      </button>
    );
  };

  const selectedLive = selectedPin ? pinStates[selectedPin.id] : undefined;

  return (
    <div className="glass-panel p-4 flex flex-col gap-4 border border-slate-800 bg-[#090e18]">
      {/* Header & Board Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <Cpu size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              GEMELO DE PINES EN TIEMPO REAL — {layout.title}
            </h3>
            <p className="text-[11px] font-mono text-slate-400">
              {layout.chipLabel} • {activePinCount} pines activos en vivo{" "}
              {lastUpdatedAt ? `• Última trama ${new Date(lastUpdatedAt).toLocaleTimeString()}` : "• Sin telemetría serial"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PINOUT_TABS.map((tab) => {
            const isTabActive =
              boardId === tab.id ||
              (boardId === "arduino_leonardo" && tab.id === "arduino_uno") ||
              (boardId === "esp32" && tab.id === "rpi_pico");
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onBoardChange?.(tab.id);
                  const nextLayout = getPinoutForBoard(tab.id);
                  setSelectedPin(nextLayout.pins[0] || null);
                }}
                className={`px-2.5 py-1 rounded text-[10px] font-mono border transition-colors ${
                  isTabActive
                    ? "bg-blue-600 border-blue-500 text-white font-semibold"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Physical PCB Visualization */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-8 bg-[#060a12] border border-slate-800 rounded-xl p-3">
          {layout.formFactor === "dip" || layout.formFactor === "rpi_40" ? (
            <div className="grid grid-cols-1 md:grid-cols-11 gap-2 items-stretch">
              <div className="md:col-span-4 space-y-1">
                <div className="text-[9px] font-mono text-slate-500 uppercase mb-1">
                  {layout.formFactor === "rpi_40" ? "Pines Impares (1–39)" : "Banco Izquierdo"}
                </div>
                {leftPins.map((pin) => renderPinButton(pin, "left"))}
              </div>

              {/* PCB Center Die */}
              <div className="md:col-span-3 flex flex-col items-center justify-center bg-[#0d1829] border border-emerald-500/25 rounded-lg p-3 text-center my-2 md:my-0">
                <div className="w-14 h-14 rounded-lg bg-slate-950 border border-slate-700 flex flex-col items-center justify-center mb-2 shadow-inner">
                  <Cpu size={20} className="text-emerald-400 mb-0.5" />
                  <span className="text-[8px] font-mono text-slate-400">USB</span>
                </div>
                <div className="text-[11px] font-bold text-white font-mono">{layout.title}</div>
                <div className="text-[10px] font-mono text-emerald-400 mt-1">{layout.chipLabel}</div>
                <div className="mt-3 text-[9px] font-mono text-slate-400 space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> Pin Activo
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> Sensor Mapeado
                  </div>
                  <div className="text-[9px] text-slate-500 pt-1">
                    Fuente: {source === "usb_serial" ? "USB Serial Live" : "Standby"}
                  </div>
                </div>
              </div>

              <div className="md:col-span-4 space-y-1">
                <div className="text-[9px] font-mono text-slate-500 uppercase mb-1 md:text-right">
                  {layout.formFactor === "rpi_40" ? "Pines Pares (2–40)" : "Banco Derecho"}
                </div>
                {rightPins.map((pin) => renderPinButton(pin, "right"))}
              </div>
            </div>
          ) : (
            /* Arduino Uno / Mega Form Factor */
            <div className="space-y-3">
              <div>
                <div className="text-[9px] font-mono text-slate-500 uppercase mb-1.5">
                  Header Digital / PWM / Comunicación
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {topPins.map((pin) => renderPinButton(pin, "left"))}
                </div>
              </div>

              {headerPins.length > 0 && (
                <div>
                  <div className="text-[9px] font-mono text-cyan-400 uppercase mb-1.5">
                    Expansión Mega 2560 (Pines D22–D53 / Steppers / SPI)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {headerPins.map((pin) => renderPinButton(pin, "left"))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[9px] font-mono text-amber-400 uppercase mb-1.5">
                  Header Analógico (ADC) & Alimentación
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {bottomPins.map((pin) => renderPinButton(pin, "left"))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Selected Pin Inspector & Real-Time Hardware Control */}
        <div className="xl:col-span-4 bg-[#060a12] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[10px] font-mono text-blue-400 font-bold uppercase flex items-center gap-1.5">
              <Radio size={13} /> Inspector de Pin en Vivo
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                isConnected
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : "bg-slate-900 text-slate-400 border border-slate-800"
              }`}
            >
              {isConnected ? "USB EN LÍNEA" : "SOLO LECTURA"}
            </span>
          </div>

          {selectedPin ? (
            <div className="space-y-3 text-xs font-mono">
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{selectedPin.label}</span>
                  <span className="text-[10px] text-slate-400">Pin físico #{selectedPin.physicalPin}</span>
                </div>
                <div className="mt-1.5 text-[11px] text-slate-400">
                  Tipo: <span className="text-slate-200 uppercase">{selectedPin.kind}</span>
                  {selectedPin.altFunction && ` • ${selectedPin.altFunction}`}
                </div>
                {(selectedLive?.sensorLabel || selectedPin.defaultSensorRole) && (
                  <div className="mt-1.5 text-[11px] text-amber-300 flex items-center gap-1.5">
                    <Activity size={12} />
                    Sensor/Actuador: {selectedLive?.sensorLabel || selectedPin.defaultSensorRole}
                  </div>
                )}
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="text-[10px] text-slate-400 uppercase mb-1">Estado Medido en Tiempo Real</div>
                {selectedLive ? (
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-bold text-emerald-400">
                      {selectedLive.mode === "ANALOG"
                        ? `${selectedLive.value} (ADC)`
                        : selectedLive.mode === "PWM"
                          ? `PWM ${selectedLive.value}/255`
                          : selectedLive.active
                            ? "HIGH (1)"
                            : "LOW (0)"}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(selectedLive.updatedAt).toLocaleTimeString()}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">
                    Sin trama recibida aún para {selectedPin.id}. El firmware puede reportar{" "}
                    <code className="text-slate-300">PIN:{selectedPin.id}=1</code>.
                  </div>
                )}
              </div>

              {isConfigurablePin(selectedPin) && (
                <div className="space-y-2.5 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => sendPinDigitalToggle(selectedPin, true)}
                      className="py-2 rounded bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Zap size={12} /> FORZAR HIGH
                    </button>
                    <button
                      type="button"
                      onClick={() => sendPinDigitalToggle(selectedPin, false)}
                      className="py-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-bold transition-colors"
                    >
                      FORZAR LOW
                    </button>
                  </div>

                  {selectedPin.kind === "pwm" && (
                    <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-cyan-300">
                        <span className="flex items-center gap-1">
                          <Sliders size={11} /> Salida PWM
                        </span>
                        <span>{pwmValue} / 255</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={255}
                        value={pwmValue}
                        onChange={(e) => setPwmValue(Number(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                      <button
                        type="button"
                        onClick={() => sendPinPwm(selectedPin, pwmValue)}
                        className="w-full py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold transition-colors"
                      >
                        APLICAR PWM ({pwmValue})
                      </button>
                    </div>
                  )}
                </div>
              )}

              {commandStatus && (
                <div className="text-[10px] text-blue-300 bg-blue-950/30 border border-blue-500/30 rounded px-2.5 py-1.5">
                  {commandStatus}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
