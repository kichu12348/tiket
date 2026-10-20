import type { TicketType } from "./ticketType";
import type { Order } from "./order";
export interface Availability { version: number; remaining: number | null; serverTime: string; tiers: (TicketType & { remaining: number | null })[] }
export interface PriceLine { ticketTypeId: string; unitPricePaise: number; discountPaise: number; ticketTaxPaise: number; platformFeePaise: number; feeTaxPaise: number; totalPaise: number }
export interface Quote { totalPaise: number; currency: string; lines: PriceLine[]; policy: { version: string } }
export interface Refund { id: string; orderId: string; amountPaise: number; status: string; reason: string; error: string | null }
export interface Finance { capturedPaise: number; orders: { order: Order; attendee: { name: string; email: string } }[]; refunds: Refund[]; items: (PriceLine & { id: string; orderId: string; name: string; ticketId: string })[] }
export interface Coupon { code: string; kind: "percent" | "fixed" | "access"; value: number; ticketTypeIds: string[]; maxUses: number | null; startsAt?: string | null; endsAt?: string | null; isActive: boolean }
export type MailConfig = { provider: "brevo"; apiKey: string; fromEmail: string; fromName?: string } | { provider: "smtp"; host: string; port: number; secure: boolean; username: string; password: string; fromEmail: string; fromName?: string };
