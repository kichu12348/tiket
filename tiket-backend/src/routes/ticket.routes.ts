import type { FastifyInstance } from "fastify";
import {
  getTicketPass,
  getMyTickets,
  cancelTicket,
} from "@controllers/ticket";
import {
  initiateTransfer,
  acceptTransfer,
  cancelTransfer,
} from "@controllers/transfer";
import {
  getTicketPassSchema,
  getMyTicketsSchema,
  cancelTicketSchema,
  initiateTransferSchema,
  acceptTransferSchema,
  cancelTransferSchema,
} from "@schemas/ticket";

export default async function ticketRoutes(fastify: FastifyInstance) {
  fastify.get("/me", getMyTicketsSchema, getMyTickets);
  fastify.get("/:ticketId", getTicketPassSchema, getTicketPass);
  fastify.post("/:ticketId/cancel", cancelTicketSchema, cancelTicket);
  fastify.post("/:ticketId/transfer", initiateTransferSchema, initiateTransfer);
  fastify.post(
    "/transfers/:transferId/accept",
    acceptTransferSchema,
    acceptTransfer,
  );
  fastify.post(
    "/transfers/:transferId/cancel",
    cancelTransferSchema,
    cancelTransfer,
  );
}
