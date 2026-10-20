import db from "@db";
import { admissionAudits, checkIns, events, orders, tickets } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { emitEvent } from "../services/inventory.service";
import { HttpError } from "./errors";
import { verifyEventPermission } from "./permissions";

export async function changeAdmission(
  eventId: string,
  ticketId: string,
  userId: string,
  undo = false,
) {
  return db.transaction(async (tx) => {
    await tx
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, eventId))
      .for("update");
    if (!(await verifyEventPermission(eventId, userId, "scan_tickets", tx)))
      throw new HttpError(403, "Check-in permission is required.");
    const [record] = await tx
      .select({ ticket: tickets, payment: orders.paymentStatus })
      .from(tickets)
      .innerJoin(orders, eq(tickets.orderId, orders.id))
      .where(and(eq(tickets.id, ticketId), eq(tickets.eventId, eventId)));
    if (!record) throw new HttpError(404, "Ticket not found.");
    const expected = undo ? "used" : "active";
    if (
      record.ticket.status !== expected ||
      !["success", "partially_refunded"].includes(record.payment)
    )
      throw new HttpError(
        409,
        "Ticket is not eligible for this admission change.",
      );
    const [ticket] = await tx
      .update(tickets)
      .set({ status: undo ? "active" : "used", updatedAt: new Date() })
      .where(and(eq(tickets.id, ticketId), eq(tickets.status, expected)))
      .returning();
    if (!ticket)
      throw new HttpError(409, "Ticket admission has already changed.");
    if (undo) await tx.delete(checkIns).where(eq(checkIns.ticketId, ticketId));
    else
      await tx
        .insert(checkIns)
        .values({ ticketId, eventId, loggedByUserId: userId });
    await tx.insert(admissionAudits).values({
      eventId,
      ticketId,
      actorId: userId,
      action: undo ? "undo" : "checkin",
    });
    await emitEvent(tx, eventId, "checkin.changed");
    return {
      ticket,
      status: ticket.status,
      checkedInAt: undo ? null : new Date().toISOString(),
      message: undo ? "Check-in undone." : "Attendee checked in.",
    };
  });
}
