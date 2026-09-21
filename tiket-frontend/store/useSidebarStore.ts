import { create } from "zustand";

interface SidebarStore {
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  isCollapsed: true,
  setIsCollapsed: (isCollapsed) => set({ isCollapsed }),
}));
