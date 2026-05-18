import { z } from "zod";
import { executeSerialCommand } from "../drivers/webserial/manager";
import { executeUsbCommand } from "../drivers/webusb/manager";
import { runPipeline } from "../workflows/pipeline";

const AgentCommandSchema = z.object({
  type: z.enum(["serial", "usb", "ai"]),
  payload: z.record(z.any()),
});

export type AgentCommand = z.infer<typeof AgentCommandSchema>;

export async function dispatchAgentCommand(command: AgentCommand) {
  const parsed = AgentCommandSchema.parse(command);

  if (parsed.type === "serial") {
    return executeSerialCommand(parsed.payload);
  }

  if (parsed.type === "usb") {
    return executeUsbCommand(parsed.payload);
  }

  if (parsed.type === "ai") {
    return runPipeline(parsed.payload, []);
  }

  throw new Error("Unsupported agent command type");
}
