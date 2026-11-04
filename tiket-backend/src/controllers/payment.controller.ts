import type { FastifyRequest, FastifyReply } from "fastify";
import db from "@db";
import { orders } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { gateway } from "../services/gateway.service";
import {
  acceptWebhook,
  applyPayment,
} from "../services/payment-lifecycle.service";
import { checkoutStatus } from "../services/checkout.service";
import { HttpError } from "../utils/errors";

interface VerifyBody {
  orderId: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  providerSignature?: string;
  providerPayload?: Record<string, string>;
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

  const providerOrderId = body.providerOrderId ?? body.razorpayOrderId;
  const providerPaymentId = body.providerPaymentId ?? body.razorpayPaymentId;
  const providerSignature = body.providerSignature ?? body.razorpaySignature;

  if (!providerOrderId || !providerPaymentId || !providerSignature)
    throw new HttpError(400, "Missing payment verification parameters.");

  if (!order.paymentIntentId || order.paymentIntentId !== providerOrderId)
    throw new HttpError(400, "Invalid checkout signature.");

  const payloadRecord: Record<string, string> = {
    ...(body.providerPayload ?? {}),
    providerOrderId,
    providerPaymentId,
    providerSignature,
    razorpayOrderId: providerOrderId,
    razorpayPaymentId: providerPaymentId,
    razorpaySignature: providerSignature,
  };

  const isValid = gateway().verifyClientCallback({
    expectedGatewayOrderId: order.paymentIntentId,
    payload: payloadRecord,
  });

  if (!isValid) throw new HttpError(400, "Invalid checkout signature.");

  // A valid client signature alone never fulfills tickets: fetch the captured provider fact.
  const payment = await gateway().fetchPayment(providerPaymentId);
  if (payment.order_id !== order.paymentIntentId)
    throw new HttpError(400, "Payment belongs to another order.");

  await db.transaction((tx) => applyPayment(tx, payment));
  return checkoutStatus(order.id, userId);
}

export async function handleWebhook(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!Buffer.isBuffer(request.body))
    throw new HttpError(400, "Missing webhook body.");
  await acceptWebhook(request.body, request.headers);
  return reply.send({ status: "accepted" });
}
