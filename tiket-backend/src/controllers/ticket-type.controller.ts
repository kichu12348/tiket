import { toPaise, fromPaise } from "../utils/money";
import { HttpError } from "../utils/errors";
import { allocatedByTier, emitEvent, expireHolds, lockEvent } from "../services/inventory.service";
import { verifyEventPermission } from "../utils/permissions";
import { handleControllerError } from "../utils/errors";
import type { FastifyRequest, FastifyReply } from "fastify";
import db from "@db";
import { ticketTypes, events, tickets } from "@db/schema";
import { eq, and, asc, max } from "drizzle-orm";
import { verifyEventOwner } from "@utils";

interface CreateTicketTypeBody {
  isHidden?: boolean;
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

    const isOwner = await verifyEventPermission(eventId, user.id, "manage_tickets");
    if (!isOwner) {
      return reply
        .status(403)
        .send({ error: "Only the event creator can configure tickets." });
    }

    const body = request.body;

    // Normalize price string mapping perfectly
    const normalizedPrice = fromPaise(toPaise(String(body.price ?? 0)));
    if (body.saleStart && body.saleEnd && new Date(body.saleStart) >= new Date(body.saleEnd)) throw new HttpError(400, "Sale end must follow start.");

    const newTicketTypeList = await db.transaction(async (tx) => {
      await lockEvent(tx, eventId);
      const maxCountResult = await tx
        .select({
          maxCount: max(ticketTypes.sortOrder),
        })
        .from(ticketTypes)
        .where(eq(ticketTypes.eventId, eventId));

      const maxCount = maxCountResult[0]?.maxCount || 0;

      const result = await tx
        .insert(ticketTypes)
        .values({
          eventId,
          name: body.name,
          isHidden: body.isHidden ?? false,
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
      await emitEvent(tx, eventId, "tickets.changed");
      return result;
    });

    const createdType = newTicketTypeList[0];
    if (!createdType) {
      return reply.status(500).send({ error: "Failed to create ticket tier." });
    }

    return reply.status(201).send(createdType);
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const getTicketTypes = async (
  request: FastifyRequest<{ Params: { eventId: string } }>,
  reply: FastifyReply,
) => {
  try {
    const { eventId } = request.params;

    let manager = false;
    try { await request.jwtVerify(); manager = await verifyEventPermission(eventId, (request.user as { id: string }).id, "manage_tickets"); } catch { /* Public tier list */ }
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event || event.status !== "published" && !manager) throw new HttpError(404, "Event not found.");
    const ticketTypesList = await db.select().from(ticketTypes).where(and(eq(ticketTypes.eventId, eventId), manager ? undefined : eq(ticketTypes.isHidden, false))).orderBy(asc(ticketTypes.sortOrder));
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

    const isOwner = await verifyEventPermission(eventId, user.id, "manage_tickets");
    if (!isOwner) {
      return reply
        .status(403)
        .send({ error: "Only the event creator can modify ticket tiers." });
    }

    const payload: Partial<typeof ticketTypes.$inferInsert> = { updatedAt: new Date() };
    if (body.isHidden !== undefined) payload.isHidden = body.isHidden;
    if (body.name !== undefined) payload.name = body.name;
    if (body.description !== undefined) payload.description = body.description;
    if (body.price !== undefined) payload.price = fromPaise(toPaise(String(body.price)));
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

    const updatedTypeList = await db.transaction(async tx => {
      await lockEvent(tx, eventId); await expireHolds(tx, eventId);
      const [current] = await tx.select().from(ticketTypes).where(and(eq(ticketTypes.id, ticketTypeId), eq(ticketTypes.eventId, eventId)));
      if (!current) throw new HttpError(404, "Ticket tier not found.");
      const merged = { ...current, ...payload };
      if (merged.saleStart && merged.saleEnd && merged.saleStart >= merged.saleEnd) throw new HttpError(400, "Sale end must follow start.");
      if (body.quantityLimit !== undefined && body.quantityLimit !== null && body.quantityLimit < ((await allocatedByTier(tx, eventId)).get(ticketTypeId) || 0)) throw new HttpError(409, "Quantity cannot be reduced below allocated tickets.");
      const result = await tx.update(ticketTypes).set(payload).where(and(eq(ticketTypes.id, ticketTypeId), eq(ticketTypes.eventId, eventId))).returning();
      await emitEvent(tx, eventId, "tickets.changed"); return result;
    });
    const updatedType = updatedTypeList[0];
    if (!updatedType) {
      return reply.status(404).send({ error: "Ticket Tier not found" });
    }

    return reply.send(updatedType);
  } catch (error) {
    return handleControllerError(request, reply, error);
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

    const isOwner = await verifyEventPermission(eventId, user.id, "manage_tickets");
    if (!isOwner) {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const deletedTypeList = await db.transaction(async tx => {
      await lockEvent(tx, eventId);
      const [issued] = await tx.select({ id: tickets.id }).from(tickets).where(eq(tickets.ticketTypeId, ticketTypeId)).limit(1);
      if (issued) throw new HttpError(409, "Ticket types with registrations must be hidden or closed rather than deleted.");
      const result = await tx.delete(ticketTypes).where(and(eq(ticketTypes.id, ticketTypeId), eq(ticketTypes.eventId, eventId))).returning();
      if (result.length) await emitEvent(tx, eventId, "tickets.changed");
      return result;
    });

    if (deletedTypeList.length === 0) {
      return reply.status(404).send({ error: "Ticket tier not found" });
    }

    return reply.send({ message: "Ticket tier successfully deleted." });
  } catch (error) {
    return handleControllerError(request, reply, error);
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

    const isOwner = await verifyEventPermission(eventId, user.id, "manage_tickets");
    if (!isOwner) {
      return reply
        .status(403)
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
    return handleControllerError(request, reply, error);
  }
};
