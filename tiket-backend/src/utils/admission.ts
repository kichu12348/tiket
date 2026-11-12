import db from "@db";
import {
  admissionAudits,
  checkIns,
  events,
  orders,
  tickets,
  ticketTypes,
} from "@db/schema";
import { and, desc, eq } from "drizzle-orm";
import { emitEvent } from "../services/inventory.service";
import { enqueueCheckInEmail } from "../services/notifications.service";
import { publishEventChange } from "../services/realtime.service";
import { HttpError } from "./errors";
import { verifyEventPermission } from "./permissions";

export interface AdmissionOptions {
  dateOverride?: string;
  skipDebounce?: boolean;
}

export function evaluateCheckInRules(
  record: {
    payment: string;
    ticketStatus: string;
    multiDayCheckIn: boolean;
    maxCheckInsPerDay: number | null;
  },
  existingCheckIns: Array<{
    id: string;
    checkInDate: string;
    checkedInAt: Date | string;
  }>,
  checkInDate: string,
  options?: AdmissionOptions,
): { todayCheckIns: number; totalCheckIns: number } {
  if (!["success", "partially_refunded"].includes(record.payment)) {
    throw new HttpError(
      409,
      "Ticket is not eligible for this admission change.",
    );
  }

  if (!["active", "used"].includes(record.ticketStatus)) {
    throw new HttpError(
      409,
      "Ticket is not eligible for this admission change.",
    );
  }

  // Accidental Double-Scan Guard (unless skipDebounce is enabled)
  if (
    !options?.skipDebounce &&
    existingCheckIns.length > 0 &&
    Date.now() - new Date(existingCheckIns[0]!.checkedInAt).getTime() < 3000
  ) {
    throw new HttpError(409, "Ticket was just scanned moments ago.");
  }

  const isMultiDay = Boolean(record.multiDayCheckIn);
  const maxPerDay =
    record.maxCheckInsPerDay !== undefined ? record.maxCheckInsPerDay : 1;

  // Case A — Single-Use Ticket (multiDayCheckIn is false and maxCheckInsPerDay === 1)
  if (!isMultiDay && (maxPerDay === 1 || maxPerDay === null)) {
    if (existingCheckIns.length > 0) {
      throw new HttpError(409, "Ticket has already been checked in.");
    }
  }

  // Case B — Multi-Day or Multi-Entry Ticket
  if (isMultiDay || (maxPerDay !== null && maxPerDay > 1)) {
    // If not multiDayCheckIn, cannot be checked in on a different day
    if (
      !isMultiDay &&
      existingCheckIns.some((c) => c.checkInDate !== checkInDate)
    ) {
      throw new HttpError(409, "Ticket was already used on a previous day.");
    }

    const todayCheckIns = existingCheckIns.filter(
      (c) => c.checkInDate === checkInDate,
    ).length;
    if (maxPerDay !== null && todayCheckIns >= maxPerDay) {
      throw new HttpError(
        409,
        `Daily check-in limit (${maxPerDay}) reached for ${checkInDate}.`,
      );
    }
  }

  const todayCount = existingCheckIns.filter(
    (c) => c.checkInDate === checkInDate,
  ).length;
  return {
    todayCheckIns: todayCount,
    totalCheckIns: existingCheckIns.length,
  };
}

export async function changeAdmission(
  eventId: string,
  ticketId: string,
  userId: string,
  undo = false,
  options?: AdmissionOptions,
) {
  const result = await db.transaction(async (tx) => {
    const [eventRecord] = await tx
      .select({ id: events.id, timezone: events.timezone })
      .from(events)
      .where(eq(events.id, eventId))
      .for("update");

    if (!(await verifyEventPermission(eventId, userId, "scan_tickets", tx)))
      throw new HttpError(403, "Check-in permission is required.");

    const [record] = await tx
      .select({
        ticket: tickets,
        payment: orders.paymentStatus,
        multiDayCheckIn: ticketTypes.multiDayCheckIn,
        maxCheckInsPerDay: ticketTypes.maxCheckInsPerDay,
      })
      .from(tickets)
      .innerJoin(orders, eq(tickets.orderId, orders.id))
      .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
      .where(and(eq(tickets.id, ticketId), eq(tickets.eventId, eventId)));

    if (!record) throw new HttpError(404, "Ticket not found.");

    const existingCheckIns = await tx
      .select()
      .from(checkIns)
      .where(eq(checkIns.ticketId, ticketId))
      .orderBy(desc(checkIns.checkedInAt));

    const checkInDate =
      options?.dateOverride ??
      new Intl.DateTimeFormat("en-CA", {
        timeZone: eventRecord?.timezone || "UTC",
      }).format(new Date());

    if (!undo) {
      // Validate rules
      const { todayCheckIns, totalCheckIns } = evaluateCheckInRules(
        {
          payment: record.payment,
          ticketStatus: record.ticket.status,
          multiDayCheckIn: record.multiDayCheckIn,
          maxCheckInsPerDay: record.maxCheckInsPerDay,
        },
        existingCheckIns,
        checkInDate,
        options,
      );

      const [ticket] = await tx
        .update(tickets)
        .set({ status: "used", updatedAt: new Date() })
        .where(eq(tickets.id, ticketId))
        .returning();

      if (!ticket)
        throw new HttpError(409, "Ticket admission has already changed.");

      const [insertedCheckIn] = await tx
        .insert(checkIns)
        .values({
          ticketId,
          eventId,
          loggedByUserId: userId,
          checkInDate,
        })
        .returning();

      if (!insertedCheckIn)
        throw new HttpError(500, "Failed to record check-in.");

      if (existingCheckIns.length === 0) {
        await enqueueCheckInEmail(tx, eventId, ticketId);
      }

      await tx.insert(admissionAudits).values({
        eventId,
        ticketId,
        actorId: userId,
        action: "checkin",
      });

      const version = await emitEvent(tx, eventId, "checkin.changed");

      const todayCount = todayCheckIns + 1;
      const totalCount = totalCheckIns + 1;
      return {
        ticket,
        checkIn: insertedCheckIn,
        status: ticket.status,
        checkInDate,
        todayCheckInCount: todayCount,
        totalCheckIns: totalCount,
        checkedInAt: insertedCheckIn.checkedInAt.toISOString(),
        message: `Attendee checked in (#${todayCount} today, ${totalCount} total).`,
        _version: version,
      };
    } else {
      // Undo
      if (existingCheckIns.length === 0) {
        throw new HttpError(409, "Ticket is not checked in.");
      }

      const mostRecent = existingCheckIns[0]!;
      await tx.delete(checkIns).where(eq(checkIns.id, mostRecent.id));

      const remainingTotal = existingCheckIns.length - 1;
      const newStatus = remainingTotal === 0 ? "active" : "used";

      const [ticket] = await tx
        .update(tickets)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(tickets.id, ticketId))
        .returning();

      if (!ticket)
        throw new HttpError(409, "Ticket admission has already changed.");

      await tx.insert(admissionAudits).values({
        eventId,
        ticketId,
        actorId: userId,
        action: "undo",
      });

      const version = await emitEvent(tx, eventId, "checkin.changed");

      const remainingToday = existingCheckIns
        .slice(1)
        .filter((c) => c.checkInDate === mostRecent.checkInDate).length;

      return {
        ticket,
        status: ticket.status,
        checkInDate: mostRecent.checkInDate,
        todayCheckInCount: remainingToday,
        totalCheckIns: remainingTotal,
        checkedInAt:
          remainingTotal > 0
            ? existingCheckIns[1]?.checkedInAt.toISOString()
            : null,
        message: "Check-in undone.",
        _version: version,
      };
    }
  });

  if (result._version !== undefined) {
    void publishEventChange(eventId, result._version);
  }
  const { _version, ...cleanResult } = result;
  void _version;
  return cleanResult;
}
