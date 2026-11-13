import type { TicketType } from "./ticketType";
import type { Order } from "./order";
export interface Availability {
  version: number;
  remaining: number | null;
  serverTime: string;
  tiers: (TicketType & { remaining: number | null })[];
}
export interface PriceLine {
  ticketTypeId: string;
  unitPricePaise: number;
  discountPaise: number;
  ticketTaxPaise: number;
  platformFeePaise: number;
  feeTaxPaise: number;
  totalPaise: number;
}
export interface Quote {
  totalPaise: number;
  currency: string;
  lines: PriceLine[];
  policy: { version: string };
}
export interface Refund {
  id: string;
  orderId: string;
  amountPaise: number;
  status: string;
  reason: string;
  error: string | null;
  providerRefundId?: string | null;
  createdAt?: string;
}

export interface OrganizerBankAccount {
  userId: string;
  accountHolderName: string;
  phone?: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  upiId?: string | null;
  gatewayAccountId?: string | null;
  onboardingStatus?: string;
  updatedAt: string;
}

export interface PayoutRequest {
  id: string;
  eventId: string;
  requestedBy: string;
  amountPaise: number;
  status: "requested" | "processing" | "paid" | "rejected";
  bankSnapshot: {
    accountHolderName: string;
    maskedAccountNumber: string;
    ifscCode: string;
    bankName: string;
    upiId?: string | null;
  };
  referenceNumber?: string | null;
  gatewayPayoutId?: string | null;
  gatewaySettlementId?: string | null;
  processedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceSummary {
  grossSalesPaise: number;
  totalDiscountsPaise: number;
  platformFeesPaise: number;
  taxesPaise: number;
  totalRefundedPaise: number;
  netEarningsPaise: number;
  withdrawnOrPendingPaise: number;
  availableToWithdrawPaise: number;
  unsettledBalancePaise?: number;
}

export interface Finance {
  capturedPaise: number;
  orders: { order: Order; attendee: { name: string; email: string } }[];
  refunds: Refund[];
  items: (PriceLine & {
    id: string;
    orderId: string;
    name: string;
    ticketId: string;
  })[];
  summary?: FinanceSummary;
  unsettledBalancePaise?: number;
  bankAccount?: OrganizerBankAccount | null;
  payouts?: PayoutRequest[];
}

export interface SaveBankAccountPayload {
  accountHolderName: string;
  phone?: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  upiId?: string | null;
}

export interface RequestPayoutPayload {
  amountPaise: number;
  notes?: string | null;
}
export interface Coupon {
  code: string;
  kind: "percent" | "fixed" | "access";
  value: number;
  ticketTypeIds: string[];
  maxUses: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
}
export type MailConfig =
  | { provider: "brevo"; apiKey: string; fromEmail: string; fromName?: string }
  | {
      provider: "smtp";
      host: string;
      port: number;
      secure: boolean;
      username: string;
      password: string;
      fromEmail: string;
      fromName?: string;
    };

export interface BlacklistEntry {
  id: string;
  organizationId: string;
  eventId: string | null;
  targetUserId: string | null;
  pattern: string | null;
  reason: string | null;
  createdBy: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface CreateBlacklistPayload {
  targetUserId?: string;
  pattern?: string;
  scope?: "event" | "organization";
  reason?: string;
  cancelExistingTickets?: boolean;
}

