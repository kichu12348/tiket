export type TicketStatus =
  | "pending"
  | "pending_approval"
  | "active"
  | "used"
  | "transferred"
  | "refunded"
  | "cancelled";

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

export interface TicketPassTemplate {
  id: string;
  name: string;
  backgroundImageUrl?: string | null;
  elementsJson?: unknown;
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
  template?: TicketPassTemplate | null;
}

export interface TransferTicketPayload {
  targetEmail: string;
}

export interface TicketTransfer {
  id: string;
  ticketId: string;
  fromUserId: string;
  toUserId: string;
  status: string;
  createdAt: string;
}

export interface AcceptTransferResponse {
  message: string;
  transfer: TicketTransfer;
}

