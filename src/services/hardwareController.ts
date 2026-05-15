import mqtt from 'mqtt';

export class HardwareController {
  private port: any | null = null;
  private writer: WritableStreamDefaultWriter | null = null;
  private reader: ReadableStreamDefaultReader | null = null;
  private ws: WebSocket | null = null;
  private mqttClient: mqtt.MqttClient | null = null;

  private sensorListeners: Set<(data: any) => void> = new Set();
  private rawDataListeners: Set<(data: string) => void> = new Set();
  onSensorData: ((data: any) => void) | null = null;
  onError: ((error: string) => void) | null = null;

  addSensorListener(cb: (data: any) => void) {
    this.sensorListeners.add(cb);
    return () => {
      this.sensorListeners.delete(cb);
    };
  }

  addRawDataListener(cb: (data: string) => void) {
    this.rawDataListeners.add(cb);
    return () => {
      this.rawDataListeners.delete(cb);
    };
  }

  emitSensorData(data: any) {
    if (this.onSensorData) this.onSensorData(data);
    this.sensorListeners.forEach(cb => cb(data));
  }

  private customReadLoopPromise: Promise<void> | null = null;
  private isReading = false;

  async connectStream(url: string, topic?: string) {
    return new Promise<boolean>((resolve) => {
      try {
        if (url.startsWith('mqtt://') || url.startsWith('ws://') || url.startsWith('wss://')) {
          if (url.includes('mqtt') || topic) { // crude heuristic
            // Fallback to MQTT
            this.mqttClient = mqtt.connect(url);
            this.mqttClient.on('connect', () => {
              console.log('Connected to MQTT Broker:', url);
              if (topic) this.mqttClient?.subscribe(topic);
              else this.mqttClient?.subscribe('#'); // Subscribe to all for testing
              resolve(true);
            });
            this.mqttClient.on('error', (err) => {
              console.error('MQTT Error:', err);
              if (this.onError) this.onError(`MQTT Error: ${err.message}`);
              resolve(false);
            });
            this.mqttClient.on('message', (receivedTopic, message) => {
              const msg = message.toString();
              console.log(`📬 MQTT RX [${receivedTopic}]:`, msg);
              this.parseHardwareData(msg);
            });
          } else {
            // Standard WebSocket
            this.ws = new WebSocket(url);
            this.ws.onopen = () => {
              console.log('Connected to WebSocket:', url);
              resolve(true);
            };
            this.ws.onerror = (e) => {
              console.error('WebSocket Error:', e);
              if (this.onError) this.onError('WebSocket connection failed');
              resolve(false);
            };
            this.ws.onmessage = (event) => {
              const msg = event.data;
              console.log('📬 WS RX:', msg);
              this.parseHardwareData(msg);
            };
          }
        } else {
          throw new Error('Invalid protocol. Use ws://, wss:// or mqtt://');
        }
      } catch (err: any) {
         console.error('Connection error:', err);
         if (this.onError) this.onError(`Connection failed: ${err.message}`);
         resolve(false);
      }
    });
  }

  async connect() {
    const nav = navigator as any;
    if (!('serial' in nav)) {
      console.error('Web Serial API no soportada en este navegador. Úsalo en Chrome/Edge en entornos no iframe.');
      // Fallback para simulación en el iframe
      return true;
    }

    try {
      this.port = await nav.serial.requestPort();
      await this.port.open({ baudRate: 115200 }); // Configuración típica para GRBL/Marlin
      
      const textEncoder = new TextEncoderStream();
      const writableStreamClosed = textEncoder.readable.pipeTo(this.port.writable as WritableStream);
      this.writer = textEncoder.writable.getWriter();

      // Start reading loop
      this.isReading = true;
      this.customReadLoopPromise = this.readLoop();

      console.log('Conectado exitosamente al controlador de hardware (Arduino/PLC).');
      return true;
    } catch (err: any) {
      console.error('Error al conectar con Arduino:', err);
      if (this.onError) this.onError(`Failed to connect to hardware: ${err.message || 'Unknown error'}`);
      return false;
    }
  }

  private async readLoop() {
    if (!this.port || !this.port.readable) return;
    
    // We create a decoder that splits the stream by strings
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();
    this.reader = reader;

    let buffer = '';

    try {
      while (this.isReading) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          let lines = buffer.split('\n');
          // keep the last incomplete chunk in the buffer
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
              console.log('📬 ARDUINO RX:', trimmed);
              this.parseHardwareData(trimmed);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error leyendo del puerto serial:', error);
    } finally {
      reader.releaseLock();
    }
  }

  private parseHardwareData(data: string) {
    if (!data) return;
    this.rawDataListeners.forEach(cb => cb(data));

    try {
      // Intentar forzar parseo JSON por si es un payload estructurado
      const parsed = JSON.parse(data);
      
      // Buscar recursivamente las métricas que nos importan dentro de la estructura (ej: AWS IoT envueltos)
      const extractMetrics = (obj: any): any => {
         let result: any = {};
         for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
               Object.assign(result, extractMetrics(obj[key]));
            } else if (typeof obj[key] === 'number') {
               const k = key.toLowerCase();
               if (k === 'temp' || k === 'temperature') result.temperature = obj[key];
               if (k === 'vib' || k === 'vibration') result.vibration = obj[key];
               if (k === 'load' || k === 'rpm') result.load = obj[key];
            }
         }
         return result;
      };

      const extracted = extractMetrics(parsed);
      
      // Si logramos extraer algo útil, lo emitimos
      if (extracted.temperature !== undefined || extracted.vibration !== undefined || extracted.load !== undefined) {
          this.emitSensorData(extracted);
          return;
      }
      // Si no, emitimos el objeto crudo por si otra capa lo necesita
      this.emitSensorData(parsed);

    } catch (e) {
      // No era JSON, usar expresiones regulares robustas para data serial convencional
      let tempMatch = data.match(/(?:T|TEMP|TEMPERATURE)[:=\s]*([\d.-]+)/i);
      let vibeMatch = data.match(/(?:V|VIB|VIBRATION)[:=\s]*([\d.-]+)/i);
      let loadMatch = data.match(/(?:L|LOAD|RPM)[:=\s]*([\d.-]+)/i);

      let payload: any = {};
      let hasData = false;

      if (tempMatch) { payload.temperature = parseFloat(tempMatch[1]); hasData = true; }
      if (vibeMatch) { payload.vibration = parseFloat(vibeMatch[1]); hasData = true; }
      if (loadMatch) { payload.load = parseFloat(loadMatch[1]); hasData = true; }

      if (hasData) {
        this.emitSensorData(payload);
      }
    }
  }

  async sendCommand(gcode: string, fromSyncQueue: boolean = false) {
    if (typeof window !== 'undefined' && !navigator.onLine && !fromSyncQueue) {
      console.warn('[HardwareController] Device is offline. Queueing command:', gcode);
      const { offlineSync } = await import('./offlineSync');
      offlineSync.addTask('local_machine', 'sendCommand', { gcode });
      return;
    }

    console.log(`Enviando a máquina: ${gcode}`);
    try {
      if (this.writer) {
        await this.writer.write(gcode + '\n');
      } else {
        console.warn('Simulando envío de comando G-CODE:', gcode);
        // Wait for simulation
        await new Promise(resolve => setTimeout(resolve, 500));
        this.simulateGCodeEffect(gcode);
      }
    } catch (err: any) {
      console.error('Error enviando comando:', err);
      if (!fromSyncQueue && typeof window !== 'undefined') {
         console.warn('[HardwareController] Command failed. Queueing for retry:', gcode);
         const { offlineSync } = await import('./offlineSync');
         offlineSync.addTask('local_machine', 'sendCommand', { gcode });
      }
      if (this.onError) this.onError(`Command failed: ${err.message || 'Port disconnected'}`);
    }
  }

  // Interprete virtual de G-code para simular la respuesta de los sensores al comando
  private simulateGCodeEffect(gcode: string) {
    const upperCmd = gcode.toUpperCase();
    
    let tempDiff = 0;
    let vibDiff = 0;
    let loadDiff = 0;

    // Reducir avance o detener
    if (upperCmd.includes('M5') || upperCmd.includes('M05')) { // Parada del cabezal
       tempDiff = -200;
       vibDiff = -3;
       loadDiff = -40;
    } else if (upperCmd.includes('M0') || upperCmd.includes('M112')) { // Pausa o Parada de emergencia
       tempDiff = -300;
       vibDiff = -5;
       loadDiff = -80;
    } 

    if (upperCmd.includes('F')) {
       // Feedrate detectado
       const match = upperCmd.match(/F(\d+)/);
       if (match && parseInt(match[1]) < 1000) {
         tempDiff -= 50;
         vibDiff -= 1;
       }
    }

    if (upperCmd.includes('S')) {
       // Spindle speed
       const match = upperCmd.match(/S(\d+)/);
       if (match && parseInt(match[1]) < 5000) {
         tempDiff -= 100;
         vibDiff -= 1.5;
         loadDiff -= 20;
       }
    }

    if (tempDiff !== 0 || vibDiff !== 0 || loadDiff !== 0) {
       console.log(`Interpreter: applying virtual telemetry diff`, {tempDiff, vibDiff, loadDiff});
       // Send a delta packet or absolute reading to App.tsx
       // We'll rely on App's state updater logic which currently might just override.
       // So we'll emit an event that signifies a "trend" or specific value drop. 
       // For a robust simulation, we'd keep true state here, but let's just trigger a sudden drop
       this.emitSensorData({
         temp: 350,   // Forced safe values for simulation
         vib: 1.5,
         load: 35
       });
       this.rawDataListeners.forEach(cb => cb(`ok (simulated effect)`));
    } else {
       this.rawDataListeners.forEach(cb => cb(`ok`));
    }
  }

  async disconnect() {
    if (this.mqttClient) {
      this.mqttClient.end();
      this.mqttClient = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.writer) {
      this.writer.releaseLock();
    }
    if (this.port) {
      await this.port.close();
      this.port = null;
    }
    console.log('Desconectado del hardware.');
  }

  // Comandos de automatización predefinidos
  async emergencyStop() {
    await this.sendCommand('M112'); // Parada de emergencia estándar
  }

  async startSpindle(rpm: number) {
    await this.sendCommand(`M3 S${rpm}`); // Iniciar husillo
  }

  async stopSpindle() {
    await this.sendCommand('M5'); // Detener husillo
  }

  async moveTo(x: number, y: number, z: number, feedrate: number) {
    await this.sendCommand(`G1 X${x} Y${y} Z${z} F${feedrate}`);
  }
}

export const hardware = new HardwareController();
