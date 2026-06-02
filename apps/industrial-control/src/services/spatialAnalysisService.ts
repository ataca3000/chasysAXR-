import * as THREE from "three";

export interface SpatialSuggestion {
  nodeName: string;
  type: "actuator" | "sensor";
  hardware:
    | "servo"
    | "stepper"
    | "dc_motor"
    | "thermal"
    | "vibration"
    | "ultrasonic";
  justification: string;
  position?: [number, number, number];
  suggestedPin?: string;
}

/**
 * Extrae metadatos simplificados de la escena 3D para que la IA pueda procesarlos.
 */
export function extractModelMetadata(object: THREE.Object3D) {
  const metadata: any[] = [];

  object.traverse((node) => {
    const isMesh = (node as THREE.Mesh).isMesh;
    const isGroup = (node as THREE.Group).isGroup;
    if (isMesh || (isGroup && node.name)) {
      const box = new THREE.Box3().setFromObject(node as THREE.Object3D);
      const size = new THREE.Vector3();
      box.getSize(size);

      metadata.push({
        name: node.name || "Unnamed_Node",
        type: node.type,
        position: node.position.toArray(),
        dimensions: {
          x: parseFloat(size.x.toFixed(2)),
          y: parseFloat(size.y.toFixed(2)),
          z: parseFloat(size.z.toFixed(2)),
        },
        parent: node.parent?.name || "root",
      });
    }
  });

  return metadata;
}

/**
 * Envía los metadatos a Gemini para obtener sugerencias de automatización.
 */
export async function getSpatialAnalysis(
  metadata: any[],
): Promise<SpatialSuggestion[]> {
  const prompt = `
    Actúa como un Ingeniero de Automatización Industrial. 
    Analiza la siguiente estructura de nodos de un modelo 3D (formato JSON):
    ${JSON.stringify(metadata.slice(0, 30))} // Limitamos para el contexto

    Tu tarea:
    1. Identifica nodos que parezcan articulaciones, ejes o partes móviles (ej: 'Joint', 'Axis', 'Arm', 'Wheel'). Sugiere ACTUADORES.
    2. Identifica puntos críticos de calor o fricción. Sugiere SENSORES.
    3. IMPORTANTE: Extrae la propiedad "position" exacta del nodo analizado del JSON de entrada.
    4. Devuelve estrictamente un JSON array con este formato:
    [{
      "nodeName": "nombre", "type": "actuator|sensor", "hardware": "tipo", 
      "justification": "por qué", "position": [x, y, z]
    }]
  `;

  try {
    const response = await fetch("/api/chat", {
      // Reutilizamos tu proxy de Gemini
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, currentScene: metadata }),
    });
    const data = await response.json();
    return data.result.suggestions || []; // Asumiendo que Gemini devuelve el JSON parseado
  } catch (err) {
    console.error("Error en análisis espacial:", err);
    return [];
  }
}
