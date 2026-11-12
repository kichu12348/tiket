import { pgEnum } from "drizzle-orm/pg-core";

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
  "date",
  "datetime",
  "time",
  "rating",
  "url",
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

