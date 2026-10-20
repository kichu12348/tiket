import type { FastifyRequest } from "fastify";
import { issueConnectionTicket } from "../services/realtime.service";
export async function connectDashboard(
  request: FastifyRequest<{ Params: { eventId: string } }>,
) {
  await request.jwtVerify();
  return issueConnectionTicket(
    request.params.eventId,
    (request.user as { id: string }).id,
  );
}
