import type { FastifyInstance } from "fastify";
import { initiateTransfer, acceptTransfer } from "@controllers/transfer";
import {
  initiateTransferSchema,
  acceptTransferSchema,
} from "@schemas/transfer";

export default async function transferRoutes(fastify: FastifyInstance) {
  fastify.post("/:ticketId/transfer", initiateTransferSchema, initiateTransfer);
  fastify.post(
    "/transfers/:transferId/accept",
    acceptTransferSchema,
    acceptTransfer,
  );
}
