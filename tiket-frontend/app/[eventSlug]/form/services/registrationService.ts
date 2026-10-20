import { API_ENDPOINTS, API_URL } from "@/constants/config";
import type { TicketType } from "@/types/ticketType";
import type { FormField } from "@/types/form";

export async function fetchTicketTypes(eventId: string): Promise<TicketType[]> {
  try {
    const res = await fetch(
      `${API_URL}${API_ENDPOINTS.TICKET_TYPES.GET_ALL(eventId)}`,
      {
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error("Failed to fetch ticket types:", error);
    return [];
  }
}

export async function fetchFormFields(eventId: string): Promise<FormField[]> {
  try {
    const res = await fetch(
      `${API_URL}${API_ENDPOINTS.FORMS.GET_ALL(eventId)}`,
      {
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error("Failed to fetch form fields:", error);
    return [];
  }
}
