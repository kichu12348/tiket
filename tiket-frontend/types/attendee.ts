export interface AttendeeUser {
  id: string;
  name: string;
  email: string;
}

export interface AttendeeTicketType {
  id: string;
  name: string;
  price: string;
}

export interface AttendeeOrder {
  id: string;
  totalAmount: string;
  paymentStatus: "pending" | "success" | "failed" | "refunded";
  createdAt: string;
}

export interface AttendeeItem {
  id: string;
  qrCode: string;
  status: "active" | "used" | "transferred" | "refunded" | "cancelled";
  createdAt: string;
  user: AttendeeUser;
  ticketType: AttendeeTicketType;
  order: AttendeeOrder;
  checkedInAt: string | null;
}

export interface TicketTypeBreakdown {
  ticketTypeId: string;
  ticketTypeName: string;
  count: number;
  checkedInCount: number;
  price: string;
}

export interface AttendeeStatsData {
  totalAttendees: number;
  checkedInCount: number;
  pendingCount: number;
  totalRevenue: number;
  breakdownByTicketType: TicketTypeBreakdown[];
}

export interface FormResponseItem {
  fieldId?: string;
  fieldType?: string;
  label: string;
  value: string;
}

export interface CheckInLog {
  id: string;
  checkedInAt: string;
  loggedBy: {
    id: string;
    name: string;
  } | null;
}

export interface AttendeeDetailResponse {
  attendee: AttendeeItem;
  checkIns: CheckInLog[];
}

export interface AttendeeFormResponsesResponse {
  responses: FormResponseItem[];
}

export interface GetAttendeesResponse {
  attendees: AttendeeItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ManualRegisterPayload {
  name: string;
  email: string;
  ticketTypeId: string;
  notes?: string;
}

export interface AttendeeFiltersState {
  search: string;
  ticketTypeId: string;
  status: string;
  paymentStatus: string;
  page: number;
  limit: number;
}
