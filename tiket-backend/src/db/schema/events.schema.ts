import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  bigserial,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";
import { eventStatusEnum, locationTypeEnum } from "./enums.schema";
import { users } from "./users.schema";
import type { FormFieldDefinition } from "./forms.schema";

export interface EventSocialLinks {
  website?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
  youtube?: string | null;
  community?: string | null;
}

export interface CustomInsightWidget {
  id: string;
  title: string;
  fieldId: string;
  chartType: "bar" | "donut" | "stat" | "table";
  filterTicketTypeId?: string | null;
  filterStatus?: "all" | "checked_in" | "active";
}

export const events = pgTable("events", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  description: text("description"),
  coverImage: text("cover_image"),
  color: varchar("color", { length: 7 }).default("#000000"),
  locationType: locationTypeEnum("location_type").notNull().default("offline"),
  locationDetails: jsonb("location_details"), // Maps link, address, or meeting URL
  socialLinks: jsonb("social_links").$type<EventSocialLinks>(),
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
  maxTicketsPerUser: integer("max_tickets_per_user"),
  overbookingLimit: integer("overbooking_limit").notNull().default(0),
  platformFeeBps: integer("platform_fee_bps").notNull().default(400),
  version: integer("version").notNull().default(0),
  status: eventStatusEnum("status").notNull().default("draft"),
  customInsightsConfig: jsonb("custom_insights_config")
    .$type<CustomInsightWidget[]>()
    .default([]),
  formFields: jsonb("form_fields")
    .$type<FormFieldDefinition[]>()
    .notNull()
    .default([]),
  organizationId: uuid("organization_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

export const eventBlacklist = pgTable("event_blacklist", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  organizationId: uuid("organization_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
  targetUserId: uuid("target_user_id").references(() => users.id, {
    onDelete: "cascade",
  }),
  pattern: varchar("pattern", { length: 255 }),
  reason: text("reason"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

