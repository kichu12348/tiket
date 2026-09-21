import { create } from 'zustand';
import { Event } from '@/types/event';

interface EventState {
  event: Event | null;
  isLoading: boolean;
  setEvent: (event: Event) => void;
  updateEventLocally: (partialEvent: Partial<Event>) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export const useEventStore = create<EventState>((set) => ({
  event: null,
  isLoading: true,
  setEvent: (event) => set({ event, isLoading: false }),
  updateEventLocally: (partialEvent) => set((state) => ({
    event: state.event ? { ...state.event, ...partialEvent } : null
  })),
  setIsLoading: (isLoading) => set({ isLoading }),
}));
