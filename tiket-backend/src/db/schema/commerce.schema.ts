import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { paymentStatusEnum, refundStatusEnum } from "./enums.schema";
import { users } from "./users.schema";
import { events } from "./events.schema";
import { tickets, ticketTypes } from "./tickets.schema";

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    code: varchar("code", { length: 64 }).notNull(),
    kind: varchar("kind", { enum: ["percent", "fixed", "access"] }).notNull(),
    value: integer("value").notNull().default(0),
    ticketTypeIds: jsonb("ticket_type_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    maxUses: integer("max_uses"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("coupon_event_code").on(table.eventId, table.code),
    check("coupon_value_nonnegative", sql`${table.value} >= 0`),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    paymentStatus: paymentStatusEnum("payment_status")
      .notNull()
      .default("pending"),
    paymentProvider: varchar("payment_provider", { length: 100 }), // razorpay, stripe, etc.
    paymentIntentId: varchar("payment_intent_id", { length: 255 }),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    totalPaise: integer("total_paise").notNull().default(0),
    reservationState: varchar("reservation_state", {
      enum: ["held", "confirmed", "released"],
    })
      .notNull()
      .default("held"),
    registrationStatus: varchar("registration_status", {
      enum: [
        "checkout",
        "confirmed",
        "pending_approval",
        "declined",
        "cancelled",
        "expired",
        "refund_pending",
      ],
    })
      .notNull()
      .default("checkout"),
    requireApproval: boolean("require_approval").notNull().default(false),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    couponId: uuid("coupon_id").references(() => coupons.id),
    linkedAccountId: varchar("linked_account_id", { length: 255 }),
    payoutReference: varchar("payout_reference", { length: 255 }),
    initializationState: varchar("initialization_state", {
      enum: ["new", "creating", "ready", "uncertain"],
    })
      .notNull()
      .default("new"),
    pricingPolicy: jsonb("pricing_policy")
      .$type<{
        version: string;
        ticketTaxBps: number;
        platformFeeBps: number;
        platformFeePaise: number;
        feeTaxBps: number;
      }>()
      .notNull(),
    lastReconciledAt: timestamp("last_reconciled_at", { withTimezone: true }),
    paymentId: varchar("payment_id", { length: 255 }).unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("order_buyer_idempotency").on(
      table.userId,
      table.idempotencyKey,
    ),
    uniqueIndex("order_gateway_id").on(table.paymentIntentId),
    index("order_expiry").on(table.reservationState, table.expiresAt),
    check("order_total_nonnegative", sql`${table.totalPaise} >= 0`),
    check(
      "order_reservation_state",
      sql`${table.reservationState} in ('held', 'confirmed', 'released')`,
    ),
    check(
      "order_registration_state",
      sql`${table.registrationStatus} in ('checkout', 'confirmed', 'pending_approval', 'declined', 'cancelled', 'expired', 'refund_pending')`,
    ),
  ],
);

// Snapshot UPDATE/DELETE guards are installed by drizzle/0000_baseline.sql and must be preserved in future migrations.
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    orderId: uuid("order_id")
      .references(() => orders.id)
      .notNull(),
    ticketId: uuid("ticket_id")
      .references(() => tickets.id)
      .unique()
      .notNull(),
    ticketTypeId: uuid("ticket_type_id")
      .references(() => ticketTypes.id)
      .notNull(),
    name: text("name").notNull(),
    unitPricePaise: integer("unit_price_paise").notNull(),
    discountPaise: integer("discount_paise").notNull().default(0),
    ticketTaxPaise: integer("ticket_tax_paise").notNull().default(0),
    platformFeePaise: integer("platform_fee_paise").notNull().default(0),
    feeTaxPaise: integer("fee_tax_paise").notNull().default(0),
    totalPaise: integer("total_paise").notNull(),
    passFeeToCustomer: boolean("pass_fee_to_customer").notNull().default(true),
    organizerNetPaise: integer("organizer_net_paise").notNull().default(0),
    policy: jsonb("policy")
      .$type<{
        isRefundable: boolean;
        refundableUntil: string | null;
        isTransferable: boolean;
        maxTransfers: number;
        passFeeToCustomer: boolean;
      }>()
      .notNull(),
  },
  (table) => [
    check(
      "order_item_amounts",
      sql`${table.unitPricePaise} >= 0 and ${table.discountPaise} >= 0 and ${table.discountPaise} <= ${table.unitPricePaise} and ${table.ticketTaxPaise} >= 0 and ${table.platformFeePaise} >= 0 and ${table.feeTaxPaise} >= 0 and (
        (${table.passFeeToCustomer} = true and ${table.totalPaise} = ${table.unitPricePaise} - ${table.discountPaise} + ${table.ticketTaxPaise} + ${table.platformFeePaise} + ${table.feeTaxPaise})
        or
        (${table.passFeeToCustomer} = false and ${table.totalPaise} = ${table.unitPricePaise} - ${table.discountPaise} + ${table.ticketTaxPaise})
      )`,
    ),
  ],
);

export const paymentAttempts = pgTable("payment_attempts", {
  id: varchar("id", { length: 255 }).primaryKey(),
  orderId: uuid("order_id")
    .references(() => orders.id)
    .notNull(),
  status: varchar("status", {
    enum: ["authorized", "captured", "failed"],
  }).notNull(),
  amountPaise: integer("amount_paise").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    orderId: uuid("order_id")
      .references(() => orders.id)
      .notNull(),
    requestedBy: uuid("requested_by").references(() => users.id),
    commandKey: varchar("command_key", { length: 128 }).notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    paymentId: varchar("payment_id", { length: 255 }).notNull(),
    providerRefundId: varchar("provider_refund_id", { length: 255 }).unique(),
    amountPaise: integer("amount_paise").notNull(),
    status: varchar("status", {
      enum: ["requested", "processing", "uncertain", "processed", "failed"],
    })
      .notNull()
      .default("requested"),
    reason: text("reason").notNull(),
    voidTicketIds: jsonb("void_ticket_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    error: text("error"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("refund_order_command").on(table.orderId, table.commandKey),
    check("refund_positive", sql`${table.amountPaise} > 0`),
  ],
);

export const refundRequests = pgTable("refund_requests", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  ticketId: uuid("ticket_id")
    .references(() => tickets.id, { onDelete: "cascade" })
    .notNull(),
  orderId: uuid("order_id")
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: refundStatusEnum("status").notNull().default("pending"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const webhookInbox = pgTable("webhook_inbox", {
  id: varchar("id", { length: 255 }).primaryKey(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  attempts: integer("attempts").notNull().default(0),
  error: text("error"),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const payoutRequests = pgTable("payout_requests", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  requestedBy: uuid("requested_by")
    .references(() => users.id)
    .notNull(),
  amountPaise: integer("amount_paise").notNull(),
  status: varchar("status", {
    enum: ["requested", "processing", "paid", "rejected"],
  })
    .notNull()
    .default("requested"),
  bankSnapshot: jsonb("bank_snapshot")
    .$type<{
      accountHolderName: string;
      maskedAccountNumber: string;
      ifscCode: string;
      bankName: string;
      upiId?: string | null;
    }>()
    .notNull(),
  referenceNumber: varchar("reference_number", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

