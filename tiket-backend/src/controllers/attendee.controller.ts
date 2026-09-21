import type { FastifyRequest, FastifyReply } from "fastify";
import db from "@db";
import {
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
import { eq, and, like, or, sql, desc, count, inArray } from "drizzle-orm";
import { verifyEventOwner } from "@utils";

async function verifyAccess(eventId: string, userId: string): Promise<boolean> {
  const isOwner = await verifyEventOwner(eventId, userId);
  if (isOwner) return true;

  const teamCheck = await db
    .select({ id: eventTeamMembers.id })
    .from(eventTeamMembers)
    .where(
      and(
        eq(eventTeamMembers.eventId, eventId),
        eq(eventTeamMembers.userId, userId),
      ),
    );

  return teamCheck.length > 0;
}

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

    const hasAccess = await verifyAccess(eventId, user.id);
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

    if (ticketTypeId) {
      conditions.push(eq(tickets.ticketTypeId, ticketTypeId));
    }
    if (status) {
      conditions.push(eq(tickets.status, status as any));
    }
    if (paymentStatus) {
      conditions.push(eq(orders.paymentStatus, paymentStatus as any));
    }

    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      conditions.push(
        or(
          like(users.name, searchPattern),
          like(users.email, searchPattern),
          like(tickets.qrCode, searchPattern),
        ) as any,
      );
    }

    const whereClause = and(...conditions);

    // Total count query
    const totalResult = await db
      .select({ count: count() })
      .from(tickets)
      .innerJoin(users, eq(tickets.userId, users.id))
      .innerJoin(orders, eq(tickets.orderId, orders.id))
      .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
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
          name: ticketTypes.name,
          price: ticketTypes.price,
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
      .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
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

    const attendees = rows.map((r) => ({
      id: r.ticket.id,
      qrCode: r.ticket.qrCode,
      status: r.ticket.status,
      createdAt: r.ticket.createdAt.toISOString(),
      user: r.user,
      ticketType: r.ticketType,
      order: {
        id: r.order.id,
        totalAmount: r.order.totalAmount,
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
    if ((error as Error).message?.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch attendees." });
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

    const hasAccess = await verifyAccess(eventId, user.id);
    if (!hasAccess) {
      return reply
        .status(403)
        .send({ error: "You do not have permission to view event stats." });
    }

    // Total tickets count
    const totalAttendeesResult = await db
      .select({ count: count() })
      .from(tickets)
      .where(eq(tickets.eventId, eventId));

    const totalAttendees = totalAttendeesResult[0]?.count || 0;

    // Checked in count (status === 'used' or check_ins recorded)
    const checkedInResult = await db
      .select({ count: count() })
      .from(checkIns)
      .where(eq(checkIns.eventId, eventId));

    const checkedInCount = checkedInResult[0]?.count || 0;
    const pendingCount = Math.max(0, totalAttendees - checkedInCount);

    // Total revenue from successful orders
    const revenueResult = await db
      .select({
        totalRevenue: sql<string>`coalesce(sum(cast(${orders.totalAmount} as numeric)), 0)`,
      })
      .from(orders)
      .where(
        and(eq(orders.eventId, eventId), eq(orders.paymentStatus, "success")),
      );

    const totalRevenue = parseFloat(revenueResult[0]?.totalRevenue || "0");

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
    if ((error as Error).message?.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch attendee stats." });
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

    const hasAccess = await verifyAccess(eventId, user.id);
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
          name: ticketTypes.name,
          price: ticketTypes.price,
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
      .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
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

    const attendee = {
      id: row.ticket.id,
      qrCode: row.ticket.qrCode,
      status: row.ticket.status,
      createdAt: row.ticket.createdAt.toISOString(),
      user: row.user,
      ticketType: row.ticketType,
      order: {
        id: row.order.id,
        totalAmount: row.order.totalAmount,
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
    if ((error as Error).message?.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch attendee detail." });
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

    const hasAccess = await verifyAccess(eventId, user.id);
    if (!hasAccess) {
      return reply
        .status(403)
        .send({ error: "You do not have permission to view form responses." });
    }

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
    if ((error as Error).message?.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch form responses." });
  }
};

export const toggleCheckIn = async (
  request: FastifyRequest<{
    Params: { eventId: string; ticketId: string };
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId, ticketId } = request.params;

    const hasAccess = await verifyAccess(eventId, user.id);
    if (!hasAccess) {
      return reply
        .status(403)
        .send({ error: "You do not have permission to check in attendees." });
    }

    const ticketList = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), eq(tickets.eventId, eventId)));

    const ticket = ticketList[0];
    if (!ticket) {
      return reply.status(404).send({ error: "Ticket not found." });
    }

    if (ticket.status === "cancelled" || ticket.status === "refunded") {
      return reply
        .status(400)
        .send({ error: `Cannot check in ticket with status: ${ticket.status}` });
    }

    // Toggle logic
    if (ticket.status === "used") {
      // Undo check in: revert status to active & remove checkIn record
      await db
        .update(tickets)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(tickets.id, ticketId));

      await db.delete(checkIns).where(eq(checkIns.ticketId, ticketId));

      return reply.status(200).send({
        message: "Check-in undone. Ticket reverted to active.",
        status: "active",
        checkedInAt: null,
      });
    } else {
      // Perform check in: insert checkIn record & mark ticket as used
      const checkedInAt = new Date();

      await db.insert(checkIns).values({
        eventId,
        ticketId,
        loggedByUserId: user.id,
        checkedInAt,
      });

      await db
        .update(tickets)
        .set({ status: "used", updatedAt: checkedInAt })
        .where(eq(tickets.id, ticketId));

      return reply.status(200).send({
        message: "Attendee checked in successfully.",
        status: "used",
        checkedInAt: checkedInAt.toISOString(),
      });
    }
  } catch (error) {
    if ((error as Error).message?.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Failed to toggle check-in status." });
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

    const hasAccess = await verifyAccess(eventId, user.id);
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

    await db
      .update(tickets)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(tickets.id, ticketId));

    return reply.status(200).send({
      message: "Ticket cancelled successfully.",
      status: "cancelled",
    });
  } catch (error) {
    if ((error as Error).message?.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Failed to cancel ticket." });
  }
};

export const manualRegister = async (
  request: FastifyRequest<{
    Params: { eventId: string };
    Body: {
      name: string;
      email: string;
      ticketTypeId: string;
      notes?: string;
    };
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId } = request.params;

    const hasAccess = await verifyAccess(eventId, user.id);
    if (!hasAccess) {
      return reply
        .status(403)
        .send({ error: "You do not have permission to manually register attendees." });
    }

    const { name, email, ticketTypeId } = request.body;

    // Verify ticket type exists and belongs to event
    const ticketTypeRows = await db
      .select()
      .from(ticketTypes)
      .where(and(eq(ticketTypes.id, ticketTypeId), eq(ticketTypes.eventId, eventId)));

    const targetType = ticketTypeRows[0];
    if (!targetType) {
      return reply.status(404).send({ error: "Specified ticket type not found." });
    }

    // Find or create user by email
    let targetUser: { id: string; name: string; email: string };
    const existingUsers = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

    if (existingUsers.length > 0 && existingUsers[0]) {
      targetUser = {
        id: existingUsers[0].id,
        name: existingUsers[0].name,
        email: existingUsers[0].email,
      };
    } else {
      const slug = `${email.split("@")[0]}-${Date.now().toString(36)}`;
      const newUsers = await db
        .insert(users)
        .values({
          name,
          email: email.toLowerCase(),
          slug,
          type: "individual",
          isVerified: true,
        })
        .returning();
      const createdUser = newUsers[0];
      if (!createdUser) {
        return reply.status(500).send({ error: "Failed to create attendee account." });
      }
      targetUser = {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
      };
    }

    // Create order (marked as success / zero or manual payment)
    const newOrders = await db
      .insert(orders)
      .values({
        eventId,
        userId: targetUser.id,
        totalAmount: targetType.price,
        paymentStatus: "success",
        paymentProvider: "manual",
        paymentIntentId: `manual_${Date.now()}`,
      })
      .returning();

    const createdOrder = newOrders[0];
    if (!createdOrder) {
      return reply.status(500).send({ error: "Failed to create order record." });
    }

    // Generate unique QR code
    const qrCode = `TK-${eventId.slice(0, 4)}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase();

    // Create ticket
    const newTickets = await db
      .insert(tickets)
      .values({
        eventId,
        orderId: createdOrder.id,
        ticketTypeId,
        userId: targetUser.id,
        qrCode,
        status: "active",
      })
      .returning();

    const createdTicket = newTickets[0];
    if (!createdTicket) {
      return reply.status(500).send({ error: "Failed to issue ticket." });
    }

    return reply.status(201).send({
      message: "Attendee manually registered and ticket issued successfully.",
      ticket: {
        id: createdTicket.id,
        qrCode: createdTicket.qrCode,
        status: createdTicket.status,
        createdAt: createdTicket.createdAt.toISOString(),
        user: targetUser,
        ticketType: {
          id: targetType.id,
          name: targetType.name,
          price: targetType.price,
        },
        order: {
          id: createdOrder.id,
          totalAmount: createdOrder.totalAmount,
          paymentStatus: createdOrder.paymentStatus,
          createdAt: createdOrder.createdAt.toISOString(),
        },
        checkedInAt: null,
      },
    });
  } catch (error) {
    if ((error as Error).message?.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Failed to manually register attendee." });
  }
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

    const hasAccess = await verifyAccess(eventId, user.id);
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
        ticketPrice: ticketTypes.price,
        paymentStatus: orders.paymentStatus,
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.userId, users.id))
      .innerJoin(orders, eq(tickets.orderId, orders.id))
      .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
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

    const escapeCsv = (val: any) => {
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
    if ((error as Error).message?.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Failed to export attendees." });
  }
};
