import type { FastifyRequest, FastifyReply } from "fastify";
import db from "@db";
import {
  events,
  orders,
  tickets,
  ticketTypes,
  ticketFormResponses,
  eventTeamMembers,
  users,
  emailTemplates,
} from "@db/schema";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";
import { initiatePaymentForOrder } from "@services/payment";
import { sendEmail } from "../utils/emailService";

interface PurchaseItem {
  ticketTypeId: string;
  formResponses?: {
    fieldId: string;
    responseValue: string;
  }[];
}

interface CreateOrderBody {
  eventId: string;
  purchases: PurchaseItem[];
}

class OrderValidationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const createOrder = async (
  request: FastifyRequest<{ Body: CreateOrderBody }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId, purchases } = request.body;

    if (!purchases || purchases.length === 0) {
      return reply.status(400).send({ error: "No tickets requested." });
    }

    // 1. Verify Event Existence & Check Host Guard
    const eventList = await db
      .select({ id: events.id, organizationId: events.organizationId })
      .from(events)
      .where(eq(events.id, eventId));

    const checkEvent = eventList[0];
    if (!checkEvent) {
      return reply.status(404).send({ error: "Event not found." });
    }

    if (checkEvent.organizationId === user.id) {
      return reply
        .status(403)
        .send({
          error: "As an event host, you cannot register for your own event.",
        });
    }

    // 2. Check Team Member / Event Handler Guard
    const teamCheck = await db
      .select({ id: eventTeamMembers.id })
      .from(eventTeamMembers)
      .where(
        and(
          eq(eventTeamMembers.eventId, eventId),
          eq(eventTeamMembers.userId, user.id),
        ),
      );

    if (teamCheck.length > 0) {
      return reply
        .status(403)
        .send({
          error: "As an event team member, you cannot register for this event.",
        });
    }

    const typeQuantities: Record<string, number> = {};
    for (const p of purchases) {
      typeQuantities[p.ticketTypeId] =
        (typeQuantities[p.ticketTypeId] || 0) + 1;
    }
    const requestedTypes = Object.keys(typeQuantities);

    // 3. Execute DB Transaction
    const transactionResult = await db.transaction(async (tx) => {
      let totalAmount = 0;

      for (const tTypeId of requestedTypes) {
        const tierList = await tx
          .select()
          .from(ticketTypes)
          .where(eq(ticketTypes.id, tTypeId));
        const tier = tierList[0];

        if (!tier) {
          tx.rollback();
          throw new OrderValidationError(
            `Ticket tier mapped to ID ${tTypeId} not found.`,
            404,
          );
        }

        if (tier.eventId !== eventId) {
          tx.rollback();
          throw new OrderValidationError("Mismatching Tier bounds.", 400);
        }

        const requestedAmount = typeQuantities[tTypeId] || 0;

        if (tier.quantityLimit !== null) {
          const soldQuery = await tx
            .select({ count: sql<string>`count(*)` })
            .from(tickets)
            .where(
              and(
                eq(tickets.ticketTypeId, tTypeId),
                eq(tickets.status, "active"),
              ),
            );

          const soldCountObj = soldQuery[0];
          const sold = soldCountObj ? Number(soldCountObj.count) : 0;

          if (sold + requestedAmount > tier.quantityLimit) {
            tx.rollback();
            throw new OrderValidationError(
              `Insufficient ticket inventory for ${tier.name}. Only ${
                tier.quantityLimit - sold
              } remaining.`,
              409,
            );
          }
        }

        totalAmount += parseFloat(tier.price) * requestedAmount;
      }

      const isFreeOrder = totalAmount === 0;

      const newOrderList = await tx
        .insert(orders)
        .values({
          eventId,
          userId: user.id,
          totalAmount: totalAmount.toFixed(2),
          paymentStatus: isFreeOrder ? "success" : "pending",
          paymentProvider: isFreeOrder ? "free" : "razorpay",
        })
        .returning();

      const order = newOrderList[0];
      if (!order) {
        tx.rollback();
        throw new OrderValidationError(
          "Failed to allocate order root block.",
          500,
        );
      }

      const createdTickets = [];

      for (const p of purchases) {
        const uniqueQr = `${order.id}-${crypto.randomUUID()}`;

        const ticketList = await tx
          .insert(tickets)
          .values({
            orderId: order.id,
            ticketTypeId: p.ticketTypeId,
            userId: user.id,
            eventId: eventId,
            qrCode: uniqueQr,
            status: "active",
          })
          .returning();

        const ticket = ticketList[0];
        if (!ticket) continue;

        createdTickets.push(ticket);

        if (p.formResponses && p.formResponses.length > 0) {
          const formattedResponses = p.formResponses.map((r) => ({
            ticketId: ticket.id,
            fieldId: r.fieldId,
            responseValue: r.responseValue,
          }));

          await tx.insert(ticketFormResponses).values(formattedResponses);
        }
      }

      return { order, tickets: createdTickets, totalAmount };
    });

    const { order, tickets: createdTickets, totalAmount } = transactionResult;

    // Async email trigger for confirmation if order is free/success
    if (totalAmount === 0 && createdTickets.length > 0) {
      (async () => {
        try {
          const [tpl] = await db
            .select()
            .from(emailTemplates)
            .where(
              and(
                eq(emailTemplates.eventId, eventId),
                eq(emailTemplates.type, "confirmation"),
                eq(emailTemplates.isActive, true),
              ),
            );

          if (tpl) {
            const [userRecord] = await db
              .select()
              .from(users)
              .where(eq(users.id, user.id));

            const [eventObj] = await db
              .select()
              .from(events)
              .where(eq(events.id, eventId));

            if (userRecord && eventObj) {
              const firstTicket = createdTickets[0];

              if (firstTicket) {
                await sendEmail({
                  eventId,
                  templateId: tpl.id,
                  recipientEmail: userRecord.email,
                  recipientName: userRecord.name,
                  subject: tpl.subject,
                  body: tpl.body,
                  data: {
                    event: {
                      title: eventObj.title,
                      startDate: eventObj.startDate
                        ? new Date(eventObj.startDate).toLocaleString()
                        : "",
                      location:
                        eventObj.locationType === "online"
                          ? "Online Stream"
                          : "Venue",
                      url: `http://localhost:3000/${eventObj.slug}`,
                      passUrl: `http://localhost:3000/passes/${firstTicket.id}`,
                    },
                    attendee: {
                      name: userRecord.name,
                      email: userRecord.email,
                    },
                    ticket: {
                      qrCode: firstTicket.qrCode,
                    },
                  },
                });
              }
            }
          }
        } catch (e) {
          console.error("Order confirmation email trigger error:", e);
        }
      })();
    }

    // 4. Handle Razorpay Order Creation outside DB transaction
    let razorpayOrder = null;
    if (totalAmount > 0) {
      const paymentRes = await initiatePaymentForOrder(order.id, totalAmount);
      razorpayOrder = paymentRes.razorpayOrder;
    }

    return reply.status(201).send({
      order,
      tickets: createdTickets,
      razorpayOrder,
    });
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    if (
      (error as Error).message?.includes("jwt") ||
      (error as Error).message?.includes("Authorization")
    ) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply
      .status(500)
      .send({ error: (error as Error).message || "Internal Server Error" });
  }
};

export const payOrderMock = async (
  request: FastifyRequest<{ Params: { orderId: string } }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { orderId } = request.params;

    const updated = await db
      .update(orders)
      .set({ paymentStatus: "success" })
      .where(and(eq(orders.id, orderId), eq(orders.userId, user.id)))
      .returning();

    if (updated.length === 0) {
      return reply
        .status(404)
        .send({ error: "Order not found or you don't have access." });
    }

    return reply.send({
      message: "Mock transaction validated and secured.",
      order: updated[0],
    });
  } catch (error) {
    if (
      (error as Error).message?.includes("jwt") ||
      (error as Error).message?.includes("Authorization")
    ) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};
