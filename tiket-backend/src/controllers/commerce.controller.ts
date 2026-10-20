import type { FastifyRequest } from "fastify";
import db from "@db";
import {
  coupons,
  events,
  eventRoles,
  eventTeamMembers,
  orders,
  orderItems,
  paymentAttempts,
  refunds,
  tickets,
  ticketTypes,
  users,
} from "@db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { HttpError } from "../utils/errors";
import {
  verifyEventPermission,
  type EventPermission,
} from "../utils/permissions";
import {
  allocatedByTier,
  emitEvent,
  expireHolds,
  lockEvent,
} from "../services/inventory.service";
import { commandKey } from "../services/checkout.service";
import {
  queueRefund,
  requestRefund,
  type RefundCommand,
} from "../services/refund.service";
import { enqueueOrderEmail } from "../services/notifications.service";

type EventRequest = FastifyRequest<{ Params: { eventId: string } }>;
export async function getPermissions(request: EventRequest) {
  await request.jwtVerify();
  const actor = (request.user as { id: string }).id;
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, request.params.eventId));
  if (!event) throw new HttpError(404, "Event not found.");
  if (event.organizationId === actor)
    return {
      owner: true,
      permissions: [
        "manage_tickets",
        "manage_forms",
        "view_guests",
        "manage_guests",
        "scan_tickets",
        "manage_settings",
        "view_analytics",
        "manage_team",
        "view_payments",
        "manage_refunds",
        "manage_emails",
      ],
    };
  const [role] = await db
    .select({ permissions: eventRoles.permissions })
    .from(eventTeamMembers)
    .innerJoin(
      eventRoles,
      and(
        eq(eventRoles.id, eventTeamMembers.roleId),
        eq(eventRoles.eventId, event.id),
      ),
    )
    .where(
      and(
        eq(eventTeamMembers.eventId, event.id),
        eq(eventTeamMembers.userId, actor),
      ),
    );
  if (!role) throw new HttpError(403, "Event team access is required.");
  return { owner: false, permissions: role.permissions };
}
export async function getPendingApprovals(request: EventRequest) {
  await authorize(request, request.params.eventId, "manage_guests");
  return db
    .select({
      id: orders.id,
      name: users.name,
      email: users.email,
      status: orders.registrationStatus,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(
      and(
        eq(orders.eventId, request.params.eventId),
        eq(orders.registrationStatus, "pending_approval"),
      ),
    )
    .limit(500);
}
async function authorize(
  request: FastifyRequest,
  eventId: string,
  permission: EventPermission,
) {
  await request.jwtVerify();
  const id = (request.user as { id: string }).id;
  if (!(await verifyEventPermission(eventId, id, permission)))
    throw new HttpError(403, "Permission denied.");
  return id;
}
export async function getFinance(request: EventRequest) {
  await authorize(request, request.params.eventId, "view_payments");
  const list = await db
    .select({
      order: orders,
      attendee: { name: users.name, email: users.email },
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.eventId, request.params.eventId))
    .orderBy(desc(orders.createdAt))
    .limit(500);
  const ids = list.map((row) => row.order.id);
  const attempts = ids.length
    ? await db
        .select()
        .from(paymentAttempts)
        .where(inArray(paymentAttempts.orderId, ids))
    : [];
  return {
    orders: list,
    capturedPaise: attempts
      .filter((attempt) => attempt.status === "captured")
      .reduce((sum, attempt) => sum + attempt.amountPaise, 0),
    refunds: ids.length
      ? await db.select().from(refunds).where(inArray(refunds.orderId, ids))
      : [],
    items: ids.length
      ? await db
          .select()
          .from(orderItems)
          .where(inArray(orderItems.orderId, ids))
      : [],
  };
}
export async function refundOrder(
  request: FastifyRequest<{
    Params: { eventId: string; orderId: string };
    Body: RefundCommand;
  }>,
) {
  const actor = await authorize(
    request,
    request.params.eventId,
    "manage_refunds",
  );
  const [order] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.id, request.params.orderId),
        eq(orders.eventId, request.params.eventId),
      ),
    );
  if (!order) throw new HttpError(404, "Order not found.");
  return requestRefund(
    order.id,
    actor,
    commandKey(request.headers["idempotency-key"]),
    request.body,
  );
}
export async function decideRegistration(
  request: FastifyRequest<{
    Params: { eventId: string; orderId: string };
    Body: { decision: "approve" | "decline" };
  }>,
) {
  const actor = await authorize(
    request,
    request.params.eventId,
    "manage_guests",
  );
  return db.transaction(async (tx) => {
    await lockEvent(tx, request.params.eventId);
    const [order] = await tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, request.params.orderId),
          eq(orders.eventId, request.params.eventId),
        ),
      );
    if (!order) throw new HttpError(404, "Order not found.");
    const status =
      request.body.decision === "approve" ? "confirmed" : "declined";
    if (order.registrationStatus === status) return order;
    if (
      order.registrationStatus !== "pending_approval" ||
      order.reservationState !== "confirmed"
    )
      throw new HttpError(409, "Registration is not awaiting approval.");
    if (status === "declined") {
      if (order.totalPaise > 0) {
        const existing = await tx
          .select()
          .from(refunds)
          .where(
            and(
              eq(refunds.orderId, order.id),
              inArray(refunds.status, [
                "requested",
                "processing",
                "uncertain",
                "processed",
              ]),
            ),
          );
        const balance =
          order.totalPaise -
          existing.reduce((sum, refund) => sum + refund.amountPaise, 0);
        if (balance > 0)
          await queueRefund(
            tx,
            order,
            `decline:${order.id}`,
            {
              amountPaise: balance,
              reason: "Registration declined by organizer",
            },
            actor,
          );
      }
      await tx
        .update(tickets)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(tickets.orderId, order.id));
    } else {
      if (!["success", "partially_refunded"].includes(order.paymentStatus))
        throw new HttpError(409, "Payment is not captured.");
      await tx
        .update(tickets)
        .set({ status: "active", updatedAt: new Date() })
        .where(
          and(
            eq(tickets.orderId, order.id),
            eq(tickets.status, "pending_approval"),
          ),
        );
    }
    const [updated] = await tx
      .update(orders)
      .set({
        registrationStatus: status,
        reservationState: status === "declined" ? "released" : "confirmed",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id))
      .returning();
    await enqueueOrderEmail(
      tx,
      order.id,
      status === "declined" ? "declined" : "confirmation",
    );
    await emitEvent(tx, order.eventId, "registration.changed");
    return updated;
  });
}
export interface CouponBody {
  code: string;
  kind: "fixed" | "percent" | "access";
  value: number;
  ticketTypeIds: string[];
  maxUses?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
}
export async function getCoupons(request: EventRequest) {
  await authorize(request, request.params.eventId, "manage_tickets");
  return db
    .select()
    .from(coupons)
    .where(eq(coupons.eventId, request.params.eventId));
}
export async function saveCoupon(
  request: FastifyRequest<{ Params: { eventId: string }; Body: CouponBody }>,
) {
  await authorize(request, request.params.eventId, "manage_tickets");
  const body = request.body;
  if (
    (body.kind === "percent" && body.value > 10000) ||
    (body.startsAt &&
      body.endsAt &&
      new Date(body.startsAt) >= new Date(body.endsAt))
  )
    throw new HttpError(400, "Invalid discount or date window.");
  return db.transaction(async (tx) => {
    await lockEvent(tx, request.params.eventId);
    const tiers = await tx
      .select()
      .from(ticketTypes)
      .where(eq(ticketTypes.eventId, request.params.eventId));
    if (body.ticketTypeIds.some((id) => !tiers.some((tier) => tier.id === id)))
      throw new HttpError(400, "Ticket tier does not belong to this event.");
    const value = {
      ...body,
      eventId: request.params.eventId,
      code: body.code.trim().toUpperCase(),
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
    };
    const [result] = await tx
      .insert(coupons)
      .values(value)
      .onConflictDoUpdate({
        target: [coupons.eventId, coupons.code],
        set: value,
      })
      .returning();
    await emitEvent(tx, request.params.eventId, "tickets.changed");
    return result;
  });
}
export async function getAvailability(
  request: FastifyRequest<{
    Params: { eventId: string };
    Querystring: { code?: string };
  }>,
) {
  return db.transaction(async (tx) => {
    const event = await lockEvent(tx, request.params.eventId);
    await expireHolds(tx, event.id);
    let manager = false;
    try {
      await request.jwtVerify();
      manager = await verifyEventPermission(
        event.id,
        (request.user as { id: string }).id,
        "manage_tickets",
        tx,
      );
    } catch {
      /* Public availability is allowed for published events. */
    }
    if (event.status !== "published" && !manager)
      throw new HttpError(404, "Event not found.");
    const allocated = await allocatedByTier(tx, event.id);
    const used = [...allocated.values()].reduce((sum, count) => sum + count, 0);
    const eventRemaining =
      event.capacity === null ? null : Math.max(0, event.capacity - used);
    const tiers = await tx
      .select()
      .from(ticketTypes)
      .where(eq(ticketTypes.eventId, event.id))
      .orderBy(ticketTypes.sortOrder);
    const codes = request.query.code
      ? await tx
          .select()
          .from(coupons)
          .where(
            and(
              eq(coupons.eventId, event.id),
              eq(coupons.code, request.query.code.trim().toUpperCase()),
              eq(coupons.isActive, true),
            ),
          )
      : [];
    const access = codes.find(
      (code) =>
        (!code.startsAt || code.startsAt <= new Date()) &&
        (!code.endsAt || code.endsAt > new Date()),
    );
    const [version] = await tx
      .select({ version: events.version })
      .from(events)
      .where(eq(events.id, event.id));
    return {
      version: version!.version,
      remaining: eventRemaining,
      serverTime: new Date().toISOString(),
      tiers: tiers
        .filter(
          (tier) =>
            manager ||
            !tier.isHidden ||
            (access &&
              (!access.ticketTypeIds.length ||
                access.ticketTypeIds.includes(tier.id))),
        )
        .map((tier) => ({
          ...tier,
          remaining:
            tier.quantityLimit === null
              ? eventRemaining
              : Math.min(
                  eventRemaining ?? Infinity,
                  Math.max(
                    0,
                    tier.quantityLimit - (allocated.get(tier.id) || 0),
                  ),
                ),
        })),
    };
  });
}
