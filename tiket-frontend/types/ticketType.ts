export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  price: string;
  quantityLimit: number | null;
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
  name: string;
  description?: string;
  price?: number;
  quantityLimit?: number | null;
  saleStart?: string | null;
  saleEnd?: string | null;
  isRefundable?: boolean;
  refundableUntil?: string | null;
  isTransferable?: boolean;
  maxTransfers?: number;
}

export interface UpdateTicketTypePayload extends Partial<CreateTicketTypePayload> {}
