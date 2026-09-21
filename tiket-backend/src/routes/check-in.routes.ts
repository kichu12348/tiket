import type { FastifyInstance } from "fastify";
import { scanTicket } from "@controllers/check-in";
import { scanTicketSchema } from "@schemas/check-in";

export default async function checkInRoutes(fastify: FastifyInstance) {
  fastify.post("/scan", scanTicketSchema, scanTicket);
}
