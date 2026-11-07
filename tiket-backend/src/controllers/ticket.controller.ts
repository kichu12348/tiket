import { verifyEventPermission } from "../utils/permissions";
import { fromPaise } from "../utils/money";
import { handleControllerError } from "../utils/errors";
import type { FastifyRequest, FastifyReply } from "fastify";
import db from "@db";
import {
  orderItems,
  tickets,
  events,
  ticketTypes,
  users,
  orders,
  documentTemplates,
  ticketTransfers,
  forms,
} from "@db/schema";
import { eq, and, desc, ne } from "drizzle-orm";
import { emitEvent, lockEvent } from "../services/inventory.service";
import { queueRefund } from "../services/refund.service";

export const getTicketPass = async (
  request: FastifyRequest<{ Params: { ticketId: string } }>,
  reply: FastifyReply,
) => {
  try {
    // 1. Authenticate user via JWT
    await request.jwtVerify();
    const user = request.user as { id: string; email: string };
    const { ticketId } = request.params;

    // 2. Fetch ticket details along with event, ticket type, attendee, and order info
    const result = await db
      .select({
        ticket: tickets,
        event: events,
        ticketType: ticketTypes,
        attendee: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        order: {
          id: orders.id,
          totalAmount: orders.totalAmount,
          paymentStatus: orders.paymentStatus,
          createdAt: orders.createdAt,
        },
      })
      .from(tickets)
      .innerJoin(events, eq(tickets.eventId, events.id))
      .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
      .innerJoin(users, eq(tickets.userId, users.id))
      .innerJoin(orders, eq(tickets.orderId, orders.id))
      .where(eq(tickets.id, ticketId));

    if (!result || result.length === 0 || !result[0]) {
      return reply.status(404).send({ error: "Ticket not found." });
    }

    const row = result[0];

    // 3. Authorization Guard:
    // User must be the ticket owner (attendee), event organizer, or an event team member.
    const isTicketOwner = row.ticket.userId === user.id;
    const isEventOrganizer = row.event.organizationId === user.id;

    const isTeamMember = await verifyEventPermission(
      row.event.id,
      user.id,
      "view_guests",
    );
    const [item] = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.ticketId, ticketId));

    if (!isTicketOwner && !isEventOrganizer && !isTeamMember) {
      return reply
        .status(403)
        .send({ error: "You do not have permission to view this ticket." });
    }

    // 4. Fetch optional registration form responses
    const [formRow] = await db
      .select({ fields: forms.fields })
      .from(forms)
      .where(eq(forms.eventId, row.event.id));

    const formFieldsMap = new Map(
      (formRow?.fields || []).map((f) => [f.id, f.label]),
    );
    const responses = (row.ticket.formResponses || [])
      .filter((r) => formFieldsMap.has(r.fieldId))
      .map((r) => ({
        label: formFieldsMap.get(r.fieldId) || "",
        value: r.responseValue,
      }));

    // 5. Fetch active ticket template (if configured for this event)
    const [template] = await db
      .select({
        id: documentTemplates.id,
        name: documentTemplates.name,
        backgroundImageUrl: documentTemplates.backgroundImageUrl,
        elementsJson: documentTemplates.elementsJson,
      })
      .from(documentTemplates)
      .where(
        and(
          eq(documentTemplates.eventId, row.event.id),
          eq(documentTemplates.type, "ticket"),
        ),
      )
      .orderBy(desc(documentTemplates.updatedAt))
      .limit(1);

    const responsePayload = {
      id: row.ticket.id,
      qrCode: row.ticket.qrCode,
      status: row.ticket.status,
      createdAt: row.ticket.createdAt.toISOString(),
      event: {
        id: row.event.id,
        title: row.event.title,
        slug: row.event.slug,
        startDate: row.event.startDate.toISOString(),
        endDate: row.event.endDate ? row.event.endDate.toISOString() : null,
        locationType: row.event.locationType,
        locationDetails: row.event.locationDetails,
        timezone: row.event.timezone,
        coverImage: row.event.coverImage,
      },
      ticketType: {
        id: row.ticketType.id,
        name: item?.name ?? row.ticketType.name,
        price: item ? fromPaise(item.unitPricePaise) : row.ticketType.price,
        description: row.ticketType.description,
        isTransferable:
          item?.policy.isTransferable ?? row.ticketType.isTransferable,
        isRefundable: item?.policy.isRefundable ?? row.ticketType.isRefundable,
        templateImageUrl: row.ticketType.templateImageUrl ?? null,
        templateConfig: row.ticketType.templateConfig ?? null,
      },
      attendee: {
        id: row.attendee.id,
        name: row.attendee.name,
        email: row.attendee.email,
      },
      order: {
        id: row.order.id,
        totalAmount: row.order.totalAmount,
        paymentStatus: row.order.paymentStatus,
        createdAt: row.order.createdAt.toISOString(),
      },
      responses: responses.map((r) => ({
        label: r.label,
        value: r.value,
      })),
      template: template
        ? {
            id: template.id,
            name: template.name,
            backgroundImageUrl: template.backgroundImageUrl,
            elementsJson: template.elementsJson,
          }
        : null,
    };

    return reply.status(200).send(responsePayload);
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const getMyTickets = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };

    // 1. Fetch tickets owned by user joined with events and ticketTypes
    const userTickets = await db
      .select({
        ticket: tickets,
        event: {
          id: events.id,
          title: events.title,
          slug: events.slug,
          startDate: events.startDate,
          endDate: events.endDate,
          locationType: events.locationType,
          coverImage: events.coverImage,
        },
        ticketType: {
          id: ticketTypes.id,
          name: ticketTypes.name,
          price: ticketTypes.price,
        },
      })
      .from(tickets)
      .innerJoin(events, eq(tickets.eventId, events.id))
      .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
      .where(eq(tickets.userId, user.id))
      .orderBy(desc(tickets.createdAt));

    // 2. Fetch incoming pending transfers where toUserId === user.id
    const incomingTransfers = await db
      .select({
        id: ticketTransfers.id,
        ticketId: ticketTransfers.ticketId,
        status: ticketTransfers.status,
        createdAt: ticketTransfers.createdAt,
        ticket: {
          id: tickets.id,
          status: tickets.status,
        },
        event: {
          id: events.id,
          title: events.title,
          slug: events.slug,
        },
        sender: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(ticketTransfers)
      .innerJoin(tickets, eq(ticketTransfers.ticketId, tickets.id))
      .innerJoin(events, eq(tickets.eventId, events.id))
      .innerJoin(users, eq(ticketTransfers.fromUserId, users.id))
      .where(
        and(
          eq(ticketTransfers.toUserId, user.id),
          eq(ticketTransfers.status, "pending"),
        ),
      )
      .orderBy(desc(ticketTransfers.createdAt));

    // 3. Fetch outgoing pending transfers where fromUserId === user.id
    const outgoingTransfers = await db
      .select({
        id: ticketTransfers.id,
        ticketId: ticketTransfers.ticketId,
        toUserId: ticketTransfers.toUserId,
        status: ticketTransfers.status,
        createdAt: ticketTransfers.createdAt,
        recipient: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(ticketTransfers)
      .innerJoin(users, eq(ticketTransfers.toUserId, users.id))
      .where(
        and(
          eq(ticketTransfers.fromUserId, user.id),
          eq(ticketTransfers.status, "pending"),
        ),
      )
      .orderBy(desc(ticketTransfers.createdAt));

    return reply.send({
      tickets: userTickets.map((t) => ({
        id: t.ticket.id,
        qrCode: t.ticket.qrCode,
        status: t.ticket.status,
        createdAt: t.ticket.createdAt.toISOString(),
        event: {
          id: t.event.id,
          title: t.event.title,
          slug: t.event.slug,
          startDate: t.event.startDate.toISOString(),
          endDate: t.event.endDate ? t.event.endDate.toISOString() : null,
          locationType: t.event.locationType,
          coverImage: t.event.coverImage,
        },
        ticketType: {
          id: t.ticketType.id,
          name: t.ticketType.name,
          price: t.ticketType.price,
        },
      })),
      incomingTransfers: incomingTransfers.map((it) => ({
        id: it.id,
        ticketId: it.ticketId,
        status: it.status,
        createdAt: it.createdAt.toISOString(),
        ticket: {
          id: it.ticket.id,
          status: it.ticket.status,
        },
        event: {
          id: it.event.id,
          title: it.event.title,
          slug: it.event.slug,
        },
        sender: {
          id: it.sender.id,
          name: it.sender.name,
          email: it.sender.email,
        },
      })),
      outgoingTransfers: outgoingTransfers.map((ot) => ({
        id: ot.id,
        ticketId: ot.ticketId,
        toUserId: ot.toUserId,
        status: ot.status,
        createdAt: ot.createdAt.toISOString(),
        recipient: {
          id: ot.recipient.id,
          name: ot.recipient.name,
          email: ot.recipient.email,
        },
      })),
    });
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const cancelTicket = async (
  request: FastifyRequest<{ Params: { ticketId: string } }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { ticketId } = request.params;

    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId));

    if (!ticket) {
      return reply.status(404).send({ error: "Ticket not found." });
    }

    if (ticket.userId !== user.id) {
      return reply
        .status(403)
        .send({ error: "You do not have permission to cancel this ticket." });
    }

    if (ticket.status !== "active" && ticket.status !== "pending_approval") {
      return reply
        .status(409)
        .send({ error: "Only active or pending tickets can be cancelled." });
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, ticket.orderId));

    if (!order) {
      return reply.status(404).send({ error: "Order not found." });
    }

    const [item] = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.ticketId, ticket.id));

    if (order.totalPaise === 0) {
      // Free ticket cancellation
      await db.transaction(async (tx) => {
        await lockEvent(tx, ticket.eventId);

        await tx
          .update(tickets)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(tickets.id, ticket.id));

        const remainingActive = await tx
          .select({ id: tickets.id })
          .from(tickets)
          .where(
            and(
              eq(tickets.orderId, order.id),
              ne(tickets.status, "cancelled"),
              ne(tickets.status, "refunded"),
            ),
          );

        if (remainingActive.length === 0) {
          await tx
            .update(orders)
            .set({
              reservationState: "released",
              registrationStatus: "cancelled",
              updatedAt: new Date(),
            })
            .where(eq(orders.id, order.id));
        }

        await emitEvent(tx, ticket.eventId, "tickets.changed");
      });

      return reply.send({
        message: "Ticket cancelled successfully.",
        ticketId: ticket.id,
      });
    }

    // Paid ticket
    if (!item) {
      return reply
        .status(404)
        .send({ error: "Order item details not found." });
    }

    const isRefundable = item.policy?.isRefundable === true;
    const isWithinWindow =
      !item.policy?.refundableUntil ||
      new Date(item.policy.refundableUntil) > new Date();

    if (!isRefundable || !isWithinWindow) {
      return reply.status(409).send({
        error: "This ticket is non-refundable or past the refund window.",
      });
    }

    await db.transaction(async (tx) => {
      await lockEvent(tx, ticket.eventId);

      await queueRefund(
        tx,
        order,
        `cancel:${ticket.id}`,
        {
          amountPaise: item.totalPaise,
          reason: "Attendee self-service ticket cancellation",
          voidTicketIds: [ticket.id],
        },
        user.id,
      );

      await tx
        .update(tickets)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(tickets.id, ticket.id));

      const remainingActive = await tx
        .select({ id: tickets.id })
        .from(tickets)
        .where(
          and(
            eq(tickets.orderId, order.id),
            ne(tickets.status, "cancelled"),
            ne(tickets.status, "refunded"),
          ),
        );

      if (remainingActive.length === 0) {
        await tx
          .update(orders)
          .set({
            reservationState: "released",
            registrationStatus: "cancelled",
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));
      }

      await emitEvent(tx, ticket.eventId, "tickets.changed");
    });

    return reply.send({
      message: "Ticket cancelled and refund queued successfully.",
      ticketId: ticket.id,
    });
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};
