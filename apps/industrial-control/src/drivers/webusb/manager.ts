export async function connectWebUsb() {
  const device = await (navigator as any).usb.requestDevice({ filters: [] });
  await device.open();
  if (!device.configuration) {
    await device.selectConfiguration(1);
  }
  await device.claimInterface(0);
  return device;
}

export async function executeUsbCommand(payload: Record<string, unknown>) {
  const device = await connectWebUsb();
  const data = new TextEncoder().encode(JSON.stringify(payload));
  await device.transferOut(1, data);
}
