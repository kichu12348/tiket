import api from "@/lib/api";
import { Event } from "@/types/event";
import { API_ENDPOINTS } from "@/constants/config";

export async function getMyEvents() {
  try {
    const res = await api.get(API_ENDPOINTS.EVENTS.ME);
    return res.data as Event[];
  } catch (error) {
    throw error;
  }
}
