import { useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';

export function ArduinoFirmwareDialog({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const arduinoCode = `// ULTRON AI - Web Serial PLC Firmware para Arduino Nano
// Soporte incluido para Servo Brazo Robotico
// Baudrate: 115200

#include <Servo.h>

const int SPINDLE_PIN = 9;   // PWM Pin para motor principal / CNC
const int COOLANT_PIN = 4;   // Relé de refrigerante
const int ESTOP_PIN = 2;     // Botón de emergencia

// Definicion de Servos (Brazo Robotico)
Servo servoBase;
Servo servoShoulder;
Servo servoElbow;
Servo servoGripper;

void setup() {
  Serial.begin(115200);
  
  pinMode(SPINDLE_PIN, OUTPUT);
  pinMode(COOLANT_PIN, OUTPUT);
  pinMode(ESTOP_PIN, INPUT_PULLUP);
  
  // Asignacion de pines PWM para el brazo en el Nano
  servoBase.attach(3);
  servoShoulder.attach(5);
  servoElbow.attach(6);
  servoGripper.attach(10);
  
  // Posiciones iniciales (Home)
  servoBase.write(90);
  servoShoulder.write(90);
  servoElbow.write(90);
  servoGripper.write(0);

  // Enviar señal de listo al Frontend (Web Serial API)
  Serial.println("ULTRON_READY");
}

void loop() {
  // 1. COMPROBAR PARO DE EMERGENCIA (E-STOP)
  if (digitalRead(ESTOP_PIN) == LOW) {
    Serial.println("CRÍTICO: EMERGENCY_STOP_TRIGGERED");
    haltAll();
    delay(1000); 
  }

  // 2. LEER COMANDOS DEL WEB SERIAL
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\\n');
    command.trim();
    
    // CNC: Encender Spindle (ej: M3 S12000)
    if (command.startsWith("M3 S")) {
      int speed = command.substring(4).toInt();
      int pwmValue = map(speed, 0, 24000, 0, 255);
      analogWrite(SPINDLE_PIN, pwmValue);
      Serial.println("OK_SPINDLE_START");
    } 
    // CNC: Apagar
    else if (command == "M5") {
      analogWrite(SPINDLE_PIN, 0);
      Serial.println("OK_SPINDLE_STOP");
    }
    // ROBOTICA: Mover base (ej: SERVO_BASE 180)
    else if (command.startsWith("SERVO_BASE ")) {
      int ang = command.substring(11).toInt();
      servoBase.write(ang);
      Serial.println("OK_SERVO_BASE_" + String(ang));
    }
    // ROBOTICA: Mover hombro (ej: SERVO_SHOULDER 45)
    else if (command.startsWith("SERVO_SHOULDER ")) {
      int ang = command.substring(15).toInt();
      servoShoulder.write(ang);
      Serial.println("OK_SERVO_SHOULDER_" + String(ang));
    }
    // ROBOTICA: Mover codo (ej: SERVO_ELBOW 90)
    else if (command.startsWith("SERVO_ELBOW ")) {
      int ang = command.substring(12).toInt();
      servoElbow.write(ang);
      Serial.println("OK_SERVO_ELBOW_" + String(ang));
    }
    // ROBOTICA: Mover pinza (ej: SERVO_GRIPPER 60)
    else if (command.startsWith("SERVO_GRIPPER ")) {
      int ang = command.substring(14).toInt();
      servoGripper.write(ang);
      Serial.println("OK_SERVO_GRIPPER_" + String(ang));
    }
    // OTROS (G-Code directo, telemetria)
    else {
      Serial.println("CMD_RECEIVED:" + command);
    }
  }
}

void haltAll() {
  analogWrite(SPINDLE_PIN, 0);
  digitalWrite(COOLANT_PIN, LOW);
  servoBase.write(90);
  servoShoulder.write(90);
  servoElbow.write(90);
  servoGripper.write(0);
}
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(arduinoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-xl p-6 shadow-2xl max-w-3xl w-full flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h2 className="text-white font-mono text-lg flex items-center gap-2 font-bold tracking-widest">
            <Download size={20} className="text-google-blue" /> FIRMWARE ARDUINO (C++)
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold transition-colors">X</button>
        </div>
        
        <div className="text-slate-400 text-sm mb-4 space-y-2 shrink-0">
          <p>Para emparejar correctamente el Hardware (Arduino) con el Agent Ultron en la web, requieres programar la placa para que pueda interpretar los comandos enviados a través de nuestro Web Serial API.</p>
          <ul className="list-disc ml-5 text-slate-300">
            <li>Copia este código y pégalo en tu <strong>Arduino IDE</strong>.</li>
            <li>Conecta tu placa, compílalo y súbelo.</li>
            <li>En Ultron haz clic en "SERIAL" y selecciona el puerto de tu Arduino.</li>
          </ul>
        </div>

        <div className="relative flex-1 min-h-0 bg-black/50 rounded-lg border border-white/10 p-4 font-mono text-xs sm:text-sm text-google-green overflow-hidden flex flex-col shadow-inner">
          <button 
            onClick={copyToClipboard}
            className="absolute top-3 right-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-3 py-1.5 rounded flex items-center gap-2 transition-colors z-10 font-bold shadow-sm"
          >
            {copied ? <Check size={16} className="text-google-blue" /> : <Copy size={16} />}
            {copied ? 'COPIADO' : 'COPIAR CÓDIGO'}
          </button>
          <div className="overflow-y-auto custom-scrollbar pr-2 h-full">
            <pre className="whitespace-pre-wrap">{arduinoCode}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
