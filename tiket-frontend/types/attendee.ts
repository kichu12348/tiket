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
  paymentStatus:
    "pending" | "success" | "failed" | "refunded" | "partially_refunded";
  createdAt: string;
}

export interface AttendeeItem {
  id: string;
  qrCode: string;
  status:
    | "pending"
    | "pending_approval"
    | "active"
    | "used"
    | "transferred"
    | "refunded"
    | "cancelled";
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

export interface EventInsightsSummary {
  totalRegistrations: number;
  confirmedCount: number;
  checkedInCount: number;
  pendingApprovalCount: number;
  cancelledOrDeclinedCount: number;
  checkInRatePercent: number;
  capacity: number | null;
  remainingCapacity: number | null;
  netRevenuePaise: number;
  totalRefundedPaise: number;
  couponOrdersCount: number;
}

export interface DailySeriesItem {
  date: string;
  registrations: number;
  revenuePaise: number;
}

export interface HourlyCheckInItem {
  hour: string;
  count: number;
}

export interface TierBreakdownItem {
  ticketTypeId: string;
  name: string;
  sold: number;
  capacity: number | null;
  revenuePaise: number;
  checkedIn: number;
}

export interface RecentActivityItem {
  id: string;
  attendeeName: string;
  attendeeEmail: string;
  ticketTypeName: string;
  status: string;
  timestamp: string;
}

export interface EventInsightsData {
  summary: EventInsightsSummary;
  dailySeries: DailySeriesItem[];
  hourlyCheckIns: HourlyCheckInItem[];
  tierBreakdown: TierBreakdownItem[];
  recentActivity: RecentActivityItem[];
}
