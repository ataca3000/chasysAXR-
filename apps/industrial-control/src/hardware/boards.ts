export type BoardFamily = "arduino" | "raspberry_pi" | "esp32";

export type FlashProtocol = "stk500v1" | "micropython_repl" | "uart_sync";

export type CodeLanguage = "arduino" | "python" | "hex";

export interface UsbPortFilter {
  usbVendorId: number;
  usbProductId?: number;
}

export interface BoardProfile {
  id: string;
  name: string;
  shortLabel: string;
  family: BoardFamily;
  mcu: string;
  defaultBaud: number;
  supportedBauds: number[];
  flashProtocol: FlashProtocol;
  defaultLanguage: CodeLanguage;
  defaultFilename: string;
  flashCapacityKb: number;
  ramKb: number;
  usbFilters: UsbPortFilter[];
  notes: string;
}

export const BOARD_PROFILES: BoardProfile[] = [
  {
    id: "rpi_pico",
    name: "Raspberry Pi Pico / Pico W (RP2040)",
    shortLabel: "RPi Pico RP2040",
    family: "raspberry_pi",
    mcu: "RP2040 Dual-Core ARM Cortex-M0+",
    defaultBaud: 115200,
    supportedBauds: [9600, 57600, 115200, 230400, 921600],
    flashProtocol: "micropython_repl",
    defaultLanguage: "python",
    defaultFilename: "main.py",
    flashCapacityKb: 2048,
    ramKb: 264,
    usbFilters: [
      { usbVendorId: 0x2e8a, usbProductId: 0x0005 }, // Raspberry Pi Pico MicroPython
      { usbVendorId: 0x2e8a, usbProductId: 0x000a }, // Pico SDK CDC UART
      { usbVendorId: 0x2e8a },
    ],
    notes: "Fast-Flash directo vía MicroPython Raw REPL a memoria flash (main.py).",
  },
  {
    id: "rpi_uart",
    name: "Raspberry Pi 3 / 4 / 5 (USB-UART / CDC)",
    shortLabel: "RPi 3/4/5 UART",
    family: "raspberry_pi",
    mcu: "BCM2711 / BCM2712 (Adaptador FTDI/CP2102/CH340)",
    defaultBaud: 115200,
    supportedBauds: [9600, 38400, 57600, 115200, 230400, 921600],
    flashProtocol: "uart_sync",
    defaultLanguage: "python",
    defaultFilename: "obstacle_agent.py",
    flashCapacityKb: 4096,
    ramKb: 1024,
    usbFilters: [
      { usbVendorId: 0x0403 }, // FTDI
      { usbVendorId: 0x10c4 }, // Silicon Labs CP210x
      { usbVendorId: 0x1a86 }, // QinHeng CH340/CH341
      { usbVendorId: 0x067b }, // Prolific PL2303
      { usbVendorId: 0x0525 }, // Linux USB Gadget CDC
    ],
    notes: "Control serial + despliegue de script Python en Raspberry Pi OS por USB-UART.",
  },
  {
    id: "arduino_uno",
    name: "Arduino Uno R3 / R4 (ATmega328P)",
    shortLabel: "Arduino Uno",
    family: "arduino",
    mcu: "ATmega328P / Renesas RA4M1",
    defaultBaud: 115200,
    supportedBauds: [9600, 57600, 115200],
    flashProtocol: "stk500v1",
    defaultLanguage: "arduino",
    defaultFilename: "obstacle_uno.ino",
    flashCapacityKb: 32,
    ramKb: 2,
    usbFilters: [
      { usbVendorId: 0x2341, usbProductId: 0x0043 }, // Arduino Uno R3
      { usbVendorId: 0x2341, usbProductId: 0x0001 }, // Uno Rev1
      { usbVendorId: 0x2341, usbProductId: 0x1002 }, // Uno R4
      { usbVendorId: 0x2a03, usbProductId: 0x0043 }, // Arduino.org Uno
      { usbVendorId: 0x1a86 }, // CH340 clones
    ],
    notes: "Compatible con Optiboot STK500v1 Fast-Flash (.hex) vía DTR/RTS y código .ino.",
  },
  {
    id: "arduino_nano",
    name: "Arduino Nano (ATmega328P / CH340 / FTDI)",
    shortLabel: "Arduino Nano",
    family: "arduino",
    mcu: "ATmega328P (Old/New Bootloader)",
    defaultBaud: 115200,
    supportedBauds: [9600, 57600, 115200],
    flashProtocol: "stk500v1",
    defaultLanguage: "arduino",
    defaultFilename: "obstacle_nano.ino",
    flashCapacityKb: 30,
    ramKb: 2,
    usbFilters: [
      { usbVendorId: 0x1a86, usbProductId: 0x7523 }, // CH340 Nano
      { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FT232R Nano
      { usbVendorId: 0x2341 },
    ],
    notes: "Usa 115200 baudios (Optiboot nuevo) o 57600 baudios (Old Bootloader).",
  },
  {
    id: "arduino_mega",
    name: "Arduino Mega 2560 (Multi-Servo & CNC)",
    shortLabel: "Arduino Mega",
    family: "arduino",
    mcu: "ATmega2560",
    defaultBaud: 115200,
    supportedBauds: [9600, 57600, 115200, 250000],
    flashProtocol: "stk500v1",
    defaultLanguage: "arduino",
    defaultFilename: "cnc_obstacle_mega.ino",
    flashCapacityKb: 256,
    ramKb: 8,
    usbFilters: [
      { usbVendorId: 0x2341, usbProductId: 0x0010 },
      { usbVendorId: 0x2341, usbProductId: 0x0042 },
      { usbVendorId: 0x1a86 },
    ],
    notes: "Ideal para brazos robóticos multi-eje, CNC GRBL y múltiples ultrasonidos HC-SR04.",
  },
  {
    id: "arduino_leonardo",
    name: "Arduino Leonardo / Pro Micro (ATmega32U4)",
    shortLabel: "Leonardo 32U4",
    family: "arduino",
    mcu: "ATmega32U4 Native USB CDC",
    defaultBaud: 115200,
    supportedBauds: [9600, 57600, 115200],
    flashProtocol: "stk500v1",
    defaultLanguage: "arduino",
    defaultFilename: "obstacle_leonardo.ino",
    flashCapacityKb: 28,
    ramKb: 2.5,
    usbFilters: [
      { usbVendorId: 0x2341, usbProductId: 0x8036 },
      { usbVendorId: 0x2341, usbProductId: 0x0036 },
      { usbVendorId: 0x1b4f }, // SparkFun Pro Micro
    ],
    notes: "USB nativo CDC; usa pulso 1200 baud / DTR para entrar al bootloader.",
  },
  {
    id: "esp32",
    name: "ESP32 / ESP32-S3 (MicroPython & Serial)",
    shortLabel: "ESP32 DevKit",
    family: "esp32",
    mcu: "ESP32 Xtensa Dual-Core 240MHz",
    defaultBaud: 115200,
    supportedBauds: [9600, 115200, 460800, 921600],
    flashProtocol: "micropython_repl",
    defaultLanguage: "python",
    defaultFilename: "main.py",
    flashCapacityKb: 4096,
    ramKb: 520,
    usbFilters: [
      { usbVendorId: 0x10c4, usbProductId: 0xea60 }, // CP2102
      { usbVendorId: 0x1a86, usbProductId: 0x7523 }, // CH340
      { usbVendorId: 0x1a86, usbProductId: 0x55d4 }, // CH9102
      { usbVendorId: 0x303a }, // Espressif USB JTAG/Serial
    ],
    notes: "Soporta Fast-Flash MicroPython REPL y telemetría Wi-Fi/Serial de alta velocidad.",
  },
];

export function getBoardProfile(boardId: string): BoardProfile {
  return BOARD_PROFILES.find((b) => b.id === boardId) || BOARD_PROFILES[0];
}

export function getUsbFiltersForBoard(boardId?: string): UsbPortFilter[] {
  if (!boardId) return getAllKnownUsbFilters();
  const profile = BOARD_PROFILES.find((b) => b.id === boardId);
  return profile ? profile.usbFilters : getAllKnownUsbFilters();
}

export function getAllKnownUsbFilters(): UsbPortFilter[] {
  const seen = new Set<string>();
  const filters: UsbPortFilter[] = [];
  for (const board of BOARD_PROFILES) {
    for (const f of board.usbFilters) {
      const key = `${f.usbVendorId}:${f.usbProductId ?? "*"}`;
      if (!seen.has(key)) {
        seen.add(key);
        filters.push(f);
      }
    }
  }
  return filters;
}

export interface ObstacleTelemetry {
  distanceCm?: number;
  obstacleDetected?: boolean;
  zone?: "left" | "center" | "right" | "all";
  sensorSource?: string;
}

/**
 * Pure parser for Arduino / Raspberry Pi / ESP32 obstacle & ultrasonic telemetry lines.
 * Supports JSON payloads and key-value/token serial lines like:
 * - DIST:18.4,OBS:1
 * - SONAR=22.0cm
 * - {"distanceCm": 14.5, "obstacle": true, "zone": "center"}
 * - OBSTACLE:DETECTED PROX:12
 */
export function parseObstacleTelemetry(rawData: string): ObstacleTelemetry | null {
  if (!rawData || typeof rawData !== "string") return null;
  const trimmed = rawData.trim();
  if (!trimmed) return null;

  // Attempt JSON parsing first
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const obj = JSON.parse(trimmed);
      const distVal =
        typeof obj.distanceCm === "number"
          ? obj.distanceCm
          : typeof obj.distance === "number"
            ? obj.distance
            : typeof obj.dist_cm === "number"
              ? obj.dist_cm
              : typeof obj.sonar === "number"
                ? obj.sonar
                : typeof obj.proximity === "number"
                  ? obj.proximity
                  : undefined;

      const obsVal =
        typeof obj.obstacleDetected === "boolean"
          ? obj.obstacleDetected
          : typeof obj.obstacle === "boolean"
            ? obj.obstacle
            : typeof obj.blocked === "boolean"
              ? obj.blocked
              : typeof obj.obs === "number"
                ? obj.obs > 0
                : undefined;

      if (distVal !== undefined || obsVal !== undefined) {
        return {
          distanceCm: distVal !== undefined ? Math.max(0, Number(distVal.toFixed(1))) : undefined,
          obstacleDetected: obsVal,
          zone:
            obj.zone === "left" || obj.zone === "center" || obj.zone === "right"
              ? obj.zone
              : "center",
          sensorSource: typeof obj.sensor === "string" ? obj.sensor : "json",
        };
      }
    } catch {
      // Fall through to regex parser
    }
  }

  let distanceCm: number | undefined;
  let obstacleDetected: boolean | undefined;

  const distMatch = trimmed.match(
    /(?:DIST|DISTANCE|SONAR|LIDAR|TOF|PROX|RANGE|CM)[:=\s]*([\d.]+)/i,
  );
  if (distMatch) {
    const val = parseFloat(distMatch[1]);
    if (!Number.isNaN(val) && Number.isFinite(val)) {
      distanceCm = Math.max(0, Number(val.toFixed(1)));
    }
  }

  const obsMatch = trimmed.match(
    /(?:OBS|OBSTACLE|BLOCKED|HAZARD)[:=\s]*(1|0|true|false|detected|clear|yes|no)/i,
  );
  if (obsMatch) {
    const token = obsMatch[1].toLowerCase();
    obstacleDetected = ["1", "true", "detected", "yes"].includes(token);
  } else if (/\bOBSTACLE_DETECTED\b|\bCOLLISION_RISK\b/i.test(trimmed)) {
    obstacleDetected = true;
  } else if (/\bPATH_CLEAR\b|\bNO_OBSTACLE\b/i.test(trimmed)) {
    obstacleDetected = false;
  }

  if (distanceCm === undefined && obstacleDetected === undefined) {
    return null;
  }

  return {
    distanceCm,
    obstacleDetected,
    zone: /\bLEFT\b/i.test(trimmed)
      ? "left"
      : /\bRIGHT\b/i.test(trimmed)
        ? "right"
        : "center",
    sensorSource: "serial_token",
  };
}

export interface ObstacleSafetyAssessment {
  level: "safe" | "warning" | "critical";
  shouldInterlock: boolean;
  avoidanceCommand: string;
  label: string;
}

export function evaluateObstacleSafety(
  distanceCm: number | null,
  thresholdCm: number,
  explicitObstacle?: boolean,
): ObstacleSafetyAssessment {
  const safeThreshold = Math.max(5, thresholdCm);
  const warningThreshold = Math.round(safeThreshold * 1.8);

  if (explicitObstacle === true || (distanceCm !== null && distanceCm <= safeThreshold)) {
    return {
      level: "critical",
      shouldInterlock: true,
      avoidanceCommand: "M112",
      label: "OBSTÁCULO CRÍTICO",
    };
  }

  if (distanceCm !== null && distanceCm <= warningThreshold) {
    return {
      level: "warning",
      shouldInterlock: false,
      avoidanceCommand: "G1 F300",
      label: "PRECAUCIÓN DE PROXIMIDAD",
    };
  }

  return {
    level: "safe",
    shouldInterlock: false,
    avoidanceCommand: "STATUS",
    label: "RUTA DESPEJADA",
  };
}
