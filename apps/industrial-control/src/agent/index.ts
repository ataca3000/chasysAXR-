import { JARVIS_CONFIG } from "./config";

export async function jarvis(input: string) {
  return {
    ok: true,
    message: "JARVIS listo",
    input,
    config: JARVIS_CONFIG
  };
}
