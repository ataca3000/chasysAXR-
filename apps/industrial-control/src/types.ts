export interface TelemetryData {
  temperature: number;
  vibration: number;
  load: number;
  timestamp?: number;
}

export interface Machine {
  id: string;
  type: 'CNC' | 'Robot' | 'Conveyor' | 'PlasmaSpotter' | 'Motor' | 'Servo' | 'Valve' | 'Roller';
  status: 'idle' | 'running' | 'error' | 'maintenance';
  position: [number, number, number];
  sensors?: string[];
  index?: number;
}

export interface AIRecommendation {
  html: string;
  gcode: string[];
}

export interface HardwareCommand {
  action: string;
  params?: Record<string, any>;
}

export interface OfflineTask {
  id: string;
  machineId: string;
  action: string;
  status: 'pending' | 'syncing' | 'completed';
}

export interface SystemError {
  id: string;
  message: string;
  type: 'hardware' | 'ai' | 'connection' | 'sensor';
  timestamp: number;
}
