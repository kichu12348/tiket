import db from "@db";
import {
  events,
  eventTeamMembers,
  formFields,
  orderItems,
  orders,
  ticketFormResponses,
  tickets,
  ticketTypes,
  uploads,
} from "@db/schema";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import type { Transaction } from "../db/types";
import { HttpError } from "../utils/errors";
import { toPaise, fromPaise } from "../utils/money";
import {
  validateFormResponses,
  type FormResponse,
} from "../utils/registration-validation";
import {
  allocatedByTier,
  assertCapacity,
  emitEvent,
  expireHolds,
  lockEvent,
  releaseHold,
  validateCoupon,
} from "./inventory.service";
import { priceCart, pricingPolicy } from "./pricing.service";
import { enqueueOrderEmail } from "./notifications.service";
import { gateway } from "./gateway.service";

export interface CheckoutBody {
  eventId: string;
  purchases: { ticketTypeId: string; formResponses?: FormResponse[] }[];
  code?: string;
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, canonical(entry)]),
    );
  return value;
}
export const fingerprint = (value: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
export function commandKey(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9:_-]{8,128}$/.test(value))
    throw new HttpError(400, "A valid Idempotency-Key header is required.");
  return value;
}
function registrationOpen(event: typeof events.$inferSelect) {
  const now = new Date();
  if (
    event.status !== "published" ||
    event.endDate <= now ||
    (event.registrationStart && event.registrationStart > now) ||
    (event.registrationEnd && event.registrationEnd <= now)
  )
    throw new HttpError(409, "Registration is closed.");
}
async function cart(
  tx: Transaction,
  body: CheckoutBody,
  userId: string,
  complimentary: boolean,
) {
  const event = await lockEvent(tx, body.eventId);
  if (!complimentary) {
    const [member] = await tx
      .select({ id: eventTeamMembers.id })
      .from(eventTeamMembers)
      .where(
        and(
          eq(eventTeamMembers.eventId, event.id),
          eq(eventTeamMembers.userId, userId),
        ),
      )
      .limit(1);
    if (event.organizationId === userId || member)
      throw new HttpError(
        403,
        "Event organizers and team members must use manual registration.",
      );
  }
  registrationOpen(event);
  await expireHolds(tx, event.id);
  if (!body.purchases.length || body.purchases.length > 20)
    throw new HttpError(400, "Choose between 1 and 20 tickets.");
  const tiers = await tx
    .select()
    .from(ticketTypes)
    .where(
      and(
        eq(ticketTypes.eventId, event.id),
        inArray(
          ticketTypes.id,
          body.purchases.map((p) => p.ticketTypeId),
        ),
      ),
    )
    .orderBy(ticketTypes.id);
  const requested = new Map<string, number>();
  const coupon = await validateCoupon(tx, event.id, body.code);
  const fields = await tx
    .select()
    .from(formFields)
    .where(eq(formFields.eventId, event.id));
  const now = new Date();
  for (const purchase of body.purchases) {
    const tier = tiers.find((t) => t.id === purchase.ticketTypeId);
    if (!tier)
      throw new HttpError(400, "Ticket type does not belong to this event.");
    if (
      !complimentary &&
      ((tier.saleStart && tier.saleStart > now) ||
        (tier.saleEnd && tier.saleEnd <= now))
    )
      throw new HttpError(409, "This ticket is not on sale.");
    if (
      tier.isHidden &&
      !complimentary &&
      (!coupon ||
        (coupon.ticketTypeIds.length > 0 &&
          !coupon.ticketTypeIds.includes(tier.id)))
    )
      throw new HttpError(403, "An eligible access code is required.");
    if (!complimentary) validateFormResponses(fields, purchase.formResponses);
    for (const response of purchase.formResponses || []) {
      if (fields.find((f) => f.id === response.fieldId)?.fieldType !== "file")
        continue;
      const [upload] = await tx
        .select()
        .from(uploads)
        .where(
          and(
            eq(uploads.id, response.responseValue.replace(/^file:/, "")),
            eq(uploads.userId, userId),
            eq(uploads.eventId, event.id),
            eq(uploads.fieldId, response.fieldId),
          ),
        );
      if (!upload?.completedAt)
        throw new HttpError(
          400,
          "Finish uploading your registration file first.",
        );
    }
    requested.set(tier.id, (requested.get(tier.id) || 0) + 1);
  }
  assertCapacity(
    event.capacity,
    await allocatedByTier(tx, event.id),
    requested,
    tiers,
  );
  const policy = pricingPolicy();
  const pricing = priceCart(
    body.purchases.map((p) => ({
      ticketTypeId: p.ticketTypeId,
      unitPricePaise: complimentary
        ? 0
        : toPaise(tiers.find((t) => t.id === p.ticketTypeId)!.price),
    })),
    policy,
    coupon,
  );
  return { event, tiers, coupon, policy, ...pricing };
}
export async function quoteCheckout(body: CheckoutBody, userId: string) {
  return db.transaction(async (tx) => {
    const result = await cart(tx, body, userId, false);
    return {
      totalPaise: result.totalPaise,
      currency: "INR",
      lines: result.lines,
      policy: result.policy,
    };
  });
}
export async function createCheckout(
  body: CheckoutBody,
  userId: string,
  key: string,
  complimentary = false,
) {
  const hash = fingerprint({ ...body, complimentary });
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${userId + ":" + key}, 0))`,
    );
    await lockEvent(tx, body.eventId);
    const [previous] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.idempotencyKey, key)));
    if (previous) {
      if (previous.requestHash !== hash)
        throw new HttpError(
          409,
          "Idempotency key was already used for a different checkout.",
        );
      return previous;
    }
    const result = await cart(tx, body, userId, complimentary);
    if (!complimentary && result.totalPaise > 0) {
      const [held] = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.eventId, body.eventId),
            eq(orders.userId, userId),
            eq(orders.reservationState, "held"),
            gt(orders.expiresAt, sql`now()`),
          ),
        )
        .limit(1);
      if (held)
        throw new HttpError(
          409,
          "You already have an active checkout for this event. Resume or cancel that reservation first.",
        );
    }
    const isFree = result.totalPaise === 0;
    if (
      !isFree &&
      process.env.NODE_ENV !== "test" &&
      (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
    )
      throw new HttpError(503, "Paid registration is not configured yet.");
    const requireApproval = !complimentary && result.event.requireApproval;
    const [order] = await tx
      .insert(orders)
      .values({
        eventId: body.eventId,
        userId,
        totalPaise: result.totalPaise,
        totalAmount: fromPaise(result.totalPaise),
        currency: "INR",
        paymentStatus: isFree ? "success" : "pending",
        paymentProvider: complimentary
          ? "complimentary"
          : isFree
            ? "free"
            : "razorpay",
        reservationState: isFree ? "confirmed" : "held",
        registrationStatus: isFree
          ? requireApproval
            ? "pending_approval"
            : "confirmed"
          : "checkout",
        requireApproval,
        idempotencyKey: key,
        requestHash: hash,
        couponId: result.coupon?.id,
        pricingPolicy: result.policy,
        expiresAt: isFree ? null : sql`now() + interval '12 minutes'`,
        initializationState: isFree ? "ready" : "new",
      })
      .returning();
    if (!order) throw new Error("Order creation failed.");
    for (const [index, purchase] of body.purchases.entries()) {
      const tier = result.tiers.find((t) => t.id === purchase.ticketTypeId)!;
      const line = result.lines[index]!;
      const [ticket] = await tx
        .insert(tickets)
        .values({
          orderId: order.id,
          eventId: order.eventId,
          ticketTypeId: tier.id,
          userId,
          qrCode: randomUUID(),
          status: isFree
            ? requireApproval
              ? "pending_approval"
              : "active"
            : "pending",
        })
        .returning();
      await tx.insert(orderItems).values({
        ...line,
        orderId: order.id,
        ticketId: ticket!.id,
        name: tier.name,
        policy: {
          isRefundable: tier.isRefundable,
          refundableUntil: tier.refundableUntil?.toISOString() ?? null,
          isTransferable: tier.isTransferable,
          maxTransfers: tier.maxTransfers,
        },
      });
      if (purchase.formResponses?.length)
        await tx.insert(ticketFormResponses).values(
          purchase.formResponses.map((response) => ({
            ...response,
            ticketId: ticket!.id,
          })),
        );
    }
    if (isFree)
      await enqueueOrderEmail(
        tx,
        order.id,
        requireApproval ? "pending" : "confirmation",
      );
    await emitEvent(
      tx,
      order.eventId,
      isFree ? "registration.changed" : "availability.changed",
    );
    return order;
  });
}
export async function initializeGatewayOrder(orderId: string) {
  const [claimed] = await db
    .update(orders)
    .set({ initializationState: "creating", updatedAt: new Date() })
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.initializationState, "new"),
        eq(orders.reservationState, "held"),
      ),
    )
    .returning();
  if (!claimed) return;
  try {
    const remote = await gateway().createOrder(claimed.totalPaise, claimed.id);
    if (
      remote.amount !== claimed.totalPaise ||
      remote.currency !== claimed.currency
    )
      throw new Error("Gateway order does not match the quote.");
    await db
      .update(orders)
      .set({
        paymentIntentId: remote.id,
        initializationState: "ready",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, claimed.id));
  } catch {
    // A request may have reached the gateway even if its response was lost. Never create another blindly.
    await db
      .update(orders)
      .set({ initializationState: "uncertain", updatedAt: new Date() })
      .where(eq(orders.id, claimed.id));
  }
}
export async function checkoutStatus(orderId: string, userId: string) {
  const [known] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));
  if (!known) throw new HttpError(404, "Order not found.");
  await db.transaction(async (tx) => {
    await lockEvent(tx, known.eventId);
    await expireHolds(tx, known.eventId);
  });
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  const issued = await db
    .select()
    .from(tickets)
    .where(eq(tickets.orderId, orderId));
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  return {
    order,
    tickets: issued,
    items,
    serverTime: new Date().toISOString(),
    razorpayOrder:
      order?.paymentIntentId && order.reservationState === "held"
        ? {
            id: order.paymentIntentId,
            amount: order.totalPaise,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
          }
        : null,
  };
}
export async function cancelCheckout(orderId: string, userId: string) {
  const [known] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));
  if (!known) throw new HttpError(404, "Order not found.");
  await db.transaction(async (tx) => {
    await lockEvent(tx, known.eventId);
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    if (order) await releaseHold(tx, order);
  });
  return checkoutStatus(orderId, userId);
}
