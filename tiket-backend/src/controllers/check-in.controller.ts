import type { FastifyReply, FastifyRequest } from "fastify";
import db from "@db";
import { tickets } from "@db/schema";
import { eq } from "drizzle-orm";
import { changeAdmission } from "../utils/admission";
import { handleControllerError, HttpError } from "../utils/errors";

export const scanTicket = async (
  request: FastifyRequest<{ Body: { qrCode: string; eventId: string } }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const [ticket] = await db
      .select({ id: tickets.id, eventId: tickets.eventId })
      .from(tickets)
      .where(eq(tickets.qrCode, request.body.qrCode));
    if (!ticket || ticket.eventId !== request.body.eventId)
      throw new HttpError(404, "Ticket not found for this event.");
    return reply
      .status(201)
      .send(
        await changeAdmission(
          ticket.eventId,
          ticket.id,
          (request.user as { id: string }).id,
        ),
      );
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};
