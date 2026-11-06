import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";
import {
  templateTypeEnum,
  workflowActionEnum,
  workflowTriggerEnum,
} from "./enums.schema";
import { users } from "./users.schema";
import { events } from "./events.schema";

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

