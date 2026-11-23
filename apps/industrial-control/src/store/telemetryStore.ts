import { useSyncExternalStore } from "react";
import { hardware, TelemetryData } from "../services/hardwareController";
import { PinLiveState } from "../hardware/pinoutDefinitions";

export type TelemetrySource = "none" | "usb_serial" | "mqtt_ws" | "mobile_sensors";

export interface TelemetryPoint {
  time: string;
  temperature: number | null;
  vibration: number | null;
  load: number | null;
  distanceCm: number | null;
}

export interface TelemetryState {
  currentTelemetry: {
    temperature: number | null;
    vibration: number | null;
    load: number | null;
    flow: number | null;
    distanceCm: number | null;
    obstacleDetected: boolean;
    obstacleZone: "left" | "center" | "right" | "all";
  };
  telemetryHistory: TelemetryPoint[];
  pinStates: Record<string, PinLiveState>;
  activePosition: { x: number; y: number; z: number } | null;
  source: TelemetrySource;
  hasRealTelemetry: boolean;
  lastUpdatedAt: number | null;
  isCriticalAlarm: boolean;
  systemError: string | null;
}

// Strictly clean initial state with NO simulated telemetry values.
let state: TelemetryState = {
  currentTelemetry: {
    temperature: null,
    vibration: null,
    load: null,
    flow: null,
    distanceCm: null,
    obstacleDetected: false,
    obstacleZone: "center",
  },
  telemetryHistory: [],
  pinStates: {},
  activePosition: null,
  source: "none",
  hasRealTelemetry: false,
  lastUpdatedAt: null,
  isCriticalAlarm: false,
  systemError: null,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function ingestRealTelemetry(
  data: TelemetryData,
  source: TelemetrySource = "usb_serial",
) {
  const now = Date.now();
  const newTemp = data.temp !== undefined ? data.temp : data.temperature;
  const newVib = data.vib !== undefined ? data.vib : data.vibration;
  const newLoad = data.load !== undefined ? data.load : undefined;
  const newFlow = data.flow !== undefined ? data.flow : undefined;
  const newDist = data.distanceCm !== undefined ? data.distanceCm : undefined;

  let updated = false;
  const newCurrent = { ...state.currentTelemetry };

  if (typeof newTemp === "number" && Number.isFinite(newTemp)) {
    newCurrent.temperature = newTemp;
    updated = true;
  }
  if (typeof newVib === "number" && Number.isFinite(newVib)) {
    newCurrent.vibration = newVib;
    updated = true;
  }
  if (typeof newLoad === "number" && Number.isFinite(newLoad)) {
    newCurrent.load = newLoad;
    updated = true;
  }
  if (typeof newFlow === "number" && Number.isFinite(newFlow)) {
    newCurrent.flow = newFlow;
    updated = true;
  }
  if (typeof newDist === "number" && Number.isFinite(newDist)) {
    newCurrent.distanceCm = newDist;
    updated = true;
  }
  if (typeof data.obstacleDetected === "boolean") {
    newCurrent.obstacleDetected = data.obstacleDetected;
    updated = true;
  }
  if (data.obstacleZone) {
    newCurrent.obstacleZone = data.obstacleZone;
  }

  let nextPinStates = state.pinStates;
  if (Array.isArray(data.pins) && data.pins.length > 0) {
    nextPinStates = { ...state.pinStates };
    for (const p of data.pins) {
      nextPinStates[p.pinId] = p;
    }
    updated = true;
  }

  // Also infer active sensor pins when distance telemetry is flowing
  if (typeof newDist === "number" && Number.isFinite(newDist) && source === "usb_serial") {
    const boardId = hardware.getBoardId();
    nextPinStates = { ...nextPinStates };
    if (boardId === "rpi_pico") {
      nextPinStates["GP3"] = {
        pinId: "GP3",
        active: true,
        mode: "SENSOR",
        value: 1,
        sensorLabel: "HC-SR04 TRIG",
        updatedAt: now,
      };
      nextPinStates["GP2"] = {
        pinId: "GP2",
        active: newDist <= 30,
        mode: "SENSOR",
        value: Math.round(newDist),
        sensorLabel: `${newDist.toFixed(1)} cm`,
        updatedAt: now,
      };
    } else if (boardId === "rpi_uart") {
      nextPinStates["GPIO23"] = {
        pinId: "GPIO23",
        active: true,
        mode: "SENSOR",
        value: 1,
        sensorLabel: "HC-SR04 TRIG",
        updatedAt: now,
      };
      nextPinStates["GPIO24"] = {
        pinId: "GPIO24",
        active: newDist <= 30,
        mode: "SENSOR",
        value: Math.round(newDist),
        sensorLabel: `${newDist.toFixed(1)} cm`,
        updatedAt: now,
      };
    } else {
      nextPinStates["D7"] = {
        pinId: "D7",
        active: true,
        mode: "SENSOR",
        value: 1,
        sensorLabel: "HC-SR04 TRIG",
        updatedAt: now,
      };
      nextPinStates["D6"] = {
        pinId: "D6",
        active: newDist <= 30,
        mode: "SENSOR",
        value: Math.round(newDist),
        sensorLabel: `${newDist.toFixed(1)} cm`,
        updatedAt: now,
      };
    }
  }

  const nextPos = data.position || state.activePosition;
  if (data.position) updated = true;

  if (updated || state.isCriticalAlarm) {
    const labelTime = new Date(now).toTimeString().slice(0, 8);
    const newPoint: TelemetryPoint = {
      time: labelTime,
      temperature: newCurrent.temperature,
      vibration: newCurrent.vibration,
      load: newCurrent.load,
      distanceCm: newCurrent.distanceCm,
    };

    const newHistory = [...state.telemetryHistory, newPoint];
    if (newHistory.length > 30) newHistory.shift();

    state = {
      ...state,
      currentTelemetry: newCurrent,
      telemetryHistory: newHistory,
      pinStates: nextPinStates,
      activePosition: nextPos,
      source,
      hasRealTelemetry: true,
      lastUpdatedAt: now,
      isCriticalAlarm: false,
    };
    notify();
  }
}

export const telemetryStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return state;
  },
  setSystemError(error: string | null) {
    state = { ...state, systemError: error };
    notify();
  },
  updatePinState(pin: PinLiveState) {
    state = {
      ...state,
      pinStates: {
        ...state.pinStates,
        [pin.pinId]: pin,
      },
      lastUpdatedAt: Date.now(),
    };
    notify();
  },
  clearTelemetry() {
    state = {
      currentTelemetry: {
        temperature: null,
        vibration: null,
        load: null,
        flow: null,
        distanceCm: null,
        obstacleDetected: false,
        obstacleZone: "center",
      },
      telemetryHistory: [],
      pinStates: {},
      activePosition: null,
      source: "none",
      hasRealTelemetry: false,
      lastUpdatedAt: null,
      isCriticalAlarm: false,
      systemError: null,
    };
    notify();
  },
};

hardware.onSensorData = (data: TelemetryData) => {
  ingestRealTelemetry(data, "usb_serial");
};

hardware.onError = (errText) => {
  state = { ...state, systemError: `Hardware Error: ${errText}` };
  notify();
};

// Watchdog: trigger disconnection alarm only if real hardware was active and stopped reporting for 6s
if (typeof window !== "undefined") {
  window.setInterval(() => {
    if (state.lastUpdatedAt && Date.now() - state.lastUpdatedAt > 6000) {
      if (!state.isCriticalAlarm && state.source !== "mobile_sensors") {
        state = { ...state, isCriticalAlarm: true };
        notify();
      }
    }
  }, 1500);
}

export function useTelemetry() {
  return useSyncExternalStore(
    telemetryStore.subscribe,
    telemetryStore.getSnapshot,
  );
}
