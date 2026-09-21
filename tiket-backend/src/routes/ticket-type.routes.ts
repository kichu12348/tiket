import type { FastifyInstance } from "fastify";
import {
  createTicketType,
  getTicketTypes,
  updateTicketType,
  deleteTicketType,
  reorderTicketTypes,
} from "@controllers/ticket-type";
import {
  createTicketTypeSchema,
  getTicketTypesSchema,
  updateTicketTypeSchema,
  deleteTicketTypeSchema,
  reorderTicketTypesSchema,
} from "@schemas/ticket-type";

export default async function ticketTypeRoutes(fastify: FastifyInstance) {
  fastify.post("/:eventId", createTicketTypeSchema, createTicketType);
  fastify.get("/:eventId", getTicketTypesSchema, getTicketTypes);
  fastify.put(
    "/:eventId/reorder",
    reorderTicketTypesSchema,
    reorderTicketTypes,
  );
  fastify.patch(
    "/:eventId/:ticketTypeId",
    updateTicketTypeSchema,
    updateTicketType,
  );
  fastify.delete(
    "/:eventId/:ticketTypeId",
    deleteTicketTypeSchema,
    deleteTicketType,
  );
}
