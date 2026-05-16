import mqtt from "mqtt";

export function connectMQTT() {
  // Use local broker from Docker or fallback to secure localhost
  const brokerUrl = import.meta.env.VITE_MQTT_BROKER_URL || "ws://localhost:9001/mqtt";
  return mqtt.connect(brokerUrl, {
     reconnectPeriod: 5000,
     connectTimeout: 10000
  });
}
