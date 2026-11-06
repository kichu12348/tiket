import type { ConditionGroup, VisibilityConditionRule } from "./form";

export interface TicketLayoutLayer {
  id: string;
  type: "qr" | "text";
  name: string; // e.g. "QR Code", "Name", "{{ticket_code}}"
  tokenOrText: string; // e.g. "{{name}}", "{{ticket_code}}", "{{form.College}}"
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  fontSize: number; // e.g. 43
  maxLines: number; // e.g. 2
  lineSpacing: number; // e.g. 0
  fontColor: string; // e.g. "#000000"
  fontWeight?: string;
  fontFamily?: string;
  fontStyle?: string;
  textDecoration?: string;
  qrColor?: string;
  qrBgColor?: string;
}

export interface TicketLayoutConfig {
  canvasWidth: number;
  canvasHeight: number;
  layers: TicketLayoutLayer[];
}

export interface TicketType {
  isHidden?: boolean;
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  price: string;
  templateImageUrl?: string | null;
  templateConfig?: TicketLayoutConfig | null;
  passFeeToCustomer?: boolean;
  quantityLimit: number | null;
  poolName?: string | null;
  poolCapacity?: number | null;
  category?: string | null;
  tags?: string[];
  enableWaitlist?: boolean;
  multiDayCheckIn?: boolean;
  maxPerUser?: number | null;
  isFixedDefault?: boolean;
  collectGst?: boolean;
  isClosed?: boolean;
  conditions?: VisibilityConditionRule[] | null;
  eligibilityRules?: ConditionGroup | null;
  saleStart: string | null;
  saleEnd: string | null;
  isRefundable: boolean;
  refundableUntil: string | null;
  isTransferable: boolean;
  maxTransfers: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketTypePayload {
  isHidden?: boolean;
  name: string;
  description?: string;
  price?: number;
  templateImageUrl?: string | null;
  templateConfig?: TicketLayoutConfig | null;
  passFeeToCustomer?: boolean;
  quantityLimit?: number | null;
  poolName?: string | null;
  poolCapacity?: number | null;
  category?: string | null;
  tags?: string[];
  enableWaitlist?: boolean;
  multiDayCheckIn?: boolean;
  maxPerUser?: number | null;
  isFixedDefault?: boolean;
  collectGst?: boolean;
  isClosed?: boolean;
  conditions?: VisibilityConditionRule[] | null;
  eligibilityRules?: ConditionGroup | null;
  saleStart?: string | null;
  saleEnd?: string | null;
  isRefundable?: boolean;
  refundableUntil?: string | null;
  isTransferable?: boolean;
  maxTransfers?: number;
}

export type UpdateTicketTypePayload = Partial<CreateTicketTypePayload>;
