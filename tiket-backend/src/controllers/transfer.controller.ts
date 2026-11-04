import { handleControllerError } from "../utils/errors";
import type { FastifyRequest, FastifyReply } from "fastify";
import db from "@db";
import { events, tickets, ticketTypes, ticketTransfers, users } from "@db/schema";
import { assertNotBlacklisted } from "../services/inventory.service";
import { eq, and } from "drizzle-orm";
import { deliverMail } from "../services/mail.service";

interface InitiateTransferBody {
  targetEmail: string;
}

export const initiateTransfer = async (
  request: FastifyRequest<{
    Params: { ticketId: string };
    Body: InitiateTransferBody;
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string; email: string };
    const { ticketId } = request.params;
    const { targetEmail } = request.body;

    if (targetEmail.toLowerCase() === user.email.toLowerCase()) {
      return reply
        .status(400)
        .send({ error: "You cannot transfer a ticket to yourself." });
    }

    const ticketList = await db
      .select({
        id: tickets.id,
        userId: tickets.userId,
        status: tickets.status,
        transferCount: tickets.transferCount,
        ticketTypeId: tickets.ticketTypeId,
        eventId: tickets.eventId,
      })
      .from(tickets)
      .where(eq(tickets.id, ticketId));

    const ticket = ticketList[0];
    if (!ticket) return reply.status(404).send({ error: "Ticket not found." });
    if (ticket.userId !== user.id)
      return reply
        .status(403)
        .send({ error: "You don't natively own this ticket." });
    if (ticket.status !== "active")
      return reply
        .status(400)
        .send({ error: "Ticket is not currently active." });

    const tierList = await db
      .select()
      .from(ticketTypes)
      .where(eq(ticketTypes.id, ticket.ticketTypeId));
    const tier = tierList[0];
    if (!tier) return reply.status(500).send({ error: "Mapping tier error." });

    if (!tier.isTransferable) {
      return reply
        .status(400)
        .send({
          error:
            "This ticket type specifically restricts absolute transferability.",
        });
    }

    // Fallback limit checking mapping logic natively bounded structurally bounded
    if (tier.maxTransfers !== 0 && ticket.transferCount >= tier.maxTransfers) {
      return reply
        .status(400)
        .send({
          error:
            "This ticket has already exhausted its configured transfer allowance.",
        });
    }

    const targetUserList = await db
      .select()
      .from(users)
      .where(eq(users.email, targetEmail));
    const targetUser = targetUserList[0];

    if (!targetUser) {
      return reply
        .status(404)
        .send({
          error:
            "Target Email not inherently mapped inside the platform registry. Ask them to sign up first!",
        });
    }

    const [event] = await db
      .select({
        id: events.id,
        organizationId: events.organizationId,
        title: events.title,
      })
      .from(events)
      .where(eq(events.id, ticket.eventId));
    if (!event) return reply.status(404).send({ error: "Event not found." });

    await assertNotBlacklisted(
      db,
      { id: event.id, organizationId: event.organizationId },
      { id: targetUser.id, email: targetUser.email },
    );

    // Isolate duplication blocking
    const existingTransfers = await db
      .select()
      .from(ticketTransfers)
      .where(
        and(
          eq(ticketTransfers.ticketId, ticketId),
          eq(ticketTransfers.status, "pending"),
        ),
      );

    if (existingTransfers.length > 0) {
      return reply
        .status(400)
        .send({ error: "A pending transfer process already exists." });
    }

    const transferLists = await db
      .insert(ticketTransfers)
      .values({
        ticketId,
        fromUserId: user.id,
        toUserId: targetUser.id,
        status: "pending",
      })
      .returning();

    const createdTransfer = transferLists[0];
    if (!createdTransfer) throw new Error("Failed to create transfer record");

    const origin = (process.env.FRONTEND_URL || "http://localhost:3000").split(
      ",",
    )[0]!;
    try {
      await deliverMail(
        {
          recipientEmail: targetUser.email,
          recipientName: targetUser.name,
          subject: `Ticket transfer for ${event.title}`,
          body: `<p>${user.email} has initiated a ticket transfer for <strong>${event.title}</strong>.</p><p>Please visit your <a href="${origin}/home">dashboard</a> or <a href="${origin}/passes/${ticketId}">view ticket pass</a> to accept it.</p>`,
        },
        event.id,
        `transfer:${createdTransfer.id}`,
      );
    } catch (mailErr) {
      request.log.warn(mailErr, "Failed to deliver transfer notification email");
    }

    return reply.status(201).send(createdTransfer);
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const acceptTransfer = async (
  request: FastifyRequest<{ Params: { transferId: string } }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { transferId } = request.params;

    const transferList = await db
      .select()
      .from(ticketTransfers)
      .where(eq(ticketTransfers.id, transferId));
    const transfer = transferList[0];

    if (!transfer)
      return reply.status(404).send({ error: "Transfer sequence unmapped." });
    if (transfer.toUserId !== user.id)
      return reply
        .status(403)
        .send({ error: "Unauthorized target access restriction." });
    if (transfer.status !== "pending")
      return reply
        .status(400)
        .send({ error: "Transfer condition completely fulfilled previously." });

    // Enforce strictly binding atomic execution mapping
    return await db.transaction(async (tx) => {
      const ticketList = await tx
        .select()
        .from(tickets)
        .where(eq(tickets.id, transfer.ticketId));
      const ticket = ticketList[0];

      if (!ticket || ticket.status !== "active") {
        tx.rollback();
        return reply
          .status(400)
          .send({ error: "Target ticket invalidated intrinsically." });
      }

      const [event] = await tx
        .select({ id: events.id, organizationId: events.organizationId })
        .from(events)
        .where(eq(events.id, ticket.eventId));
      if (!event) {
        tx.rollback();
        return reply.status(404).send({ error: "Event not found." });
      }

      const [recipientUser] = await tx
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, user.id));
      if (!recipientUser) {
        tx.rollback();
        return reply.status(404).send({ error: "User not found." });
      }

      await assertNotBlacklisted(
        tx,
        { id: event.id, organizationId: event.organizationId },
        { id: recipientUser.id, email: recipientUser.email },
      );

      const updatedTransfers = await tx
        .update(ticketTransfers)
        .set({ status: "completed" })
        .where(eq(ticketTransfers.id, transfer.id))
        .returning();

      await tx
        .update(tickets)
        .set({
          userId: transfer.toUserId,
          transferCount: ticket.transferCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(tickets.id, ticket.id));

      return reply.send({
        message: "Transfer successfully atomically validated.",
        transfer: updatedTransfers[0],
      });
    });
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const cancelTransfer = async (
  request: FastifyRequest<{ Params: { transferId: string } }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { transferId } = request.params;

    const [transfer] = await db
      .select()
      .from(ticketTransfers)
      .where(eq(ticketTransfers.id, transferId));

    if (!transfer) {
      return reply.status(404).send({ error: "Transfer not found." });
    }

    if (transfer.fromUserId !== user.id && transfer.toUserId !== user.id) {
      return reply
        .status(403)
        .send({ error: "You are not authorized to cancel this transfer." });
    }

    if (transfer.status !== "pending") {
      return reply
        .status(400)
        .send({ error: "Only pending transfers can be cancelled." });
    }

    const [updatedTransfer] = await db
      .update(ticketTransfers)
      .set({ status: "rejected" })
      .where(
        and(
          eq(ticketTransfers.id, transfer.id),
          eq(ticketTransfers.status, "pending"),
        ),
      )
      .returning();

    return reply.send({
      message: "Transfer cancelled successfully.",
      transfer: updatedTransfer,
    });
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};
