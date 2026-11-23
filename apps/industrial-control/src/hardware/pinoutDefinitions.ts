export type PinKind =
  | "power"
  | "gnd"
  | "digital"
  | "pwm"
  | "analog"
  | "uart"
  | "i2c"
  | "spi"
  | "reset";

export interface BoardPinDefinition {
  id: string;
  label: string;
  physicalPin: number;
  side: "left" | "right" | "top" | "bottom" | "header";
  kind: PinKind;
  altFunction?: string;
  defaultSensorRole?: string;
}

export interface PinLiveState {
  pinId: string;
  active: boolean;
  mode: "INPUT" | "OUTPUT" | "PWM" | "ANALOG" | "I2C" | "UART" | "SENSOR";
  value: number; // 0/1 digital, 0..255 PWM, 0..1023/4095 analog
  sensorLabel?: string;
  updatedAt: number;
}

export interface BoardPinoutLayout {
  boardId: string;
  title: string;
  chipLabel: string;
  formFactor: "dip" | "uno" | "mega" | "rpi_40";
  pins: BoardPinDefinition[];
}

export const BOARD_PINOUTS: Record<string, BoardPinoutLayout> = {
  arduino_nano: {
    boardId: "arduino_nano",
    title: "Arduino Nano (DIP-30)",
    chipLabel: "ATmega328P",
    formFactor: "dip",
    pins: [
      // Left side top-to-bottom
      { id: "D12", label: "D12 (MISO)", physicalPin: 1, side: "left", kind: "spi", altFunction: "SPI MISO" },
      { id: "D11", label: "D11~ (MOSI)", physicalPin: 2, side: "left", kind: "pwm", altFunction: "PWM / MOSI" },
      { id: "D10", label: "D10~ (SS)", physicalPin: 3, side: "left", kind: "pwm", altFunction: "PWM / Servo Pinza", defaultSensorRole: "Servo Gripper" },
      { id: "D9", label: "D9~", physicalPin: 4, side: "left", kind: "pwm", altFunction: "PWM / Spindle", defaultSensorRole: "Servo Dirección / Spindle" },
      { id: "D8", label: "D8", physicalPin: 5, side: "left", kind: "digital" },
      { id: "D7", label: "D7", physicalPin: 6, side: "left", kind: "digital", defaultSensorRole: "HC-SR04 TRIG" },
      { id: "D6", label: "D6~", physicalPin: 7, side: "left", kind: "pwm", defaultSensorRole: "HC-SR04 ECHO" },
      { id: "D5", label: "D5~", physicalPin: 8, side: "left", kind: "pwm", defaultSensorRole: "Motor PWM" },
      { id: "D4", label: "D4", physicalPin: 9, side: "left", kind: "digital", defaultSensorRole: "Relé Refrigerante" },
      { id: "D3", label: "D3~ (INT1)", physicalPin: 10, side: "left", kind: "pwm", defaultSensorRole: "Servo Base" },
      { id: "D2", label: "D2 (INT0)", physicalPin: 11, side: "left", kind: "digital", defaultSensorRole: "E-STOP IRQ" },
      { id: "GND1", label: "GND", physicalPin: 12, side: "left", kind: "gnd" },
      { id: "RST1", label: "RESET", physicalPin: 13, side: "left", kind: "reset" },
      { id: "D0", label: "RX0 (D0)", physicalPin: 14, side: "left", kind: "uart", altFunction: "USB UART RX" },
      { id: "D1", label: "TX1 (D1)", physicalPin: 15, side: "left", kind: "uart", altFunction: "USB UART TX" },
      // Right side top-to-bottom
      { id: "D13", label: "D13 (LED/SCK)", physicalPin: 16, side: "right", kind: "spi", altFunction: "LED Builtin / SCK" },
      { id: "3V3", label: "3V3 OUT", physicalPin: 17, side: "right", kind: "power" },
      { id: "REF", label: "AREF", physicalPin: 18, side: "right", kind: "power" },
      { id: "A0", label: "A0 (D14)", physicalPin: 19, side: "right", kind: "analog", defaultSensorRole: "NTC Termistor" },
      { id: "A1", label: "A1 (D15)", physicalPin: 20, side: "right", kind: "analog", defaultSensorRole: "Piezo Vibración" },
      { id: "A2", label: "A2 (D16)", physicalPin: 21, side: "right", kind: "analog", defaultSensorRole: "Sensor Carga/Corriente" },
      { id: "A3", label: "A3 (D17)", physicalPin: 22, side: "right", kind: "analog" },
      { id: "A4", label: "A4 (SDA)", physicalPin: 23, side: "right", kind: "i2c", altFunction: "I2C SDA", defaultSensorRole: "IMU / OLED SDA" },
      { id: "A5", label: "A5 (SCL)", physicalPin: 24, side: "right", kind: "i2c", altFunction: "I2C SCL", defaultSensorRole: "IMU / OLED SCL" },
      { id: "A6", label: "A6 (ADC)", physicalPin: 25, side: "right", kind: "analog" },
      { id: "A7", label: "A7 (ADC)", physicalPin: 26, side: "right", kind: "analog" },
      { id: "5V", label: "5V", physicalPin: 27, side: "right", kind: "power" },
      { id: "RST2", label: "RESET", physicalPin: 28, side: "right", kind: "reset" },
      { id: "GND2", label: "GND", physicalPin: 29, side: "right", kind: "gnd" },
      { id: "VIN", label: "VIN (7-12V)", physicalPin: 30, side: "right", kind: "power" },
    ],
  },
  arduino_uno: {
    boardId: "arduino_uno",
    title: "Arduino Uno R3 / R4",
    chipLabel: "ATmega328P",
    formFactor: "uno",
    pins: [
      { id: "D13", label: "D13 (SCK)", physicalPin: 1, side: "top", kind: "spi", altFunction: "LED Builtin" },
      { id: "D12", label: "D12 (MISO)", physicalPin: 2, side: "top", kind: "spi" },
      { id: "D11", label: "D11~ (MOSI)", physicalPin: 3, side: "top", kind: "pwm" },
      { id: "D10", label: "D10~ (SS)", physicalPin: 4, side: "top", kind: "pwm" },
      { id: "D9", label: "D9~", physicalPin: 5, side: "top", kind: "pwm", defaultSensorRole: "Servo Dirección" },
      { id: "D8", label: "D8", physicalPin: 6, side: "top", kind: "digital" },
      { id: "D7", label: "D7", physicalPin: 7, side: "top", kind: "digital", defaultSensorRole: "HC-SR04 TRIG" },
      { id: "D6", label: "D6~", physicalPin: 8, side: "top", kind: "pwm", defaultSensorRole: "HC-SR04 ECHO" },
      { id: "D5", label: "D5~", physicalPin: 9, side: "top", kind: "pwm", defaultSensorRole: "Motor PWM" },
      { id: "D4", label: "D4", physicalPin: 10, side: "top", kind: "digital" },
      { id: "D3", label: "D3~", physicalPin: 11, side: "top", kind: "pwm" },
      { id: "D2", label: "D2 (INT0)", physicalPin: 12, side: "top", kind: "digital", defaultSensorRole: "E-STOP IRQ" },
      { id: "D1", label: "D1 (TX)", physicalPin: 13, side: "top", kind: "uart" },
      { id: "D0", label: "D0 (RX)", physicalPin: 14, side: "top", kind: "uart" },
      { id: "3V3", label: "3.3V", physicalPin: 15, side: "bottom", kind: "power" },
      { id: "5V", label: "5V", physicalPin: 16, side: "bottom", kind: "power" },
      { id: "GND1", label: "GND", physicalPin: 17, side: "bottom", kind: "gnd" },
      { id: "VIN", label: "VIN", physicalPin: 18, side: "bottom", kind: "power" },
      { id: "A0", label: "A0", physicalPin: 19, side: "bottom", kind: "analog", defaultSensorRole: "Temperatura" },
      { id: "A1", label: "A1", physicalPin: 20, side: "bottom", kind: "analog", defaultSensorRole: "Vibración" },
      { id: "A2", label: "A2", physicalPin: 21, side: "bottom", kind: "analog", defaultSensorRole: "Carga" },
      { id: "A3", label: "A3", physicalPin: 22, side: "bottom", kind: "analog" },
      { id: "A4", label: "A4 (SDA)", physicalPin: 23, side: "bottom", kind: "i2c", defaultSensorRole: "I2C SDA" },
      { id: "A5", label: "A5 (SCL)", physicalPin: 24, side: "bottom", kind: "i2c", defaultSensorRole: "I2C SCL" },
    ],
  },
  arduino_mega: {
    boardId: "arduino_mega",
    title: "Arduino Mega 2560",
    chipLabel: "ATmega2560 (54 I/O + 16 ADC)",
    formFactor: "mega",
    pins: [
      { id: "D13", label: "D13~", physicalPin: 1, side: "top", kind: "pwm", altFunction: "LED Builtin" },
      { id: "D12", label: "D12~", physicalPin: 2, side: "top", kind: "pwm" },
      { id: "D11", label: "D11~", physicalPin: 3, side: "top", kind: "pwm" },
      { id: "D10", label: "D10~", physicalPin: 4, side: "top", kind: "pwm" },
      { id: "D9", label: "D9~", physicalPin: 5, side: "top", kind: "pwm", defaultSensorRole: "Servo Base" },
      { id: "D8", label: "D8~", physicalPin: 6, side: "top", kind: "pwm" },
      { id: "D7", label: "D7~", physicalPin: 7, side: "top", kind: "pwm", defaultSensorRole: "HC-SR04 TRIG" },
      { id: "D6", label: "D6~", physicalPin: 8, side: "top", kind: "pwm", defaultSensorRole: "HC-SR04 ECHO" },
      { id: "D5", label: "D5~", physicalPin: 9, side: "top", kind: "pwm", defaultSensorRole: "Spindle PWM" },
      { id: "D4", label: "D4~", physicalPin: 10, side: "top", kind: "pwm", defaultSensorRole: "Relé CNC" },
      { id: "D3", label: "D3~", physicalPin: 11, side: "top", kind: "pwm" },
      { id: "D2", label: "D2~", physicalPin: 12, side: "top", kind: "pwm", defaultSensorRole: "E-STOP IRQ" },
      { id: "D14", label: "D14 (TX3)", physicalPin: 13, side: "top", kind: "uart" },
      { id: "D15", label: "D15 (RX3)", physicalPin: 14, side: "top", kind: "uart" },
      { id: "D18", label: "D18 (TX1)", physicalPin: 15, side: "top", kind: "uart" },
      { id: "D19", label: "D19 (RX1)", physicalPin: 16, side: "top", kind: "uart" },
      { id: "D20", label: "D20 (SDA)", physicalPin: 17, side: "top", kind: "i2c", defaultSensorRole: "I2C SDA" },
      { id: "D21", label: "D21 (SCL)", physicalPin: 18, side: "top", kind: "i2c", defaultSensorRole: "I2C SCL" },
      // Expansion Dual Header + Analog
      { id: "D22", label: "D22", physicalPin: 22, side: "header", kind: "digital", defaultSensorRole: "Stepper X STEP" },
      { id: "D23", label: "D23", physicalPin: 23, side: "header", kind: "digital", defaultSensorRole: "Stepper X DIR" },
      { id: "D24", label: "D24", physicalPin: 24, side: "header", kind: "digital", defaultSensorRole: "Stepper Y STEP" },
      { id: "D25", label: "D25", physicalPin: 25, side: "header", kind: "digital", defaultSensorRole: "Stepper Y DIR" },
      { id: "D26", label: "D26", physicalPin: 26, side: "header", kind: "digital" },
      { id: "D27", label: "D27", physicalPin: 27, side: "header", kind: "digital" },
      { id: "D30", label: "D30", physicalPin: 30, side: "header", kind: "digital", defaultSensorRole: "Final Carrera X" },
      { id: "D31", label: "D31", physicalPin: 31, side: "header", kind: "digital", defaultSensorRole: "Final Carrera Y" },
      { id: "D44", label: "D44~", physicalPin: 44, side: "header", kind: "pwm" },
      { id: "D45", label: "D45~", physicalPin: 45, side: "header", kind: "pwm" },
      { id: "D46", label: "D46~", physicalPin: 46, side: "header", kind: "pwm" },
      { id: "D50", label: "D50 (MISO)", physicalPin: 50, side: "header", kind: "spi" },
      { id: "D51", label: "D51 (MOSI)", physicalPin: 51, side: "header", kind: "spi" },
      { id: "D52", label: "D52 (SCK)", physicalPin: 52, side: "header", kind: "spi" },
      { id: "D53", label: "D53 (SS)", physicalPin: 53, side: "header", kind: "spi" },
      // Analog A0..A15
      { id: "A0", label: "A0", physicalPin: 60, side: "bottom", kind: "analog", defaultSensorRole: "Temp Husillo" },
      { id: "A1", label: "A1", physicalPin: 61, side: "bottom", kind: "analog", defaultSensorRole: "Vibración Z" },
      { id: "A2", label: "A2", physicalPin: 62, side: "bottom", kind: "analog", defaultSensorRole: "Corriente" },
      { id: "A3", label: "A3", physicalPin: 63, side: "bottom", kind: "analog" },
      { id: "A4", label: "A4", physicalPin: 64, side: "bottom", kind: "analog" },
      { id: "A5", label: "A5", physicalPin: 65, side: "bottom", kind: "analog" },
      { id: "A8", label: "A8", physicalPin: 68, side: "bottom", kind: "analog" },
      { id: "A9", label: "A9", physicalPin: 69, side: "bottom", kind: "analog" },
      { id: "5V", label: "5V", physicalPin: 70, side: "bottom", kind: "power" },
      { id: "GND1", label: "GND", physicalPin: 71, side: "bottom", kind: "gnd" },
    ],
  },
  rpi_pico: {
    boardId: "rpi_pico",
    title: "Raspberry Pi Pico / RP2040 (40 Pines)",
    chipLabel: "RP2040 Dual Cortex-M0+",
    formFactor: "dip",
    pins: [
      // Left Pins 1-20
      { id: "GP0", label: "GP0 (UART0 TX)", physicalPin: 1, side: "left", kind: "uart" },
      { id: "GP1", label: "GP1 (UART0 RX)", physicalPin: 2, side: "left", kind: "uart" },
      { id: "GND1", label: "GND", physicalPin: 3, side: "left", kind: "gnd" },
      { id: "GP2", label: "GP2", physicalPin: 4, side: "left", kind: "digital", defaultSensorRole: "HC-SR04 ECHO" },
      { id: "GP3", label: "GP3", physicalPin: 5, side: "left", kind: "digital", defaultSensorRole: "HC-SR04 TRIG" },
      { id: "GP4", label: "GP4 (I2C0 SDA)", physicalPin: 6, side: "left", kind: "i2c", defaultSensorRole: "ToF VL53L0X SDA" },
      { id: "GP5", label: "GP5 (I2C0 SCL)", physicalPin: 7, side: "left", kind: "i2c", defaultSensorRole: "ToF VL53L0X SCL" },
      { id: "GND2", label: "GND", physicalPin: 8, side: "left", kind: "gnd" },
      { id: "GP6", label: "GP6", physicalPin: 9, side: "left", kind: "digital" },
      { id: "GP7", label: "GP7", physicalPin: 10, side: "left", kind: "digital" },
      { id: "GP8", label: "GP8", physicalPin: 11, side: "left", kind: "digital" },
      { id: "GP9", label: "GP9", physicalPin: 12, side: "left", kind: "digital" },
      { id: "GND3", label: "GND", physicalPin: 13, side: "left", kind: "gnd" },
      { id: "GP10", label: "GP10", physicalPin: 14, side: "left", kind: "pwm" },
      { id: "GP11", label: "GP11", physicalPin: 15, side: "left", kind: "pwm" },
      { id: "GP12", label: "GP12", physicalPin: 16, side: "left", kind: "digital" },
      { id: "GP13", label: "GP13", physicalPin: 17, side: "left", kind: "digital" },
      { id: "GND4", label: "GND", physicalPin: 18, side: "left", kind: "gnd" },
      { id: "GP14", label: "GP14", physicalPin: 19, side: "left", kind: "pwm" },
      { id: "GP15", label: "GP15 (PWM)", physicalPin: 20, side: "left", kind: "pwm", defaultSensorRole: "Servo Dirección" },
      // Right Pins 40-21 (listed top-to-bottom visually)
      { id: "VBUS", label: "VBUS (5V USB)", physicalPin: 40, side: "right", kind: "power" },
      { id: "VSYS", label: "VSYS", physicalPin: 39, side: "right", kind: "power" },
      { id: "GND8", label: "GND", physicalPin: 38, side: "right", kind: "gnd" },
      { id: "3V3_EN", label: "3V3_EN", physicalPin: 37, side: "right", kind: "power" },
      { id: "3V3", label: "3V3 OUT", physicalPin: 36, side: "right", kind: "power" },
      { id: "ADC_VREF", label: "ADC_VREF", physicalPin: 35, side: "right", kind: "power" },
      { id: "GP28", label: "GP28 (ADC2)", physicalPin: 34, side: "right", kind: "analog", defaultSensorRole: "ADC Corriente" },
      { id: "AGND", label: "ADC_GND", physicalPin: 33, side: "right", kind: "gnd" },
      { id: "GP27", label: "GP27 (ADC1)", physicalPin: 32, side: "right", kind: "analog", defaultSensorRole: "Vibración ADC" },
      { id: "GP26", label: "GP26 (ADC0)", physicalPin: 31, side: "right", kind: "analog", defaultSensorRole: "Termistor ADC" },
      { id: "RUN", label: "RUN (RESET)", physicalPin: 30, side: "right", kind: "reset" },
      { id: "GP22", label: "GP22", physicalPin: 29, side: "right", kind: "digital" },
      { id: "GND7", label: "GND", physicalPin: 28, side: "right", kind: "gnd" },
      { id: "GP21", label: "GP21", physicalPin: 27, side: "right", kind: "digital" },
      { id: "GP20", label: "GP20", physicalPin: 26, side: "right", kind: "digital" },
      { id: "GP19", label: "GP19 (SPI0 TX)", physicalPin: 25, side: "right", kind: "spi" },
      { id: "GP18", label: "GP18 (SPI0 SCK)", physicalPin: 24, side: "right", kind: "spi" },
      { id: "GND6", label: "GND", physicalPin: 23, side: "right", kind: "gnd" },
      { id: "GP17", label: "GP17 (SPI0 CSn)", physicalPin: 22, side: "right", kind: "spi" },
      { id: "GP16", label: "GP16 (SPI0 RX)", physicalPin: 21, side: "right", kind: "spi" },
    ],
  },
  rpi_uart: {
    boardId: "rpi_uart",
    title: "Raspberry Pi 3 / 4 / 5 (GPIO 40-Pin Header)",
    chipLabel: "BCM2711 / BCM2712 Header J8",
    formFactor: "rpi_40",
    pins: [
      { id: "3V3_1", label: "3V3 Power", physicalPin: 1, side: "left", kind: "power" },
      { id: "5V_1", label: "5V Power", physicalPin: 2, side: "right", kind: "power" },
      { id: "GPIO2", label: "GPIO2 (SDA1)", physicalPin: 3, side: "left", kind: "i2c", defaultSensorRole: "I2C LiDAR/IMU SDA" },
      { id: "5V_2", label: "5V Power", physicalPin: 4, side: "right", kind: "power" },
      { id: "GPIO3", label: "GPIO3 (SCL1)", physicalPin: 5, side: "left", kind: "i2c", defaultSensorRole: "I2C LiDAR/IMU SCL" },
      { id: "GND_1", label: "GND", physicalPin: 6, side: "right", kind: "gnd" },
      { id: "GPIO4", label: "GPIO4 (GPCLK0)", physicalPin: 7, side: "left", kind: "digital", defaultSensorRole: "1-Wire Temp DS18B20" },
      { id: "GPIO14", label: "GPIO14 (TXD0)", physicalPin: 8, side: "right", kind: "uart", altFunction: "UART TX" },
      { id: "GND_2", label: "GND", physicalPin: 9, side: "left", kind: "gnd" },
      { id: "GPIO15", label: "GPIO15 (RXD0)", physicalPin: 10, side: "right", kind: "uart", altFunction: "UART RX" },
      { id: "GPIO17", label: "GPIO17", physicalPin: 11, side: "left", kind: "digital", defaultSensorRole: "Relé E-STOP" },
      { id: "GPIO18", label: "GPIO18 (PWM0)", physicalPin: 12, side: "right", kind: "pwm", defaultSensorRole: "Servo / Motor PWM0" },
      { id: "GPIO27", label: "GPIO27", physicalPin: 13, side: "left", kind: "digital" },
      { id: "GND_3", label: "GND", physicalPin: 14, side: "right", kind: "gnd" },
      { id: "GPIO22", label: "GPIO22", physicalPin: 15, side: "left", kind: "digital" },
      { id: "GPIO23", label: "GPIO23", physicalPin: 16, side: "right", kind: "digital", defaultSensorRole: "HC-SR04 TRIG" },
      { id: "3V3_2", label: "3V3 Power", physicalPin: 17, side: "left", kind: "power" },
      { id: "GPIO24", label: "GPIO24", physicalPin: 18, side: "right", kind: "digital", defaultSensorRole: "HC-SR04 ECHO" },
      { id: "GPIO10", label: "GPIO10 (MOSI)", physicalPin: 19, side: "left", kind: "spi" },
      { id: "GND_4", label: "GND", physicalPin: 20, side: "right", kind: "gnd" },
      { id: "GPIO9", label: "GPIO9 (MISO)", physicalPin: 21, side: "left", kind: "spi" },
      { id: "GPIO25", label: "GPIO25", physicalPin: 22, side: "right", kind: "digital" },
      { id: "GPIO11", label: "GPIO11 (SCLK)", physicalPin: 23, side: "left", kind: "spi" },
      { id: "GPIO8", label: "GPIO8 (CE0)", physicalPin: 24, side: "right", kind: "spi" },
      { id: "GND_5", label: "GND", physicalPin: 25, side: "left", kind: "gnd" },
      { id: "GPIO7", label: "GPIO7 (CE1)", physicalPin: 26, side: "right", kind: "spi" },
      { id: "GPIO5", label: "GPIO5", physicalPin: 29, side: "left", kind: "digital" },
      { id: "GND_6", label: "GND", physicalPin: 30, side: "right", kind: "gnd" },
      { id: "GPIO6", label: "GPIO6", physicalPin: 31, side: "left", kind: "digital" },
      { id: "GPIO12", label: "GPIO12 (PWM0)", physicalPin: 32, side: "right", kind: "pwm" },
      { id: "GPIO13", label: "GPIO13 (PWM1)", physicalPin: 33, side: "left", kind: "pwm" },
      { id: "GPIO19", label: "GPIO19 (PWM1)", physicalPin: 35, side: "left", kind: "pwm" },
      { id: "GPIO16", label: "GPIO16", physicalPin: 36, side: "right", kind: "digital" },
      { id: "GPIO26", label: "GPIO26", physicalPin: 37, side: "left", kind: "digital" },
      { id: "GPIO20", label: "GPIO20", physicalPin: 38, side: "right", kind: "digital" },
      { id: "GND_7", label: "GND", physicalPin: 39, side: "left", kind: "gnd" },
      { id: "GPIO21", label: "GPIO21", physicalPin: 40, side: "right", kind: "digital" },
    ],
  },
};

export function getPinoutForBoard(boardId: string): BoardPinoutLayout {
  if (boardId === "arduino_leonardo") return BOARD_PINOUTS.arduino_uno;
  if (boardId === "esp32") return BOARD_PINOUTS.rpi_pico;
  return BOARD_PINOUTS[boardId] || BOARD_PINOUTS.arduino_nano;
}

/**
 * Normalizes pin identifiers such as D09, gp15, gpio18, a0 -> canonical uppercase ID.
 */
export function normalizePinId(raw: string): string {
  const cleaned = raw.trim().toUpperCase();
  if (/^D0\d$/.test(cleaned)) return `D${Number.parseInt(cleaned.slice(1), 10)}`;
  if (/^GP0\d$/.test(cleaned)) return `GP${Number.parseInt(cleaned.slice(2), 10)}`;
  if (/^GPIO0\d$/.test(cleaned)) return `GPIO${Number.parseInt(cleaned.slice(4), 10)}`;
  return cleaned;
}

/**
 * Parses live pin & sensor frames from USB Serial:
 * - "PIN:D9=1,A0=512,D7=HIGH"
 * - "PWM:D5=180"
 * - "GPIO18:HIGH"
 * - '{"pins":{"D9":1,"A0":512,"GP15":255}}'
 */
export function parsePinTelemetry(raw: string): PinLiveState[] {
  if (!raw || typeof raw !== "string") return [];
  const trimmed = raw.trim();
  const now = Date.now();
  const updates: PinLiveState[] = [];

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj.pins === "object" && obj.pins !== null) {
        for (const [key, rawVal] of Object.entries(obj.pins)) {
          const pinId = normalizePinId(key);
          const numVal =
            typeof rawVal === "boolean"
              ? rawVal
                ? 1
                : 0
              : typeof rawVal === "number"
                ? rawVal
                : Number.parseFloat(String(rawVal));
          if (!Number.isNaN(numVal)) {
            const isAnalog = /^A\d+$/i.test(pinId);
            const mode: PinLiveState["mode"] = isAnalog
              ? "ANALOG"
              : numVal > 1
                ? "PWM"
                : "OUTPUT";
            updates.push({
              pinId,
              active: numVal > 0,
              mode,
              value: numVal,
              updatedAt: now,
            });
          }
        }
        return updates;
      }
    } catch {
      // Fall through to token parsing
    }
  }

  // Match patterns like PIN:D9=HIGH, PWM:D5=180, GP15:1, GPIO23=1, A0:512
  const regex =
    /\b(?:PIN:|PWM:)?(D\d+|A\d+|GP\d+|GPIO\d+)\s*[:=]\s*(HIGH|LOW|TRUE|FALSE|\d+(?:\.\d+)?)/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(trimmed)) !== null) {
    const pinId = normalizePinId(match[1]);
    const valToken = match[2].toUpperCase();
    const prefix = match[0].toUpperCase();
    let numVal = 0;
    if (valToken === "HIGH" || valToken === "TRUE") numVal = 1;
    else if (valToken === "LOW" || valToken === "FALSE") numVal = 0;
    else numVal = Number.parseFloat(valToken);

    const isAnalog = /^A\d+$/i.test(pinId);
    const isPwm = prefix.startsWith("PWM:") || (!isAnalog && numVal > 1);
    updates.push({
      pinId,
      active: numVal > 0,
      mode: isAnalog ? "ANALOG" : isPwm ? "PWM" : "OUTPUT",
      value: numVal,
      updatedAt: now,
    });
  }

  return updates;
}
