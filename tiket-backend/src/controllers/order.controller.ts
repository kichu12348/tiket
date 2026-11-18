import db from "@db";
import { orders, tickets, ticketTypes, orderItems } from "@db/schema";
import { and, desc, eq, gt, or, sql } from "drizzle-orm";
import { HttpError } from "../utils/errors";
import { fromPaise } from "../utils/money";
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
  const userId = (request.user as { id: string }).id;
  const order = await createCheckout(
    request.body,
    userId,
    commandKey(request.headers["idempotency-key"]),
  );

  let razorpayOrderPayload: {
    id: string;
    amount: number;
    currency: string;
    keyId: string;
  } | null = null;

  if (order.totalPaise > 0) {
    if (order.paymentProvider === "razorpay") {
      await initializeGatewayOrder(order.id);
    }
    const [refreshed] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, order.id));
    const keyId = process.env.RAZORPAY_KEY_ID;
    if (!refreshed?.paymentIntentId || !keyId) {
      throw new HttpError(500, "Payment gateway failed to initialize");
    }
    razorpayOrderPayload = {
      id: refreshed.paymentIntentId,
      amount: refreshed.totalPaise,
      currency: refreshed.currency,
      keyId,
    };
  }

  const [ticket] = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(eq(tickets.orderId, order.id))
    .limit(1);

  const items = await db
    .select({ discountPaise: orderItems.discountPaise })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  const totalDiscountPaise = items.reduce(
    (sum, item) => sum + (item.discountPaise || 0),
    0,
  );
  const discountAmount = fromPaise(totalDiscountPaise);

  let status: "pending" | "completed" | "pending_approval" = "pending";
  if (order.totalPaise === 0) {
    status =
      order.registrationStatus === "pending_approval"
        ? "pending_approval"
        : "completed";
  } else if (order.paymentStatus === "success") {
    status =
      order.registrationStatus === "pending_approval"
        ? "pending_approval"
        : "completed";
  } else {
    status = "pending";
  }

  return reply.status(201).send({
    order: {
      id: order.id,
      eventId: order.eventId,
      status,
      totalAmount: order.totalAmount,
      discountAmount,
    },
    ticketId: ticket?.id ?? null,
    razorpayOrder: razorpayOrderPayload,
  });
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
  const userId = (request.user as { id: string }).id;
  const param = request.params.orderId;

  const [activeOrder] = await db
    .select({
      id: orders.id,
      eventId: orders.eventId,
      totalAmount: orders.totalAmount,
      totalPaise: orders.totalPaise,
      registrationStatus: orders.registrationStatus,
      paymentStatus: orders.paymentStatus,
      reservationState: orders.reservationState,
    })
    .from(orders)
    .where(
      and(
        eq(orders.userId, userId),
        or(eq(orders.eventId, param), eq(orders.id, param)),
        or(
          eq(orders.reservationState, "confirmed"),
          and(
            eq(orders.reservationState, "held"),
            gt(orders.expiresAt, sql`now()`),
          ),
        ),
      ),
    )
    .orderBy(desc(orders.createdAt))
    .limit(1);

  if (activeOrder) {
    const [ticketWithTier] = await db
      .select({
        ticketId: tickets.id,
        ticketTypeName: ticketTypes.name,
      })
      .from(tickets)
      .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
      .where(eq(tickets.orderId, activeOrder.id))
      .limit(1);

    let status: "pending" | "completed" | "pending_approval" = "pending";
    if (activeOrder.totalPaise === 0) {
      status =
        activeOrder.registrationStatus === "pending_approval"
          ? "pending_approval"
          : "completed";
    } else if (activeOrder.paymentStatus === "success") {
      status =
        activeOrder.registrationStatus === "pending_approval"
          ? "pending_approval"
          : "completed";
    } else {
      status = "pending";
    }

    return {
      hasActiveOrder: true,
      order: {
        id: activeOrder.id,
        status,
        totalAmount: activeOrder.totalAmount,
        ticketId: ticketWithTier?.ticketId ?? null,
        ticketTypeName: ticketWithTier?.ticketTypeName ?? null,
      },
    };
  }

  return {
    hasActiveOrder: false,
    order: null,
  };
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
