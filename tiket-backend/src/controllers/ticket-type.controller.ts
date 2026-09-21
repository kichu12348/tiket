import type { FastifyRequest, FastifyReply } from "fastify";
import db from "@db";
import { ticketTypes } from "@db/schema";
import { eq, and, asc, max } from "drizzle-orm";
import { verifyEventOwner } from "@utils";

interface CreateTicketTypeBody {
  name: string;
  description?: string;
  price?: number;
  quantityLimit?: number | null;
  saleStart?: string | null;
  saleEnd?: string | null;
  isRefundable?: boolean;
  refundableUntil?: string | null;
  isTransferable?: boolean;
  maxTransfers?: number;
}

interface UpdateTicketTypeBody extends Partial<CreateTicketTypeBody> {}

export const createTicketType = async (
  request: FastifyRequest<{
    Params: { eventId: string };
    Body: CreateTicketTypeBody;
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId } = request.params;

    const isOwner = await verifyEventOwner(eventId, user.id);
    if (!isOwner) {
      return reply
        .status(401)
        .send({ error: "Only the event creator can configure tickets." });
    }

    const body = request.body;

    // Normalize price string mapping perfectly
    const normalizedPrice = body.price ? body.price.toString() : "0.00";

    const newTicketTypeList = await db.transaction(async (tx) => {
      const maxCountResult = await tx
        .select({
          maxCount: max(ticketTypes.sortOrder),
        })
        .from(ticketTypes)
        .where(eq(ticketTypes.eventId, eventId));

      const maxCount = maxCountResult[0]?.maxCount || 0;

      return await tx
        .insert(ticketTypes)
        .values({
          eventId,
          name: body.name,
          description: body.description,
          price: normalizedPrice,
          quantityLimit: body.quantityLimit,
          saleStart: body.saleStart ? new Date(body.saleStart) : null,
          saleEnd: body.saleEnd ? new Date(body.saleEnd) : null,
          isRefundable: body.isRefundable ?? false,
          refundableUntil: body.refundableUntil
            ? new Date(body.refundableUntil)
            : null,
          isTransferable: body.isTransferable ?? false,
          maxTransfers: body.maxTransfers ?? 0,
          sortOrder: maxCount + 1,
        })
        .returning();
    });

    const createdType = newTicketTypeList[0];
    if (!createdType) {
      return reply.status(500).send({ error: "Failed to create ticket tier." });
    }

    return reply.status(201).send(createdType);
  } catch (error) {
    if ((error as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const getTicketTypes = async (
  request: FastifyRequest<{ Params: { eventId: string } }>,
  reply: FastifyReply,
) => {
  try {
    const { eventId } = request.params;

    // Both attendees and creators uniquely share access to see listing tiers!
    const ticketTypesList = await db
      .select()
      .from(ticketTypes)
      .where(eq(ticketTypes.eventId, eventId))
      .orderBy(asc(ticketTypes.sortOrder));

    return reply.send(ticketTypesList);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const updateTicketType = async (
  request: FastifyRequest<{
    Params: { eventId: string; ticketTypeId: string };
    Body: UpdateTicketTypeBody;
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId, ticketTypeId } = request.params;
    const body = request.body;

    const isOwner = await verifyEventOwner(eventId, user.id);
    if (!isOwner) {
      return reply
        .status(401)
        .send({ error: "Only the event creator can modify ticket tiers." });
    }

    const payload: any = { updatedAt: new Date() };
    if (body.name !== undefined) payload.name = body.name;
    if (body.description !== undefined) payload.description = body.description;
    if (body.price !== undefined) payload.price = body.price.toString();
    if (body.quantityLimit !== undefined)
      payload.quantityLimit = body.quantityLimit;
    if (body.isRefundable !== undefined)
      payload.isRefundable = body.isRefundable;
    if (body.isTransferable !== undefined)
      payload.isTransferable = body.isTransferable;
    if (body.maxTransfers !== undefined)
      payload.maxTransfers = body.maxTransfers;

    if (body.saleStart !== undefined)
      payload.saleStart = body.saleStart ? new Date(body.saleStart) : null;
    if (body.saleEnd !== undefined)
      payload.saleEnd = body.saleEnd ? new Date(body.saleEnd) : null;
    if (body.refundableUntil !== undefined)
      payload.refundableUntil = body.refundableUntil
        ? new Date(body.refundableUntil)
        : null;

    const updatedTypeList = await db
      .update(ticketTypes)
      .set(payload)
      .where(
        and(eq(ticketTypes.id, ticketTypeId), eq(ticketTypes.eventId, eventId)),
      )
      .returning();

    const updatedType = updatedTypeList[0];
    if (!updatedType) {
      return reply.status(404).send({ error: "Ticket Tier not found" });
    }

    return reply.send(updatedType);
  } catch (error) {
    if ((error as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const deleteTicketType = async (
  request: FastifyRequest<{
    Params: { eventId: string; ticketTypeId: string };
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId, ticketTypeId } = request.params;

    const isOwner = await verifyEventOwner(eventId, user.id);
    if (!isOwner) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const deletedTypeList = await db
      .delete(ticketTypes)
      .where(
        and(eq(ticketTypes.id, ticketTypeId), eq(ticketTypes.eventId, eventId)),
      )
      .returning();

    if (deletedTypeList.length === 0) {
      return reply.status(404).send({ error: "Ticket tier not found" });
    }

    return reply.send({ message: "Ticket tier successfully deleted." });
  } catch (error) {
    if ((error as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const reorderTicketTypes = async (
  request: FastifyRequest<{
    Params: { eventId: string };
    Body: { id: string; sortOrder: number }[];
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId } = request.params;
    const body = request.body;

    const isOwner = await verifyEventOwner(eventId, user.id);
    if (!isOwner) {
      return reply
        .status(401)
        .send({ error: "Only the event creator can modify ticket tiers." });
    }

    await db.transaction(async (tx) => {
      for (const item of body) {
        await tx
          .update(ticketTypes)
          .set({ sortOrder: item.sortOrder })
          .where(
            and(eq(ticketTypes.id, item.id), eq(ticketTypes.eventId, eventId)),
          );
      }
    });

    return reply.send({ message: "Ticket types reordered successfully." });
  } catch (error) {
    if ((error as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};
