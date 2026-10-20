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
  pgEnum,
  uniqueIndex,
  index,
  check,
  bigserial,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

// ==========================================
// 🎯 ENUMS
// ==========================================

export const userTypeEnum = pgEnum("user_type", ["individual", "organization"]);

export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "published",
  "completed",
  "cancelled",
]);
export const locationTypeEnum = pgEnum("location_type", [
  "online",
  "offline",
  "hybrid",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "success",
  "failed",
  "refunded",
  "partially_refunded",
]);
export const ticketStatusEnum = pgEnum("ticket_status", [
  "pending",
  "pending_approval",
  "active",
  "used",
  "transferred",
  "refunded",
  "cancelled",
]);
export const transferStatusEnum = pgEnum("transfer_status", [
  "pending",
  "completed",
  "rejected",
]);
export const refundStatusEnum = pgEnum("refund_status", [
  "pending",
  "approved",
  "rejected",
  "processed",
]);
export const fieldTypeEnum = pgEnum("field_type", [
  "text",
  "long_text",
  "email",
  "phone",
  "number",
  "single_select",
  "multi_select",
  "radio",
  "checkbox",
  "date",
  "datetime",
  "time",
  "rating",
  "file",
  "url",
  "select",
]);
export const templateTypeEnum = pgEnum("template_type", [
  "ticket",
  "certificate",
]);
export const workflowTriggerEnum = pgEnum("workflow_trigger", [
  "ticket_purchased",
  "checked_in",
  "event_completed",
]);
export const workflowActionEnum = pgEnum("workflow_action", [
  "send_email",
  "generate_certificate",
]);
export const emailTemplateTypeEnum = pgEnum("email_template_type", [
  "invitation",
  "confirmation",
  "checkin",
  "thank_you",
  "sorry",
  "custom",
]);
export const emailDeliveryStatusEnum = pgEnum("email_delivery_status", [
  "sent",
  "failed",
  "queued",
]);

// ==========================================
// 🔐 AUTH SYSTEM
// ==========================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: text("password_hash"),
  googleId: varchar("google_id", { length: 255 }).unique(),
  type: userTypeEnum("type").notNull().default("individual"),
  description: text("description"),
  isVerified: boolean("is_verified").default(false),
  otpHash: text("otp_hash"),
  otpExpiresAt: timestamp("otp_expires_at"),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 🎉 EVENT CREATION & MANAGEMENT
// ==========================================

export const events = pgTable("events", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  description: text("description"),
  coverImage: text("cover_image"),
  color: varchar("color", { length: 7 }).default("#000000"),
  locationType: locationTypeEnum("location_type").notNull().default("offline"),
  locationDetails: jsonb("location_details"), // Maps link, address, or meeting URL
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  timezone: varchar("timezone", { length: 50 }).notNull().default("UTC"),
  registrationStart: timestamp("registration_start"),
  registrationEnd: timestamp("registration_end"),
  fontFamily: varchar("font_family", { length: 100 }).default(
    "'Inter', sans-serif",
  ),
  requireApproval: boolean("require_approval").notNull().default(false),
  capacity: integer("capacity"), // null means unlimited
  version: integer("version").notNull().default(0),
  status: eventStatusEnum("status").notNull().default("draft"),
  organizationId: uuid("organization_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 👥 TEAM & PERMISSIONS SYSTEM
// ==========================================

export const eventRoles = pgTable("event_roles", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 100 }).notNull(), // admin, volunteer, scanner, etc.
  permissions: jsonb("permissions").notNull().default("[]"), // array of permissions
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const eventTeamMembers = pgTable("event_team_members", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  roleId: uuid("role_id")
    .references(() => eventRoles.id, { onDelete: "restrict" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 🎟️ TICKET SYSTEM & POLICY
// ==========================================

export const ticketTypes = pgTable("ticket_types", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isHidden: boolean("is_hidden").notNull().default(false),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"), // 0 for free
  quantityLimit: integer("quantity_limit"), // null means unlimited
  saleStart: timestamp("sale_start"),
  saleEnd: timestamp("sale_end"),
  isRefundable: boolean("is_refundable").notNull().default(false),
  refundableUntil: timestamp("refundable_until"),
  isTransferable: boolean("is_transferable").notNull().default(false),
  maxTransfers: integer("max_transfers").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 💸 PAYMENT SYSTEM
// ==========================================

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
    check("order_reservation_state", sql`${table.reservationState} in ('held', 'confirmed', 'released')`),
    check("order_registration_state", sql`${table.registrationStatus} in ('checkout', 'confirmed', 'pending_approval', 'declined', 'cancelled', 'expired', 'refund_pending')`),
  ],
);

export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  orderId: uuid("order_id")
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  ticketTypeId: uuid("ticket_type_id")
    .references(() => ticketTypes.id, { onDelete: "restrict" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(), // Current owner
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  qrCode: varchar("qr_code", { length: 255 }).unique().notNull(), // Uniquely identifies validation
  status: ticketStatusEnum("status").notNull().default("active"),
  transferCount: integer("transfer_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 🔁 TICKET TRANSFER & REFUNDS
// ==========================================

export const ticketTransfers = pgTable("ticket_transfers", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  ticketId: uuid("ticket_id")
    .references(() => tickets.id, { onDelete: "cascade" })
    .notNull(),
  fromUserId: uuid("from_user_id")
    .references(() => users.id)
    .notNull(),
  toUserId: uuid("to_user_id")
    .references(() => users.id)
    .notNull(),
  status: transferStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

// ==========================================
// 🧾 FORM BUILDER SYSTEM
// ==========================================

export const formFields = pgTable("form_fields", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  fieldType: fieldTypeEnum("field_type").notNull(),
  isRequired: boolean("is_required").notNull().default(true),
  options: jsonb("options"), // Array of choices for select/radio
  sortOrder: integer("sort_order").notNull().default(0),
  page: integer("page").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ticketFormResponses = pgTable("ticket_form_responses", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  ticketId: uuid("ticket_id")
    .references(() => tickets.id, { onDelete: "cascade" })
    .notNull(),
  fieldId: uuid("field_id")
    .references(() => formFields.id, { onDelete: "cascade" })
    .notNull(),
  responseValue: text("response_value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 📄 DOCUMENT ENGINE (TICKETS & CERTIFICATES)
// ==========================================

export const documentTemplates = pgTable("document_templates", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  type: templateTypeEnum("type").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  backgroundImageUrl: text("background_image_url"),
  elementsJson: jsonb("elements_json").notNull().default("[]"), // Stores x, y, font, size, variable mappings
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const certificates = pgTable("certificates", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  templateId: uuid("template_id")
    .references(() => documentTemplates.id)
    .notNull(),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
});

// ==========================================
// 📍 CHECK-IN SYSTEM
// ==========================================

export const checkIns = pgTable("check_ins", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  ticketId: uuid("ticket_id")
    .references(() => tickets.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  loggedByUserId: uuid("logged_by_user_id").references(() => users.id), // The team member validating the scan
  checkedInAt: timestamp("checked_in_at").defaultNow().notNull(),
});

// ==========================================
// ⚙️ AUTOMATION / WORKFLOWS
// ==========================================

export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  triggerEvent: workflowTriggerEnum("trigger_event").notNull(),
  actionType: workflowActionEnum("action_type").notNull(),
  actionConfig: jsonb("action_config").notNull().default("{}"), // Template ID, custom text, etc.
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 📧 EMAIL ENGINE (TEMPLATES & LOGS)
// ==========================================

export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: emailTemplateTypeEnum("type").notNull().default("custom"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailLogs = pgTable("email_logs", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  templateId: uuid("template_id").references(() => emailTemplates.id, {
    onDelete: "set null",
  }),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  recipientName: varchar("recipient_name", { length: 255 }),
  subject: text("subject").notNull(),
  status: emailDeliveryStatusEnum("status").notNull().default("sent"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

// ==========================================
// 🔗 RELATIONS
// ==========================================

export const usersRelations = relations(users, ({ many }) => ({
  events: many(events),
  memberships: many(eventTeamMembers),
  orders: many(orders),
  tickets: many(tickets),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organization: one(users, {
    fields: [events.organizationId],
    references: [users.id],
  }),
  roles: many(eventRoles),
  teamMembers: many(eventTeamMembers),
  ticketTypes: many(ticketTypes),
  orders: many(orders),
  tickets: many(tickets),
  formFields: many(formFields),
  documentTemplates: many(documentTemplates),
  checkIns: many(checkIns),
  workflows: many(workflows),
  emailTemplates: many(emailTemplates),
  emailLogs: many(emailLogs),
}));

export const eventRolesRelations = relations(eventRoles, ({ one, many }) => ({
  event: one(events, { fields: [eventRoles.eventId], references: [events.id] }),
  members: many(eventTeamMembers),
}));

export const eventTeamMembersRelations = relations(
  eventTeamMembers,
  ({ one }) => ({
    event: one(events, {
      fields: [eventTeamMembers.eventId],
      references: [events.id],
    }),
    user: one(users, {
      fields: [eventTeamMembers.userId],
      references: [users.id],
    }),
    role: one(eventRoles, {
      fields: [eventTeamMembers.roleId],
      references: [eventRoles.id],
    }),
  }),
);

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  order: one(orders, { fields: [tickets.orderId], references: [orders.id] }),
  ticketType: one(ticketTypes, {
    fields: [tickets.ticketTypeId],
    references: [ticketTypes.id],
  }),
  user: one(users, { fields: [tickets.userId], references: [users.id] }),
  event: one(events, { fields: [tickets.eventId], references: [events.id] }),
  formResponses: many(ticketFormResponses),
  transfers: many(ticketTransfers),
  checkIns: many(checkIns),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  event: one(events, { fields: [orders.eventId], references: [events.id] }),
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  tickets: many(tickets),
}));

export const ticketTypesRelations = relations(ticketTypes, ({ one, many }) => ({
  event: one(events, {
    fields: [ticketTypes.eventId],
    references: [events.id],
  }),
  tickets: many(tickets),
}));

export const ticketTransfersRelations = relations(
  ticketTransfers,
  ({ one }) => ({
    ticket: one(tickets, {
      fields: [ticketTransfers.ticketId],
      references: [tickets.id],
    }),
    fromUser: one(users, {
      fields: [ticketTransfers.fromUserId],
      references: [users.id],
    }),
    toUser: one(users, {
      fields: [ticketTransfers.toUserId],
      references: [users.id],
    }),
  }),
);

export const refundRequestsRelations = relations(refundRequests, ({ one }) => ({
  ticket: one(tickets, {
    fields: [refundRequests.ticketId],
    references: [tickets.id],
  }),
  order: one(orders, {
    fields: [refundRequests.orderId],
    references: [orders.id],
  }),
  user: one(users, { fields: [refundRequests.userId], references: [users.id] }),
}));

export const formFieldsRelations = relations(formFields, ({ one, many }) => ({
  event: one(events, { fields: [formFields.eventId], references: [events.id] }),
  responses: many(ticketFormResponses),
}));

export const ticketFormResponsesRelations = relations(
  ticketFormResponses,
  ({ one }) => ({
    ticket: one(tickets, {
      fields: [ticketFormResponses.ticketId],
      references: [tickets.id],
    }),
    field: one(formFields, {
      fields: [ticketFormResponses.fieldId],
      references: [formFields.id],
    }),
  }),
);

export const documentTemplatesRelations = relations(
  documentTemplates,
  ({ one, many }) => ({
    event: one(events, {
      fields: [documentTemplates.eventId],
      references: [events.id],
    }),
    certificates: many(certificates),
  }),
);

export const certificatesRelations = relations(certificates, ({ one }) => ({
  event: one(events, {
    fields: [certificates.eventId],
    references: [events.id],
  }),
  user: one(users, { fields: [certificates.userId], references: [users.id] }),
  template: one(documentTemplates, {
    fields: [certificates.templateId],
    references: [documentTemplates.id],
  }),
}));

export const checkInsRelations = relations(checkIns, ({ one }) => ({
  event: one(events, { fields: [checkIns.eventId], references: [events.id] }),
  ticket: one(tickets, {
    fields: [checkIns.ticketId],
    references: [tickets.id],
  }),
  logger: one(users, {
    fields: [checkIns.loggedByUserId],
    references: [users.id],
  }),
}));

export const workflowsRelations = relations(workflows, ({ one }) => ({
  event: one(events, { fields: [workflows.eventId], references: [events.id] }),
}));

export const emailTemplatesRelations = relations(
  emailTemplates,
  ({ one, many }) => ({
    event: one(events, {
      fields: [emailTemplates.eventId],
      references: [events.id],
    }),
    logs: many(emailLogs),
  }),
);

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  event: one(events, {
    fields: [emailLogs.eventId],
    references: [events.id],
  }),
  template: one(emailTemplates, {
    fields: [emailLogs.templateId],
    references: [emailTemplates.id],
  }),
}));

// Snapshot UPDATE/DELETE guards are installed by drizzle/0000_baseline.sql and must be preserved in future migrations.
export const orderItems = pgTable("order_items", {
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
  policy: jsonb("policy")
    .$type<{
      isRefundable: boolean;
      refundableUntil: string | null;
      isTransferable: boolean;
      maxTransfers: number;
    }>()
    .notNull(),
}, table => [check("order_item_amounts", sql`${table.unitPricePaise} >= 0 and ${table.discountPaise} >= 0 and ${table.discountPaise} <= ${table.unitPricePaise} and ${table.ticketTaxPaise} >= 0 and ${table.platformFeePaise} >= 0 and ${table.feeTaxPaise} >= 0 and ${table.totalPaise} = ${table.unitPricePaise} - ${table.discountPaise} + ${table.ticketTaxPaise} + ${table.platformFeePaise} + ${table.feeTaxPaise}`)]);
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
export const domainEvents = pgTable(
  "domain_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    eventId: uuid("event_id")
      .references(() => events.id)
      .notNull(),
    version: integer("version").notNull(),
    type: varchar("type", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("domain_event_version").on(table.eventId, table.version),
  ],
);
export const connectionTickets = pgTable("connection_tickets", {
  hash: varchar("hash", { length: 64 }).primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  eventId: uuid("event_id")
    .references(() => events.id)
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
export const emailConnections = pgTable("email_connections", {
  userId: uuid("user_id")
    .references(() => users.id)
    .primaryKey(),
  encryptedConfig: text("encrypted_config").notNull(),
});
export const deliveryJobs = pgTable("delivery_jobs", {
  key: varchar("key", { length: 255 }).primaryKey(),
  eventId: uuid("event_id")
    .references(() => events.id)
    .notNull(),
  payload: jsonb("payload")
    .$type<{
      recipientEmail: string;
      recipientName?: string;
      subject: string;
      body: string;
      templateId?: string;
    }>()
    .notNull(),
  status: varchar("status", {
    enum: ["queued", "processing", "sent", "failed", "uncertain"],
  })
    .notNull()
    .default("queued"),
  error: text("error"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const uploads = pgTable("uploads", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  eventId: uuid("event_id")
    .references(() => events.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  fieldId: uuid("field_id")
    .references(() => formFields.id)
    .notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  contentType: varchar("content_type", { length: 120 }).notNull(),
  size: integer("size").notNull(),
  objectKey: text("object_key").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const admissionAudits = pgTable("admission_audits", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  eventId: uuid("event_id").references(() => events.id).notNull(),
  ticketId: uuid("ticket_id").references(() => tickets.id).notNull(),
  actorId: uuid("actor_id").references(() => users.id).notNull(),
  action: varchar("action", { enum: ["checkin", "undo"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
