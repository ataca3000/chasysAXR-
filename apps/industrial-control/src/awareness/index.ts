export * from "./state";
export * from "./events";
export * from "./sensors";
export * from "./agents";
export * from "./map";

import { initializeAwarenessInputs } from "./sensors";

export function initAwareness() {
  initializeAwarenessInputs();
}
