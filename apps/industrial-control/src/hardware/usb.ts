export async function connectUSB() {
  // @ts-ignore
  const device = await navigator.usb.requestDevice({
    filters: [{ vendorId: 0x2341 }] // Example: Arduino vendor ID
  });
  await device.open();
  return device;
}
