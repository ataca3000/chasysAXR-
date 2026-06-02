import { addSensorReading, pushAlert, SensorReading } from "./state";

const ALERT_RULES = [
  {
    test: (reading: SensorReading) =>
      reading.type === "temperature" && reading.value > 800,
    create: (machineId: string, reading: SensorReading) => ({
      id: `${machineId}-temp-${reading.ts}`,
      level: "critical" as const,
      machineId,
      source: reading.source,
      ts: reading.ts,
      message: `Temperatura crítica en ${machineId}: ${reading.value}${reading.unit}`,
    }),
  },
  {
    test: (reading: SensorReading) =>
      reading.type === "temperature" && reading.value > 550,
    create: (machineId: string, reading: SensorReading) => ({
      id: `${machineId}-temp-warning-${reading.ts}`,
      level: "warning" as const,
      machineId,
      source: reading.source,
      ts: reading.ts,
      message: `Temperatura alta en ${machineId}: ${reading.value}${reading.unit}`,
    }),
  },
  {
    test: (reading: SensorReading) =>
      reading.type === "vibration" && reading.value > 4.5,
    create: (machineId: string, reading: SensorReading) => ({
      id: `${machineId}-vib-${reading.ts}`,
      level: "warning" as const,
      machineId,
      source: reading.source,
      ts: reading.ts,
      message: `Vibración peligrosa en ${machineId}: ${reading.value}${reading.unit}`,
    }),
  },
  {
    test: (reading: SensorReading) =>
      reading.type === "load" && reading.value > 90,
    create: (machineId: string, reading: SensorReading) => ({
      id: `${machineId}-load-${reading.ts}`,
      level: "warning" as const,
      machineId,
      source: reading.source,
      ts: reading.ts,
      message: `Carga excesiva en ${machineId}: ${reading.value}${reading.unit}`,
    }),
  },
];

export function evaluateSensorReading(
  machineId: string,
  reading: SensorReading,
) {
  for (const rule of ALERT_RULES) {
    if (rule.test(reading)) {
      const alert = rule.create(machineId, reading);
      pushAlert(alert);
      return alert;
    }
  }
  return null;
}

export function eavesdropAlert(machineId: string, reading: SensorReading) {
  const alert = evaluateSensorReading(machineId, reading);
  return alert;
}
