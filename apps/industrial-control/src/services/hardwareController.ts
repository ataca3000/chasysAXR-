import mqtt from "mqtt";
import { parseCNCResponse } from "../hardware/cnc-protocol";
import {
  getAllKnownUsbFilters,
  getBoardProfile,
  getUsbFiltersForBoard,
  parseObstacleTelemetry,
} from "../hardware/boards";
import {
  FlashProgress,
  flashMicroPythonRawRepl,
  flashStk500v1,
} from "../hardware/flasher";
import { parsePinTelemetry, PinLiveState } from "../hardware/pinoutDefinitions";

export interface TelemetryData {
  temp?: number;
  temperature?: number;
  vib?: number;
  vibration?: number;
  load?: number;
  flow?: number;
  distanceCm?: number;
  obstacleDetected?: boolean;
  obstacleZone?: "left" | "center" | "right" | "all";
  pins?: PinLiveState[];
  cncStatus?: string;
  cncOk?: boolean;
  cncErrorCode?: number;
  cncAlarmCode?: number;
  position?: { x: number; y: number; z: number };
  [key: string]: any;
}

export interface SerialConnectConfig {
  boardId?: string;
  baudRate?: number;
  filterMode?: "board" | "known" | "all";
}

export class HardwareController {
  private port: any | null = null;
  private writer: WritableStreamDefaultWriter<string> | null = null;
  private writerPipeClosed: Promise<void> | null = null;
  private textEncoderAbort: AbortController | null = null;
  private activeReader: ReadableStreamDefaultReader<string> | null = null;
  private readerPipeClosed: Promise<void> | null = null;
  private ws: WebSocket | null = null;
  private mqttClient: mqtt.MqttClient | null = null;

  private activeBoardId = "arduino_nano";
  private activeBaudRate = 115200;
  private activePortInfo: { usbVendorId?: number; usbProductId?: number } | null = null;
  private isReading = false;

  private sensorListeners: Set<(data: TelemetryData) => void> = new Set();
  private rawDataListeners: Set<(data: string) => void> = new Set();
  private connectionListeners: Set<(connected: boolean) => void> = new Set();
  onSensorData: ((data: TelemetryData) => void) | null = null;
  onError: ((error: string) => void) | null = null;

  constructor(_options?: { simulation?: boolean }) {
    // Hardware controller strictly reports real incoming telemetry from USB Serial / MQTT / WebSocket.
  }

  isConnected(): boolean {
    return Boolean(this.port || this.ws?.readyState === WebSocket.OPEN || this.mqttClient?.connected);
  }

  isSerialConnected(): boolean {
    return Boolean(this.port);
  }

  getBoardId(): string {
    return this.activeBoardId;
  }

  getBaudRate(): number {
    return this.activeBaudRate;
  }

  getPortInfo() {
    return this.activePortInfo;
  }

  addSensorListener(cb: (data: TelemetryData) => void) {
    this.sensorListeners.add(cb);
    return () => {
      this.sensorListeners.delete(cb);
    };
  }

  addRawDataListener(cb: (data: string) => void) {
    this.rawDataListeners.add(cb);
    return () => {
      this.rawDataListeners.delete(cb);
    };
  }

  addConnectionListener(cb: (connected: boolean) => void) {
    this.connectionListeners.add(cb);
    return () => {
      this.connectionListeners.delete(cb);
    };
  }

  private notifyConnection() {
    const state = this.isConnected();
    this.connectionListeners.forEach((cb) => cb(state));
  }

  emitSensorData(data: TelemetryData) {
    if (this.onSensorData) this.onSensorData(data);
    this.sensorListeners.forEach((cb) => cb(data));
  }

  async connectStream(url: string, topic?: string) {
    if (!url) {
      if (this.onError) this.onError("Connection failed: Empty URL provided");
      return false;
    }

    return new Promise<boolean>((resolve) => {
      try {
        const protocol = url.split(":")[0];
        if (["mqtt", "ws", "wss"].includes(protocol)) {
          if (protocol === "mqtt" || topic) {
            this.mqttClient = mqtt.connect(url, {
              connectTimeout: 5000,
              reconnectPeriod: 2000,
            });
            this.mqttClient.on("connect", () => {
              if (topic) this.mqttClient?.subscribe(topic);
              else this.mqttClient?.subscribe("#");
              this.notifyConnection();
              resolve(true);
            });
            this.mqttClient.on("error", (err) => {
              if (this.onError) this.onError(`MQTT Error: ${err.message}`);
              resolve(false);
            });
            this.mqttClient.on("message", (_receivedTopic, message) => {
              try {
                this.parseHardwareData(message.toString());
              } catch (e) {
                console.error("Error processing MQTT message:", e);
              }
            });
          } else {
            this.ws = new WebSocket(url);
            this.ws.onopen = () => {
              this.notifyConnection();
              resolve(true);
            };
            this.ws.onerror = () => {
              if (this.onError)
                this.onError("WebSocket connection failed. Verify URL and network.");
              resolve(false);
            };
            this.ws.onmessage = (event) => {
              try {
                this.parseHardwareData(event.data);
              } catch (e) {
                console.error("Error processing WebSocket message:", e);
              }
            };
          }
        } else {
          throw new Error(
            `Unsupported protocol: ${protocol}. Use ws://, wss:// or mqtt://`,
          );
        }
      } catch (err: any) {
        if (this.onError) this.onError(`Setup failed: ${err.message}`);
        resolve(false);
      }
    });
  }

  async connect(config: SerialConnectConfig = {}) {
    const nav = navigator as any;
    if (!("serial" in nav)) {
      const errorMsg = "Web Serial API no está soportada en este navegador.";
      if (this.onError) this.onError(errorMsg);
      return false;
    }

    try {
      if (this.port) {
        await this.disconnect();
      }

      const boardId = config.boardId || this.activeBoardId;
      const profile = getBoardProfile(boardId);
      const baudRate = config.baudRate || profile.defaultBaud || 115200;
      const filterMode = config.filterMode || "known";

      const requestOptions =
        filterMode === "all"
          ? undefined
          : {
              filters:
                filterMode === "board"
                  ? getUsbFiltersForBoard(boardId)
                  : getAllKnownUsbFilters(),
            };

      this.port = requestOptions
        ? await nav.serial.requestPort(requestOptions)
        : await nav.serial.requestPort();

      await this.port.open({ baudRate });
      this.activeBoardId = boardId;
      this.activeBaudRate = baudRate;
      this.activePortInfo =
        typeof this.port.getInfo === "function" ? this.port.getInfo() : null;

      await this.attachStreams();
      this.notifyConnection();
      return true;
    } catch (err: any) {
      if (this.onError)
        this.onError(
          `Conexión USB fallida: ${err.message || "Puerto no seleccionado"}`,
        );
      return false;
    }
  }

  private async attachStreams() {
    if (!this.port) return;

    if (this.port.writable && !this.port.writable.locked) {
      const textEncoder = new TextEncoderStream();
      this.textEncoderAbort = new AbortController();
      this.writerPipeClosed = textEncoder.readable
        .pipeTo(this.port.writable as WritableStream, {
          signal: this.textEncoderAbort.signal,
        })
        .catch(() => {
          // Aborted cleanly during flash or disconnect
        });
      this.writer = textEncoder.writable.getWriter();
    }

    if (this.port.readable && !this.port.readable.locked) {
      this.isReading = true;
      this.readLoop();
    }
  }

  private async detachStreamsForFlashOrClose() {
    this.isReading = false;

    if (this.activeReader) {
      try {
        await this.activeReader.cancel();
      } catch {}
      try {
        this.activeReader.releaseLock();
      } catch {}
      this.activeReader = null;
    }

    if (this.readerPipeClosed) {
      await this.readerPipeClosed.catch(() => {});
      this.readerPipeClosed = null;
    }

    if (this.writer) {
      try {
        await this.writer.close();
      } catch {}
      try {
        this.writer.releaseLock();
      } catch {}
      this.writer = null;
    }

    if (this.textEncoderAbort) {
      this.textEncoderAbort.abort();
      this.textEncoderAbort = null;
    }

    if (this.writerPipeClosed) {
      await this.writerPipeClosed.catch(() => {});
      this.writerPipeClosed = null;
    }
  }

  private async readLoop() {
    if (!this.port || !this.port.readable) return;

    const textDecoder = new TextDecoderStream();
    this.readerPipeClosed = this.port.readable
      .pipeTo(textDecoder.writable)
      .catch(() => {});
    const reader = textDecoder.readable.getReader();
    this.activeReader = reader;

    let buffer = "";

    try {
      while (this.isReading) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
              this.parseHardwareData(trimmed);
            }
          }
        }
      }
    } catch (error) {
      if (this.isReading) {
        console.error("Error leyendo del puerto serial:", error);
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {}
      if (this.activeReader === reader) {
        this.activeReader = null;
      }
    }
  }

  async setDtrRts(dtr: boolean, rts: boolean) {
    if (!this.port || typeof this.port.setSignals !== "function") {
      throw new Error("No hay puerto USB conectado o no soporta señales DTR/RTS.");
    }
    await this.port.setSignals({
      dataTerminalReady: dtr,
      requestToSend: rts,
    });
  }

  async resetBoardPulse() {
    await this.setDtrRts(false, false);
    await new Promise((r) => setTimeout(r, 80));
    await this.setDtrRts(true, true);
  }

  async fastFlashFirmware(
    protocol: "micropython_repl" | "stk500v1",
    code: string,
    filename: string,
    onProgress?: (p: FlashProgress) => void,
  ) {
    if (!this.port) {
      throw new Error("Conecta primero tu placa Arduino o Raspberry Pi por USB Serial.");
    }

    await this.detachStreamsForFlashOrClose();
    try {
      if (protocol === "micropython_repl") {
        return await flashMicroPythonRawRepl(this.port, code, filename, onProgress);
      }
      return await flashStk500v1(this.port, code, onProgress);
    } finally {
      await this.attachStreams();
    }
  }

  private parseHardwareData(data: string) {
    if (!data) return;
    this.rawDataListeners.forEach((cb) => cb(data));

    const trimmed = data.trim();
    const combinedPayload: TelemetryData = {};
    let hasStructuredData = false;

    // 1. Parse pin telemetry (PIN:D9=1, PWM:D5=180, A0:512, JSON pins)
    const parsedPins = parsePinTelemetry(trimmed);
    if (parsedPins.length > 0) {
      combinedPayload.pins = parsedPins;
      hasStructuredData = true;
    }

    // 2. Parse obstacle / ultrasonic / LiDAR telemetry
    const obstacle = parseObstacleTelemetry(trimmed);
    if (obstacle) {
      if (obstacle.distanceCm !== undefined)
        combinedPayload.distanceCm = obstacle.distanceCm;
      if (obstacle.obstacleDetected !== undefined)
        combinedPayload.obstacleDetected = obstacle.obstacleDetected;
      if (obstacle.zone) combinedPayload.obstacleZone = obstacle.zone;
      hasStructuredData = true;
    }

    // 3. Parse GRBL/CNC status
    if (trimmed.startsWith("<") || /^(ok|error:|alarm:)/i.test(trimmed)) {
      const cnc = parseCNCResponse(trimmed);
      combinedPayload.cncStatus = cnc.status;
      combinedPayload.cncOk = cnc.ok;
      combinedPayload.cncErrorCode = cnc.errorCode;
      combinedPayload.cncAlarmCode = cnc.alarmCode;
      combinedPayload.position = cnc.position;
      hasStructuredData = true;
    }

    // 4. Parse JSON or numeric sensor tokens
    try {
      const parsed = JSON.parse(trimmed);
      const extractMetrics = (obj: any): any => {
        const result: any = {};
        for (const key in obj) {
          if (typeof obj[key] === "object" && obj[key] !== null && key !== "pins") {
            Object.assign(result, extractMetrics(obj[key]));
          } else if (typeof obj[key] === "number") {
            const k = key.toLowerCase();
            if (k === "temp" || k === "temperature") result.temperature = obj[key];
            if (k === "vib" || k === "vibration") result.vibration = obj[key];
            if (k === "load" || k === "rpm") result.load = obj[key];
            if (k === "flow") result.flow = obj[key];
          }
        }
        return result;
      };

      const extracted = extractMetrics(parsed);
      if (
        extracted.temperature !== undefined ||
        extracted.vibration !== undefined ||
        extracted.load !== undefined ||
        extracted.flow !== undefined
      ) {
        Object.assign(combinedPayload, extracted);
        hasStructuredData = true;
      } else if (!hasStructuredData && typeof parsed === "object" && parsed !== null) {
        this.emitSensorData(parsed);
        return;
      }
    } catch {
      const tempMatch = trimmed.match(/(?:^|[\s,])(?:T|TEMP|TEMPERATURE)[:=\s]*([\d.-]+)/i);
      const vibeMatch = trimmed.match(/(?:^|[\s,])(?:V|VIB|VIBRATION)[:=\s]*([\d.-]+)/i);
      const loadMatch = trimmed.match(/(?:^|[\s,])(?:L|LOAD|RPM)[:=\s]*([\d.-]+)/i);
      const flowMatch = trimmed.match(/(?:^|[\s,])(?:FLOW|CAUDAL)[:=\s]*([\d.-]+)/i);

      if (tempMatch) {
        combinedPayload.temperature = parseFloat(tempMatch[1]);
        hasStructuredData = true;
      }
      if (vibeMatch) {
        combinedPayload.vibration = parseFloat(vibeMatch[1]);
        hasStructuredData = true;
      }
      if (loadMatch) {
        combinedPayload.load = parseFloat(loadMatch[1]);
        hasStructuredData = true;
      }
      if (flowMatch) {
        combinedPayload.flow = parseFloat(flowMatch[1]);
        hasStructuredData = true;
      }
    }

    if (hasStructuredData) {
      this.emitSensorData(combinedPayload);
    }
  }

  async sendCommand(gcode: string, fromSyncQueue: boolean = false) {
    if (typeof window !== "undefined" && !navigator.onLine && !fromSyncQueue) {
      const { offlineSync } = await import("./offlineSync");
      offlineSync.addTask("local_machine", "sendCommand", { gcode });
      return false;
    }

    try {
      if (this.writer) {
        await this.writer.write(gcode + "\n");
        return true;
      }

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(gcode);
        return true;
      }

      if (this.mqttClient && this.mqttClient.connected) {
        this.mqttClient.publish("industrial/commands", gcode);
        return true;
      }

      const error =
        "Hardware no conectado. Conecta tu Arduino o Raspberry Pi vía USB Serial o MQTT/WS.";
      if (this.onError) this.onError(error);
      return false;
    } catch (err: any) {
      if (!fromSyncQueue && typeof window !== "undefined") {
        const { offlineSync } = await import("./offlineSync");
        offlineSync.addTask("local_machine", "sendCommand", { gcode });
      }
      if (this.onError)
        this.onError(`Command failed: ${err.message || "Port disconnected"}`);
      return false;
    }
  }

  async disconnect() {
    if (this.mqttClient) {
      this.mqttClient.end();
      this.mqttClient = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    await this.detachStreamsForFlashOrClose();
    if (this.port) {
      try {
        await this.port.close();
      } catch {}
      this.port = null;
    }
    this.activePortInfo = null;
    this.notifyConnection();
  }

  async emergencyStop() {
    return this.sendCommand("M112");
  }

  async startSpindle(rpm: number) {
    return this.sendCommand(`M3 S${rpm}`);
  }

  async stopSpindle() {
    return this.sendCommand("M5");
  }

  async moveTo(x: number, y: number, z: number, feedrate: number) {
    return this.sendCommand(`G1 X${x} Y${y} Z${z} F${feedrate}`);
  }
}

export const hardware = new HardwareController();
