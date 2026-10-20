import type { FastifyInstance } from "fastify";
import {
  verifyPayment,
  handleWebhook,
} from "../controllers/payment.controller";
import { verifyPaymentSchema, webhookSchema } from "../_schemas/payment.schema";
export default async function paymentRoutes(fastify: FastifyInstance) {
  fastify.post("/verify", verifyPaymentSchema, verifyPayment);
  fastify.register(async (webhook) => {
    webhook.removeContentTypeParser("application/json");
    webhook.addContentTypeParser(
      "application/json",
      { parseAs: "buffer" },
      (_request, body, done) => done(null, body),
    );
    webhook.post("/webhook", webhookSchema, handleWebhook);
  });
}
