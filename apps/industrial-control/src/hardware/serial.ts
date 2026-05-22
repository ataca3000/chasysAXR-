export async function connectSerial() {
  if (!('serial' in navigator)) {
    throw new Error('Web Serial API no esta soportada en este navegador.');
  }
  // @ts-ignore
  const port = await navigator.serial.requestPort();
  await port.open({ baudRate: 115200 });
  return port;
}
