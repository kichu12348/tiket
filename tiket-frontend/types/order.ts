export interface PriceLine {
  ticketTypeId: string;
  unitPricePaise: number;
  discountPaise: number;
  ticketTaxPaise: number;
  platformFeePaise: number;
  feeTaxPaise: number;
  totalPaise: number;
  passFeeToCustomer?: boolean;
  organizerNetPaise?: number;
}

export interface OrderItem extends PriceLine {
  id: string;
  orderId: string;
  ticketId: string;
  name: string;
  passFeeToCustomer: boolean;
  organizerNetPaise: number;
  policy: {
    isRefundable: boolean;
    refundableUntil: string | null;
    isTransferable: boolean;
    maxTransfers: number;
    passFeeToCustomer: boolean;
  };
}

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
  code?: string;
}

export interface Order {
  id: string;
  eventId: string;
  userId: string;
  totalAmount: string;
  totalPaise: number;
  expiresAt: string | null;
  reservationState: "held" | "confirmed" | "released";
  registrationStatus:
    | "checkout"
    | "confirmed"
    | "pending_approval"
    | "declined"
    | "cancelled"
    | "expired"
    | "refund_pending";
  paymentStatus:
    "pending" | "success" | "failed" | "refunded" | "partially_refunded";
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
  status:
    | "active"
    | "cancelled"
    | "transferred"
    | "used"
    | "pending"
    | "pending_approval"
    | "refunded";
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
  serverTime: string;
  items: PriceLine[];
  tickets: Ticket[];
  razorpayOrder?: RazorpayOrderData | null;
}

export interface PayOrderResponse {
  message: string;
  order: Order;
}
