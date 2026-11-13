import type { FastifyReply, FastifyRequest } from "fastify";
import db from "@db";
import {
  coupons,
  events,
  eventBlacklist,
  eventRoles,
  eventTeamMembers,
  orders,
  orderItems,
  organizerBankAccounts,
  paymentAttempts,
  payoutRequests,
  refunds,
  tickets,
  ticketTypes,
  users,
} from "@db/schema";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { HttpError } from "../utils/errors";
import type { Database } from "../db/types";
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
  getOrganizerUnsettledBalancePaise,
  queueRefund,
  requestRefund,
  type RefundCommand,
} from "../services/refund.service";
import { enqueueOrderEmail } from "../services/notifications.service";
import { gateway } from "../services/gateway.service";

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
export function validateIfscCode(ifsc: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase());
}

export function validateAccountNumber(accountNumber: string): boolean {
  return /^[0-9]{6,20}$/.test(accountNumber.trim());
}

export function maskAccountNumber(accountNumber: string): string {
  const trimmed = accountNumber.trim();
  if (trimmed.length <= 4) return trimmed;
  const last4 = trimmed.slice(-4);
  const maskedLength = Math.max(4, trimmed.length - 4);
  return "•".repeat(maskedLength) + last4;
}

export async function calculateFinanceSummary(
  executor: Database,
  eventId: string,
) {
  const paidOrders = await executor
    .select({ id: orders.id, totalPaise: orders.totalPaise })
    .from(orders)
    .where(
      and(
        eq(orders.eventId, eventId),
        inArray(orders.paymentStatus, [
          "success",
          "partially_refunded",
          "refunded",
        ]),
      ),
    );
  const paidOrderIds = paidOrders.map((o) => o.id);

  let grossSalesPaise = 0;
  let totalDiscountsPaise = 0;
  let platformFeesPaise = 0;
  let taxesPaise = 0;
  let totalOrganizerNetPaise = 0;

  if (paidOrderIds.length > 0) {
    const items = await executor
      .select({
        unitPricePaise: orderItems.unitPricePaise,
        discountPaise: orderItems.discountPaise,
        platformFeePaise: orderItems.platformFeePaise,
        ticketTaxPaise: orderItems.ticketTaxPaise,
        feeTaxPaise: orderItems.feeTaxPaise,
        organizerNetPaise: orderItems.organizerNetPaise,
      })
      .from(orderItems)
      .where(inArray(orderItems.orderId, paidOrderIds));

    for (const item of items) {
      grossSalesPaise += item.unitPricePaise;
      totalDiscountsPaise += item.discountPaise;
      platformFeesPaise += item.platformFeePaise;
      taxesPaise += item.ticketTaxPaise + item.feeTaxPaise;
      const net =
        item.organizerNetPaise !== undefined && !Number.isNaN(item.organizerNetPaise)
          ? item.organizerNetPaise
          : item.unitPricePaise - item.discountPaise;
      totalOrganizerNetPaise += net;
    }
  }

  let totalRefundedPaise = 0;
  if (paidOrderIds.length > 0) {
    const activeRefunds = await executor
      .select({ amountPaise: refunds.amountPaise })
      .from(refunds)
      .where(
        and(
          inArray(refunds.orderId, paidOrderIds),
          inArray(refunds.status, [
            "requested",
            "processing",
            "uncertain",
            "processed",
          ]),
        ),
      );
    totalRefundedPaise = activeRefunds.reduce(
      (sum, r) => sum + r.amountPaise,
      0,
    );
  }

  const activePayouts = await executor
    .select({ amountPaise: payoutRequests.amountPaise })
    .from(payoutRequests)
    .where(
      and(
        eq(payoutRequests.eventId, eventId),
        inArray(payoutRequests.status, ["requested", "processing", "paid"]),
      ),
    );
  const withdrawnOrPendingPaise = activePayouts.reduce(
    (sum, p) => sum + p.amountPaise,
    0,
  );

  const netEarningsPaise = Math.max(
    0,
    totalOrganizerNetPaise - totalRefundedPaise,
  );
  const availableToWithdrawPaise = Math.max(
    0,
    netEarningsPaise - withdrawnOrPendingPaise,
  );

  return {
    grossSalesPaise,
    totalDiscountsPaise,
    platformFeesPaise,
    taxesPaise,
    totalRefundedPaise,
    netEarningsPaise,
    withdrawnOrPendingPaise,
    availableToWithdrawPaise,
  };
}

export async function getFinance(request: EventRequest) {
  const actor = await authorize(request, request.params.eventId, "view_payments");
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, request.params.eventId));
  if (!event) throw new HttpError(404, "Event not found.");

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

  const summary = await calculateFinanceSummary(db, request.params.eventId);
  const unsettledBalancePaise = await getOrganizerUnsettledBalancePaise(
    request.params.eventId,
    db,
  );

  const [bankRecord] = await db
    .select()
    .from(organizerBankAccounts)
    .where(eq(organizerBankAccounts.userId, event.organizationId));
  const isOwner = event.organizationId === actor;
  const bankAccount = bankRecord
    ? {
        ...bankRecord,
        accountNumber: isOwner
          ? bankRecord.accountNumber
          : maskAccountNumber(bankRecord.accountNumber),
      }
    : null;

  const payouts = await db
    .select()
    .from(payoutRequests)
    .where(eq(payoutRequests.eventId, request.params.eventId))
    .orderBy(desc(payoutRequests.createdAt));

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
    summary: {
      ...summary,
      unsettledBalancePaise,
    },
    unsettledBalancePaise,
    bankAccount,
    payouts,
  };
}

export async function updateBankAccount(
  request: FastifyRequest<{
    Params: { eventId: string };
    Body: {
      accountHolderName: string;
      phone: string;
      accountNumber: string;
      ifscCode: string;
      bankName: string;
      upiId?: string | null;
    };
  }>,
) {
  await request.jwtVerify();
  const actor = (request.user as { id: string }).id;
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, request.params.eventId));
  if (!event) throw new HttpError(404, "Event not found.");
  if (event.organizationId !== actor) {
    throw new HttpError(
      403,
      "Only the event owner can manage bank account details.",
    );
  }

  const phone = (request.body.phone || "").trim();
  if (!phone || phone.length < 10) {
    throw new HttpError(400, "Valid phone number is required for bank verification.");
  }

  const ifsc = request.body.ifscCode.trim().toUpperCase();
  if (!validateIfscCode(ifsc)) {
    throw new HttpError(400, "Invalid IFSC code format.");
  }

  const accountNumber = request.body.accountNumber.trim();
  if (!validateAccountNumber(accountNumber)) {
    throw new HttpError(400, "Account number must be 6 to 20 digits.");
  }

  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, actor));

  const [existingAccount] = await db
    .select({ gatewayAccountId: organizerBankAccounts.gatewayAccountId })
    .from(organizerBankAccounts)
    .where(eq(organizerBankAccounts.userId, actor));

  let gatewayAccountId: string | null =
    existingAccount?.gatewayAccountId || null;
  let onboardingStatus = "active";

  try {
    const subAccount = await gateway().upsertSubMerchantAccount({
      userId: actor,
      email: user?.email || "",
      phone,
      accountHolderName: request.body.accountHolderName.trim(),
      accountNumber,
      ifscCode: ifsc,
      bankName: request.body.bankName.trim(),
      upiId: request.body.upiId?.trim() || null,
      existingAccountId: existingAccount?.gatewayAccountId || null,
    });
    gatewayAccountId = subAccount.gatewayAccountId;
    onboardingStatus = subAccount.status || "active";
  } catch (err) {
    request.log.error(err, "Sub-merchant onboarding warning");
  }

  const [saved] = await db
    .insert(organizerBankAccounts)
    .values({
      userId: actor,
      accountHolderName: request.body.accountHolderName.trim(),
      phone,
      accountNumber,
      ifscCode: ifsc,
      bankName: request.body.bankName.trim(),
      upiId: request.body.upiId?.trim() || null,
      gatewayAccountId,
      onboardingStatus,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: organizerBankAccounts.userId,
      set: {
        accountHolderName: request.body.accountHolderName.trim(),
        phone,
        accountNumber,
        ifscCode: ifsc,
        bankName: request.body.bankName.trim(),
        upiId: request.body.upiId?.trim() || null,
        gatewayAccountId,
        onboardingStatus,
        updatedAt: new Date(),
      },
    })
    .returning();

  return { success: true, bankAccount: saved };
}

export async function requestPayout(
  request: FastifyRequest<{
    Params: { eventId: string };
    Body: {
      amountPaise: number;
      notes?: string | null;
    };
  }>,
  reply: FastifyReply,
) {
  await request.jwtVerify();
  const actor = (request.user as { id: string }).id;

  const result = await db.transaction(async (tx) => {
    const event = await lockEvent(tx, request.params.eventId);
    if (event.organizationId !== actor) {
      throw new HttpError(
        403,
        "Only the event owner can request withdrawals.",
      );
    }

    const [bankAccount] = await tx
      .select()
      .from(organizerBankAccounts)
      .where(eq(organizerBankAccounts.userId, actor));
    if (!bankAccount) {
      throw new HttpError(
        400,
        "Please configure bank account details before requesting a withdrawal.",
      );
    }

    const summary = await calculateFinanceSummary(tx, event.id);
    if (request.body.amountPaise <= 0) {
      throw new HttpError(400, "Withdrawal amount must be greater than zero.");
    }
    if (request.body.amountPaise > summary.availableToWithdrawPaise) {
      throw new HttpError(
        400,
        `Withdrawal amount of ₹${(request.body.amountPaise / 100).toFixed(2)} exceeds available balance of ₹${(summary.availableToWithdrawPaise / 100).toFixed(2)}.`,
      );
    }

    const maskedAccountNumber = maskAccountNumber(bankAccount.accountNumber);

    const [created] = await tx
      .insert(payoutRequests)
      .values({
        eventId: event.id,
        requestedBy: actor,
        amountPaise: request.body.amountPaise,
        status: "requested",
        bankSnapshot: {
          accountHolderName: bankAccount.accountHolderName,
          maskedAccountNumber,
          ifscCode: bankAccount.ifscCode,
          bankName: bankAccount.bankName,
          upiId: bankAccount.upiId || null,
        },
        notes: request.body.notes?.trim() || null,
      })
      .returning();

    if (!created) {
      throw new HttpError(500, "Failed to create payout request.");
    }

    // Collect held transfers for this event to release
    const heldOrders = await tx
      .select({
        gatewayTransferId: orders.gatewayTransferId,
      })
      .from(orders)
      .where(
        and(
          eq(orders.eventId, event.id),
          eq(orders.transferReleased, false),
          sql`${orders.gatewayTransferId} IS NOT NULL`,
        ),
      );

    const heldTransferIds = heldOrders
      .map((o) => o.gatewayTransferId)
      .filter((id): id is string => Boolean(id));

    let withdrawalStatus: "requested" | "processing" | "paid" = "paid";
    let gatewayPayoutId: string | null = null;
    let referenceNumber: string | null = null;
    let failureReason: string | null = null;

    try {
      const withdrawal = await gateway().executeAutomatedWithdrawal({
        payoutRequestId: created.id,
        amountPaise: request.body.amountPaise,
        bankAccount: {
          gatewayAccountId: bankAccount.gatewayAccountId,
          accountHolderName: bankAccount.accountHolderName,
          accountNumber: bankAccount.accountNumber,
          ifscCode: bankAccount.ifscCode,
          bankName: bankAccount.bankName,
          upiId: bankAccount.upiId,
        },
        heldTransferIds,
      });

      withdrawalStatus = withdrawal.status;
      gatewayPayoutId = withdrawal.gatewayPayoutId;
      referenceNumber = withdrawal.referenceNumber ?? null;

      if (heldTransferIds.length > 0) {
        await tx
          .update(orders)
          .set({ transferReleased: true, updatedAt: new Date() })
          .where(inArray(orders.gatewayTransferId, heldTransferIds));
      }
    } catch (err) {
      withdrawalStatus = "requested";
      failureReason =
        err instanceof Error ? err.message : "Gateway withdrawal failed";
    }

    const [updatedPayout] = await tx
      .update(payoutRequests)
      .set({
        status: failureReason ? "rejected" : withdrawalStatus,
        gatewayPayoutId,
        referenceNumber,
        failureReason,
        updatedAt: new Date(),
      })
      .where(eq(payoutRequests.id, created.id))
      .returning();

    return updatedPayout;
  });

  return reply.code(201).send(result);
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
    const event = await lockEvent(tx, request.params.eventId);
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

      if (event.capacity !== null) {
        const maxCapacity = event.capacity + (event.overbookingLimit ?? 0);
        const [currentApproved] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(tickets)
          .where(
            and(
              eq(tickets.eventId, event.id),
              inArray(tickets.status, ["active", "used"]),
            ),
          );
        const [orderTickets] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(tickets)
          .where(
            and(
              eq(tickets.orderId, order.id),
              eq(tickets.status, "pending_approval"),
            ),
          );
        const approvedCount = Number(currentApproved?.count || 0);
        const toApproveCount = Number(orderTickets?.count || 0);
        if (approvedCount + toApproveCount > maxCapacity) {
          throw new HttpError(
            409,
            "Approving this registration would exceed event capacity.",
          );
        }
      }

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

    const poolAllocated = new Map<string, number>();
    const poolCapacities = new Map<string, number>();
    for (const tier of tiers) {
      if (
        tier.poolName &&
        tier.poolCapacity !== null &&
        tier.poolCapacity !== undefined
      ) {
        poolCapacities.set(tier.poolName, tier.poolCapacity);
        poolAllocated.set(
          tier.poolName,
          (poolAllocated.get(tier.poolName) || 0) +
            (allocated.get(tier.id) || 0),
        );
      }
    }

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
        .map((tier) => {
          const eventRemainingVal =
            eventRemaining === null ? Infinity : eventRemaining;
          const tierRemainingVal =
            tier.quantityLimit === null
              ? Infinity
              : Math.max(
                  0,
                  tier.quantityLimit - (allocated.get(tier.id) || 0),
                );
          const poolRemainingVal =
            tier.poolName && poolCapacities.has(tier.poolName)
              ? Math.max(
                  0,
                  poolCapacities.get(tier.poolName)! -
                    (poolAllocated.get(tier.poolName) || 0),
                )
              : Infinity;

          const minRemaining = Math.min(
            eventRemainingVal,
            poolRemainingVal,
            tierRemainingVal,
          );

          return {
            ...tier,
            remaining: minRemaining === Infinity ? null : minRemaining,
          };
        }),
    };
  });
}

export async function getBlacklist(request: EventRequest) {
  await authorize(request, request.params.eventId, "manage_guests");
  const [event] = await db
    .select({ organizationId: events.organizationId })
    .from(events)
    .where(eq(events.id, request.params.eventId));
  if (!event) throw new HttpError(404, "Event not found.");

  const rows = await db
    .select({
      id: eventBlacklist.id,
      organizationId: eventBlacklist.organizationId,
      eventId: eventBlacklist.eventId,
      targetUserId: eventBlacklist.targetUserId,
      pattern: eventBlacklist.pattern,
      reason: eventBlacklist.reason,
      createdBy: eventBlacklist.createdBy,
      createdAt: eventBlacklist.createdAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(eventBlacklist)
    .leftJoin(users, eq(users.id, eventBlacklist.targetUserId))
    .where(
      and(
        eq(eventBlacklist.organizationId, event.organizationId),
        or(
          eq(eventBlacklist.eventId, request.params.eventId),
          isNull(eventBlacklist.eventId),
        ),
      ),
    )
    .orderBy(desc(eventBlacklist.createdAt));

  return rows.map((row) => ({
    ...row,
    user: row.targetUserId ? row.user : null,
  }));
}

export interface CreateBlacklistInput {
  targetUserId?: string;
  pattern?: string;
  scope?: "event" | "organization";
  reason?: string;
  cancelExistingTickets?: boolean;
}

export async function createBlacklistEntry(
  request: FastifyRequest<{
    Params: { eventId: string };
    Body: CreateBlacklistInput;
  }>,
) {
  const actor = await authorize(
    request,
    request.params.eventId,
    "manage_guests",
  );
  const {
    targetUserId,
    pattern: rawPattern,
    scope = "event",
    reason,
    cancelExistingTickets,
  } = request.body;

  if (!targetUserId && !rawPattern?.trim()) {
    throw new HttpError(400, "Either targetUserId or pattern is required.");
  }

  return db.transaction(async (tx) => {
    const event = await lockEvent(tx, request.params.eventId);

    let pattern = rawPattern?.trim().toLowerCase() || null;

    if (targetUserId) {
      const [u] = await tx
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, targetUserId));
      if (!u) throw new HttpError(404, "Target user not found.");
      if (!pattern) {
        pattern = u.email.toLowerCase();
      }
    }

    const eventId = scope === "organization" ? null : event.id;

    const [created] = await tx
      .insert(eventBlacklist)
      .values({
        organizationId: event.organizationId,
        eventId,
        targetUserId: targetUserId || null,
        pattern,
        reason: reason?.trim() || null,
        createdBy: actor,
      })
      .returning();

    if (cancelExistingTickets) {
      const cancelConditions = [];
      if (targetUserId) {
        cancelConditions.push(eq(tickets.userId, targetUserId));
      }
      if (pattern) {
        if (pattern.startsWith("@")) {
          const domain = pattern.toLowerCase();
          const matchingUsers = await tx
            .select({ id: users.id })
            .from(users)
            .where(sql`lower(${users.email}) like ${"%" + domain}`);
          const matchingIds = matchingUsers.map((m) => m.id);
          if (matchingIds.length > 0) {
            cancelConditions.push(inArray(tickets.userId, matchingIds));
          }
        } else {
          const matchingUsers = await tx
            .select({ id: users.id })
            .from(users)
            .where(eq(sql`lower(${users.email})`, pattern));
          const matchingIds = matchingUsers.map((m) => m.id);
          if (matchingIds.length > 0) {
            cancelConditions.push(inArray(tickets.userId, matchingIds));
          }
        }
      }

      if (cancelConditions.length > 0) {
        await tx
          .update(tickets)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(
            and(
              eq(tickets.eventId, event.id),
              inArray(tickets.status, ["active", "pending_approval"]),
              or(...cancelConditions),
            ),
          );
      }
    }

    return created;
  });
}

export async function deleteBlacklistEntry(
  request: FastifyRequest<{
    Params: { eventId: string; blacklistId: string };
  }>,
) {
  await authorize(request, request.params.eventId, "manage_guests");
  const [event] = await db
    .select({ organizationId: events.organizationId })
    .from(events)
    .where(eq(events.id, request.params.eventId));
  if (!event) throw new HttpError(404, "Event not found.");

  const [deleted] = await db
    .delete(eventBlacklist)
    .where(
      and(
        eq(eventBlacklist.id, request.params.blacklistId),
        eq(eventBlacklist.organizationId, event.organizationId),
      ),
    )
    .returning();

  if (!deleted) throw new HttpError(404, "Blacklist entry not found.");
  return { success: true };
}
