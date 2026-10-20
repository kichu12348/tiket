import type { FastifyRequest, FastifyReply } from "fastify";
import db from "@db";
import { orders } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { validHmac, gateway } from "../services/gateway.service";
import {
  acceptWebhook,
  applyPayment,
} from "../services/payment-lifecycle.service";
import { checkoutStatus } from "../services/checkout.service";
import { HttpError } from "../utils/errors";
interface VerifyBody {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}
export async function verifyPayment(
  request: FastifyRequest<{ Body: VerifyBody }>,
) {
  await request.jwtVerify();
  const userId = (request.user as { id: string }).id;
  const body = request.body;
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, body.orderId), eq(orders.userId, userId)));
  if (!order) throw new HttpError(404, "Order not found.");
  if (
    !order.paymentIntentId ||
    order.paymentIntentId !== body.razorpayOrderId ||
    !validHmac(
      order.paymentIntentId + "|" + body.razorpayPaymentId,
      body.razorpaySignature,
      process.env.RAZORPAY_KEY_SECRET,
    )
  )
    throw new HttpError(400, "Invalid checkout signature.");
  // A valid client signature alone never fulfills tickets: fetch the captured provider fact.
  const payment = await gateway().fetchPayment(body.razorpayPaymentId);
  if (payment.order_id !== order.paymentIntentId)
    throw new HttpError(400, "Payment belongs to another order.");
  await db.transaction((tx) => applyPayment(tx, payment));
  return checkoutStatus(order.id, userId);
}
export async function handleWebhook(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const signature = request.headers["x-razorpay-signature"];
  const id = request.headers["x-razorpay-event-id"];
  if (
    !Buffer.isBuffer(request.body) ||
    typeof signature !== "string" ||
    typeof id !== "string"
  )
    throw new HttpError(400, "Missing webhook headers.");
  await acceptWebhook(request.body, signature, id);
  return reply.send({ status: "accepted" });
}
