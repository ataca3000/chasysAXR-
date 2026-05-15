import mqtt from "mqtt";

export function connectMQTT() {
  return mqtt.connect("wss://broker.emqx.io:8084/mqtt");
}
