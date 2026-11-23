export interface IntelHexBlock {
  address: number;
  data: Uint8Array;
}

export interface ParsedIntelHex {
  blocks: IntelHexBlock[];
  totalBytes: number;
  entryAddress: number;
}

/**
 * Parses an Intel HEX string (:LLAAAATTDD...CC) into contiguous memory blocks.
 * Validates record length and 2's complement checksum.
 */
export function parseIntelHex(hexText: string): ParsedIntelHex {
  const lines = hexText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new Error("Archivo Intel HEX vacío.");
  }

  let upperBaseAddress = 0;
  let entryAddress = 0;
  let totalBytes = 0;
  const rawChunks: Array<{ address: number; data: Uint8Array }> = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (!line.startsWith(":")) {
      throw new Error(`Línea HEX ${lineIdx + 1} inválida: falta prefijo ':'`);
    }

    const body = line.slice(1);
    if (body.length < 10 || body.length % 2 !== 0) {
      throw new Error(`Línea HEX ${lineIdx + 1} truncada.`);
    }

    const bytes = new Uint8Array(body.length / 2);
    let checksumSum = 0;
    for (let i = 0; i < bytes.length; i++) {
      const parsed = Number.parseInt(body.slice(i * 2, i * 2 + 2), 16);
      if (Number.isNaN(parsed)) {
        throw new Error(`Carácter hexadecimal inválido en línea ${lineIdx + 1}.`);
      }
      bytes[i] = parsed;
      checksumSum += parsed;
    }

    if ((checksumSum & 0xff) !== 0) {
      throw new Error(`Error de checksum en línea HEX ${lineIdx + 1}.`);
    }

    const byteCount = bytes[0];
    if (bytes.length !== byteCount + 5) {
      throw new Error(`Longitud inconsistente en línea HEX ${lineIdx + 1}.`);
    }

    const address = (bytes[1] << 8) | bytes[2];
    const recordType = bytes[3];
    const payload = bytes.slice(4, 4 + byteCount);

    if (recordType === 0x00) {
      // Data record
      const fullAddress = upperBaseAddress + address;
      rawChunks.push({ address: fullAddress, data: payload });
      totalBytes += payload.length;
    } else if (recordType === 0x01) {
      // End of file
      break;
    } else if (recordType === 0x02) {
      // Extended Segment Address
      if (payload.length !== 2) throw new Error("Registro tipo 02 inválido.");
      upperBaseAddress = ((payload[0] << 8) | payload[1]) << 4;
    } else if (recordType === 0x04) {
      // Extended Linear Address
      if (payload.length !== 2) throw new Error("Registro tipo 04 inválido.");
      upperBaseAddress = ((payload[0] << 8) | payload[1]) << 16;
    } else if (recordType === 0x03 || recordType === 0x05) {
      // Start Segment / Linear Address
      if (payload.length === 4) {
        entryAddress =
          ((payload[0] << 24) | (payload[1] << 16) | (payload[2] << 8) | payload[3]) >>> 0;
      }
    }
  }

  if (rawChunks.length === 0) {
    throw new Error("El archivo .hex no contiene bloques de datos grabables.");
  }

  // Merge contiguous chunks into sequential blocks
  rawChunks.sort((a, b) => a.address - b.address);
  const blocks: IntelHexBlock[] = [];
  for (const chunk of rawChunks) {
    const prev = blocks[blocks.length - 1];
    if (prev && prev.address + prev.data.length === chunk.address) {
      const merged = new Uint8Array(prev.data.length + chunk.data.length);
      merged.set(prev.data, 0);
      merged.set(chunk.data, prev.data.length);
      prev.data = merged;
    } else {
      blocks.push({ address: chunk.address, data: chunk.data });
    }
  }

  return { blocks, totalBytes, entryAddress };
}

function encodeUtf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa === "function") {
    return btoa(binary);
  }
  return Buffer.from(bytes).toString("base64");
}

/**
 * Generates MicroPython Raw REPL write sequence using base64 chunks so any
 * UTF-8 character, quote, or newline flashes reliably into device flash.
 */
export function buildRawReplFrames(
  filename: string,
  sourceCode: string,
  chunkSize = 192,
): string[] {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_") || "main.py";
  const b64 = encodeUtf8ToBase64(sourceCode);
  const frames: string[] = [];

  // Interrupt running script (Ctrl-C x2) and enter Raw REPL (Ctrl-A)
  frames.push("\r\x03\x03");
  frames.push("\r\x01");

  // Open target file in flash and import ubinascii/binascii
  const openCmd =
    `import binascii\n_f = open(${JSON.stringify(safeName)}, "wb")\n\x04`;
  frames.push(openCmd);

  for (let i = 0; i < b64.length; i += chunkSize) {
    const slice = b64.slice(i, i + chunkSize);
    frames.push(`_f.write(binascii.a2b_base64(${JSON.stringify(slice)}))\n\x04`);
  }

  frames.push(`_f.close()\nprint("FLASH_OK:${safeName}")\n\x04`);
  // Exit Raw REPL (Ctrl-B) and Soft Reboot (Ctrl-D) to execute main.py immediately
  frames.push("\x02");
  frames.push("\r\x04");

  return frames;
}

export interface FlashProgress {
  percent: number;
  stage: string;
  bytesWritten: number;
  totalBytes: number;
}

/**
 * Flashes MicroPython script directly to Raspberry Pi Pico / RP2040 / ESP32
 * flash memory via Web Serial Raw REPL.
 */
export async function flashMicroPythonRawRepl(
  port: any,
  sourceCode: string,
  filename = "main.py",
  onProgress?: (p: FlashProgress) => void,
): Promise<{ ok: boolean; bytesWritten: number; message: string }> {
  if (!port || !port.writable) {
    throw new Error("Puerto USB Serial no abierto o sin flujo de escritura.");
  }

  const encoder = new TextEncoder();
  const totalBytes = encoder.encode(sourceCode).length;
  const frames = buildRawReplFrames(filename, sourceCode);

  onProgress?.({
    percent: 5,
    stage: `Interrumpiendo script e iniciando Raw REPL para ${filename}...`,
    bytesWritten: 0,
    totalBytes,
  });

  const writer = port.writable.getWriter();
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let deviceAck = "";

  try {
    if (port.readable && !port.readable.locked) {
      reader = port.readable.getReader();
    }

    for (let i = 0; i < frames.length; i++) {
      const payload = encoder.encode(frames[i]);
      await writer.write(payload);

      // Give flash controller brief settle window between frames
      const delayMs = i < 2 ? 120 : i === frames.length - 1 ? 150 : 45;
      await new Promise((r) => setTimeout(r, delayMs));

      if (reader) {
        try {
          const readAttempt = await Promise.race([
            reader.read(),
            new Promise<{ value?: Uint8Array; done: boolean }>((r) =>
              setTimeout(() => r({ value: undefined, done: false }), 40),
            ),
          ]);
          if (readAttempt.value) {
            deviceAck += new TextDecoder().decode(readAttempt.value);
          }
        } catch {
          // Non-fatal during rapid REPL frames
        }
      }

      const pct = Math.min(98, Math.round(((i + 1) / frames.length) * 100));
      const writtenEstimate = Math.min(
        totalBytes,
        Math.round(((i + 1) / frames.length) * totalBytes),
      );
      onProgress?.({
        percent: pct,
        stage:
          i === frames.length - 1
            ? `Reiniciando placa y arrancando ${filename}...`
            : `Escribiendo en memoria flash (${i + 1}/${frames.length})...`,
        bytesWritten: writtenEstimate,
        totalBytes,
      });
    }

    onProgress?.({
      percent: 100,
      stage: `Fast-Flash completado (${totalBytes} bytes en ${filename}).`,
      bytesWritten: totalBytes,
      totalBytes,
    });

    const hasSyntaxErr = /Traceback|SyntaxError|OSError/i.test(deviceAck);
    if (hasSyntaxErr) {
      throw new Error(`El dispositivo reportó un error en REPL: ${deviceAck.slice(-160)}`);
    }

    return {
      ok: true,
      bytesWritten: totalBytes,
      message: `Script grabado en flash (${filename}, ${totalBytes} bytes) y ejecutado vía Soft Reset.`,
    };
  } finally {
    try {
      writer.releaseLock();
    } catch {}
    if (reader) {
      try {
        await reader.cancel();
      } catch {}
      try {
        reader.releaseLock();
      } catch {}
    }
  }
}

async function readExactBytesWithTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  expectedLen: number,
  timeoutMs = 500,
): Promise<Uint8Array> {
  const out: number[] = [];
  const deadline = Date.now() + timeoutMs;

  while (out.length < expectedLen && Date.now() < deadline) {
    const remaining = Math.max(10, deadline - Date.now());
    const res = await Promise.race([
      reader.read(),
      new Promise<{ value?: Uint8Array; done: boolean }>((r) =>
        setTimeout(() => r({ value: undefined, done: true }), remaining),
      ),
    ]);
    if (res.value) {
      for (let i = 0; i < res.value.length; i++) {
        out.push(res.value[i]);
      }
    }
    if (res.done && !res.value) break;
  }

  return new Uint8Array(out);
}

/**
 * STK500v1 Optiboot Binary Fast-Flash over Web Serial for Arduino AVR (Uno/Nano/Mega).
 * Flashes Intel HEX pages using DTR/RTS pulse + STK_GET_SYNC + STK_LOAD_ADDRESS + STK_PROG_PAGE.
 */
export async function flashStk500v1(
  port: any,
  hexText: string,
  onProgress?: (p: FlashProgress) => void,
): Promise<{ ok: boolean; bytesWritten: number; message: string }> {
  if (!port || !port.writable || !port.readable) {
    throw new Error("Puerto USB Serial no disponible para STK500v1.");
  }

  const parsed = parseIntelHex(hexText);
  const pageSize = 128;

  onProgress?.({
    percent: 5,
    stage: "Pulsando DTR/RTS para reiniciar bootloader Arduino (Optiboot)...",
    bytesWritten: 0,
    totalBytes: parsed.totalBytes,
  });

  if (typeof port.setSignals === "function") {
    await port.setSignals({ dataTerminalReady: false, requestToSend: false });
    await new Promise((r) => setTimeout(r, 80));
    await port.setSignals({ dataTerminalReady: true, requestToSend: true });
    await new Promise((r) => setTimeout(r, 250));
  }

  const writer = port.writable.getWriter();
  const reader = port.readable.getReader();

  try {
    // Attempt STK_GET_SYNC (0x30, 0x20) up to 6 times -> expects STK_INSYNC (0x14), STK_OK (0x10)
    let synced = false;
    for (let attempt = 0; attempt < 6; attempt++) {
      await writer.write(new Uint8Array([0x30, 0x20]));
      const resp = await readExactBytesWithTimeout(reader, 2, 220);
      if (resp.length >= 2 && resp[0] === 0x14 && resp[1] === 0x10) {
        synced = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 90));
    }

    if (!synced) {
      throw new Error(
        "No se recibió respuesta STK500v1 del bootloader Arduino (verifica baudrate 115200/57600 o pulsa RESET físico).",
      );
    }

    // Enter program mode: STK_ENTER_PROGMODE (0x50, 0x20)
    await writer.write(new Uint8Array([0x50, 0x20]));
    const enterResp = await readExactBytesWithTimeout(reader, 2, 300);
    if (enterResp[0] !== 0x14) {
      throw new Error("Fallo al entrar en modo programación STK500v1.");
    }

    let written = 0;
    for (const block of parsed.blocks) {
      for (let offset = 0; offset < block.data.length; offset += pageSize) {
        const chunk = block.data.slice(offset, offset + pageSize);
        const wordAddr = (block.address + offset) >> 1;
        const addrLow = wordAddr & 0xff;
        const addrHigh = (wordAddr >> 8) & 0xff;

        // STK_LOAD_ADDRESS (0x55, addrLow, addrHigh, 0x20)
        await writer.write(new Uint8Array([0x55, addrLow, addrHigh, 0x20]));
        const addrResp = await readExactBytesWithTimeout(reader, 2, 300);
        if (addrResp[0] !== 0x14) {
          throw new Error(`Error cargando dirección 0x${wordAddr.toString(16)}`);
        }

        // STK_PROG_PAGE (0x64, lenHi, lenLo, 'F', ...data, 0x20)
        const lenHi = (chunk.length >> 8) & 0xff;
        const lenLo = chunk.length & 0xff;
        const packet = new Uint8Array(4 + chunk.length + 1);
        packet[0] = 0x64;
        packet[1] = lenHi;
        packet[2] = lenLo;
        packet[3] = 0x46; // 'F' Flash
        packet.set(chunk, 4);
        packet[packet.length - 1] = 0x20;

        await writer.write(packet);
        const progResp = await readExactBytesWithTimeout(reader, 2, 600);
        if (progResp[0] !== 0x14) {
          throw new Error(`Error programando página flash en 0x${wordAddr.toString(16)}`);
        }

        written += chunk.length;
        onProgress?.({
          percent: Math.min(96, Math.round((written / parsed.totalBytes) * 100)),
          stage: `Programando página AVR 0x${(block.address + offset).toString(16)}...`,
          bytesWritten: written,
          totalBytes: parsed.totalBytes,
        });
      }
    }

    // STK_LEAVE_PROGMODE (0x51, 0x20)
    await writer.write(new Uint8Array([0x51, 0x20]));
    await readExactBytesWithTimeout(reader, 2, 300);

    onProgress?.({
      percent: 100,
      stage: `Fast-Flash AVR completado (${written} bytes).`,
      bytesWritten: written,
      totalBytes: parsed.totalBytes,
    });

    return {
      ok: true,
      bytesWritten: written,
      message: `Arduino programado vía STK500v1 (${written} bytes en flash).`,
    };
  } finally {
    try {
      writer.releaseLock();
    } catch {}
    try {
      reader.releaseLock();
    } catch {}
  }
}

export const SAMPLE_AVR_HEARTBEAT_HEX = `:100000000C9434000C943E000C943E000C943E0082
:100010000C943E000C943E000C943E000C943E0068
:040020000C944000FC
:00000001FF`;

export const DEFAULT_ARDUINO_OBSTACLE_INO = `// 1/0 iAgnt Studio - Arduino + Ultrasonido HC-SR04 + Puente Gemini Web Serial
// Compatible: Arduino Uno / Nano / Mega / Leonardo (115200 baud)

#include <Servo.h>

const int TRIG_PIN = 7;
const int ECHO_PIN = 6;
const int SERVO_PIN = 9;
const int MOTOR_PWM_PIN = 5;
const int SAFETY_THRESHOLD_CM = 25;

Servo steeringServo;
bool estopActive = false;

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(MOTOR_PWM_PIN, OUTPUT);
  steeringServo.attach(SERVO_PIN);
  steeringServo.write(90);
  Serial.println("ARDUINO_OBSTACLE_BRIDGE_READY");
}

float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 25000);
  if (duration == 0) return 250.0;
  return (duration * 0.0343) / 2.0;
}

void loop() {
  float dist = readDistanceCm();
  int obsFlag = (dist <= SAFETY_THRESHOLD_CM) ? 1 : 0;

  if (obsFlag == 1 && !estopActive) {
    analogWrite(MOTOR_PWM_PIN, 0);
    Serial.println("OBSTACLE_DETECTED");
  }

  Serial.print("DIST:");
  Serial.print(dist, 1);
  Serial.print(",OBS:");
  Serial.println(obsFlag);

  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\\n');
    cmd.trim();
    if (cmd == "M112" || cmd == "STOP") {
      estopActive = true;
      analogWrite(MOTOR_PWM_PIN, 0);
      Serial.println("OK:ESTOP_ENGAGED");
    } else if (cmd == "AVOID_LEFT") {
      steeringServo.write(45);
      Serial.println("OK:AVOID_LEFT");
    } else if (cmd == "AVOID_RIGHT") {
      steeringServo.write(135);
      Serial.println("OK:AVOID_RIGHT");
    } else if (cmd == "RESUME") {
      estopActive = false;
      steeringServo.write(90);
      analogWrite(MOTOR_PWM_PIN, 140);
      Serial.println("OK:RESUMED");
    }
  }
  delay(150);
}
`;

export const DEFAULT_RPI_PICO_OBSTACLE_PY = `# Raspberry Pi Pico (RP2040) - MicroPython Web Serial + Obstáculos
# Compatible con Fast-Flash directo a memoria flash (main.py)

from machine import Pin, PWM, time_pulse_us
import sys, uselect, time

TRIG = Pin(3, Pin.OUT)
ECHO = Pin(2, Pin.IN)
LED = Pin("LED", Pin.OUT)
SERVO = PWM(Pin(15))
SERVO.freq(50)

SAFETY_CM = 25.0
estop = False

def set_servo_angle(angle):
    duty = int(1638 + (max(0, min(180, angle)) / 180.0) * (8191 - 1638))
    SERVO.duty_u16(duty)

def read_distance_cm():
    TRIG.low()
    time.sleep_us(2)
    TRIG.high()
    time.sleep_us(10)
    TRIG.low()
    dur = time_pulse_us(ECHO, 1, 25000)
    if dur < 0:
        return 250.0
    return (dur * 0.0343) / 2.0

poll = uselect.poll()
poll.register(sys.stdin, uselect.POLLIN)
set_servo_angle(90)
print("RP2040_OBSTACLE_READY")

while True:
    dist = read_distance_cm()
    obs = 1 if dist <= SAFETY_CM else 0
    LED.value(obs)
    print(f'{{"distanceCm":{dist:.1f},"obstacle":{str(bool(obs)).lower()}}}')

    if poll.poll(10):
        line = sys.stdin.readline().strip()
        if line in ("M112", "STOP"):
            estop = True
            print("OK:PICO_ESTOP")
        elif line == "AVOID_LEFT":
            set_servo_angle(45)
            print("OK:PICO_AVOID_LEFT")
        elif line == "AVOID_RIGHT":
            set_servo_angle(135)
            print("OK:PICO_AVOID_RIGHT")
        elif line == "RESUME":
            estop = False
            set_servo_angle(90)
            print("OK:PICO_RESUMED")

    time.sleep(0.15)
`;

export const DEFAULT_RPI_UART_BRIDGE_PY = `#!/usr/bin/env python3
# Raspberry Pi 3/4/5 - Puente Serial UART/CDC con Sensor de Obstáculos y Gemini Control
import json, sys, time

SAFETY_CM = 25.0

def emit_telemetry(distance_cm: float):
    payload = {
        "distanceCm": round(distance_cm, 1),
        "obstacle": distance_cm <= SAFETY_CM,
        "sensor": "rpi_gpio_ultrasonic"
    }
    print(json.dumps(payload), flush=True)

if __name__ == "__main__":
    print("RPI_UART_AGENT_READY", flush=True)
    # Bucle base: reemplazar lectura con gpiozero DistanceSensor(echo=24, trigger=23)
    while True:
        emit_telemetry(42.0)
        time.sleep(0.5)
`;
