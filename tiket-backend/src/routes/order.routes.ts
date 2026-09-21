import type { FastifyInstance } from "fastify";
import { createOrder, payOrderMock } from "@controllers/order";
import { createOrderSchema, payOrderSchema } from "@schemas/order";

export default async function orderRoutes(fastify: FastifyInstance) {
  fastify.post("/", createOrderSchema, createOrder);
  fastify.post("/:orderId/pay", payOrderSchema, payOrderMock);
}
