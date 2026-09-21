import api from "@/lib/api";
import { API_ENDPOINTS } from "@/constants/config";
import {
  TicketType,
  CreateTicketTypePayload,
  UpdateTicketTypePayload,
} from "@/types/ticketType";

import { TicketPassData } from "@/types/ticket";

export const getTicketTypes = async (eventId: string): Promise<TicketType[]> => {
  const response = await api.get(API_ENDPOINTS.TICKET_TYPES.GET_ALL(eventId));
  return response.data;
};

export const createTicketType = async (
  eventId: string,
  payload: CreateTicketTypePayload
): Promise<TicketType> => {
  const response = await api.post(
    `${API_ENDPOINTS.TICKET_TYPES.CREATE}/${eventId}`,
    payload
  );
  return response.data;
};

export const updateTicketType = async (
  eventId: string,
  ticketTypeId: string,
  payload: UpdateTicketTypePayload
): Promise<TicketType> => {
  const response = await api.patch(
    API_ENDPOINTS.TICKET_TYPES.UPDATE(eventId, ticketTypeId),
    payload
  );
  return response.data;
};

export const deleteTicketType = async (
  eventId: string,
  ticketTypeId: string
): Promise<{ message: string }> => {
  const response = await api.delete(
    API_ENDPOINTS.TICKET_TYPES.DELETE(eventId, ticketTypeId)
  );
  return response.data;
};

export const reorderTicketTypes = async (
  eventId: string,
  orderedIds: { id: string; sortOrder: number }[]
): Promise<{ message: string }> => {
  const response = await api.put(
    API_ENDPOINTS.TICKET_TYPES.REORDER(eventId),
    orderedIds
  );
  return response.data;
};

// Fetch individual attendee ticket pass payload
export const getTicketPass = async (ticketId: string): Promise<TicketPassData> => {
  const response = await api.get(API_ENDPOINTS.TICKETS.GET(ticketId));
  return response.data;
};
