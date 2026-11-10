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
  index,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";
import type {
  ConditionGroup,
  VisibilityConditionRule,
} from "../../utils/registration-validation";
import { ticketStatusEnum, transferStatusEnum } from "./enums.schema";
import { users } from "./users.schema";
import { events } from "./events.schema";
import { orders } from "./commerce.schema";
import type { TicketFormResponseItem } from "./forms.schema";

export type {
  ConditionRule,
  ConditionGroup,
  FieldConditionConfig,
} from "../../utils/registration-validation";

export interface TicketLayoutLayer {
  id: string;
  type: "qr" | "text";
  name: string; // e.g. "QR Code", "Name", "{{ticket_code}}"
  tokenOrText: string; // e.g. "{{name}}", "{{ticket_code}}", "{{form.College}}"
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  fontSize: number; // e.g. 43
  maxLines: number; // e.g. 2
  lineSpacing: number; // e.g. 0
  fontColor: string; // e.g. "#000000"
  fontWeight?: string; // e.g. "600", "bold"
  fontFamily?: string; // e.g. "'Inter', sans-serif"
  fontStyle?: string; // e.g. "normal" | "italic"
  textDecoration?: string; // e.g. "none" | "underline"
  qrColor?: string; // e.g. "#000000"
  qrBgColor?: string; // e.g. "#ffffff"
}

export interface TicketLayoutConfig {
  canvasWidth: number;
  canvasHeight: number;
  layers: TicketLayoutLayer[];
}

export const ticketTypes = pgTable("ticket_types", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isHidden: boolean("is_hidden").notNull().default(false),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"), // 0 for free
  templateImageUrl: text("template_image_url"),
  templateConfig: jsonb("template_config").$type<TicketLayoutConfig | null>(),
  quantityLimit: integer("quantity_limit"), // null means unlimited
  poolName: varchar("pool_name", { length: 100 }),
  poolCapacity: integer("pool_capacity"),
  category: varchar("category", { length: 100 }),
  tags: jsonb("tags").$type<string[]>().default([]),
  enableWaitlist: boolean("enable_waitlist").notNull().default(false),
  multiDayCheckIn: boolean("multi_day_check_in").notNull().default(false),
  maxCheckInsPerDay: integer("max_check_ins_per_day").default(1),
  codePrefix: varchar("code_prefix", { length: 20 }).notNull().default(""),
  codeLength: integer("code_length").notNull().default(6),
  maxPerUser: integer("max_per_user"),
  isFixedDefault: boolean("is_fixed_default").notNull().default(false),
  collectGst: boolean("collect_gst").notNull().default(false),
  isClosed: boolean("is_closed").notNull().default(false),
  passFeeToCustomer: boolean("pass_fee_to_customer").notNull().default(true),
  conditions: jsonb("conditions").$type<VisibilityConditionRule[] | null>(),
  eligibilityRules: jsonb("eligibility_rules").$type<ConditionGroup | null>(),
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
  formResponses: jsonb("form_responses")
    .$type<TicketFormResponseItem[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

export const checkIns = pgTable(
  "check_ins",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    ticketId: uuid("ticket_id")
      .references(() => tickets.id, { onDelete: "cascade" })
      .notNull(),
    checkInDate: varchar("check_in_date", { length: 10 }).notNull(),
    loggedByUserId: uuid("logged_by_user_id").references(() => users.id), // The team member validating the scan
    checkedInAt: timestamp("checked_in_at").defaultNow().notNull(),
  },
  (table) => [
    index("checkin_ticket_date_idx").on(table.ticketId, table.checkInDate),
  ],
);

export const admissionAudits = pgTable("admission_audits", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  eventId: uuid("event_id")
    .references(() => events.id)
    .notNull(),
  ticketId: uuid("ticket_id")
    .references(() => tickets.id)
    .notNull(),
  actorId: uuid("actor_id")
    .references(() => users.id)
    .notNull(),
  action: varchar("action", { enum: ["checkin", "undo"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

