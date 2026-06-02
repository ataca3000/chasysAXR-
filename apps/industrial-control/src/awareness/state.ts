import { useSyncExternalStore } from "react";
import { eavesdropAlert } from "./events";
import { eventBus } from "../services/eventBus";

export type SensorType =
  | "temperature"
  | "vibration"
  | "load"
  | "flow"
  | "power"
  | "custom";
export type MachineStatus = "ok" | "warning" | "critical" | "offline";
export type AlertLevel = "info" | "warning" | "critical";

export interface SensorReading {
  id: string;
  type: SensorType;
  value: number;
  unit: string;
  ts: number;
  source: string;
}

export interface MachineState {
  id: string;
  name: string;
  status: MachineStatus;
  sensors: SensorReading[];
  lastUpdate: number;
}

export interface AlertEvent {
  id: string;
  level: AlertLevel;
  message: string;
  machineId?: string;
  ts: number;
  source: string;
}

export interface SituationalState {
  machines: Record<string, MachineState>;
  alerts: AlertEvent[];
  lastUpdate: number;
}

const initialState: SituationalState = {
  machines: {},
  alerts: [],
  lastUpdate: Date.now(),
};

let state: SituationalState = initialState;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeAwareness(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSituationalState() {
  return useSyncExternalStore(subscribeAwareness, getSituationalState);
}

export function getSituationalState() {
  return state;
}

export function updateMachineState(
  machineId: string,
  update: Partial<MachineState>,
) {
  const current = state.machines[machineId] || {
    id: machineId,
    name: machineId,
    status: "ok" as MachineStatus,
    sensors: [],
    lastUpdate: Date.now(),
  };

  const merged = {
    ...current,
    ...update,
    sensors: update.sensors ? [...update.sensors] : current.sensors,
    lastUpdate: Date.now(),
  };

  state = {
    ...state,
    machines: {
      ...state.machines,
      [machineId]: merged,
    },
    lastUpdate: Date.now(),
  };

  notify();
  eventBus.emit("awareness:machine-updated", merged);
}

export function addSensorReading(machineId: string, reading: SensorReading) {
  const current = state.machines[machineId] || {
    id: machineId,
    name: machineId,
    status: "ok" as MachineStatus,
    sensors: [],
    lastUpdate: Date.now(),
  };

  const nextSensors = [...current.sensors, reading].slice(-30);
  const nextStatus = current.status;

  state = {
    ...state,
    machines: {
      ...state.machines,
      [machineId]: {
        ...current,
        sensors: nextSensors,
        lastUpdate: Date.now(),
        status: nextStatus,
      },
    },
    lastUpdate: Date.now(),
  };

  notify();
  eventBus.emit("awareness:sensor-reading", { machineId, reading });
  eavesdropAlert(machineId, reading);
}

export function pushAlert(alert: AlertEvent) {
  state = {
    ...state,
    alerts: [alert, ...state.alerts].slice(0, 100),
    lastUpdate: Date.now(),
  };

  notify();
  eventBus.emit("awareness:alert", alert);
}

export function getMachineState(machineId: string) {
  return state.machines[machineId];
}
