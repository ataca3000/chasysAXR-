import { useSyncExternalStore } from 'react';
import { hardware, TelemetryData } from '../services/hardwareController';

export interface TelemetryState {
  currentTelemetry: { temperature: number; vibration: number; load: number };
  telemetryHistory: any[];
  isCriticalAlarm: boolean;
  systemError: string | null;
}

// Initial state matching App.tsx's original setup
let state: TelemetryState = {
  currentTelemetry: { temperature: 300, vibration: 1.2, load: 45 },
  telemetryHistory: Array.from({ length: 20 }).map((_, i) => ({
      time: i.toString(),
      temperature: 300,
      vibration: 1,
      load: 40
  })),
  isCriticalAlarm: false,
  systemError: null,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(l => l());
}

let lastHardwareUpdate = 0;

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
  }
};

// Global Hardware Binding
hardware.onSensorData = (data: TelemetryData) => {
  lastHardwareUpdate = Date.now();
  
  const newTemp = data.temp !== undefined ? data.temp : data.temperature;
  const newVib = data.vib !== undefined ? data.vib : data.vibration;
  const newLoad = data.load !== undefined ? data.load : undefined;

  let updated = false;
  let newCurrent = { ...state.currentTelemetry };

  if (newTemp !== undefined) { newCurrent.temperature = newTemp; updated = true; }
  if (newVib !== undefined) { newCurrent.vibration = newVib; updated = true; }
  if (newLoad !== undefined) { newCurrent.load = newLoad; updated = true; }

  // Update if data changed OR if we were previously in critical alarm (to clear it)
  if (updated || state.isCriticalAlarm) {
    let timeRaw = new Date().getTime();
    const newPoint = {
      time: timeRaw.toString().slice(-6), 
      temperature: newCurrent.temperature,
      vibration: newCurrent.vibration,
      load: newCurrent.load
    };
    
    const newHistory = [...state.telemetryHistory, newPoint];
    if (newHistory.length > 20) newHistory.shift();

    state = {
      ...state,
      currentTelemetry: newCurrent,
      telemetryHistory: newHistory,
      isCriticalAlarm: false // Clear disconnected state since we got data
    };
    notify();
  }
};

hardware.onError = (errText) => {
  state = { ...state, systemError: `Hardware Error: ${errText}` };
  notify();
};

// Watchdog timer: Trigger critical alarm if no hardware data for 5 seconds
window.setInterval(() => {
  if (lastHardwareUpdate > 0 && Date.now() - lastHardwareUpdate > 5000) {
     if (!state.isCriticalAlarm) {
       state = { ...state, isCriticalAlarm: true };
       notify();
     }
  }
}, 1000);

export function useTelemetry() {
  return useSyncExternalStore(telemetryStore.subscribe, telemetryStore.getSnapshot);
}
