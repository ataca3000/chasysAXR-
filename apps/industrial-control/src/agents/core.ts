import { z } from "zod";
import { executeSerialCommand } from "../drivers/webserial/manager";
import { executeUsbCommand } from "../drivers/webusb/manager";
import { getRecommendations } from "../services/agentBackend";
import { useAgentStore } from "../store/state";

const AgentCommandSchema = z.object({
  type: z.enum(["serial", "usb", "ai"]),
  payload: z.record(z.any()).optional(),
});

export type AgentCommand = z.infer<typeof AgentCommandSchema>;

export type AgentCommandResult = {
  html: string;
  gcode: string[];
};

export async function dispatchAgentCommand(
  command: AgentCommand
): Promise<AgentCommandResult | void> {
  const parsed = AgentCommandSchema.parse(command);
  const store = useAgentStore.getState();
  store.setStatus(`processing:${parsed.type}`);

  try {
    if (parsed.type === "serial") {
      await executeSerialCommand(parsed.payload ?? {});
      return { html: "<p>Serial command sent.</p>", gcode: [] };
    }

    if (parsed.type === "usb") {
      await executeUsbCommand(parsed.payload ?? {});
      return { html: "<p>USB command sent.</p>", gcode: [] };
    }

    if (parsed.type === "ai") {
      const telemetry = parsed.payload?.telemetry ?? parsed.payload;
      const machineStatus = (telemetry as any)?.status ?? "OPERATIVO";
      return await getRecommendations(telemetry, machineStatus);
    }
  } finally {
    store.setStatus("idle");
  }
}
