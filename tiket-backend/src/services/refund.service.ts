import db from "@db";
import {
  events,
  orderItems,
  orders,
  refunds,
  tickets,
  ticketTypes,
} from "@db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database, Transaction } from "../db/types";
import { HttpError } from "../utils/errors";
import { fingerprint } from "./checkout.service";
import { emitEvent, lockEvent } from "./inventory.service";
import { gateway, type GatewayRefund } from "./gateway.service";
import { publishEventChange } from "./realtime.service";

export interface RefundCommand {
  amountPaise: number;
  reason: string;
  voidTicketIds?: string[];
}

export async function getOrganizerUnsettledBalancePaise(
  eventId: string,
  client: Database | Transaction = db,
): Promise<number> {
  const eligibleOrders = await client
    .select({
      id: orders.id,
    })
    .from(orders)
    .where(
      and(
        eq(orders.eventId, eventId),
        inArray(orders.paymentStatus, ["success", "partially_refunded"]),
        inArray(orders.transferStatus, ["pending", "processed"]),
      ),
    );

  const orderIds = eligibleOrders.map((o) => o.id);
  if (orderIds.length === 0) return 0;

  const items = await client
    .select({
      organizerNetPaise: orderItems.organizerNetPaise,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds));

  const totalUnsettledPaise = items.reduce(
    (sum, item) => sum + (item.organizerNetPaise || 0),
    0,
  );

  const activeRefunds = await client
    .select({
      amountPaise: refunds.amountPaise,
    })
    .from(refunds)
    .where(
      and(
        inArray(refunds.orderId, orderIds),
        inArray(refunds.status, [
          "requested",
          "processing",
          "uncertain",
          "processed",
        ]),
      ),
    );

  const totalRefundedPaise = activeRefunds.reduce(
    (sum, r) => sum + r.amountPaise,
    0,
  );

  return Math.max(0, totalUnsettledPaise - totalRefundedPaise);
}

export async function queueRefund(
  tx: Transaction,
  order: typeof orders.$inferSelect,
  key: string,
  command: RefundCommand,
  requestedBy: string | null,
  paymentId = order.paymentId,
) {
  if (!paymentId)
    throw new HttpError(409, "No captured payment is available to refund.");
  const hash = fingerprint(command);
  const [previous] = await tx
    .select()
    .from(refunds)
    .where(and(eq(refunds.orderId, order.id), eq(refunds.commandKey, key)));
  if (previous) {
    if (previous.requestHash !== hash)
      throw new HttpError(409, "Refund key was used for a different request.");
    return previous;
  }
  const [reserved] = await tx
    .select({
      amount: sql<number>`coalesce(sum(${refunds.amountPaise}), 0)::int`,
    })
    .from(refunds)
    .where(
      and(
        eq(refunds.paymentId, paymentId),
        inArray(refunds.status, [
          "requested",
          "processing",
          "uncertain",
          "processed",
        ]),
      ),
    );
  if (
    !Number.isInteger(command.amountPaise) ||
    command.amountPaise <= 0 ||
    command.amountPaise + Number(reserved?.amount || 0) > order.totalPaise
  )
    throw new HttpError(400, "Refund exceeds the remaining captured amount.");
  const selected = await tx
    .select()
    .from(tickets)
    .where(eq(tickets.orderId, order.id));
  const voidIds =
    command.voidTicketIds ??
    (command.amountPaise === order.totalPaise ? selected.map((t) => t.id) : []);
  if (
    new Set(voidIds).size !== voidIds.length ||
    voidIds.some((id) => !selected.some((t) => t.id === id))
  )
    throw new HttpError(400, "Refund tickets must belong to this order.");

  if (requestedBy) {
    // Gate 1: Check all ticket tiers being refunded have allowRefunds === true
    const ticketTiers = await tx
      .select({
        ticketId: tickets.id,
        allowRefunds: ticketTypes.allowRefunds,
      })
      .from(tickets)
      .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
      .where(eq(tickets.orderId, order.id));

    const targetTiers =
      voidIds.length > 0
        ? ticketTiers.filter((t) => voidIds.includes(t.ticketId))
        : ticketTiers;

    if (targetTiers.some((t) => !t.allowRefunds)) {
      throw new HttpError(
        400,
        "Refunds are not enabled for this ticket tier. Please contact the organizer directly.",
      );
    }

    // Gate 2: Verify event has not started yet
    const [eventRow] = await tx
      .select({ startDate: events.startDate })
      .from(events)
      .where(eq(events.id, order.eventId));

    if (eventRow && new Date() >= new Date(eventRow.startDate)) {
      throw new HttpError(
        400,
        "Automated refunds are disabled once the event has started. Please handle any refund directly with the attendee.",
      );
    }

    // Gate 3: Verify organizer has sufficient unsettled balance
    const unsettledPaise = await getOrganizerUnsettledBalancePaise(
      order.eventId,
      tx,
    );
    if (unsettledPaise < command.amountPaise) {
      throw new HttpError(
        400,
        "Insufficient unsettled balance in the Razorpay settlement cycle to issue this refund. Please refund the attendee directly.",
      );
    }
  }
  const [refund] = await tx
    .insert(refunds)
    .values({
      orderId: order.id,
      requestedBy,
      commandKey: key,
      requestHash: hash,
      paymentId,
      amountPaise: command.amountPaise,
      reason: command.reason,
      voidTicketIds: voidIds,
    })
    .returning();
  // Cancel admission immediately; money and restocking remain separately recorded.
  if (voidIds.length)
    await tx
      .update(tickets)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(inArray(tickets.id, voidIds));
  if (
    paymentId === order.paymentId &&
    command.amountPaise + Number(reserved?.amount || 0) === order.totalPaise
  ) {
    await tx
      .update(orders)
      .set({
        reservationState: "released",
        registrationStatus:
          order.registrationStatus === "declined"
            ? "declined"
            : "refund_pending",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
    await tx
      .update(tickets)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(tickets.orderId, order.id));
  }
  await emitEvent(tx, order.eventId, "refund.requested");
  return refund!;
}
export async function requestRefund(
  orderId: string,
  actor: string,
  key: string,
  command: RefundCommand,
) {
  const [known] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!known) throw new HttpError(404, "Order not found.");
  const refund = await db.transaction(async (tx) => {
    await lockEvent(tx, known.eventId);
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    return queueRefund(tx, order!, key, command, actor);
  });
  void publishEventChange(known.eventId);
  return refund;
}
export async function applyRefund(tx: Transaction, remote: GatewayRefund) {
  let [refund] = await tx
    .select()
    .from(refunds)
    .where(eq(refunds.providerRefundId, remote.id));
  if (!refund && remote.notes.commandId)
    [refund] = await tx
      .select()
      .from(refunds)
      .where(eq(refunds.id, remote.notes.commandId));
  if (!refund) {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.paymentId, remote.payment_id));
    if (!order)
      throw new HttpError(409, "Refund payment has not been reconciled yet.");
    [refund] = await tx
      .insert(refunds)
      .values({
        orderId: order.id,
        commandKey: `external:${remote.id}`,
        requestHash: fingerprint(remote.id),
        paymentId: remote.payment_id,
        providerRefundId: remote.id,
        amountPaise: remote.amount,
        reason: "Refund created in Razorpay",
        voidTicketIds: [],
      })
      .returning();
  }
  if (
    !refund ||
    refund.paymentId !== remote.payment_id ||
    refund.amountPaise !== remote.amount
  )
    throw new HttpError(409, "Refund entity does not match the command.");
  if (refund.status === "processed") return;
  const status =
    remote.status === "processed"
      ? "processed"
      : remote.status === "failed"
        ? "failed"
        : "processing";
  await tx
    .update(refunds)
    .set({
      providerRefundId: remote.id,
      status,
      error: null,
      updatedAt: new Date(),
    })
    .where(eq(refunds.id, refund.id));
  const [order] = await tx
    .select()
    .from(orders)
    .where(eq(orders.id, refund.orderId));
  if (order?.paymentId === remote.payment_id && status === "processed") {
    const [sum] = await tx
      .select({
        amount: sql<number>`coalesce(sum(${refunds.amountPaise}), 0)::int`,
      })
      .from(refunds)
      .where(
        and(
          eq(refunds.paymentId, remote.payment_id),
          eq(refunds.status, "processed"),
        ),
      );
    const full = Number(sum?.amount || 0) >= order.totalPaise;
    await tx
      .update(orders)
      .set({
        paymentStatus: full ? "refunded" : "partially_refunded",
        ...(full
          ? {
              reservationState: "released" as const,
              registrationStatus:
                order.registrationStatus === "declined"
                  ? ("declined" as const)
                  : ("cancelled" as const),
              transferStatus: "reversed" as const,
            }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
    if (full)
      await tx
        .update(tickets)
        .set({ status: "refunded", updatedAt: new Date() })
        .where(eq(tickets.orderId, order.id));
  }
  if (order) await emitEvent(tx, order.eventId, "refund.changed");
}
export async function processRefunds() {
  const pending = await db
    .select()
    .from(refunds)
    .where(inArray(refunds.status, ["requested", "processing", "uncertain"]))
    .orderBy(refunds.updatedAt)
    .limit(100);
  for (const refund of pending) {
    try {
      if (refund.status !== "requested") {
        await db
          .update(refunds)
          .set({ updatedAt: new Date() })
          .where(eq(refunds.id, refund.id));
        // Reconcile unknown outcomes; do not repeat a potentially successful remote call.
        const match = (await gateway().refunds(refund.paymentId)).find(
          (r) =>
            r.id === refund.providerRefundId || r.notes.commandId === refund.id,
        );
        if (match) await applyRemote(refund.orderId, match);
        continue;
      }
      const [claim] = await db
        .update(refunds)
        .set({ status: "processing", updatedAt: new Date() })
        .where(and(eq(refunds.id, refund.id), eq(refunds.status, "requested")))
        .returning();
      if (!claim) continue;
      const remote = await gateway().createRefund(
        refund.paymentId,
        refund.amountPaise,
        refund.id,
        { reverseAll: true },
      );
      await applyRemote(refund.orderId, remote);
    } catch (error) {
      const rejected = Boolean(
        error &&
        typeof error === "object" &&
        "statusCode" in error &&
        typeof error.statusCode === "number" &&
        [400, 401, 403, 404, 422, 429].includes(error.statusCode),
      );
      await db
        .update(refunds)
        .set({
          status: rejected ? "failed" : "uncertain",
          error: rejected
            ? "Gateway rejected the refund request. Correct the configuration or request and retry."
            : error instanceof Error
              ? error.message
              : "Refund outcome requires reconciliation.",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(refunds.id, refund.id),
            inArray(refunds.status, ["processing", "uncertain"]),
          ),
        );
    }
  }
}
async function applyRemote(orderId: string, remote: GatewayRefund) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (order) {
    await db.transaction(async (tx) => {
      await lockEvent(tx, order.eventId);
      await applyRefund(tx, remote);
    });
    void publishEventChange(order.eventId);
  }
}
