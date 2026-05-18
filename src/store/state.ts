import { create } from "zustand";

export type AgentState = {
  status: string;
  connected: boolean;
  setStatus: (status: string) => void;
  setConnected: (connected: boolean) => void;
};

export const useAgentStore = create<AgentState>((set) => ({
  status: "idle",
  connected: false,
  setStatus: (status) => set({ status }),
  setConnected: (connected) => set({ connected }),
}));
