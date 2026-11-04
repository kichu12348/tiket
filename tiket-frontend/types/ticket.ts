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

export interface TicketElementStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  textAlign?: "left" | "center" | "right";
  autoFitText?: boolean;
  qrFgColor?: string;
  qrBgColor?: string;
  opacity?: number;
  lineHeight?: number | string;
  letterSpacing?: number | string;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
}

export type TicketElementType = "text" | "variable" | "qr" | "image";

export interface TicketCanvasElement {
  id: string;
  type: TicketElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  variableKey?: string;
  content?: string;
  style?: TicketElementStyle;
}

export interface TicketCanvasConfig {
  canvasWidth: number;
  canvasHeight: number;
  elements: TicketCanvasElement[];
}

export interface TicketPassTemplate {
  id: string;
  name: string;
  backgroundImageUrl?: string | null;
  elementsJson?: TicketCanvasConfig | null | unknown;
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

export type TicketPass = TicketPassData;

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

export interface IncomingTransfer {
  id: string;
  ticketId: string;
  fromUserId?: string;
  senderEmail?: string;
  senderName?: string;
  status: string;
  createdAt: string;
  event?: {
    id: string;
    title: string;
    slug?: string;
    startDate?: string;
    locationDetails?: LocationDetails | string | null;
  };
  ticketType?: {
    id: string;
    name: string;
    price?: string;
  };
  ticket?: {
    id: string;
    event?: {
      id: string;
      title: string;
      slug?: string;
      startDate?: string;
    };
    ticketType?: {
      id: string;
      name: string;
    };
  };
}

export interface UserTicketSummary {
  id: string;
  status: TicketStatus;
  qrCode?: string;
  createdAt: string;
  event: TicketPassEvent;
  ticketType: TicketPassType;
}

export interface MyTicketsResponse {
  tickets: (TicketPassData | UserTicketSummary)[];
  incomingTransfers: IncomingTransfer[];
}

export interface AcceptTransferResponse {
  message: string;
  transfer: TicketTransfer;
}

