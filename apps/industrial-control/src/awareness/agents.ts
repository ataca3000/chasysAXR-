import { getSituationalState, SensorReading } from "./state";

export function buildSituationalPrompt() {
  const state = getSituationalState();
  const machines = Object.values(state.machines);

  const machineSummary = machines
    .map((machine) => {
      const latest = machine.sensors
        .slice(-3)
        .map((reading) => `${reading.type}: ${reading.value}${reading.unit}`)
        .join(", ");
      return `Máquina ${machine.name} (${machine.id}) - status ${machine.status}. Últimos valores: ${latest || "sin datos recientes"}`;
    })
    .join("\n");

  const alertSummary = state.alerts
    .slice(0, 5)
    .map(
      (alert) =>
        `- [${alert.level}] ${alert.message} (${alert.machineId || "global"})`,
    )
    .join("\n");

  return `Eres un asistente industrial. Genera un informe corto y recomendaciones.

Estado de máquinas:
${machineSummary || "No hay datos de máquinas aún."}

Alertas recientes:
${alertSummary || "No hay alertas activas."}

Sugerencias:
`;
}

export async function analyzeSituationalState() {
  const prompt = buildSituationalPrompt();
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      history: [],
      currentScene: { awareness: true },
    }),
  });
  const json = await response.json();
  return json?.result || { message: "No response" };
}

export function formatReading(reading: SensorReading) {
  return `${reading.type} ${reading.value}${reading.unit}`;
}

export function getMachineHealth(machine: MachineState) {
  if (machine.status === "critical") return "critical";
  if (machine.status === "warning") return "warning";
  return "ok";
}
