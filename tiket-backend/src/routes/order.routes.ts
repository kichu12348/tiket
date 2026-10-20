import type { FastifyInstance } from "fastify";
import {
  createOrder,
  resumeOrder,
  quoteOrder,
  getOrder,
  abandonOrder,
} from "@controllers/order";
import { createOrderSchema, orderParamsSchema } from "@schemas/order";
export default async function orderRoutes(fastify: FastifyInstance) {
  fastify.post("/", createOrderSchema, createOrder);
  fastify.post("/quote", createOrderSchema, quoteOrder);
  fastify.get(
    "/resume/:key",
    {
      schema: {
        params: {
          type: "object",
          required: ["key"],
          properties: { key: { type: "string", maxLength: 128 } },
        },
      },
    },
    resumeOrder,
  );
  fastify.get("/:orderId", orderParamsSchema, getOrder);
  fastify.post("/:orderId/cancel", orderParamsSchema, abandonOrder);
}
