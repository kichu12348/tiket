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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
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
]);
export const ticketStatusEnum = pgEnum("ticket_status", [
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

export const orders = pgTable("orders", {
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
