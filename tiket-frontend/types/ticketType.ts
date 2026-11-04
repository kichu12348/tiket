import type { ConditionGroup } from "./form";

export interface TicketType {
  isHidden?: boolean;
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  price: string;
  quantityLimit: number | null;
  poolName?: string | null;
  poolCapacity?: number | null;
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
  quantityLimit?: number | null;
  poolName?: string | null;
  poolCapacity?: number | null;
  eligibilityRules?: ConditionGroup | null;
  saleStart?: string | null;
  saleEnd?: string | null;
  isRefundable?: boolean;
  refundableUntil?: string | null;
  isTransferable?: boolean;
  maxTransfers?: number;
}

export type UpdateTicketTypePayload = Partial<CreateTicketTypePayload>;
