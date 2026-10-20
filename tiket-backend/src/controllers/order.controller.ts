import db from "@db";
import { orders } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { HttpError } from "../utils/errors";
import type { FastifyRequest, FastifyReply } from "fastify";
import {
  createCheckout,
  quoteCheckout,
  initializeGatewayOrder,
  checkoutStatus,
  cancelCheckout,
  commandKey,
  type CheckoutBody,
} from "../services/checkout.service";
export async function createOrder(
  request: FastifyRequest<{ Body: CheckoutBody }>,
  reply: FastifyReply,
) {
  await request.jwtVerify();
  const order = await createCheckout(
    request.body,
    (request.user as { id: string }).id,
    commandKey(request.headers["idempotency-key"]),
  );
  if (order.paymentProvider === "razorpay")
    await initializeGatewayOrder(order.id);
  return reply.status(201).send(await checkoutStatus(order.id, order.userId));
}
export async function quoteOrder(
  request: FastifyRequest<{ Body: CheckoutBody }>,
) {
  await request.jwtVerify();
  return quoteCheckout(request.body, (request.user as { id: string }).id);
}
export async function getOrder(
  request: FastifyRequest<{ Params: { orderId: string } }>,
) {
  await request.jwtVerify();
  return checkoutStatus(
    request.params.orderId,
    (request.user as { id: string }).id,
  );
}
export async function abandonOrder(
  request: FastifyRequest<{ Params: { orderId: string } }>,
) {
  await request.jwtVerify();
  return cancelCheckout(
    request.params.orderId,
    (request.user as { id: string }).id,
  );
}

export async function resumeOrder(
  request: FastifyRequest<{ Params: { key: string } }>,
) {
  await request.jwtVerify();
  const userId = (request.user as { id: string }).id;
  const [order] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.userId, userId),
        eq(orders.idempotencyKey, commandKey(request.params.key)),
      ),
    );
  if (!order) throw new HttpError(404, "Order not found.");
  return checkoutStatus(order.id, userId);
}
