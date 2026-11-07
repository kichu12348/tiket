import { relations } from "drizzle-orm";
import { users, organizerBankAccounts } from "./users.schema";
import { events, eventRoles, eventTeamMembers, eventBlacklist } from "./events.schema";
import { ticketTypes, tickets, ticketTransfers, checkIns } from "./tickets.schema";
import { orders, refundRequests, payoutRequests } from "./commerce.schema";
import { emailTemplates, emailLogs } from "./emails.schema";
import { documentTemplates, certificates, workflows } from "./documents.schema";
import { forms } from "./forms.schema";

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
  documentTemplates: many(documentTemplates),
  checkIns: many(checkIns),
  workflows: many(workflows),
  form: one(forms),
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

export const eventBlacklistRelations = relations(eventBlacklist, ({ one }) => ({
  organization: one(users, {
    fields: [eventBlacklist.organizationId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [eventBlacklist.eventId],
    references: [events.id],
  }),
  targetUser: one(users, {
    fields: [eventBlacklist.targetUserId],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [eventBlacklist.createdBy],
    references: [users.id],
  }),
}));

export const organizerBankAccountsRelations = relations(
  organizerBankAccounts,
  ({ one }) => ({
    user: one(users, {
      fields: [organizerBankAccounts.userId],
      references: [users.id],
    }),
  }),
);

export const payoutRequestsRelations = relations(payoutRequests, ({ one }) => ({
  event: one(events, {
    fields: [payoutRequests.eventId],
    references: [events.id],
  }),
  requester: one(users, {
    fields: [payoutRequests.requestedBy],
    references: [users.id],
  }),
}));

export const formsRelations = relations(forms, ({ one }) => ({
  event: one(events, {
    fields: [forms.eventId],
    references: [events.id],
  }),
}));

