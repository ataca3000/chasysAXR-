import { useSyncExternalStore } from "react";
import { CodeLanguage } from "../hardware/boards";
import {
  DEFAULT_ARDUINO_OBSTACLE_INO,
  DEFAULT_RPI_PICO_OBSTACLE_PY,
  DEFAULT_RPI_UART_BRIDGE_PY,
  SAMPLE_AVR_HEARTBEAT_HEX,
} from "../hardware/flasher";

export interface DeviceMemorySlot {
  id: string;
  name: string;
  boardId: string;
  filename: string;
  language: CodeLanguage;
  code: string;
  updatedAt: string;
  pinned?: boolean;
}

const STORAGE_KEY = "chasys_device_memory_slots_v1";

const DEFAULT_SLOTS: DeviceMemorySlot[] = [
  {
    id: "slot-pico-obstacle",
    name: "RPi Pico: Ultrasonido + Servo + WebSerial",
    boardId: "rpi_pico",
    filename: "main.py",
    language: "python",
    code: DEFAULT_RPI_PICO_OBSTACLE_PY,
    updatedAt: "2026-11-23T00:00:00.000Z",
    pinned: true,
  },
  {
    id: "slot-arduino-obstacle",
    name: "Arduino Nano/Uno: HC-SR04 + E-STOP Bridge",
    boardId: "arduino_nano",
    filename: "obstacle_nano.ino",
    language: "arduino",
    code: DEFAULT_ARDUINO_OBSTACLE_INO,
    updatedAt: "2026-11-23T00:00:00.000Z",
    pinned: true,
  },
  {
    id: "slot-rpi-uart",
    name: "Raspberry Pi 4/5: Puente UART + JSON Telemetría",
    boardId: "rpi_uart",
    filename: "obstacle_agent.py",
    language: "python",
    code: DEFAULT_RPI_UART_BRIDGE_PY,
    updatedAt: "2026-11-23T00:00:00.000Z",
    pinned: true,
  },
  {
    id: "slot-avr-hex",
    name: "AVR Optiboot: Heartbeat STK500 (.hex)",
    boardId: "arduino_uno",
    filename: "avr_heartbeat.hex",
    language: "hex",
    code: SAMPLE_AVR_HEARTBEAT_HEX,
    updatedAt: "2026-11-23T00:00:00.000Z",
    pinned: true,
  },
];

function loadInitialSlots(): DeviceMemorySlot[] {
  if (typeof window === "undefined") return DEFAULT_SLOTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SLOTS));
      return DEFAULT_SLOTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // Fallback cleanly
  }
  return DEFAULT_SLOTS;
}

let slots: DeviceMemorySlot[] = loadInitialSlots();
const listeners = new Set<() => void>();

function persistAndNotify(next: DeviceMemorySlot[]) {
  slots = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }
  listeners.forEach((l) => l());
}

export const deviceMemoryStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return slots;
  },
  saveSlot(slot: Omit<DeviceMemorySlot, "id" | "updatedAt"> & { id?: string }): DeviceMemorySlot {
    const now = new Date().toISOString();
    const existing = slot.id ? slots.find((s) => s.id === slot.id) : undefined;
    if (existing) {
      const updated: DeviceMemorySlot = { ...existing, ...slot, updatedAt: now };
      persistAndNotify(slots.map((s) => (s.id === existing.id ? updated : s)));
      return updated;
    }
    const created: DeviceMemorySlot = {
      id: `slot-${Date.now().toString(36)}`,
      name: slot.name,
      boardId: slot.boardId,
      filename: slot.filename,
      language: slot.language,
      code: slot.code,
      updatedAt: now,
    };
    persistAndNotify([created, ...slots]);
    return created;
  },
  deleteSlot(id: string) {
    if (slots.length <= 1) return;
    persistAndNotify(slots.filter((s) => s.id !== id));
  },
  getTotalMemoryBytes(): number {
    const encoder = new TextEncoder();
    return slots.reduce((sum, s) => sum + encoder.encode(s.code).length, 0);
  },
};

export function useDeviceMemorySlots() {
  return useSyncExternalStore(
    deviceMemoryStore.subscribe,
    deviceMemoryStore.getSnapshot,
  );
}
