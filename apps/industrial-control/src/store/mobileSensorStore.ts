import { useSyncExternalStore } from "react";
import {
  computeBubbleLevel,
  computeLinearVibrationFromImu,
} from "../hardware/mobileSensorsMath";
import { ingestRealTelemetry } from "./telemetryStore";

export type SensorSupportStatus =
  | "idle"
  | "active"
  | "permission_required"
  | "unsupported"
  | "error";

export interface MobileSensorsSnapshot {
  enabled: boolean;
  bridgeToTelemetry: boolean;
  permissionState: "unknown" | "granted" | "denied" | "not_required";
  statusMessage: string;
  capabilities: {
    gyroscope: SensorSupportStatus;
    orientationLevel: SensorSupportStatus;
    accelerometer: SensorSupportStatus;
    proximity: SensorSupportStatus;
    temperature: SensorSupportStatus;
    battery: SensorSupportStatus;
  };
  gyro: {
    alpha: number | null; // Yaw deg
    beta: number | null;  // Pitch deg
    gamma: number | null; // Roll deg
    rateX: number | null; // deg/s or rad/s
    rateY: number | null;
    rateZ: number | null;
  };
  level: {
    pitchDeg: number;
    rollDeg: number;
    totalTiltDeg: number;
    isLevel: boolean;
  };
  accel: {
    x: number | null;
    y: number | null;
    z: number | null;
    vibrationRms: number | null;
  };
  proximity: {
    distanceCm: number | null;
    near: boolean | null;
    sourceNote: string;
  };
  thermal: {
    ambientCelsius: number | null;
    batteryLevelPct: number | null;
    batteryCharging: boolean | null;
    sourceNote: string;
  };
  lastSampleAt: number | null;
}

let snapshot: MobileSensorsSnapshot = {
  enabled: false,
  bridgeToTelemetry: true,
  permissionState: "unknown",
  statusMessage: "Pulsa 'Activar Sensores Reales' para leer IMU, nivel, proximidad y estado térmico del dispositivo.",
  capabilities: {
    gyroscope: typeof window !== "undefined" && ("DeviceOrientationEvent" in window || "Gyroscope" in window) ? "idle" : "unsupported",
    orientationLevel: typeof window !== "undefined" && "DeviceOrientationEvent" in window ? "idle" : "unsupported",
    accelerometer: typeof window !== "undefined" && "DeviceMotionEvent" in window ? "idle" : "unsupported",
    proximity:
      typeof window !== "undefined" &&
      ("ProximitySensor" in window || "ondeviceproximity" in window || "onuserproximity" in window)
        ? "idle"
        : "unsupported",
    temperature:
      typeof window !== "undefined" && "AmbientTemperatureSensor" in window
        ? "idle"
        : typeof navigator !== "undefined" && "getBattery" in navigator
          ? "idle"
          : "unsupported",
    battery: typeof navigator !== "undefined" && "getBattery" in navigator ? "idle" : "unsupported",
  },
  gyro: {
    alpha: null,
    beta: null,
    gamma: null,
    rateX: null,
    rateY: null,
    rateZ: null,
  },
  level: {
    pitchDeg: 0,
    rollDeg: 0,
    totalTiltDeg: 0,
    isLevel: false,
  },
  accel: {
    x: null,
    y: null,
    z: null,
    vibrationRms: null,
  },
  proximity: {
    distanceCm: null,
    near: null,
    sourceNote: "Sin sensor nativo ProximitySensor en este navegador; usa puente USB o cámara.",
  },
  thermal: {
    ambientCelsius: null,
    batteryLevelPct: null,
    batteryCharging: null,
    sourceNote: "Esperando lectura real de batería / AmbientTemperatureSensor...",
  },
  lastSampleAt: null,
};

const listeners = new Set<() => void>();
let cleanupFns: Array<() => void> = [];
let lastTelemetryPushAt = 0;

function emit() {
  listeners.forEach((l) => l());
}

function maybeBridgeTelemetry() {
  if (!snapshot.enabled || !snapshot.bridgeToTelemetry) return;
  const now = Date.now();
  if (now - lastTelemetryPushAt < 250) return;
  lastTelemetryPushAt = now;

  const payload: Record<string, any> = {};
  if (snapshot.accel.vibrationRms !== null) {
    payload.vibration = snapshot.accel.vibrationRms;
  }
  if (snapshot.thermal.ambientCelsius !== null) {
    payload.temperature = snapshot.thermal.ambientCelsius;
  }
  if (snapshot.proximity.distanceCm !== null) {
    payload.distanceCm = snapshot.proximity.distanceCm;
    payload.obstacleDetected = Boolean(snapshot.proximity.near);
  }
  if (Object.keys(payload).length > 0) {
    ingestRealTelemetry(payload, "mobile_sensors");
  }
}

export const mobileSensorStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return snapshot;
  },
  setBridgeToTelemetry(enabled: boolean) {
    snapshot = { ...snapshot, bridgeToTelemetry: enabled };
    emit();
  },
  async start() {
    if (typeof window === "undefined") return;
    mobileSensorStore.stop();

    const caps = { ...snapshot.capabilities };
    let permissionState: MobileSensorsSnapshot["permissionState"] = "not_required";

    try {
      const OrientationEvt = window.DeviceOrientationEvent as any;
      if (OrientationEvt && typeof OrientationEvt.requestPermission === "function") {
        const res = await OrientationEvt.requestPermission();
        permissionState = res === "granted" ? "granted" : "denied";
        if (res !== "granted") {
          snapshot = {
            ...snapshot,
            enabled: false,
            permissionState,
            statusMessage: "Permiso de giroscopio/orientación denegado por iOS/navegador.",
          };
          emit();
          return;
        }
      }

      const MotionEvt = window.DeviceMotionEvent as any;
      if (MotionEvt && typeof MotionEvt.requestPermission === "function") {
        const res = await MotionEvt.requestPermission();
        permissionState = res === "granted" ? "granted" : "denied";
      }
    } catch (err: any) {
      snapshot = {
        ...snapshot,
        enabled: false,
        statusMessage: `Error solicitando permiso de sensores: ${err?.message || err}`,
      };
      emit();
      return;
    }

    // 1. DeviceOrientationEvent (Gyroscope angles + Bubble Level)
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha === null && e.beta === null && e.gamma === null) return;
      const level = computeBubbleLevel(e.beta, e.gamma);
      caps.orientationLevel = "active";
      caps.gyroscope = "active";
      snapshot = {
        ...snapshot,
        capabilities: { ...caps },
        gyro: {
          ...snapshot.gyro,
          alpha: e.alpha !== null ? Number(e.alpha.toFixed(1)) : snapshot.gyro.alpha,
          beta: e.beta !== null ? Number(e.beta.toFixed(1)) : snapshot.gyro.beta,
          gamma: e.gamma !== null ? Number(e.gamma.toFixed(1)) : snapshot.gyro.gamma,
        },
        level,
        lastSampleAt: Date.now(),
      };
      emit();
    };
    window.addEventListener("deviceorientation", onOrientation);
    cleanupFns.push(() => window.removeEventListener("deviceorientation", onOrientation));

    // 2. DeviceMotionEvent (Real rotationRate + Acceleration Vibration RMS)
    const onMotion = (e: DeviceMotionEvent) => {
      const acc = e.acceleration || e.accelerationIncludingGravity;
      const rot = e.rotationRate;
      const includesGravity = !e.acceleration;

      const nextGyro = { ...snapshot.gyro };
      if (rot && (rot.alpha !== null || rot.beta !== null || rot.gamma !== null)) {
        caps.gyroscope = "active";
        nextGyro.rateX = rot.beta !== null ? Number(rot.beta.toFixed(2)) : null;
        nextGyro.rateY = rot.gamma !== null ? Number(rot.gamma.toFixed(2)) : null;
        nextGyro.rateZ = rot.alpha !== null ? Number(rot.alpha.toFixed(2)) : null;
      }

      let nextAccel = snapshot.accel;
      if (acc && (acc.x !== null || acc.y !== null || acc.z !== null)) {
        caps.accelerometer = "active";
        const vib = computeLinearVibrationFromImu(
          acc.x ?? 0,
          acc.y ?? 0,
          acc.z ?? 0,
          includesGravity,
        );
        nextAccel = {
          x: acc.x !== null ? Number(acc.x.toFixed(2)) : null,
          y: acc.y !== null ? Number(acc.y.toFixed(2)) : null,
          z: acc.z !== null ? Number(acc.z.toFixed(2)) : null,
          vibrationRms: vib,
        };
      }

      snapshot = {
        ...snapshot,
        capabilities: { ...caps },
        gyro: nextGyro,
        accel: nextAccel,
        lastSampleAt: Date.now(),
      };
      emit();
      maybeBridgeTelemetry();
    };
    window.addEventListener("devicemotion", onMotion);
    cleanupFns.push(() => window.removeEventListener("devicemotion", onMotion));

    // 3. Generic Sensor API: Gyroscope
    const winAny = window as any;
    if ("Gyroscope" in winAny) {
      try {
        const gyro = new winAny.Gyroscope({ frequency: 15 });
        gyro.addEventListener("reading", () => {
          caps.gyroscope = "active";
          snapshot = {
            ...snapshot,
            capabilities: { ...caps },
            gyro: {
              ...snapshot.gyro,
              rateX: Number(((gyro.x || 0) * (180 / Math.PI)).toFixed(2)),
              rateY: Number(((gyro.y || 0) * (180 / Math.PI)).toFixed(2)),
              rateZ: Number(((gyro.z || 0) * (180 / Math.PI)).toFixed(2)),
            },
            lastSampleAt: Date.now(),
          };
          emit();
        });
        gyro.start();
        cleanupFns.push(() => {
          try {
            gyro.stop();
          } catch {}
        });
      } catch {
        // Browser blocked Generic Gyroscope, DeviceMotion fallback remains active
      }
    }

    // 4. Real Proximity Sensor APIs (W3C ProximitySensor or legacy deviceproximity/userproximity)
    if ("ProximitySensor" in winAny) {
      try {
        const prox = new winAny.ProximitySensor({ frequency: 5 });
        prox.addEventListener("reading", () => {
          caps.proximity = "active";
          snapshot = {
            ...snapshot,
            capabilities: { ...caps },
            proximity: {
              distanceCm: typeof prox.distance === "number" ? Number(prox.distance.toFixed(1)) : null,
              near: Boolean(prox.near),
              sourceNote: "Sensor Web ProximitySensor en vivo",
            },
            lastSampleAt: Date.now(),
          };
          emit();
          maybeBridgeTelemetry();
        });
        prox.start();
        cleanupFns.push(() => {
          try {
            prox.stop();
          } catch {}
        });
      } catch {
        caps.proximity = "unsupported";
      }
    } else if ("ondeviceproximity" in window || "onuserproximity" in window) {
      const onDeviceProx = (e: any) => {
        caps.proximity = "active";
        snapshot = {
          ...snapshot,
          capabilities: { ...caps },
          proximity: {
            distanceCm: typeof e.value === "number" ? Number(e.value.toFixed(1)) : null,
            near: typeof e.value === "number" ? e.value <= 5 : null,
            sourceNote: "Sensor físico deviceproximity en vivo",
          },
          lastSampleAt: Date.now(),
        };
        emit();
        maybeBridgeTelemetry();
      };
      const onUserProx = (e: any) => {
        caps.proximity = "active";
        snapshot = {
          ...snapshot,
          capabilities: { ...caps },
          proximity: {
            distanceCm: e.near ? 2.0 : 50.0,
            near: Boolean(e.near),
            sourceNote: "Sensor físico userproximity en vivo",
          },
          lastSampleAt: Date.now(),
        };
        emit();
        maybeBridgeTelemetry();
      };
      window.addEventListener("deviceproximity", onDeviceProx);
      window.addEventListener("userproximity", onUserProx);
      cleanupFns.push(() => {
        window.removeEventListener("deviceproximity", onDeviceProx);
        window.removeEventListener("userproximity", onUserProx);
      });
    } else {
      caps.proximity = "unsupported";
    }

    // 5. Real AmbientTemperatureSensor (if hardware exposes it) + Battery Status API
    let thermalNote =
      "El SO del navegador bloquea la temperatura directa del SoC; usa termistor USB o AmbientTemperatureSensor si el equipo lo expone.";
    if ("AmbientTemperatureSensor" in winAny) {
      try {
        const tempSensor = new winAny.AmbientTemperatureSensor({ frequency: 1 });
        tempSensor.addEventListener("reading", () => {
          caps.temperature = "active";
          snapshot = {
            ...snapshot,
            capabilities: { ...caps },
            thermal: {
              ...snapshot.thermal,
              ambientCelsius:
                typeof tempSensor.celsius === "number"
                  ? Number(tempSensor.celsius.toFixed(1))
                  : null,
              sourceNote: "AmbientTemperatureSensor real activo",
            },
            lastSampleAt: Date.now(),
          };
          emit();
          maybeBridgeTelemetry();
        });
        tempSensor.start();
        cleanupFns.push(() => {
          try {
            tempSensor.stop();
          } catch {}
        });
      } catch {
        caps.temperature = "unsupported";
      }
    }

    const navAny = navigator as any;
    if (typeof navAny.getBattery === "function") {
      try {
        const battery = await navAny.getBattery();
        const syncBattery = () => {
          caps.battery = "active";
          snapshot = {
            ...snapshot,
            capabilities: { ...caps },
            thermal: {
              ...snapshot.thermal,
              batteryLevelPct: Math.round((battery.level ?? 0) * 100),
              batteryCharging: Boolean(battery.charging),
              sourceNote:
                snapshot.thermal.ambientCelsius !== null
                  ? "AmbientTemperatureSensor + Batería real"
                  : thermalNote,
            },
          };
          emit();
        };
        syncBattery();
        battery.addEventListener("levelchange", syncBattery);
        battery.addEventListener("chargingchange", syncBattery);
        cleanupFns.push(() => {
          battery.removeEventListener("levelchange", syncBattery);
          battery.removeEventListener("chargingchange", syncBattery);
        });
      } catch {
        caps.battery = "unsupported";
      }
    }

    snapshot = {
      ...snapshot,
      enabled: true,
      permissionState,
      capabilities: caps,
      thermal: {
        ...snapshot.thermal,
        sourceNote: thermalNote,
      },
      statusMessage:
        "Sensores reales escuchando eventos físicos del dispositivo (sin datos simulados).",
    };
    emit();
  },
  stop() {
    cleanupFns.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
    cleanupFns = [];
    snapshot = {
      ...snapshot,
      enabled: false,
      statusMessage: "Sensores móviles detenidos.",
    };
    emit();
  },
};

export function useMobileSensors() {
  return useSyncExternalStore(
    mobileSensorStore.subscribe,
    mobileSensorStore.getSnapshot,
  );
}
