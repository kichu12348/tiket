import { create } from "zustand";
import type { Event } from "@/types/event";

interface EventState {
  event: Event | null;
  isLoading: boolean;
  permissions: string[];
  isOwner: boolean;
  setEvent: (event: Event) => void;
  setPermissions: (permissions: string[], isOwner?: boolean) => void;
  updateEventLocally: (partialEvent: Partial<Event>) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export const useEventStore = create<EventState>((set) => ({
  event: null,
  isLoading: true,
  permissions: [],
  isOwner: true,
  setEvent: (event) => set({ event, isLoading: false }),
  setPermissions: (permissions, isOwner = false) =>
    set({ permissions, isOwner }),
  updateEventLocally: (partialEvent) =>
    set((state) => ({
      event: state.event ? { ...state.event, ...partialEvent } : null,
    })),
  setIsLoading: (isLoading) => set({ isLoading }),
}));
