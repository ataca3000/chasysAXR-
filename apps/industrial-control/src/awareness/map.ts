import { getSituationalState } from "./state";

export interface AwarenessMapNode {
  id: string;
  name: string;
  status: "ok" | "warning" | "critical" | "offline";
  color: string;
  position: [number, number, number];
}

export function getAwarenessMapNodes(): AwarenessMapNode[] {
  const state = getSituationalState();
  const machines = Object.values(state.machines);

  return machines.map((machine, index) => {
    const color =
      machine.status === "critical"
        ? "#ff4d4f"
        : machine.status === "warning"
          ? "#f59e0b"
          : machine.status === "offline"
            ? "#fbbf24"
            : "#34d399";
    return {
      id: machine.id,
      name: machine.name,
      status: machine.status,
      color,
      position: [index * 3 - machines.length * 1.5, 0, index * 2],
    };
  });
}
