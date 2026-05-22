export async function connectWebSerial() {
  const filters = [{ usbVendorId: 0x2341 }, { usbProductId: 0x8036 }];
  const port = await navigator.serial.requestPort({ filters });
  await port.open({ baudRate: 115200 });
  return port;
}

export async function executeSerialCommand(payload: Record<string, unknown>) {
  const port = await connectWebSerial();
  const writer = port.writable?.getWriter();
  if (!writer) throw new Error("WebSerial writer unavailable");

  const encoder = new TextEncoder();
  await writer.write(encoder.encode(JSON.stringify(payload)));
  writer.releaseLock();
}
