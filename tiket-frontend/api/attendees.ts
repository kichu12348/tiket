import api from "@/lib/api";
import { API_ENDPOINTS } from "@/constants/config";
import {
  GetAttendeesResponse,
  AttendeeStatsData,
  AttendeeDetailResponse,
  AttendeeFormResponsesResponse,
  AttendeeFiltersState,
  ManualRegisterPayload,
  AttendeeItem,
} from "@/types/attendee";

export const getAttendees = async (
  eventId: string,
  filters?: Partial<AttendeeFiltersState>,
): Promise<GetAttendeesResponse> => {
  const params = new URLSearchParams();
  if (filters?.search) params.append("search", filters.search);
  if (filters?.ticketTypeId) params.append("ticketTypeId", filters.ticketTypeId);
  if (filters?.status) params.append("status", filters.status);
  if (filters?.paymentStatus) params.append("paymentStatus", filters.paymentStatus);
  if (filters?.page) params.append("page", String(filters.page));
  if (filters?.limit) params.append("limit", String(filters.limit));

  const queryString = params.toString();
  const url = `${API_ENDPOINTS.ATTENDEES.GET_ALL(eventId)}${queryString ? `?${queryString}` : ""}`;

  const response = await api.get(url);
  return response.data;
};

export const getAttendeeStats = async (
  eventId: string,
): Promise<AttendeeStatsData> => {
  const response = await api.get(API_ENDPOINTS.ATTENDEES.STATS(eventId));
  return response.data;
};

export const getAttendeeDetail = async (
  eventId: string,
  ticketId: string,
): Promise<AttendeeDetailResponse> => {
  const response = await api.get(
    API_ENDPOINTS.ATTENDEES.GET_BY_ID(eventId, ticketId),
  );
  return response.data;
};

export const getAttendeeFormResponses = async (
  eventId: string,
  ticketId: string,
): Promise<AttendeeFormResponsesResponse> => {
  const response = await api.get(
    API_ENDPOINTS.ATTENDEES.FORM_RESPONSES(eventId, ticketId),
  );
  return response.data;
};

export const toggleCheckIn = async (
  eventId: string,
  ticketId: string,
): Promise<{ message: string; status: string; checkedInAt: string | null }> => {
  const response = await api.post(
    API_ENDPOINTS.ATTENDEES.TOGGLE_CHECKIN(eventId, ticketId),
  );
  return response.data;
};

export const cancelTicket = async (
  eventId: string,
  ticketId: string,
): Promise<{ message: string; status: string }> => {
  const response = await api.post(
    API_ENDPOINTS.ATTENDEES.CANCEL(eventId, ticketId),
  );
  return response.data;
};

export const manualRegisterAttendee = async (
  eventId: string,
  payload: ManualRegisterPayload,
): Promise<{ message: string; ticket: AttendeeItem }> => {
  const response = await api.post(
    API_ENDPOINTS.ATTENDEES.MANUAL_REGISTER(eventId),
    payload,
  );
  return response.data;
};

export const exportAttendees = async (
  eventId: string,
  format: "csv" | "json" = "csv",
): Promise<{ data: string; format: string; filename: string }> => {
  const response = await api.get(
    `${API_ENDPOINTS.ATTENDEES.EXPORT(eventId)}?format=${format}`,
  );
  return response.data;
};
