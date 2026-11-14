export interface ScanTicketData {
  id: string;
  status: string;
  userId?: string;
  eventId?: string;
  ticketTypeId?: string;
}

export interface ScanCheckInData {
  id: string;
  eventId: string;
  ticketId: string;
  checkInDate: string;
  loggedByUserId?: string;
  checkedInAt: string;
}

export interface ScanResultPayload {
  message: string;
  status: string;
  checkInDate: string;
  todayCheckInCount: number;
  totalCheckIns: number;
  checkedInAt: string | null;
  ticket?: ScanTicketData;
  checkIn?: ScanCheckInData;
}

export interface AttendeeFormResponseItem {
  fieldId: string;
  label: string;
  fieldType: string;
  value: string;
}

export interface OperationsAttendee {
  id: string;
  qrCode: string;
  status: string;
  checkInCount: number;
  checkedInToday: boolean;
  checkedInAt: string | null;
  ticketName: string;
  ticketTypeId?: string;
  createdAt?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  order?: {
    id: string;
    totalAmount?: string;
    paymentStatus?: string;
    createdAt?: string;
  };
  formResponses?: AttendeeFormResponseItem[];
}

export interface TierCheckInStat {
  ticketTypeId: string;
  name: string;
  total: number;
  checkedIn: number;
  checkedInToday: number;
  multiDayCheckIn?: boolean;
  maxCheckInsPerDay?: number;
}

export interface OperationsSummary {
  totalTickets: number;
  checkedInTotal: number;
  checkedInToday: number;
  pendingApprovals: number;
  tiers: TierCheckInStat[];
}
