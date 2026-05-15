export function parseCNCResponse(response: string) {
  // Parsers for GRBL or other CNC firmware responses
  return { status: "Idle", text: response };
}
