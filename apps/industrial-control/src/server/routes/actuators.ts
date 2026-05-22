import {
  Thermometer,
  Gauge,
  Cpu,
  Zap,
  RotateCw,
  Wrench,
  Printer,
  Signal,
} from "lucide-react";

// Define la estructura de configuración para cada actuador
export interface ActuatorConfig {
  id: string; // Identificador único (ej: "husillo_cnc", "laser_corte")
  name: string; // Nombre visible en la UI (ej: "Husillo CNC de Fresado")
  description: string; // Descripción breve
  defaultUnit: string; // Unidad por defecto para el sensor principal (ej: "RPM", "W", "°C")
  sensorMappings: {
    // Mapeo de la clave del Arduino (ej: "T") a su etiqueta y unidad en la UI
    [arduinoKey: string]: {
      label: string;
      unit?: string; // Unidad específica para este sensor, si es diferente a defaultUnit
      icon?: React.ElementType; // Icono de Lucide para la UI
      isPrimaryGraphSensor?: boolean; // Si este sensor debe ser el principal en el gráfico de línea
    };
  };
  // Puedes añadir más propiedades aquí, como límites de seguridad, comandos G-Code específicos, etc.
}

// Configuraciones predefinidas de actuadores
export const ACTUATOR_CONFIGS: ActuatorConfig[] = [
  {
    id: "husillo_cnc",
    name: "Husillo CNC de Fresado",
    description: "Actuador para fresadoras y routers CNC.",
    defaultUnit: "RPM",
    sensorMappings: {
      T: {
        label: "Temperatura Husillo",
        unit: "°C",
        icon: Thermometer,
        isPrimaryGraphSensor: true,
      },
      L: { label: "Carga Motor", unit: "%", icon: Cpu },
      V: { label: "Voltaje", unit: "V", icon: Zap },
    },
  },
  {
    id: "laser_corte",
    name: "Cabezal Láser de Corte",
    description: "Actuador para cortadoras láser.",
    defaultUnit: "W",
    sensorMappings: {
      T: {
        label: "Temperatura Láser",
        unit: "°C",
        icon: Thermometer,
        isPrimaryGraphSensor: true,
      },
      P: { label: "Presión Gas", unit: "PSI", icon: Gauge },
      PW: { label: "Potencia Salida", unit: "W", icon: Zap },
    },
  },
  {
    id: "impresora_3d_edge",
    name: "3D Printer Edge AI (3G)",
    description: "Unidad de manufactura autónoma con conexión celular.",
    defaultUnit: "°C",
    sensorMappings: {
      T: {
        label: "Nozzle Temp",
        unit: "°C",
        icon: Thermometer,
        isPrimaryGraphSensor: true,
      },
      B: { label: "Bed Temp", unit: "°C", icon: Thermometer },
      P: { label: "Progreso", unit: "%", icon: RotateCw },
      SIG: { label: "Señal 3G", unit: "dBm", icon: Signal },
      AI: { label: "Edge Load", unit: "%", icon: Cpu },
    },
  },
  {
    id: "brazo_robotico",
    name: "Brazo Robótico (Gripper)",
    description: "Actuador para brazos robóticos de manipulación.",
    defaultUnit: "N", // Newtons para fuerza de agarre
    sensorMappings: {
      T: {
        label: "Temperatura Motor",
        unit: "°C",
        icon: Thermometer,
        isPrimaryGraphSensor: true,
      },
      F: { label: "Fuerza Gripper", unit: "N", icon: Wrench },
      POS: { label: "Posición Eje Z", unit: "mm", icon: RotateCw },
    },
  },
  {
    id: "generico",
    name: "Actuador Genérico",
    description: "Configuración flexible para cualquier tipo de actuador.",
    defaultUnit: "",
    sensorMappings: {
      T: {
        label: "Temperatura",
        unit: "°C",
        icon: Thermometer,
        isPrimaryGraphSensor: true,
      },
    },
  },
];
