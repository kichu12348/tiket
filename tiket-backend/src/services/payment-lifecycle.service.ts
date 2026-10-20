import db from "@db";
import {
  orderItems,
  orders,
  paymentAttempts,
  refunds,
  tickets,
  webhookInbox,
} from "@db/schema";
import { asc, and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Transaction } from "../db/types";
import { HttpError } from "../utils/errors";
import {
  emitEvent,
  expireHolds,
  lockEvent,
  releaseHold,
} from "./inventory.service";
import {
  gateway,
  validHmac,
  type GatewayPayment,
  type GatewayRefund,
} from "./gateway.service";
import { applyRefund, queueRefund } from "./refund.service";
import { fingerprint } from "./checkout.service";
import { enqueueOrderEmail } from "./notifications.service";

export async function applyPayment(tx: Transaction, remote: GatewayPayment) {
  const [order] = await tx
    .select()
    .from(orders)
    .where(eq(orders.paymentIntentId, remote.order_id));
  if (!order)
    throw new HttpError(409, "Gateway order mapping is not available yet.");
  const event = await lockEvent(tx, order.eventId);
  const [current] = await tx
    .select()
    .from(orders)
    .where(eq(orders.id, order.id));
  if (
    !current ||
    current.paymentProvider !== "razorpay" ||
    remote.amount !== current.totalPaise ||
    remote.currency !== current.currency
  )
    throw new HttpError(409, "Payment does not match its order.");
  const [attempt] = await tx
    .select()
    .from(paymentAttempts)
    .where(eq(paymentAttempts.id, remote.id));
  if (attempt && attempt.orderId !== order.id)
    throw new HttpError(409, "Payment is already attached to another order.");
  if (
    remote.status !== "captured" &&
    remote.status !== "failed" &&
    remote.status !== "authorized"
  )
    return;
  if (attempt?.status === "captured" && remote.status !== "captured") return;
  await tx
    .insert(paymentAttempts)
    .values({
      id: remote.id,
      orderId: current.id,
      amountPaise: remote.amount,
      status: remote.status,
    })
    .onConflictDoUpdate({
      target: paymentAttempts.id,
      set: { status: remote.status },
    });
  if (remote.status === "authorized") return;
  if (remote.status === "failed") {
    if (!current.paymentId && current.paymentStatus === "pending") {
      await tx
        .update(orders)
        .set({ paymentStatus: "failed", updatedAt: new Date() })
        .where(eq(orders.id, current.id));
      await releaseHold(tx, current);
    }
    return;
  }
  if (current.paymentId === remote.id) return;
  if (current.paymentId) {
    await queueRefund(
      tx,
      current,
      `duplicate:${remote.id}`,
      {
        amountPaise: remote.amount,
        reason: "Duplicate captured payment",
        voidTicketIds: [],
      },
      null,
      remote.id,
    );
    return;
  }
  await tx
    .update(orders)
    .set({
      paymentId: remote.id,
      paymentStatus: "success",
      updatedAt: new Date(),
    })
    .where(eq(orders.id, current.id));
  const [clock] = await tx
    .select({ now: sql<string>`now()` })
    .from(orders)
    .where(eq(orders.id, current.id));
  const eligible =
    current.reservationState === "held" &&
    current.expiresAt &&
    current.expiresAt > new Date(clock!.now) &&
    event.status === "published";
  if (!eligible) {
    await releaseHold(tx, current, "expired");
    await tx
      .update(orders)
      .set({
        registrationStatus: "refund_pending",
        reservationState: "released",
      })
      .where(eq(orders.id, current.id));
    await queueRefund(
      tx,
      { ...current, paymentId: remote.id },
      `late:${remote.id}`,
      {
        amountPaise: remote.amount,
        reason: "Payment arrived after the checkout reservation ended",
      },
      null,
      remote.id,
    );
    return;
  }
  const status = current.requireApproval ? "pending_approval" : "active";
  await tx
    .update(orders)
    .set({
      reservationState: "confirmed",
      registrationStatus: current.requireApproval
        ? "pending_approval"
        : "confirmed",
      expiresAt: null,
    })
    .where(eq(orders.id, current.id));
  await tx
    .update(tickets)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(tickets.orderId, current.id), eq(tickets.status, "pending")));
  await enqueueOrderEmail(
    tx,
    current.id,
    current.requireApproval ? "pending" : "confirmation",
  );
  await emitEvent(tx, current.eventId, "payment.captured");
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new HttpError(400, "Invalid gateway event payload.");
  return value as Record<string, unknown>;
}
function string(value: unknown) {
  if (typeof value !== "string" || !value)
    throw new HttpError(400, "Invalid gateway entity.");
  return value;
}
function amount(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new HttpError(400, "Invalid gateway amount.");
  return value;
}
export async function acceptWebhook(
  raw: Buffer,
  signature: string,
  eventId: string,
) {
  if (!validHmac(raw, signature, process.env.RAZORPAY_WEBHOOK_SECRET))
    throw new HttpError(400, "Invalid webhook signature.");
  if (!/^[A-Za-z0-9_-]{1,255}$/.test(eventId))
    throw new HttpError(400, "Missing gateway event ID.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch {
    throw new HttpError(400, "Malformed webhook JSON.");
  }
  const payload = object(parsed);
  if (
    process.env.RAZORPAY_ACCOUNT_ID &&
    payload.account_id !== process.env.RAZORPAY_ACCOUNT_ID
  )
    throw new HttpError(400, "Unexpected Razorpay account.");
  await db
    .insert(webhookInbox)
    .values({ id: eventId, payload })
    .onConflictDoNothing();
  const [stored] = await db
    .select()
    .from(webhookInbox)
    .where(eq(webhookInbox.id, eventId));
  if (!stored || fingerprint(stored.payload) !== fingerprint(payload))
    throw new HttpError(409, "Webhook ID conflicts with another payload.");
}
export async function processInbox() {
  const pending = await db
    .select({ id: webhookInbox.id })
    .from(webhookInbox)
    .where(isNull(webhookInbox.processedAt))
    .orderBy(sql`${webhookInbox.lastAttemptAt} asc nulls first`)
    .limit(100);
  for (const { id } of pending) {
    try {
      await db.transaction(async (tx) => {
        const [entry] = await tx
          .select()
          .from(webhookInbox)
          .where(and(eq(webhookInbox.id, id), isNull(webhookInbox.processedAt)))
          .for("update", { skipLocked: true });
        if (!entry) return;
        const name = string(entry.payload.event);
        if (
          [
            "payment.captured",
            "payment.failed",
            "payment.authorized",
            "order.paid",
          ].includes(name)
        ) {
          const entity = object(
            object(object(entry.payload.payload).payment).entity,
          );
          await applyPayment(tx, {
            id: string(entity.id),
            order_id: string(entity.order_id),
            amount: amount(entity.amount),
            currency: string(entity.currency),
            status: string(entity.status),
            amount_refunded: amount(entity.amount_refunded ?? 0),
          });
        } else if (
          ["refund.created", "refund.processed", "refund.failed"].includes(name)
        ) {
          const entity = object(
            object(object(entry.payload.payload).refund).entity,
          );
          const remote: GatewayRefund = {
            id: string(entity.id),
            payment_id: string(entity.payment_id),
            amount: amount(entity.amount),
            status: string(entity.status),
            notes:
              entity.notes && !Array.isArray(entity.notes)
                ? Object.fromEntries(
                    Object.entries(object(entity.notes)).map(([k, v]) => [
                      k,
                      String(v),
                    ]),
                  )
                : {},
          };
          const [mapped] = await tx
            .select()
            .from(paymentAttempts)
            .where(eq(paymentAttempts.id, remote.payment_id));
          if (!mapped)
            throw new HttpError(
              409,
              "Refund arrived before its captured payment.",
            );
          const [order] = await tx
            .select()
            .from(orders)
            .where(eq(orders.id, mapped.orderId));
          await lockEvent(tx, order!.eventId);
          await applyRefund(tx, remote);
        }
        await tx
          .update(webhookInbox)
          .set({
            processedAt: new Date(),
            lastAttemptAt: new Date(),
            error: null,
            attempts: entry.attempts + 1,
          })
          .where(eq(webhookInbox.id, id));
      });
    } catch (error) {
      await db
        .update(webhookInbox)
        .set({
          lastAttemptAt: new Date(),
          attempts: sql`${webhookInbox.attempts} + 1`,
          error: error instanceof Error ? error.message : "Processing failed",
        })
        .where(eq(webhookInbox.id, id));
    }
  }
}
export async function reconcilePayments() {
  const pending = await db
    .select()
    .from(orders)
    .where(
      and(eq(orders.paymentProvider, "razorpay"), isNull(orders.paymentId)),
    )
    .orderBy(sql`${orders.lastReconciledAt} asc nulls first`)
    .limit(100);
  for (const order of pending) {
    await db
      .update(orders)
      .set({ lastReconciledAt: new Date() })
      .where(eq(orders.id, order.id));
    try {
      let remoteId = order.paymentIntentId;
      if (!remoteId && order.initializationState !== "new") {
        const remote = await gateway().findOrder(order.id);
        if (
          remote &&
          remote.amount === order.totalPaise &&
          remote.currency === order.currency
        ) {
          remoteId = remote.id;
          await db
            .update(orders)
            .set({ paymentIntentId: remote.id, initializationState: "ready" })
            .where(eq(orders.id, order.id));
        }
      }
      if (remoteId)
        for (const payment of await gateway().orderPayments(remoteId))
          await db.transaction((tx) => applyPayment(tx, payment));
    } catch {
      /* Durable state remains available for the next reconciliation pass. */
    }
  }
  // Refunds made directly in the provider dashboard are reconciled too.
  const captured = await db
    .select()
    .from(orders)
    .where(
      and(
        inArray(orders.paymentStatus, ["success", "partially_refunded"]),
        eq(orders.paymentProvider, "razorpay"),
      ),
    )
    .orderBy(sql`${orders.lastReconciledAt} asc nulls first`)
    .limit(100);
  for (const order of captured)
    if (order.paymentId) {
      await db
        .update(orders)
        .set({ lastReconciledAt: new Date() })
        .where(eq(orders.id, order.id));
      try {
        for (const refund of await gateway().refunds(order.paymentId))
          await db.transaction(async (tx) => {
            await lockEvent(tx, order.eventId);
            await applyRefund(tx, refund);
          });
      } catch {
        /* Retry next pass. */
      }
    }
}
