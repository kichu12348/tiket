import type { FastifyInstance } from "fastify";
import { getTicketPass } from "@controllers/ticket";
import { initiateTransfer, acceptTransfer } from "@controllers/transfer";
import {
  getTicketPassSchema,
  initiateTransferSchema,
  acceptTransferSchema,
} from "@schemas/ticket";

export default async function ticketRoutes(fastify: FastifyInstance) {
  fastify.get("/:ticketId", getTicketPassSchema, getTicketPass);
  fastify.post("/:ticketId/transfer", initiateTransferSchema, initiateTransfer);
  fastify.post(
    "/transfers/:transferId/accept",
    acceptTransferSchema,
    acceptTransfer,
  );
}
