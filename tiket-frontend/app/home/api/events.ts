import api from "@/lib/api";
import type { Event } from "@/types/event";
import type { MyTicketsResponse } from "@/types/ticket";
import { API_ENDPOINTS } from "@/constants/config";

export async function getMyEvents() {
  try {
    const res = await api.get(API_ENDPOINTS.EVENTS.ME);
    return res.data as Event[];
  } catch (error) {
    throw error;
  }
}

export async function getMyTickets(): Promise<MyTicketsResponse> {
  try {
    const res = await api.get(API_ENDPOINTS.TICKETS.ME);
    if (Array.isArray(res.data)) {
      return { tickets: res.data, incomingTransfers: [] };
    }
    return {
      tickets: res.data?.tickets || [],
      incomingTransfers: res.data?.incomingTransfers || [],
    };
  } catch (error) {
    throw error;
  }
}
