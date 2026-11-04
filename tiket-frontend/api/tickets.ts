import api from "@/lib/api";
import { API_ENDPOINTS } from "@/constants/config";
import type {
  TicketType,
  CreateTicketTypePayload,
  UpdateTicketTypePayload,
} from "@/types/ticketType";

import type {
  TicketPassData,
  TransferTicketPayload,
  TicketTransfer,
  AcceptTransferResponse,
  MyTicketsResponse,
} from "@/types/ticket";
import type {
  DocumentTemplate,
  CreateTemplatePayload,
  UpdateTemplatePayload,
} from "@/app/edit/[eventId]/tickets/components/TicketDesignStudio/types";

export const getTicketTypes = async (
  eventId: string,
): Promise<TicketType[]> => {
  const response = await api.get(API_ENDPOINTS.TICKET_TYPES.GET_ALL(eventId));
  return response.data;
};

export const createTicketType = async (
  eventId: string,
  payload: CreateTicketTypePayload,
): Promise<TicketType> => {
  const response = await api.post(
    `${API_ENDPOINTS.TICKET_TYPES.CREATE}/${eventId}`,
    payload,
  );
  return response.data;
};

export const updateTicketType = async (
  eventId: string,
  ticketTypeId: string,
  payload: UpdateTicketTypePayload,
): Promise<TicketType> => {
  const response = await api.patch(
    API_ENDPOINTS.TICKET_TYPES.UPDATE(eventId, ticketTypeId),
    payload,
  );
  return response.data;
};

export const deleteTicketType = async (
  eventId: string,
  ticketTypeId: string,
): Promise<{ message: string }> => {
  const response = await api.delete(
    API_ENDPOINTS.TICKET_TYPES.DELETE(eventId, ticketTypeId),
  );
  return response.data;
};

export const reorderTicketTypes = async (
  eventId: string,
  orderedIds: { id: string; sortOrder: number }[],
): Promise<{ message: string }> => {
  const response = await api.put(
    API_ENDPOINTS.TICKET_TYPES.REORDER(eventId),
    orderedIds,
  );
  return response.data;
};

// Fetch individual attendee ticket pass payload
export const getTicketPass = async (
  ticketId: string,
): Promise<TicketPassData> => {
  const response = await api.get(API_ENDPOINTS.TICKETS.GET(ticketId));
  return response.data;
};

// Initiate ticket transfer to another user email
export const initiateTicketTransfer = async (
  ticketId: string,
  payload: TransferTicketPayload,
): Promise<TicketTransfer> => {
  const response = await api.post(
    API_ENDPOINTS.TICKETS.TRANSFER(ticketId),
    payload,
  );
  return response.data;
};

export const transferTicket = initiateTicketTransfer;

// Accept an initiated ticket transfer
export const acceptTicketTransfer = async (
  transferId: string,
): Promise<AcceptTransferResponse> => {
  const response = await api.post(
    API_ENDPOINTS.TICKETS.ACCEPT_TRANSFER(transferId),
  );
  return response.data;
};

export const acceptTransfer = acceptTicketTransfer;

// Fetch current user's tickets and incoming transfers
export const getMyTickets = async (): Promise<MyTicketsResponse> => {
  const response = await api.get(API_ENDPOINTS.TICKETS.ME);
  if (Array.isArray(response.data)) {
    return {
      tickets: response.data,
      incomingTransfers: [],
    };
  }
  return {
    tickets: response.data?.tickets || [],
    incomingTransfers: response.data?.incomingTransfers || [],
  };
};

// Decline/Cancel an incoming ticket transfer
export const cancelTicketTransfer = async (
  transferId: string,
): Promise<{ message: string }> => {
  const response = await api.post(
    API_ENDPOINTS.TICKETS.CANCEL_TRANSFER(transferId),
  );
  return response.data;
};

export const declineTicketTransfer = cancelTicketTransfer;

// Cancel or request refund for a ticket pass
export const cancelTicket = async (
  ticketId: string,
): Promise<{ message: string }> => {
  const response = await api.post(API_ENDPOINTS.TICKETS.CANCEL(ticketId));
  return response.data;
};

// --- Document Templates API ---
export const getTemplates = async (
  eventId: string,
): Promise<DocumentTemplate[]> => {
  const response = await api.get(API_ENDPOINTS.TEMPLATES.GET_ALL(eventId));
  return response.data;
};

export const createTemplate = async (
  eventId: string,
  payload: CreateTemplatePayload,
): Promise<DocumentTemplate> => {
  const response = await api.post(
    API_ENDPOINTS.TEMPLATES.CREATE(eventId),
    payload,
  );
  return response.data;
};

export const updateTemplate = async (
  templateId: string,
  payload: UpdateTemplatePayload,
): Promise<DocumentTemplate> => {
  const response = await api.patch(
    API_ENDPOINTS.TEMPLATES.UPDATE(templateId),
    payload,
  );
  return response.data;
};

export const deleteTemplate = async (
  templateId: string,
): Promise<{ message: string }> => {
  const response = await api.delete(
    API_ENDPOINTS.TEMPLATES.DELETE(templateId),
  );
  return response.data;
};
