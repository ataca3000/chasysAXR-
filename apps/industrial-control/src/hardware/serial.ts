import { connectWebSerial, WebSerialConnectOptions } from "../drivers/webserial/manager";

export async function connectSerial(options: WebSerialConnectOptions = {}) {
  return connectWebSerial(options);
}
