import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";
import { users } from "./users.schema";
import { events } from "./events.schema";
import type {
  FieldConditionConfig,
  VisibilityConditionRule,
} from "../../utils/registration-validation";

export type FormFieldType =
  | "text"
  | "long_text"
  | "email"
  | "phone"
  | "number"
  | "single_select"
  | "multi_select"
  | "radio"
  | "checkbox"
  | "date"
  | "datetime"
  | "time"
  | "rating"
  | "file"
  | "url"
  | "select";

export interface FormFieldOptionsConfig {
  choices?: string[];
  min?: number | null;
  max?: number | null;
  conditions?: VisibilityConditionRule[] | FieldConditionConfig | null;
}

export type { VisibilityConditionRule } from "../../utils/registration-validation";

export interface FormFieldDefinition {
  id: string;
  eventId: string;
  name: string;
  label: string;
  fieldType: FormFieldType;
  isRequired: boolean;
  options: string[] | FormFieldOptionsConfig | null;
  conditions?: VisibilityConditionRule[] | FieldConditionConfig | null;
  sortOrder: number;
  page: number;
  createdAt: string | Date;
}

export interface TicketFormResponseItem {
  fieldId: string;
  responseValue: string;
}

// Backward-compatibility type & value placeholders for existing test suites
export const formFields = {} as unknown as {
  $inferSelect: FormFieldDefinition;
  $inferInsert: FormFieldDefinition;
};
export type formFields = typeof formFields;

export const ticketFormResponses = {} as unknown as {
  $inferSelect: TicketFormResponseItem & {
    id: string;
    ticketId: string;
    createdAt: string | Date;
  };
  $inferInsert: TicketFormResponseItem;
};
export type ticketFormResponses = typeof ticketFormResponses;

export const uploads = pgTable("uploads", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  eventId: uuid("event_id")
    .references(() => events.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  fieldId: uuid("field_id").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  contentType: varchar("content_type", { length: 120 }).notNull(),
  size: integer("size").notNull(),
  objectKey: text("object_key").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});
