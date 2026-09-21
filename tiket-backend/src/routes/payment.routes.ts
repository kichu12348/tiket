import type { FastifyInstance } from "fastify";
import { verifyPayment, handleWebhook } from "../controllers/payment.controller";
import { verifyPaymentSchema, webhookSchema } from "../_schemas/payment.schema";

export default async function paymentRoutes(fastify: FastifyInstance) {
  fastify.post("/verify", verifyPaymentSchema, verifyPayment);
  fastify.post("/webhook", webhookSchema, handleWebhook);
}
