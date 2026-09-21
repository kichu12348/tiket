import type { FastifyRequest, FastifyReply } from "fastify";
import db from "@db";
import { tickets, ticketTypes, ticketTransfers, users } from "@db/schema";
import { eq, and } from "drizzle-orm";

interface InitiateTransferBody {
  targetEmail: string;
}

export const initiateTransfer = async (
  request: FastifyRequest<{ Params: { ticketId: string }; Body: InitiateTransferBody }>,
  reply: FastifyReply
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string, email: string };
    const { ticketId } = request.params;
    const { targetEmail } = request.body;

    if (targetEmail.toLowerCase() === user.email.toLowerCase()) {
        return reply.status(400).send({ error: "You cannot transfer a ticket to yourself." });
    }

    const ticketList = await db
      .select({
          id: tickets.id,
          userId: tickets.userId,
          status: tickets.status,
          transferCount: tickets.transferCount,
          ticketTypeId: tickets.ticketTypeId
      })
      .from(tickets)
      .where(eq(tickets.id, ticketId));

    const ticket = ticketList[0];
    if (!ticket) return reply.status(404).send({ error: "Ticket not found." });
    if (ticket.userId !== user.id) return reply.status(401).send({ error: "You don't natively own this ticket." });
    if (ticket.status !== "active") return reply.status(400).send({ error: "Ticket is not currently active." });

    const tierList = await db.select().from(ticketTypes).where(eq(ticketTypes.id, ticket.ticketTypeId));
    const tier = tierList[0];
    if(!tier) return reply.status(500).send({ error: "Mapping tier error." });

    if (!tier.isTransferable) {
        return reply.status(400).send({ error: "This ticket type specifically restricts absolute transferability." });
    }
    
    // Fallback limit checking mapping logic natively bounded structurally bounded
    if (tier.maxTransfers !== 0 && ticket.transferCount >= tier.maxTransfers) {
         return reply.status(400).send({ error: "This ticket has already exhausted its configured transfer allowance." });
    }

    const targetUserList = await db.select().from(users).where(eq(users.email, targetEmail));
    const targetUser = targetUserList[0];

    if (!targetUser) {
        return reply.status(404).send({ error: "Target Email not inherently mapped inside the platform registry. Ask them to sign up first!" });
    }

    // Isolate duplication blocking
    const existingTransfers = await db.select()
         .from(ticketTransfers)
         .where(and(eq(ticketTransfers.ticketId, ticketId), eq(ticketTransfers.status, "pending")));

    if(existingTransfers.length > 0) {
         return reply.status(400).send({ error: "A pending transfer process already exists." });
    }

    const transferLists = await db.insert(ticketTransfers).values({
        ticketId,
        fromUserId: user.id,
        toUserId: targetUser.id,
        status: "pending"
    }).returning();

    return reply.status(201).send(transferLists[0]);

  } catch (error) {
    if ((error as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const acceptTransfer = async (
  request: FastifyRequest<{ Params: { transferId: string } }>,
  reply: FastifyReply
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { transferId } = request.params;

    const transferList = await db.select().from(ticketTransfers).where(eq(ticketTransfers.id, transferId));
    const transfer = transferList[0];

    if(!transfer) return reply.status(404).send({ error: "Transfer sequence unmapped." });
    if(transfer.toUserId !== user.id) return reply.status(401).send({ error: "Unauthorized target access restriction." });
    if(transfer.status !== "pending") return reply.status(400).send({ error: "Transfer condition completely fulfilled previously." });

    // Enforce strictly binding atomic execution mapping
    return await db.transaction(async (tx) => {
         const ticketList = await tx.select().from(tickets).where(eq(tickets.id, transfer.ticketId));
         const ticket = ticketList[0];

         if(!ticket || ticket.status !== "active") {
             tx.rollback();
             return reply.status(400).send({ error: "Target ticket invalidated intrinsically." });
         }

         const updatedTransfers = await tx.update(ticketTransfers)
             .set({ status: "completed" })
             .where(eq(ticketTransfers.id, transfer.id))
             .returning();

         await tx.update(tickets)
             .set({
                 userId: transfer.toUserId,
                 transferCount: ticket.transferCount + 1,
                 updatedAt: new Date()
             })
             .where(eq(tickets.id, ticket.id));

         return reply.send({ message: "Transfer successfully atomically validated.", transfer: updatedTransfers[0] });
    });

  } catch (error) {
    if ((error as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};
