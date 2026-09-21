import db from "@db";
import { orders, tickets } from "@db/schema";
import { eq, and } from "drizzle-orm";
import {
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  type RazorpayOrderResult,
} from "@services/razorpay";

export interface InitiatePaymentResult {
  isFree: boolean;
  razorpayOrder: RazorpayOrderResult | null;
}

export interface VerifyOrderPaymentOptions {
  orderId: string;
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface WebhookProcessOptions {
  rawBody: string;
  signature: string;
}

/**
 * Initiates Razorpay payment for a database order if total amount > 0.
 */
export async function initiatePaymentForOrder(
  orderId: string,
  totalAmountInINR: number | string,
): Promise<InitiatePaymentResult> {
  const numericAmount = Number(totalAmountInINR);

  if (isNaN(numericAmount) || numericAmount <= 0) {
    // Free ticket order - no Razorpay transaction required
    await db
      .update(orders)
      .set({
        paymentStatus: "success",
        paymentProvider: "free",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    return {
      isFree: true,
      razorpayOrder: null,
    };
  }

  // Create Razorpay order in INR
  const razorpayOrder = await createRazorpayOrder({
    amountInINR: numericAmount,
    receipt: orderId,
    notes: { orderId },
  });

  // Store Razorpay order ID as paymentIntentId in pending order
  await db
    .update(orders)
    .set({
      paymentProvider: "razorpay",
      paymentIntentId: razorpayOrder.id,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  return {
    isFree: false,
    razorpayOrder,
  };
}

/**
 * Confirms payment signature and marks DB order and associated tickets as successful.
 */
export async function verifyOrderPayment({
  orderId,
  userId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: VerifyOrderPaymentOptions) {
  // 1. Fetch order from DB and verify ownership
  const existingOrders = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));

  const order = existingOrders[0];
  if (!order) {
    return {
      success: false,
      statusCode: 404,
      error: "Order not found or access denied.",
    };
  }

  // If already paid, return early with order
  if (order.paymentStatus === "success") {
    return { success: true, order };
  }

  // 2. Validate HMAC SHA256 Signature
  const isValid = verifyPaymentSignature({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  if (!isValid) {
    return {
      success: false,
      statusCode: 400,
      error: "Invalid payment signature.",
    };
  }

  // 3. Atomically update Order and Tickets
  const updatedOrders = await db
    .update(orders)
    .set({
      paymentStatus: "success",
      paymentProvider: "razorpay",
      paymentIntentId: razorpayPaymentId,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId))
    .returning();

  await db
    .update(tickets)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(tickets.orderId, orderId));

  return { success: true, order: updatedOrders[0] };
}

/**
 * Processes asynchronous Razorpay webhooks (e.g. order.paid, payment.captured).
 */
export async function processWebhookEvent({
  rawBody,
  signature,
}: WebhookProcessOptions) {
  const isValid = verifyWebhookSignature({ rawPayload: rawBody, signature });
  if (!isValid) {
    return {
      success: false,
      statusCode: 400,
      error: "Invalid webhook signature.",
    };
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return { success: false, statusCode: 400, error: "Invalid JSON payload." };
  }

  const eventName = event.event as string;

  if (eventName === "order.paid" || eventName === "payment.captured") {
    const payload = event.payload as Record<string, unknown> | undefined;
    const paymentEntity = (payload?.payment as Record<string, unknown>)
      ?.entity as Record<string, unknown> | undefined;
    const orderEntity = (payload?.order as Record<string, unknown>)?.entity as
      | Record<string, unknown>
      | undefined;

    const notes = (paymentEntity?.notes || orderEntity?.notes) as
      | Record<string, string>
      | undefined;
    const orderId = notes?.orderId;
    const razorpayOrderId = (paymentEntity?.order_id || orderEntity?.id) as
      | string
      | undefined;
    const razorpayPaymentId = paymentEntity?.id as string | undefined;

    if (orderId) {
      await db
        .update(orders)
        .set({
          paymentStatus: "success",
          paymentProvider: "razorpay",
          paymentIntentId: razorpayPaymentId || razorpayOrderId,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      await db
        .update(tickets)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(tickets.orderId, orderId));
    }
  }

  return { success: true };
}
