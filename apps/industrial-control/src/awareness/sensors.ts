import { hardware } from "../services/hardwareController";
import { connectMQTT } from "../services/mqtt";
import { addSensorReading } from "./state";

export function normalizeSensorData(raw: any, source: string) {
  const now = Date.now();

  const typeMap: Record<string, string> = {
    temp: "temperature",
    temperature: "temperature",
    vib: "vibration",
    vibration: "vibration",
    load: "load",
    rpm: "load",
    flow: "flow",
    power: "power",
  };

  const normalized: any = {};
  for (const key in raw) {
    const lower = key.toLowerCase();
    if (typeMap[lower]) {
      normalized[typeMap[lower]] = raw[key];
    }
  }

  const readings = Object.entries(normalized)
    .filter(([, value]) => typeof value === "number")
    .map(([type, value]) => ({
      id: `${source}-${type}-${now}`,
      type: type as any,
      value,
      unit:
        type === "temperature"
          ? "°C"
          : type === "vibration"
            ? "mm/s"
            : type === "load"
              ? "%"
              : type === "flow"
                ? "L/min"
                : "units",
      ts: now,
      source,
    }));

  return readings;
}

export function processHardwareInput(data: any) {
  const readings = normalizeSensorData(data, "hardware");
  const machineId = data.machineId || data.id || "machine-1";
  readings.forEach((reading) => addSensorReading(machineId, reading));
}

export function processMQTTMessage(topic: string, payload: string) {
  let parsed: any = {};
  try {
    parsed = JSON.parse(payload);
  } catch {
    return;
  }

  const machineId =
    parsed.machineId ||
    parsed.id ||
    topic.split("/").slice(-1)[0] ||
    "machine-mqtt";
  const readings = normalizeSensorData(parsed, "mqtt");
  readings.forEach((reading) => addSensorReading(machineId, reading));
}

export function initializeAwarenessInputs() {
  hardware.addSensorListener((data) => {
    processHardwareInput(data);
  });

  const mqttClient = connectMQTT();
  mqttClient.on("connect", () => {
    mqttClient.subscribe("#");
  });
  mqttClient.on("message", (topic, message) => {
    processMQTTMessage(topic, message.toString());
  });
}
