import { create } from "zustand";
interface LiveStore {
  revisions: Record<string, number>;
  status: "connecting" | "live" | "polling";
  changed: (id: string) => void;
  setStatus: (status: LiveStore["status"]) => void;
}
export const useLiveStore = create<LiveStore>((set) => ({
  revisions: {},
  status: "connecting",
  changed: (id) =>
    set((state) => ({
      revisions: { ...state.revisions, [id]: (state.revisions[id] || 0) + 1 },
    })),
  setStatus: (status) => set({ status }),
}));
