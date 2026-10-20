import { emitEvent, lockEvent } from "../services/inventory.service";
import { createCheckout, checkoutStatus, commandKey } from "../services/checkout.service";
import { handleControllerError } from "../utils/errors";
import { verifyEventPermission } from "../utils/permissions";
import { changeAdmission } from "../utils/admission";
import type { FastifyRequest, FastifyReply } from "fastify";
import db from "@db";
import {
  orderItems,
  refunds,
  tickets,
  events,
  ticketTypes,
  users,
  orders,
  checkIns,
  ticketFormResponses,
  formFields,
  eventTeamMembers,
} from "@db/schema";
import { eq, and, like, or, sql, desc, count, inArray, isNotNull } from "drizzle-orm";
import { verifyEventOwner } from "@utils";


export const getAttendees = async (
  request: FastifyRequest<{
    Params: { eventId: string };
    Querystring: {
      search?: string;
      ticketTypeId?: string;
      status?: string;
      paymentStatus?: string;
      page?: string;
      limit?: string;
    };
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId } = request.params;

    const hasAccess = await verifyEventPermission(eventId, user.id, "view_guests");
    if (!hasAccess) {
      return reply
        .status(403)
        .send({ error: "You do not have permission to view event attendees." });
    }

    const {
      search,
      ticketTypeId,
      status,
      paymentStatus,
      page = "1",
      limit = "10",
    } = request.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    // Conditions
    const conditions = [eq(tickets.eventId, eventId)];
    if (!status) conditions.push(inArray(tickets.status, ["active", "used", "pending_approval"]));

    if (ticketTypeId) {
      conditions.push(eq(tickets.ticketTypeId, ticketTypeId));
    }
    if (status) {
      conditions.push(eq(tickets.status, status as typeof tickets.$inferSelect.status));
    }
    if (paymentStatus) {
      conditions.push(eq(orders.paymentStatus, paymentStatus as typeof orders.$inferSelect.paymentStatus));
    }

    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      conditions.push(
        or(
          like(users.name, searchPattern),
          like(users.email, searchPattern),
          like(tickets.qrCode, searchPattern),
        )!,
      );
    }

    const whereClause = and(...conditions);

    // Total count query
    const totalResult = await db
      .select({ count: count() })
      .from(tickets)
      .innerJoin(users, eq(tickets.userId, users.id))
      .innerJoin(orders, eq(tickets.orderId, orders.id))
      .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id)).leftJoin(orderItems, eq(orderItems.ticketId, tickets.id))
      .where(whereClause);

    const total = totalResult[0]?.count || 0;

    // Main records query
    const rows = await db
      .select({
        ticket: tickets,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        ticketType: {
          id: ticketTypes.id,
          name: sql<string>`coalesce(${orderItems.name}, ${ticketTypes.name})`,
          price: sql<string>`coalesce(${orderItems.unitPricePaise}::numeric / 100, ${ticketTypes.price})::numeric(10, 2)::text`,
        },
        order: {
          id: orders.id,
          totalAmount: orders.totalAmount,
          paymentStatus: orders.paymentStatus,
          createdAt: orders.createdAt,
        },
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.userId, users.id))
      .innerJoin(orders, eq(tickets.orderId, orders.id))
      .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id)).leftJoin(orderItems, eq(orderItems.ticketId, tickets.id))
      .where(whereClause)
      .orderBy(desc(tickets.createdAt))
      .limit(limitNum)
      .offset(offset);

    // Fetch check-in status for each ticket
    const ticketIds = rows.map((r) => r.ticket.id);
    let checkInMap: Record<string, string> = {};

    if (ticketIds.length > 0) {
      const checkInRows = await db
        .select({
          ticketId: checkIns.ticketId,
          checkedInAt: checkIns.checkedInAt,
        })
        .from(checkIns)
        .where(inArray(checkIns.ticketId, ticketIds))
        .orderBy(desc(checkIns.checkedInAt));

      for (const ci of checkInRows) {
        if (!checkInMap[ci.ticketId]) {
          checkInMap[ci.ticketId] = ci.checkedInAt.toISOString();
        }
      }
    }

    const canViewFinance = await verifyEventPermission(eventId, user.id, "view_payments");
    const attendees = rows.map((r) => ({
      id: r.ticket.id,
      qrCode: r.ticket.qrCode,
      status: r.ticket.status,
      createdAt: r.ticket.createdAt.toISOString(),
      user: r.user,
      ticketType: r.ticketType,
      order: {
        id: r.order.id,
        totalAmount: canViewFinance ? r.order.totalAmount : "0.00",
        paymentStatus: r.order.paymentStatus,
        createdAt: r.order.createdAt.toISOString(),
      },
      checkedInAt: checkInMap[r.ticket.id] || null,
    }));

    return reply.status(200).send({
      attendees,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const getAttendeeStats = async (
  request: FastifyRequest<{ Params: { eventId: string } }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId } = request.params;

    const hasAccess = await verifyEventPermission(eventId, user.id, "view_analytics");
    if (!hasAccess) {
      return reply
        .status(403)
        .send({ error: "You do not have permission to view event stats." });
    }

    // Total tickets count
    const totalAttendeesResult = await db
      .select({ count: count() })
      .from(tickets)
      .where(and(eq(tickets.eventId, eventId), inArray(tickets.status, ["active", "used", "pending_approval"])));

    const totalAttendees = totalAttendeesResult[0]?.count || 0;

    // Checked in count (status === 'used' or check_ins recorded)
    const checkedInResult = await db
      .select({ count: count() })
      .from(checkIns).innerJoin(tickets, eq(tickets.id, checkIns.ticketId))
      .where(and(eq(checkIns.eventId, eventId), eq(tickets.status, "used")));

    const checkedInCount = checkedInResult[0]?.count || 0;
    const pendingCount = Math.max(0, totalAttendees - checkedInCount);

    const [gross] = await db.select({ value: sql<string>`coalesce(sum(${orders.totalPaise}), 0)` }).from(orders).where(and(eq(orders.eventId, eventId), isNotNull(orders.paymentId)));
    const [returned] = await db.select({ value: sql<string>`coalesce(sum(${refunds.amountPaise}), 0)` }).from(refunds).innerJoin(orders, and(eq(refunds.orderId, orders.id), eq(refunds.paymentId, orders.paymentId))).where(and(eq(orders.eventId, eventId), eq(refunds.status, "processed")));
    const totalRevenue = await verifyEventPermission(eventId, user.id, "view_payments") ? (Number(gross?.value || 0) - Number(returned?.value || 0)) / 100 : 0;

    // Breakdown by ticket type
    const types = await db
      .select({
        ticketTypeId: ticketTypes.id,
        ticketTypeName: ticketTypes.name,
        price: ticketTypes.price,
      })
      .from(ticketTypes)
      .where(eq(ticketTypes.eventId, eventId));

    const breakdownByTicketType = await Promise.all(
      types.map(async (t) => {
        const ticketCountRes = await db
          .select({ count: count() })
          .from(tickets)
          .where(
            and(
              eq(tickets.eventId, eventId),
              eq(tickets.ticketTypeId, t.ticketTypeId),
            ),
          );

        const checkedInRes = await db
          .select({ count: count() })
          .from(checkIns)
          .innerJoin(tickets, eq(checkIns.ticketId, tickets.id))
          .where(
            and(
              eq(tickets.eventId, eventId),
              eq(tickets.ticketTypeId, t.ticketTypeId),
            ),
          );

        return {
          ticketTypeId: t.ticketTypeId,
          ticketTypeName: t.ticketTypeName,
          count: ticketCountRes[0]?.count || 0,
          checkedInCount: checkedInRes[0]?.count || 0,
          price: t.price,
        };
      }),
    );

    return reply.status(200).send({
      totalAttendees,
      checkedInCount,
      pendingCount,
      totalRevenue,
      breakdownByTicketType,
    });
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const getAttendeeById = async (
  request: FastifyRequest<{
    Params: { eventId: string; ticketId: string };
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId, ticketId } = request.params;

    const hasAccess = await verifyEventPermission(eventId, user.id, "view_guests");
    if (!hasAccess) {
      return reply
        .status(403)
        .send({ error: "You do not have permission to view this attendee." });
    }

    const rows = await db
      .select({
        ticket: tickets,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        ticketType: {
          id: ticketTypes.id,
          name: sql<string>`coalesce(${orderItems.name}, ${ticketTypes.name})`,
          price: sql<string>`coalesce(${orderItems.unitPricePaise}::numeric / 100, ${ticketTypes.price})::numeric(10, 2)::text`,
        },
        order: {
          id: orders.id,
          totalAmount: orders.totalAmount,
          paymentStatus: orders.paymentStatus,
          createdAt: orders.createdAt,
        },
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.userId, users.id))
      .innerJoin(orders, eq(tickets.orderId, orders.id))
      .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id)).leftJoin(orderItems, eq(orderItems.ticketId, tickets.id))
      .where(and(eq(tickets.id, ticketId), eq(tickets.eventId, eventId)));

    if (!rows || rows.length === 0 || !rows[0]) {
      return reply.status(404).send({ error: "Attendee ticket not found." });
    }

    const row = rows[0];

    // Fetch check-in history
    const checkInLogs = await db
      .select({
        id: checkIns.id,
        checkedInAt: checkIns.checkedInAt,
        loggedBy: {
          id: users.id,
          name: users.name,
        },
      })
      .from(checkIns)
      .leftJoin(users, eq(checkIns.loggedByUserId, users.id))
      .where(eq(checkIns.ticketId, ticketId))
      .orderBy(desc(checkIns.checkedInAt));

    const checkedInAt =
      checkInLogs.length > 0 ? checkInLogs[0]!.checkedInAt.toISOString() : null;

    const canViewFinance = await verifyEventPermission(eventId, user.id, "view_payments");
    const attendee = {
      id: row.ticket.id,
      qrCode: row.ticket.qrCode,
      status: row.ticket.status,
      createdAt: row.ticket.createdAt.toISOString(),
      user: row.user,
      ticketType: row.ticketType,
      order: {
        id: row.order.id,
        totalAmount: canViewFinance ? row.order.totalAmount : "0.00",
        paymentStatus: row.order.paymentStatus,
        createdAt: row.order.createdAt.toISOString(),
      },
      checkedInAt,
    };

    return reply.status(200).send({
      attendee,
      checkIns: checkInLogs.map((c) => ({
        id: c.id,
        checkedInAt: c.checkedInAt.toISOString(),
        loggedBy: c.loggedBy ? { id: c.loggedBy.id, name: c.loggedBy.name } : null,
      })),
    });
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const getAttendeeFormResponses = async (
  request: FastifyRequest<{
    Params: { eventId: string; ticketId: string };
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId, ticketId } = request.params;

    const hasAccess = await verifyEventPermission(eventId, user.id, "view_guests");
    if (!hasAccess) {
      return reply
        .status(403)
        .send({ error: "You do not have permission to view form responses." });
    }

    const [boundTicket] = await db.select({ id: tickets.id }).from(tickets).where(and(eq(tickets.id, ticketId), eq(tickets.eventId, eventId)));
    if (!boundTicket) return reply.status(404).send({ error: "Ticket not found." });
    const formResRows = await db
      .select({
        fieldId: formFields.id,
        label: formFields.label,
        fieldType: formFields.fieldType,
        value: ticketFormResponses.responseValue,
      })
      .from(ticketFormResponses)
      .innerJoin(formFields, eq(ticketFormResponses.fieldId, formFields.id))
      .where(eq(ticketFormResponses.ticketId, ticketId))
      .orderBy(formFields.sortOrder);

    return reply.status(200).send({
      responses: formResRows.map((r) => ({
        fieldId: r.fieldId,
        label: r.label,
        fieldType: r.fieldType,
        value: r.value || "",
      })),
    });
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const toggleCheckIn = async (
  request: FastifyRequest<{
    Body: { action: "checkin" | "undo" };
    Params: { eventId: string; ticketId: string };
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId, ticketId } = request.params;

    const hasAccess = await verifyEventPermission(eventId, user.id, "scan_tickets");
    if (!hasAccess) {
      return reply
        .status(403)
        .send({ error: "You do not have permission to check in attendees." });
    }

    const [ticket] = await db.select().from(tickets).where(and(eq(tickets.id, ticketId), eq(tickets.eventId, eventId)));
    return reply.send(await changeAdmission(eventId, ticketId, user.id, request.body.action === "undo"));
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const cancelTicket = async (
  request: FastifyRequest<{
    Params: { eventId: string; ticketId: string };
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId, ticketId } = request.params;

    const hasAccess = await verifyEventPermission(eventId, user.id, "manage_guests");
    if (!hasAccess) {
      return reply
        .status(403)
        .send({ error: "You do not have permission to cancel tickets." });
    }

    const ticketList = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), eq(tickets.eventId, eventId)));

    const ticket = ticketList[0];
    if (!ticket) {
      return reply.status(404).send({ error: "Ticket not found." });
    }

    await db.transaction(async tx => { await lockEvent(tx, eventId); await tx.update(tickets).set({ status: "cancelled", updatedAt: new Date() }).where(and(eq(tickets.id, ticketId), eq(tickets.eventId, eventId))); await emitEvent(tx, eventId, "registration.changed"); });

    return reply.status(200).send({
      message: "Ticket cancelled successfully.",
      status: "cancelled",
    });
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const manualRegister = async (request: FastifyRequest<{ Params: { eventId: string }; Body: { name: string; email: string; ticketTypeId: string } }>, reply: FastifyReply) => {
 try {
  await request.jwtVerify(); const actor = (request.user as { id: string }).id;
  if (!await verifyEventPermission(request.params.eventId, actor, "manage_guests")) return reply.status(403).send({ error: "Permission denied." });
  const email = request.body.email.trim().toLowerCase();
  await db.insert(users).values({ email, name: request.body.name, slug: crypto.randomUUID() }).onConflictDoNothing();
  const [user] = await db.select().from(users).where(eq(users.email, email));
  const order = await createCheckout({ eventId: request.params.eventId, purchases: [{ ticketTypeId: request.body.ticketTypeId }] }, user!.id, commandKey(request.headers["idempotency-key"]), true);
  return reply.status(201).send({ message: "Complimentary registration created.", ticket: (await checkoutStatus(order.id, user!.id)).tickets[0] });
 } catch (error) { return handleControllerError(request, reply, error); }
};

export const exportAttendees = async (
  request: FastifyRequest<{
    Params: { eventId: string };
    Querystring: { format?: "csv" | "json" };
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId } = request.params;
    const format = request.query.format || "csv";

    const hasAccess = await verifyEventPermission(eventId, user.id, "view_guests");
    if (!hasAccess) {
      return reply
        .status(403)
        .send({ error: "You do not have permission to export attendees." });
    }

    const rows = await db
      .select({
        ticketId: tickets.id,
        qrCode: tickets.qrCode,
        status: tickets.status,
        createdAt: tickets.createdAt,
        userName: users.name,
        userEmail: users.email,
        ticketTypeName: ticketTypes.name,
        ticketPrice: sql<string>`coalesce(${orderItems.unitPricePaise}::numeric / 100, ${ticketTypes.price})::numeric(10, 2)::text`,
        paymentStatus: orders.paymentStatus,
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.userId, users.id))
      .innerJoin(orders, eq(tickets.orderId, orders.id))
      .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id)).leftJoin(orderItems, eq(orderItems.ticketId, tickets.id))
      .where(eq(tickets.eventId, eventId))
      .orderBy(desc(tickets.createdAt));

    const filename = `attendees_${eventId.slice(0, 8)}_${Date.now()}.${format}`;

    if (format === "json") {
      return reply.status(200).send({
        data: JSON.stringify(rows, null, 2),
        format: "json",
        filename,
      });
    }

    // CSV format
    const headers = [
      "Ticket ID",
      "QR Code",
      "Attendee Name",
      "Attendee Email",
      "Ticket Type",
      "Price",
      "Ticket Status",
      "Payment Status",
      "Registration Date",
    ];

    const escapeCsv = (val: unknown) => {
      const str = String(val ?? "");
      return `"${str.replace(/"/g, '""')}"`;
    };

    const csvLines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.ticketId,
          r.qrCode,
          r.userName,
          r.userEmail,
          r.ticketTypeName,
          r.ticketPrice,
          r.status,
          r.paymentStatus,
          r.createdAt.toISOString(),
        ]
          .map(escapeCsv)
          .join(","),
      ),
    ];

    return reply.status(200).send({
      data: csvLines.join("\n"),
      format: "csv",
      filename,
    });
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};
