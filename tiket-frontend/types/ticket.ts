export type TicketStatus = "active" | "used" | "transferred" | "refunded" | "cancelled";

export interface LocationDetails {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  link?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface TicketPassEvent {
  id: string;
  title: string;
  slug: string;
  startDate: string;
  endDate?: string | null;
  locationType: "online" | "offline" | "hybrid";
  locationDetails?: LocationDetails | string | null;
  timezone: string;
  coverImage?: string | null;
}

export interface TicketPassType {
  id: string;
  name: string;
  price: string;
  description?: string | null;
  isTransferable: boolean;
  isRefundable: boolean;
}

export interface TicketPassAttendee {
  id: string;
  name: string;
  email: string;
}

export interface TicketPassOrder {
  id: string;
  totalAmount: string;
  paymentStatus: string;
  createdAt: string;
}

export interface TicketFormResponseItem {
  label: string;
  value?: string | null;
}

export interface TicketPassData {
  id: string;
  qrCode: string;
  status: TicketStatus;
  createdAt: string;
  event: TicketPassEvent;
  ticketType: TicketPassType;
  attendee: TicketPassAttendee;
  order: TicketPassOrder;
  responses?: TicketFormResponseItem[];
}
