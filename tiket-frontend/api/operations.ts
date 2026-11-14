import api from "@/lib/api";
import { API_ENDPOINTS } from "@/constants/config";
import type {
  ScanResultPayload,
  OperationsAttendee,
} from "@/types/operations";

export async function scanTicketCode(
  eventId: string,
  code: string,
): Promise<ScanResultPayload> {
  const response = await api.post<ScanResultPayload>(API_ENDPOINTS.CHECK_IN, {
    eventId,
    qrCode: code,
  });
  return response.data;
}

export async function toggleManualCheckIn(
  eventId: string,
  ticketId: string,
  undo: boolean = false,
): Promise<{
  message: string;
  status: string;
  checkedInAt: string | null;
  checkInDate?: string;
  todayCheckInCount?: number;
  totalCheckIns?: number;
}> {
  const response = await api.post(
    API_ENDPOINTS.ATTENDEES.TOGGLE_CHECKIN(eventId, ticketId),
    { action: undo ? "undo" : "checkin" },
  );
  return response.data;
}

export async function fetchOperationsAttendees(
  eventId: string,
  params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  },
): Promise<{
  attendees: OperationsAttendee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const query = new URLSearchParams();
  if (params?.search) query.append("search", params.search);
  if (params?.status) query.append("status", params.status);
  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));

  const qs = query.toString();
  const url = `${API_ENDPOINTS.ATTENDEES.GET_ALL(eventId)}${qs ? `?${qs}` : ""}`;
  const response = await api.get(url);
  return response.data;
}

export async function decideApproval(
  eventId: string,
  orderId: string,
  decision: "approve" | "reject",
): Promise<{ message: string }> {
  // Map "reject" to "decline" for Fastify JSON schema validation compatibility
  const backendDecision = decision === "reject" ? "decline" : "approve";
  const response = await api.post(
    API_ENDPOINTS.COMMERCE.DECISION(eventId, orderId),
    { decision: backendDecision },
  );
  return response.data;
}
