import { create } from "zustand";

export interface LiveStore {
  connected: boolean;
  version: Record<string, number>;
  revisions: Record<string, number>;
  status: "connecting" | "live" | "polling";
  setConnected: (connected: boolean) => void;
  setVersion: (eventId: string, version: number) => void;
  changed: (id: string, version?: number) => void;
  setStatus: (status: LiveStore["status"]) => void;
}

export const useLiveStore = create<LiveStore>((set) => ({
  connected: false,
  version: {},
  revisions: {},
  status: "connecting",
  setConnected: (connected) =>
    set({
      connected,
      status: connected ? "live" : "polling",
    }),
  setVersion: (eventId, newVersion) =>
    set((state) => {
      const current = state.version[eventId];
      if (current === newVersion) return state;
      return {
        version: { ...state.version, [eventId]: newVersion },
        revisions: { ...state.revisions, [eventId]: newVersion },
      };
    }),
  changed: (id, newVersion) =>
    set((state) => {
      const current = state.version[id];
      if (typeof newVersion === "number") {
        if (current === newVersion) return state;
        return {
          version: { ...state.version, [id]: newVersion },
          revisions: { ...state.revisions, [id]: newVersion },
        };
      }
      const next = (current || 0) + 1;
      return {
        version: { ...state.version, [id]: next },
        revisions: { ...state.revisions, [id]: next },
      };
    }),
  setStatus: (status) =>
    set({
      status,
      connected: status === "live",
    }),
}));
