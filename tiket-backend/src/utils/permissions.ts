import db from "@db";
import { events, eventRoles, eventTeamMembers } from "@db/schema";
import type { Database } from "../db/types";
import { and, eq } from "drizzle-orm";

export type EventPermission =
  | "manage_tickets"
  | "manage_forms"
  | "view_guests"
  | "manage_guests"
  | "scan_tickets"
  | "manage_settings"
  | "view_analytics"
  | "manage_team"
  | "view_payments"
  | "manage_refunds"
  | "manage_emails";

export async function verifyEventPermission(
  eventId: string,
  userId: string,
  permission: EventPermission,
  client: Database = db,
): Promise<boolean> {
  const [event] = await client
    .select({ owner: events.organizationId })
    .from(events)
    .where(eq(events.id, eventId));
  if (event?.owner === userId) return true;
  const [member] = await client
    .select({ permissions: eventRoles.permissions })
    .from(eventTeamMembers)
    .innerJoin(
      eventRoles,
      and(
        eq(eventTeamMembers.roleId, eventRoles.id),
        eq(eventRoles.eventId, eventId),
      ),
    )
    .where(
      and(
        eq(eventTeamMembers.eventId, eventId),
        eq(eventTeamMembers.userId, userId),
      ),
    );
  return (
    Array.isArray(member?.permissions) &&
    member.permissions.includes(permission)
  );
}
