export interface PurchaseFormResponse {
  fieldId: string;
  responseValue: string;
}

export interface PurchaseItem {
  ticketTypeId: string;
  formResponses?: PurchaseFormResponse[];
}

export interface CreateOrderPayload {
  eventId: string;
  purchases: PurchaseItem[];
}

export interface Order {
  id: string;
  eventId: string;
  userId: string;
  totalAmount: string;
  paymentStatus: "pending" | "success" | "failed" | "refunded";
  paymentProvider: string | null;
  paymentIntentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  orderId: string;
  ticketTypeId: string;
  userId: string;
  eventId: string;
  qrCode: string;
  status: "active" | "cancelled" | "transferred" | "used";
  transferCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RazorpayOrderData {
  id: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface CreateOrderResponse {
  order: Order;
  tickets: Ticket[];
  razorpayOrder?: RazorpayOrderData | null;
}

export interface PayOrderResponse {
  message: string;
  order: Order;
}
