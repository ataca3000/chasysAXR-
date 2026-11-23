import test from "node:test";
import assert from "node:assert/strict";
import {
  BOARD_PROFILES,
  evaluateObstacleSafety,
  getAllKnownUsbFilters,
  getUsbFiltersForBoard,
  parseObstacleTelemetry,
} from "./boards";
import {
  SAMPLE_AVR_HEARTBEAT_HEX,
  buildRawReplFrames,
  parseIntelHex,
} from "./flasher";

test("BOARD_PROFILES includes Raspberry Pi Pico, RPi UART, Arduino, and ESP32", () => {
  const ids = new Set(BOARD_PROFILES.map((b) => b.id));
  assert.ok(ids.has("rpi_pico"));
  assert.ok(ids.has("rpi_uart"));
  assert.ok(ids.has("arduino_uno"));
  assert.ok(ids.has("arduino_nano"));
  assert.ok(ids.has("arduino_mega"));
  assert.ok(ids.has("esp32"));

  const picoFilters = getUsbFiltersForBoard("rpi_pico");
  assert.ok(picoFilters.some((f) => f.usbVendorId === 0x2e8a));
  const allFilters = getAllKnownUsbFilters();
  assert.ok(allFilters.some((f) => f.usbVendorId === 0x2341));
  assert.ok(allFilters.some((f) => f.usbVendorId === 0x2e8a));
});

test("parseObstacleTelemetry parses JSON and serial token obstacle telemetry", () => {
  const jsonParsed = parseObstacleTelemetry('{"distanceCm":14.25,"obstacle":true,"zone":"left"}');
  assert.ok(jsonParsed);
  assert.equal(jsonParsed.distanceCm, 14.3);
  assert.equal(jsonParsed.obstacleDetected, true);
  assert.equal(jsonParsed.zone, "left");

  const tokenParsed = parseObstacleTelemetry("DIST:23.8,OBS:1");
  assert.ok(tokenParsed);
  assert.equal(tokenParsed.distanceCm, 23.8);
  assert.equal(tokenParsed.obstacleDetected, true);

  const clearParsed = parseObstacleTelemetry("SONAR=95.0 PATH_CLEAR");
  assert.ok(clearParsed);
  assert.equal(clearParsed.distanceCm, 95);
  assert.equal(clearParsed.obstacleDetected, false);

  assert.equal(parseObstacleTelemetry("OK_SPINDLE_START"), null);
});

test("evaluateObstacleSafety distinguishes critical, warning, and safe zones", () => {
  const critical = evaluateObstacleSafety(12, 25);
  assert.equal(critical.level, "critical");
  assert.equal(critical.shouldInterlock, true);
  assert.equal(critical.avoidanceCommand, "M112");

  const warning = evaluateObstacleSafety(35, 25);
  assert.equal(warning.level, "warning");
  assert.equal(warning.shouldInterlock, false);

  const safe = evaluateObstacleSafety(80, 25);
  assert.equal(safe.level, "safe");
  assert.equal(safe.shouldInterlock, false);
});

test("parseIntelHex parses valid Intel HEX and rejects corrupted checksum", () => {
  const parsed = parseIntelHex(SAMPLE_AVR_HEARTBEAT_HEX);
  assert.equal(parsed.totalBytes, 36);
  assert.equal(parsed.blocks.length, 1);
  assert.equal(parsed.blocks[0].address, 0);

  assert.throws(() => {
    parseIntelHex(":100000000C9434000C943E000C943E000C943E00FF\n:00000001FF");
  }, /checksum/i);
});

test("buildRawReplFrames builds valid MicroPython Raw REPL write & reboot frames", () => {
  const code = 'print("Hola RP2040")\n';
  const frames = buildRawReplFrames("main.py", code, 16);
  assert.equal(frames[0], "\r\x03\x03");
  assert.equal(frames[1], "\r\x01");
  assert.ok(frames[2].includes('open("main.py", "wb")'));
  assert.ok(frames.some((f) => f.includes("a2b_base64")));
  assert.equal(frames[frames.length - 2], "\x02");
  assert.equal(frames[frames.length - 1], "\r\x04");
});

import { BOARD_PINOUTS, parsePinTelemetry } from "./pinoutDefinitions";
import { computeBubbleLevel, computeLinearVibrationFromImu } from "./mobileSensorsMath";

test("BOARD_PINOUTS provides physical pin definitions for Nano, Mega, Pico, and Raspberry Pi", () => {
  assert.equal(BOARD_PINOUTS.arduino_nano.pins.length, 30);
  assert.ok(BOARD_PINOUTS.arduino_mega.pins.some((p) => p.id === "D53"));
  assert.ok(BOARD_PINOUTS.rpi_pico.pins.some((p) => p.id === "GP28"));
  assert.ok(BOARD_PINOUTS.rpi_uart.pins.some((p) => p.id === "GPIO18"));
});

test("parsePinTelemetry extracts digital, PWM, and analog pin states from serial strings and JSON", () => {
  const tokenPins = parsePinTelemetry("PIN:D09=HIGH PWM:D5=180 A0:512 GPIO18=1");
  assert.equal(tokenPins.length, 4);
  assert.deepEqual(
    tokenPins.map((p) => [p.pinId, p.mode, p.value, p.active]),
    [
      ["D9", "OUTPUT", 1, true],
      ["D5", "PWM", 180, true],
      ["A0", "ANALOG", 512, true],
      ["GPIO18", "OUTPUT", 1, true],
    ],
  );

  const jsonPins = parsePinTelemetry('{"pins":{"GP15":1,"A1":420,"D4":0}}');
  assert.equal(jsonPins.length, 3);
  assert.equal(jsonPins[0].pinId, "GP15");
  assert.equal(jsonPins[1].mode, "ANALOG");
  assert.equal(jsonPins[2].active, false);
});

test("mobileSensorsMath computes bubble level tilt and IMU vibration accurately", () => {
  const flat = computeBubbleLevel(0.4, -0.8);
  assert.equal(flat.isLevel, true);

  const tilted = computeBubbleLevel(12.5, -4.0);
  assert.equal(tilted.isLevel, false);
  assert.ok(tilted.totalTiltDeg > 12);

  const stillVib = computeLinearVibrationFromImu(0, 0, 9.80665, true);
  assert.equal(stillVib, 0);

  const shakingVib = computeLinearVibrationFromImu(2.0, 1.0, 11.8, true);
  assert.ok(shakingVib > 2.0);
});
