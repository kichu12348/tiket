import { createTicketType, updateTicketType } from "@/api/tickets";
import type { TicketType, CreateTicketTypePayload } from "@/types/ticketType";

export interface PersistTicketParams {
  eventId: string;
  activeTicket: TicketType | null;
  payload: CreateTicketTypePayload;
}

/**
 * Persists ticket tier changes to the backend (creating new or updating existing).
 */
export async function persistTicket({
  eventId,
  activeTicket,
  payload,
}: PersistTicketParams): Promise<TicketType> {
  if (activeTicket) {
    return await updateTicketType(eventId, activeTicket.id, payload);
  }
  return await createTicketType(eventId, payload);
}
