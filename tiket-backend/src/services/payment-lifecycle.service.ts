import db from "@db";
import {
  orders,
  paymentAttempts,
  tickets,
  webhookInbox,
} from "@db/schema";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Transaction } from "../db/types";
import { HttpError } from "../utils/errors";
import {
  emitEvent,
  lockEvent,
  releaseHold,
} from "./inventory.service";
import {
  gateway,
  type GatewayPayment,
  type NormalizedWebhookEvent,
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
    (current.paymentProvider !== gateway().providerName &&
      current.paymentProvider !== "razorpay") ||
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

export async function acceptWebhook(
  raw: Buffer,
  headersOrSignature: Record<string, string | string[] | undefined> | string,
  maybeEventId?: string,
) {
  const headers: Record<string, string | string[] | undefined> =
    typeof headersOrSignature === "string"
      ? {
          "x-razorpay-signature": headersOrSignature,
          "x-razorpay-event-id": maybeEventId,
        }
      : headersOrSignature;

  const { eventId, normalizedEvent } = gateway().verifyAndParseWebhook(
    raw,
    headers,
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch {
    throw new HttpError(400, "Malformed webhook JSON.");
  }
  const rawPayload = object(parsed);
  const payloadToStore = {
    ...rawPayload,
    _normalized: normalizedEvent,
  };

  await db
    .insert(webhookInbox)
    .values({ id: eventId, payload: payloadToStore })
    .onConflictDoNothing();

  const [stored] = await db
    .select()
    .from(webhookInbox)
    .where(eq(webhookInbox.id, eventId));

  if (!stored || fingerprint(stored.payload) !== fingerprint(payloadToStore))
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

        const payloadObj = object(entry.payload);
        let normalized: NormalizedWebhookEvent;

        if (
          payloadObj._normalized &&
          typeof payloadObj._normalized === "object"
        ) {
          normalized = payloadObj._normalized as NormalizedWebhookEvent;
        } else if (
          payloadObj.normalized &&
          typeof payloadObj.normalized === "object"
        ) {
          normalized = payloadObj.normalized as NormalizedWebhookEvent;
        } else if (
          "kind" in payloadObj &&
          (payloadObj.kind === "payment" ||
            payloadObj.kind === "refund" ||
            payloadObj.kind === "ignored")
        ) {
          normalized = payloadObj as unknown as NormalizedWebhookEvent;
        } else {
          // Direct test fixture insertion or legacy row: parse and normalize via gateway
          const rawBuffer = Buffer.from(JSON.stringify(entry.payload));
          const parsed = gateway().verifyAndParseWebhook(rawBuffer, {
            "x-skip-signature-verify": "true",
            "x-razorpay-event-id": entry.id,
          });
          normalized = parsed.normalizedEvent;
        }

        if (normalized.kind === "payment") {
          await applyPayment(tx, normalized.payment);
        } else if (normalized.kind === "refund") {
          const remote = normalized.refund;
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
      and(
        inArray(orders.paymentProvider, [gateway().providerName, "razorpay"]),
        isNull(orders.paymentId),
      ),
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
        inArray(orders.paymentProvider, [gateway().providerName, "razorpay"]),
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
