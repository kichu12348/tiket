import type { FastifyRequest, FastifyReply } from "fastify";
import db from "@db";
import {
  tickets,
  events,
  ticketTypes,
  users,
  orders,
  ticketFormResponses,
  formFields,
  eventTeamMembers,
} from "@db/schema";
import { eq, and } from "drizzle-orm";

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

    let isTeamMember = false;
    if (!isTicketOwner && !isEventOrganizer) {
      const teamCheck = await db
        .select()
        .from(eventTeamMembers)
        .where(
          and(
            eq(eventTeamMembers.eventId, row.event.id),
            eq(eventTeamMembers.userId, user.id),
          ),
        );
      isTeamMember = teamCheck.length > 0;
    }

    if (!isTicketOwner && !isEventOrganizer && !isTeamMember) {
      return reply
        .status(403)
        .send({ error: "You do not have permission to view this ticket." });
    }

    // 4. Fetch optional registration form responses
    const responses = await db
      .select({
        label: formFields.label,
        value: ticketFormResponses.responseValue,
      })
      .from(ticketFormResponses)
      .innerJoin(formFields, eq(ticketFormResponses.fieldId, formFields.id))
      .where(eq(ticketFormResponses.ticketId, ticketId));

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
        name: row.ticketType.name,
        price: row.ticketType.price,
        description: row.ticketType.description,
        isTransferable: row.ticketType.isTransferable,
        isRefundable: row.ticketType.isRefundable,
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
    };

    return reply.status(200).send(responsePayload);
  } catch (error) {
    if (
      (error as Error).message?.includes("jwt") ||
      (error as Error).message.includes("Authorization")
    ) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch ticket pass." });
  }
};
