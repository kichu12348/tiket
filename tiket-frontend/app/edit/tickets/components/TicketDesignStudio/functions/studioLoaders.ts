import { getTicketTypes } from "@/api/tickets";
import { getFormFields } from "@/api/forms";
import type { TicketType } from "@/types/ticketType";
import type { FormField } from "@/types/form";

/**
 * Loads all ticket types for the current event.
 */
export async function loadStudioTicketTypes(
  eventId: string,
): Promise<TicketType[]> {
  const data = await getTicketTypes(eventId);
  return data || [];
}

/**
 * Loads all custom registration form fields for dynamic token interpolation.
 */
export async function loadStudioFormFields(
  eventId: string,
): Promise<FormField[]> {
  const fields = await getFormFields(eventId);
  return fields || [];
}
