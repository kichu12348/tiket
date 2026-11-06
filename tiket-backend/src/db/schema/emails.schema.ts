import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";
import {
  emailDeliveryStatusEnum,
  emailTemplateTypeEnum,
} from "./enums.schema";
import { users } from "./users.schema";
import { events } from "./events.schema";

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
  templateType: varchar("template_type", { length: 50 }).notNull().default("custom"),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  recipientName: varchar("recipient_name", { length: 255 }),
  subject: text("subject").notNull(),
  renderedBody: text("rendered_body"),
  status: emailDeliveryStatusEnum("status").notNull().default("sent"),
  errorMessage: text("error_message"),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  openCount: integer("open_count").notNull().default(0),
  resentCount: integer("resent_count").notNull().default(0),
  lastResentAt: timestamp("last_resent_at", { withTimezone: true }),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
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
      templateType?: string;
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

