import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createHmac, randomUUID } from "node:crypto";
import { WebSocket as WebSocketClient } from "ws";
import db from "../src/db";
import {
  coupons,
  events,
  orders,
  tickets,
  ticketTypes,
  users,
  refunds,
} from "../src/db/schema";
import { eq } from "drizzle-orm";
import { buildApp } from "../src/app";
import {
  createCheckout,
  initializeGatewayOrder,
  checkoutStatus,
  cancelCheckout,
} from "../src/services/checkout.service";
import {
  applyPayment,
  processInbox,
} from "../src/services/payment-lifecycle.service";
import {
  setTestGateway,
  type GatewayOrder,
  type GatewayPayment,
  type GatewayRefund,
  type PaymentGateway,
} from "../src/services/gateway.service";
import { processRefunds, requestRefund } from "../src/services/refund.service";
import { changeAdmission } from "../src/utils/admission";
import {
  eventRoles,
  eventTeamMembers,
  webhookInbox,
  orderItems,
} from "../src/db/schema";
import { cleanupExpiredHolds } from "../src/services/inventory.service";
import { reconcilePayments } from "../src/services/payment-lifecycle.service";

const integration =
  process.env.RUN_INTEGRATION === "1" ? describe : describe.skip;
integration("commerce against PostgreSQL", () => {
  const remoteOrders = new Map<string, GatewayOrder>();
  const payments = new Map<string, GatewayPayment>();
  const remoteRefunds = new Map<string, GatewayRefund>();
  let refundCalls = 0;
  let createCalls = 0;
  let unknownRefund = false;
  const fake: PaymentGateway = {
    async createOrder(amount, receipt) {
      createCalls++;
      const order = {
        id: `order_${randomUUID()}`,
        amount,
        currency: "INR",
        receipt,
      };
      remoteOrders.set(order.id, order);
      return order;
    },
    async findOrder(receipt) {
      return [...remoteOrders.values()].find(
        (order) => order.receipt === receipt,
      );
    },
    async fetchPayment(id) {
      const payment = payments.get(id);
      if (!payment) throw new Error("Unknown payment");
      return payment;
    },
    async orderPayments(id) {
      return [...payments.values()].filter(
        (payment) => payment.order_id === id,
      );
    },
    async createRefund(paymentId, amount, commandId) {
      refundCalls++;
      const refund = {
        id: `rfnd_${randomUUID()}`,
        payment_id: paymentId,
        amount,
        status: "processed",
        notes: { commandId },
      };
      remoteRefunds.set(refund.id, refund);
      if (unknownRefund) {
        unknownRefund = false;
        throw new Error("Response lost");
      }
      return refund;
    },
    async refunds(paymentId) {
      return [...remoteRefunds.values()].filter(
        (refund) => refund.payment_id === paymentId,
      );
    },
  };
  const app = buildApp();
  let owner: string;
  let buyer: string;
  let stranger: string;
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (
      !["127.0.0.1", "localhost"].includes(target.hostname) ||
      !target.pathname.includes("evaluation")
    )
      throw new Error("Integration tests require a local evaluation database.");
    process.env.NODE_ENV = "test";
    process.env.RAZORPAY_KEY_ID = "rzp_test_fixture";
    process.env.RAZORPAY_KEY_SECRET = "test-secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook";
    delete process.env.RAZORPAY_ACCOUNT_ID;
    for (const key of [
      "TICKET_TAX_BPS",
      "PLATFORM_FEE_BPS",
      "PLATFORM_FEE_PAISE",
      "FEE_TAX_BPS",
    ])
      process.env[key] = "0";
    setTestGateway(fake);
    await app.ready();
    const records = await db
      .insert(users)
      .values(
        ["owner", "buyer", "stranger"].map((name) => ({
          name,
          email: `${randomUUID()}@example.test`,
          slug: randomUUID(),
        })),
      )
      .returning();
    [owner, buyer, stranger] = records.map((row) => row.id) as [
      string,
      string,
      string,
    ];
  });
  afterAll(async () => {
    await app.close();
  });
  async function fixture(price = "100.00", capacity = 100, approval = false) {
    const [event] = await db
      .insert(events)
      .values({
        title: "Commerce fixture",
        organizationId: owner,
        slug: randomUUID(),
        status: "published",
        capacity,
        requireApproval: approval,
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 172800000),
        timezone: "Asia/Kolkata",
      })
      .returning();
    const [tier] = await db
      .insert(ticketTypes)
      .values({
        eventId: event!.id,
        name: "General",
        price,
        quantityLimit: capacity,
      })
      .returning();
    return {
      event: event!,
      tier: tier!,
      body: { eventId: event!.id, purchases: [{ ticketTypeId: tier!.id }] },
    };
  }
  async function capture(orderId: string) {
    await initializeGatewayOrder(orderId);
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    const payment = {
      id: `pay_${randomUUID()}`,
      order_id: order!.paymentIntentId!,
      amount: order!.totalPaise,
      currency: "INR",
      status: "captured",
      amount_refunded: 0,
    };
    payments.set(payment.id, payment);
    await db.transaction((tx) => applyPayment(tx, payment));
    return payment;
  }
  const token = (id: string) => ({
    authorization: `Bearer ${app.jwt.sign({ id })}`,
  });
  test("HTTP validation rejects missing idempotency and mock payment route is gone", async () => {
    const f = await fixture();
    const response = await app.inject({
      method: "POST",
      url: "/api/orders",
      headers: token(buyer),
      payload: f.body,
    });
    expect(response.statusCode).toBe(400);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/api/orders/${randomUUID()}/pay`,
          headers: token(buyer),
        })
      ).statusCode,
    ).toBe(404);
  });
  test("checkout retries allocate once and payload reuse conflicts", async () => {
    const f = await fixture();
    const key = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 8 }, () => createCheckout(f.body, buyer, key)),
    );
    expect(new Set(results.map((row) => row.id)).size).toBe(1);
    expect((await checkoutStatus(results[0]!.id, buyer)).tickets).toHaveLength(
      1,
    );
    await expect(
      createCheckout({ ...f.body, code: "DIFFERENT" }, buyer, key),
    ).rejects.toMatchObject({ statusCode: 409 });
    const before = createCalls;
    await Promise.all(results.map((row) => initializeGatewayOrder(row.id)));
    expect(createCalls - before).toBe(1);
  });
  test("20 concurrent buyers cannot oversell the final event/tier spot", async () => {
    const f = await fixture("100.00", 1);
    const buyers = await db
      .insert(users)
      .values(
        Array.from({ length: 20 }, () => ({
          name: "Concurrent buyer",
          email: `${randomUUID()}@example.test`,
          slug: randomUUID(),
        })),
      )
      .returning();
    const results = await Promise.allSettled(
      buyers.map((record) => createCheckout(f.body, record.id, randomUUID())),
    );
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
  });
  test("coupon usage is reserved atomically and released on abandonment", async () => {
    const f = await fixture();
    await db.insert(coupons).values({
      eventId: f.event.id,
      code: "EARLY",
      kind: "fixed",
      value: 2000,
      maxUses: 1,
    });
    const body = { ...f.body, code: "early" };
    const first = await createCheckout(body, buyer, randomUUID());
    expect(first.totalPaise).toBe(8000);
    await expect(
      createCheckout(body, stranger, randomUUID()),
    ).rejects.toMatchObject({ statusCode: 409 });
    await cancelCheckout(first.id, buyer);
    expect(
      (await createCheckout(body, stranger, randomUUID())).totalPaise,
    ).toBe(8000);
  });
  test("free registrations confirm; unpaid and approval tickets cannot enter", async () => {
    const f = await fixture("0.00", 2, true);
    const order = await createCheckout(f.body, buyer, randomUUID());
    const status = await checkoutStatus(order.id, buyer);
    expect(status.order?.registrationStatus).toBe("pending_approval");
    await expect(
      changeAdmission(f.event.id, status.tickets[0]!.id, owner),
    ).rejects.toMatchObject({ statusCode: 409 });
    const response = await app.inject({
      method: "POST",
      url: `/api/commerce/${f.event.id}/orders/${order.id}/decision`,
      headers: token(owner),
      payload: { decision: "approve" },
    });
    expect(response.statusCode).toBe(200);
    expect(
      (await changeAdmission(f.event.id, status.tickets[0]!.id, owner)).status,
    ).toBe("used");
  });
  test("capture is idempotent and a delayed failure cannot undo it", async () => {
    const f = await fixture();
    const order = await createCheckout(f.body, buyer, randomUUID());
    const payment = await capture(order.id);
    await Promise.all(
      Array.from({ length: 6 }, () =>
        db.transaction((tx) => applyPayment(tx, payment)),
      ),
    );
    await db.transaction((tx) =>
      applyPayment(tx, { ...payment, status: "failed" }),
    );
    const status = await checkoutStatus(order.id, buyer);
    expect(status.order?.paymentStatus).toBe("success");
    expect(status.tickets[0]?.status).toBe("active");
    await expect(
      changeAdmission(f.event.id, status.tickets[0]!.id, stranger),
    ).rejects.toMatchObject({ statusCode: 403 });
    await changeAdmission(f.event.id, status.tickets[0]!.id, owner);
    await expect(
      changeAdmission(f.event.id, status.tickets[0]!.id, owner),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
  test("raw webhook signatures, replay and out-of-order delivery", async () => {
    const f = await fixture();
    const order = await createCheckout(f.body, buyer, randomUUID());
    await initializeGatewayOrder(order.id);
    const status = await checkoutStatus(order.id, buyer);
    const payment = {
      id: `pay_${randomUUID()}`,
      order_id: status.order!.paymentIntentId!,
      amount: order.totalPaise,
      currency: "INR",
      status: "captured",
      amount_refunded: 0,
    };
    const raw = JSON.stringify(
      { event: "payment.captured", payload: { payment: { entity: payment } } },
      null,
      2,
    );
    const signature = createHmac("sha256", "test-webhook")
      .update(raw)
      .digest("hex");
    const id = randomUUID();
    const headers = {
      "content-type": "application/json",
      "x-razorpay-signature": signature,
      "x-razorpay-event-id": id,
    };
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/payments/webhook",
          headers,
          payload: raw + " ",
        })
      ).statusCode,
    ).toBe(400);
    for (let i = 0; i < 2; i++)
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/payments/webhook",
            headers,
            payload: raw,
          })
        ).statusCode,
      ).toBe(200);
    await processInbox();
    await processInbox();
    expect((await checkoutStatus(order.id, buyer)).tickets[0]?.status).toBe(
      "active",
    );
  });
  test("callback signed for another gateway order cannot fulfill", async () => {
    const f = await fixture();
    const order = await createCheckout(f.body, buyer, randomUUID());
    await initializeGatewayOrder(order.id);
    const wrong = "order_wrong";
    const pay = "pay_wrong";
    const response = await app.inject({
      method: "POST",
      url: "/api/payments/verify",
      headers: token(buyer),
      payload: {
        orderId: order.id,
        razorpayOrderId: wrong,
        razorpayPaymentId: pay,
        razorpaySignature: createHmac("sha256", "test-secret")
          .update(`${wrong}|${pay}`)
          .digest("hex"),
      },
    });
    expect(response.statusCode).toBe(400);
    expect((await checkoutStatus(order.id, buyer)).order?.paymentStatus).toBe(
      "pending",
    );
  });
  test("lazy expiry admits another buyer; late capture is refunded", async () => {
    const f = await fixture("100.00", 1);
    const old = await createCheckout(f.body, buyer, randomUUID());
    await initializeGatewayOrder(old.id);
    await db
      .update(orders)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(orders.id, old.id));
    const next = await createCheckout(f.body, stranger, randomUUID());
    expect(next.reservationState).toBe("held");
    await capture(old.id);
    await processRefunds();
    const status = await checkoutStatus(old.id, buyer);
    expect(status.order?.paymentStatus).toBe("refunded");
    expect(status.tickets[0]?.status).toBe("refunded");
    expect(
      (await checkoutStatus(next.id, stranger)).order?.reservationState,
    ).toBe("held");
  });
  test("partial and full refunds are capped and idempotent", async () => {
    const f = await fixture();
    const order = await createCheckout(f.body, buyer, randomUUID());
    await capture(order.id);
    const key = randomUUID();
    const command = { amountPaise: 2000, reason: "Partial goodwill" };
    await requestRefund(order.id, owner, key, command);
    await requestRefund(order.id, owner, key, command);
    const before = refundCalls;
    await processRefunds();
    await processRefunds();
    expect(refundCalls - before).toBe(1);
    expect((await checkoutStatus(order.id, buyer)).order?.paymentStatus).toBe(
      "partially_refunded",
    );
    await expect(
      requestRefund(order.id, owner, randomUUID(), {
        amountPaise: 8001,
        reason: "Over limit",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await requestRefund(order.id, owner, randomUUID(), {
      amountPaise: 8000,
      reason: "Remaining balance",
    });
    await processRefunds();
    expect((await checkoutStatus(order.id, buyer)).order?.paymentStatus).toBe(
      "refunded",
    );
  });
  test("unknown provider refund outcome reconciles without issuing twice", async () => {
    const f = await fixture();
    const order = await createCheckout(f.body, buyer, randomUUID());
    await capture(order.id);
    unknownRefund = true;
    const before = refundCalls;
    await requestRefund(order.id, owner, randomUUID(), {
      amountPaise: order.totalPaise,
      reason: "Response loss",
    });
    await processRefunds();
    await processRefunds();
    expect(refundCalls - before).toBe(1);
    expect((await checkoutStatus(order.id, buyer)).order?.paymentStatus).toBe(
      "refunded",
    );
  });
  test("paid approval holds capacity, decline refunds and releases it", async () => {
    const f = await fixture("100.00", 1, true);
    const order = await createCheckout(f.body, buyer, randomUUID());
    await capture(order.id);
    const status = await checkoutStatus(order.id, buyer);
    expect(status.tickets[0]?.status).toBe("pending_approval");
    await expect(
      createCheckout(f.body, stranger, randomUUID()),
    ).rejects.toMatchObject({ statusCode: 409 });
    const url = `/api/commerce/${f.event.id}/orders/${order.id}/decision`;
    expect(
      (
        await app.inject({
          method: "POST",
          url,
          headers: token(owner),
          payload: { decision: "decline" },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (await createCheckout(f.body, stranger, randomUUID())).reservationState,
    ).toBe("held");
    await processRefunds();
    expect((await checkoutStatus(order.id, buyer)).order?.paymentStatus).toBe(
      "refunded",
    );
  });
  test("socket ticket is single-use and event-scoped", async () => {
    const f = await fixture("0.00");
    const response = await app.inject({
      method: "POST",
      url: `/api/realtime/events/${f.event.id}/connect`,
      headers: token(owner),
    });
    expect(response.statusCode).toBe(200);
    const { ticket } = response.json<{ ticket: string }>();
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const socket = new WebSocketClient(
      address.replace("http:", "ws:") + "/api/realtime/ws",
      { headers: { Origin: "http://localhost:3000" } },
    );
    await new Promise<void>((resolve) =>
      socket.addEventListener("open", () => resolve(), { once: true }),
    );
    const ready = new Promise<string>((resolve) =>
      socket.addEventListener("message", (data) => resolve(String(data.data)), {
        once: true,
      }),
    );
    socket.send(JSON.stringify({ ticket }));
    expect(JSON.parse(await ready).eventId).toBe(f.event.id);
    const changed = new Promise<string>((resolve) =>
      socket.addEventListener("message", (data) => resolve(String(data.data)), {
        once: true,
      }),
    );
    await createCheckout(f.body, buyer, randomUUID());
    expect(JSON.parse(await changed).type).toBe("event.changed");
    socket.close();
    const replay = new WebSocketClient(
      address.replace("http:", "ws:") + "/api/realtime/ws",
      { headers: { Origin: "http://localhost:3000" } },
    );
    await new Promise<void>((resolve) =>
      replay.addEventListener("open", () => resolve(), { once: true }),
    );
    const closed = new Promise<number>((resolve) =>
      replay.addEventListener("close", (event) => resolve(event.code), {
        once: true,
      }),
    );
    replay.send(JSON.stringify({ ticket }));
    expect(await closed).toBe(4001);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/api/realtime/events/${f.event.id}/connect`,
          headers: token(stranger),
        })
      ).statusCode,
    ).toBe(403);
  });
  test("multi-instance socket updates and revocation keep scanner data minimal", async () => {
    const f = await fixture("0.00");
    const [role] = await db
      .insert(eventRoles)
      .values({
        eventId: f.event.id,
        name: "Scanner",
        permissions: ["scan_tickets"],
      })
      .returning();
    const [member] = await db
      .insert(eventTeamMembers)
      .values({ eventId: f.event.id, userId: stranger, roleId: role!.id })
      .returning();
    const second = buildApp();
    await second.ready();
    const address = await second.listen({ port: 0, host: "127.0.0.1" });
    try {
      expect(
        (
          await second.inject({
            url: "/api/realtime/ws",
            headers: { origin: "https://unrelated.example" },
          })
        ).statusCode,
      ).toBe(403);
      expect(
        (
          await second.inject({
            url: `/api/commerce/${f.event.id}/finance`,
            headers: token(stranger),
          })
        ).statusCode,
      ).toBe(403);
      const response = await app.inject({
        method: "POST",
        url: `/api/realtime/events/${f.event.id}/connect`,
        headers: token(stranger),
      });
      const socket = new WebSocketClient(
        address.replace("http:", "ws:") + "/api/realtime/ws",
        { headers: { Origin: "http://localhost:3000" } },
      );
      await new Promise<void>((resolve) => socket.once("open", resolve));
      const ready = new Promise<string>((resolve) =>
        socket.once("message", (data) => resolve(data.toString())),
      );
      socket.send(JSON.stringify(response.json()));
      expect(JSON.parse(await ready).type).toBe("ready");
      const changed = new Promise<string>((resolve) =>
        socket.once("message", (data) => resolve(data.toString())),
      );
      const registration = await app.inject({
        method: "POST",
        url: "/api/orders",
        headers: { ...token(buyer), "idempotency-key": randomUUID() },
        payload: f.body,
      });
      expect(registration.statusCode).toBe(201);
      const message = JSON.parse(await changed) as Record<string, unknown>;
      expect(Object.keys(message).sort()).toEqual([
        "eventId",
        "type",
        "version",
      ]);
      const closed = new Promise<number>((resolve) =>
        socket.once("close", resolve),
      );
      await db
        .delete(eventTeamMembers)
        .where(eq(eventTeamMembers.id, member!.id));
      expect(await closed).toBe(4003);
    } finally {
      await second.close();
    }
  });
  test("refund-before-capture inbox retries converge and reject wrong amounts", async () => {
    const f = await fixture();
    const order = await createCheckout(f.body, buyer, randomUUID());
    await initializeGatewayOrder(order.id);
    const status = await checkoutStatus(order.id, buyer);
    const payment = {
      id: `pay_${randomUUID()}`,
      order_id: status.order!.paymentIntentId!,
      amount: order.totalPaise,
      currency: "INR",
      status: "captured",
      amount_refunded: order.totalPaise,
    };
    const refund = {
      id: `rfnd_${randomUUID()}`,
      payment_id: payment.id,
      amount: order.totalPaise,
      status: "processed",
      notes: {},
    };
    const id = randomUUID();
    await db
      .insert(webhookInbox)
      .values({
        id,
        payload: {
          event: "refund.processed",
          payload: { refund: { entity: refund } },
        },
      });
    await processInbox();
    expect(
      (await db.select().from(webhookInbox).where(eq(webhookInbox.id, id)))[0]
        ?.processedAt,
    ).toBeNull();
    await expect(
      db.transaction((tx) => applyPayment(tx, { ...payment, amount: 1 })),
    ).rejects.toMatchObject({ statusCode: 409 });
    await db.transaction((tx) => applyPayment(tx, payment));
    await processInbox();
    expect((await checkoutStatus(order.id, buyer)).order?.paymentStatus).toBe(
      "refunded",
    );
  });
  test("capture/cancel/cleanup races preserve capacity and never resurrect voided passes", async () => {
    const f = await fixture("100.00", 1);
    const order = await createCheckout(f.body, buyer, randomUUID());
    await initializeGatewayOrder(order.id);
    await db
      .update(orders)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(orders.id, order.id));
    await Promise.all([
      capture(order.id),
      cancelCheckout(order.id, buyer),
      cleanupExpiredHolds(),
      cleanupExpiredHolds(),
    ]);
    await processRefunds();
    const status = await checkoutStatus(order.id, buyer);
    expect(status.order?.reservationState).toBe("released");
    expect(status.tickets[0]?.status).toBe("refunded");
    expect(
      (await createCheckout(f.body, stranger, randomUUID())).reservationState,
    ).toBe("held");
  });
  test("authorized payments do not issue tickets; reconciliation repairs a lost callback", async () => {
    const f = await fixture();
    const order = await createCheckout(f.body, buyer, randomUUID());
    await initializeGatewayOrder(order.id);
    const status = await checkoutStatus(order.id, buyer);
    const payment = {
      id: `pay_${randomUUID()}`,
      order_id: status.order!.paymentIntentId!,
      amount: order.totalPaise,
      currency: "INR",
      status: "authorized",
      amount_refunded: 0,
    };
    await db.transaction((tx) => applyPayment(tx, payment));
    expect((await checkoutStatus(order.id, buyer)).tickets[0]?.status).toBe(
      "pending",
    );
    payments.set(payment.id, { ...payment, status: "captured" });
    await reconcilePayments();
    expect((await checkoutStatus(order.id, buyer)).tickets[0]?.status).toBe(
      "active",
    );
  });
  test("event capacity edits cannot cut into existing allocations", async () => {
    const f = await fixture("0.00", 2);
    await createCheckout(
      { ...f.body, purchases: [f.body.purchases[0]!, f.body.purchases[0]!] },
      buyer,
      randomUUID(),
    );
    expect(
      (
        await app.inject({
          method: "PATCH",
          url: `/api/events/${f.event.id}`,
          headers: token(owner),
          payload: { capacity: 1 },
        })
      ).statusCode,
    ).toBe(409);
  });
  test("custom SMTP configuration validates and returns no secrets", async () => {
    const f = await fixture();
    process.env.CREDENTIAL_ENCRYPTION_KEY = "ab".repeat(32);
    const url = `/api/connections/events/${f.event.id}/mail`;
    const response = await app.inject({
      method: "PUT",
      url,
      headers: token(owner),
      payload: {
        provider: "smtp",
        host: "smtp.example.test",
        port: 587,
        secure: false,
        username: "fixture",
        password: "fixture-secret",
        fromEmail: "test@example.test",
      },
    });
    expect(response.statusCode).toBe(200);
    const visible = await app.inject({ url, headers: token(owner) });
    expect(visible.body).not.toContain("fixture-secret");
    expect(visible.json().custom).toBe(true);
  });
  test("order line snapshots survive tier edits and reject direct mutations", async () => {
    const f = await fixture();
    const order = await createCheckout(f.body, buyer, randomUUID());
    await db
      .update(ticketTypes)
      .set({ price: "999.00", name: "Renamed" })
      .where(eq(ticketTypes.id, f.tier.id));
    const [line] = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    expect(line?.unitPricePaise).toBe(10000);
    expect(line?.name).toBe("General");
    await expect(
      Promise.resolve(
        db
          .update(orderItems)
          .set({ unitPricePaise: 123, totalPaise: 123 })
          .where(eq(orderItems.id, line!.id)),
      ),
    ).rejects.toThrow();
  });
  test("organizer roster, analytics, finance and door APIs share the ledger", async () => {
    const f = await fixture("0.00");
    const order = await createCheckout(f.body, buyer, randomUUID());
    const state = await checkoutStatus(order.id, buyer);
    const roster = await app.inject({
      url: `/api/attendees/${f.event.id}`,
      headers: token(owner),
    });
    expect(roster.statusCode).toBe(200);
    expect(roster.json().total).toBe(1);
    const stats = await app.inject({
      url: `/api/attendees/${f.event.id}/stats`,
      headers: token(owner),
    });
    expect(stats.statusCode).toBe(200);
    expect(stats.json().totalAttendees).toBe(1);
    expect(
      (
        await app.inject({
          url: `/api/commerce/${f.event.id}/finance`,
          headers: token(owner),
        })
      ).statusCode,
    ).toBe(200);
    const pass = await app.inject({
      url: `/api/tickets/${state.tickets[0]!.id}`,
      headers: token(buyer),
    });
    expect(pass.statusCode).toBe(200);
    expect(pass.json().ticketType.price).toBe("0.00");
    const scan = await app.inject({
      method: "POST",
      url: "/api/check-ins/scan",
      headers: token(owner),
      payload: { eventId: f.event.id, qrCode: state.tickets[0]!.qrCode },
    });
    expect(scan.statusCode).toBe(201);
    expect(scan.json().ticket.status).toBe("used");
  });
  test("inventory configuration broadcasts and preserves order history", async () => {
    const f = await fixture("0.00");
    const extra = await app.inject({
      method: "POST",
      url: `/api/ticket-types/${f.event.id}`,
      headers: token(owner),
      payload: { name: "Additional", price: 0 },
    });
    expect(extra.statusCode).toBe(201);
    expect(
      (await db.select().from(events).where(eq(events.id, f.event.id)))[0]!
        .version,
    ).toBeGreaterThan(0);
    await createCheckout(f.body, buyer, randomUUID());
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/ticket-types/${f.event.id}/${f.tier.id}`,
          headers: token(owner),
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/events/${f.event.id}`,
          headers: token(owner),
        })
      ).statusCode,
    ).toBe(409);
    const unsold = await fixture("0.00");
    await app.inject({
      method: "PATCH",
      url: `/api/events/${unsold.event.id}`,
      headers: token(owner),
      payload: { title: "Updated unsold event" },
    });
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/events/${unsold.event.id}`,
          headers: token(owner),
        })
      ).statusCode,
    ).toBe(200);
  });
});
