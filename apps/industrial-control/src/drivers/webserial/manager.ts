import {
  getAllKnownUsbFilters,
  getBoardProfile,
  getUsbFiltersForBoard,
  UsbPortFilter,
} from "../../hardware/boards";

export interface WebSerialConnectOptions {
  boardId?: string;
  baudRate?: number;
  useBoardFilter?: boolean;
  allPorts?: boolean;
}

export async function connectWebSerial(options: WebSerialConnectOptions = {}) {
  const nav = navigator as Navigator & { serial?: any };
  if (!nav.serial) {
    throw new Error("Web Serial API no está soportada en este navegador.");
  }

  const profile = options.boardId ? getBoardProfile(options.boardId) : null;
  const baudRate = options.baudRate || profile?.defaultBaud || 115200;

  let filters: UsbPortFilter[] | undefined;
  if (!options.allPorts) {
    filters =
      options.useBoardFilter && options.boardId
        ? getUsbFiltersForBoard(options.boardId)
        : getAllKnownUsbFilters();
  }

  const port = filters?.length
    ? await nav.serial.requestPort({ filters })
    : await nav.serial.requestPort();

  await port.open({ baudRate });
  return port;
}

export async function setSerialSignals(
  port: any,
  signals: { dataTerminalReady?: boolean; requestToSend?: boolean },
) {
  if (port && typeof port.setSignals === "function") {
    await port.setSignals(signals);
  }
}

export async function executeSerialCommand(
  payload: Record<string, unknown>,
  options: WebSerialConnectOptions = {},
) {
  const port = await connectWebSerial(options);
  const writer = port.writable?.getWriter();
  if (!writer) throw new Error("WebSerial writer unavailable");

  const encoder = new TextEncoder();
  await writer.write(encoder.encode(JSON.stringify(payload) + "\n"));
  writer.releaseLock();
}
