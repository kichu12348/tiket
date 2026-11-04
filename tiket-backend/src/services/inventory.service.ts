import db from "@db";
import {
  coupons,
  domainEvents,
  events,
  eventBlacklist,
  orders,
  tickets,
} from "@db/schema";
import type { Database, Transaction } from "../db/types";
import { and, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { HttpError } from "../utils/errors";

export async function lockEvent(tx: Transaction, eventId: string) {
  const [event] = await tx
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .for("update");
  if (!event) throw new HttpError(404, "Event not found.");
  return event;
}
export async function emitEvent(
  tx: Transaction,
  eventId: string,
  type: string,
) {
  const [event] = await tx
    .update(events)
    .set({ version: sql`${events.version} + 1` })
    .where(eq(events.id, eventId))
    .returning({ version: events.version });
  await tx
    .insert(domainEvents)
    .values({ eventId, version: event!.version, type });
}
export async function releaseHold(
  tx: Transaction,
  order: typeof orders.$inferSelect,
  status: "expired" | "cancelled" = "cancelled",
) {
  if (order.reservationState !== "held") return;
  await tx
    .update(orders)
    .set({
      reservationState: "released",
      registrationStatus: status,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));
  await tx
    .update(tickets)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(tickets.orderId, order.id), eq(tickets.status, "pending")));
  await emitEvent(tx, order.eventId, "availability.changed");
}
export async function expireHolds(tx: Transaction, eventId: string) {
  const expired = await tx
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.eventId, eventId),
        eq(orders.reservationState, "held"),
        lte(orders.expiresAt, sql`now()`),
      ),
    );
  for (const order of expired) await releaseHold(tx, order, "expired");
}
export async function allocatedByTier(tx: Transaction, eventId: string) {
  const rows = await tx
    .select({ tierId: tickets.ticketTypeId, count: sql<number>`count(*)::int` })
    .from(tickets)
    .innerJoin(orders, eq(tickets.orderId, orders.id))
    .where(
      and(
        eq(tickets.eventId, eventId),
        or(
          and(
            eq(orders.reservationState, "confirmed"),
            inArray(tickets.status, ["active", "used", "pending_approval"]),
          ),
          and(
            eq(orders.reservationState, "held"),
            gt(orders.expiresAt, sql`now()`),
            eq(tickets.status, "pending"),
          ),
        ),
      ),
    )
    .groupBy(tickets.ticketTypeId);
  return new Map(rows.map((row) => [row.tierId, Number(row.count)]));
}
export async function assertNotBlacklisted(
  tx: Database,
  event: { id: string; organizationId: string },
  user: { id: string; email: string },
) {
  const emailLower = user.email.toLowerCase().trim();
  const domain = emailLower.includes("@")
    ? "@" + emailLower.split("@")[1]?.toLowerCase()
    : "";

  const matchConditions = [
    eq(eventBlacklist.targetUserId, user.id),
    eq(sql`lower(${eventBlacklist.pattern})`, emailLower),
  ];
  if (domain) {
    matchConditions.push(eq(sql`lower(${eventBlacklist.pattern})`, domain));
  }

  const matches = await tx
    .select({ id: eventBlacklist.id })
    .from(eventBlacklist)
    .where(
      and(
        eq(eventBlacklist.organizationId, event.organizationId),
        or(
          eq(eventBlacklist.eventId, event.id),
          isNull(eventBlacklist.eventId),
        ),
        or(...matchConditions),
      ),
    )
    .limit(1);

  if (matches.length > 0) {
    throw new HttpError(
      403,
      "You are restricted from registering for this event.",
    );
  }
}

export function assertCapacity(
  eventCapacity: number | null,
  allocated: Map<string, number>,
  requested: Map<string, number>,
  tiers: {
    id: string;
    quantityLimit: number | null;
    poolName?: string | null;
    poolCapacity?: number | null;
  }[],
  overbookingLimit = 0,
) {
  const used = [...allocated.values()].reduce((a, b) => a + b, 0);
  const wanted = [...requested.values()].reduce((a, b) => a + b, 0);
  const maxCapacity =
    eventCapacity !== null ? eventCapacity + overbookingLimit : null;
  if (maxCapacity !== null && used + wanted > maxCapacity)
    throw new HttpError(409, "Event is sold out.");

  const poolTotals = new Map<
    string,
    { capacity: number; totalAllocated: number; totalRequested: number }
  >();

  for (const tier of tiers) {
    if (
      tier.poolName &&
      tier.poolCapacity !== null &&
      tier.poolCapacity !== undefined
    ) {
      const existing = poolTotals.get(tier.poolName) || {
        capacity: tier.poolCapacity,
        totalAllocated: 0,
        totalRequested: 0,
      };
      existing.totalAllocated += allocated.get(tier.id) || 0;
      existing.totalRequested += requested.get(tier.id) || 0;
      poolTotals.set(tier.poolName, existing);
    }
  }

  for (const [, pool] of poolTotals) {
    if (
      pool.totalRequested > 0 &&
      pool.totalAllocated + pool.totalRequested > pool.capacity
    ) {
      throw new HttpError(409, "Selected category pool is sold out.");
    }
  }

  for (const tier of tiers)
    if (
      tier.quantityLimit !== null &&
      (allocated.get(tier.id) || 0) + (requested.get(tier.id) || 0) >
        tier.quantityLimit
    )
      throw new HttpError(
        409,
        "Not enough tickets remain in the selected tier.",
      );
}
export async function validateCoupon(
  tx: Transaction,
  eventId: string,
  code?: string,
) {
  if (!code) return undefined;
  const [coupon] = await tx
    .select()
    .from(coupons)
    .where(
      and(
        eq(coupons.eventId, eventId),
        eq(coupons.code, code.trim().toUpperCase()),
      ),
    );
  const now = new Date();
  if (
    !coupon ||
    !coupon.isActive ||
    (coupon.startsAt && coupon.startsAt > now) ||
    (coupon.endsAt && coupon.endsAt <= now)
  )
    throw new HttpError(400, "Code is invalid or expired.");
  const [usage] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(
      and(
        eq(orders.couponId, coupon.id),
        or(
          eq(orders.reservationState, "confirmed"),
          and(
            eq(orders.reservationState, "held"),
            gt(orders.expiresAt, sql`now()`),
          ),
        ),
      ),
    );
  if (coupon.maxUses !== null && Number(usage?.count || 0) >= coupon.maxUses)
    throw new HttpError(409, "Code usage limit reached.");
  return coupon;
}
export async function cleanupExpiredHolds() {
  const candidates = await db
    .selectDistinct({ eventId: orders.eventId })
    .from(orders)
    .where(
      and(
        eq(orders.reservationState, "held"),
        lte(orders.expiresAt, sql`now()`),
      ),
    )
    .limit(100);
  for (const { eventId } of candidates)
    await db.transaction(async (tx) => {
      await lockEvent(tx, eventId);
      await expireHolds(tx, eventId);
    });
}
