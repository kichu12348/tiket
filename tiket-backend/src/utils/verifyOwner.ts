import { eq } from "drizzle-orm";
import db from "@db";
import { events, documentTemplates } from "@db/schema";

export async function verifyEventOwner(
  eventId: string,
  userId: string,
): Promise<boolean> {
  const eventList = await db
    .select({ organizationId: events.organizationId })
    .from(events)
    .where(eq(events.id, eventId));

  const checkEvent = eventList[0];
  if (!checkEvent) return false;
  return checkEvent.organizationId === userId;
}

export async function verifyOwnerByTemplateId(
  templateId: string,
  userId: string,
): Promise<boolean> {
  const templateList = await db
    .select({ eventId: documentTemplates.eventId })
    .from(documentTemplates)
    .where(eq(documentTemplates.id, templateId));

  if (templateList.length === 0) return false;

  const templateRef = templateList[0];
  if (!templateRef) return false;

  const eventList = await db
    .select({ organizationId: events.organizationId })
    .from(events)
    .where(eq(events.id, templateRef.eventId));

  const eventRef = eventList[0];
  if (!eventRef) return false;
  return eventRef.organizationId === userId;
}
