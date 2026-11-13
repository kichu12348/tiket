import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  platformGateway,
  setTestGateway,
  setTestSdk,
  RazorpayGatewayAdapter,
} from "../src/services/gateway.service";
import { queueRefund } from "../src/services/refund.service";

describe("Razorpay Route Automated Transfers, Settlements & Refund Guards", () => {
  let originalRouteEnabled: string | undefined;
  let originalKeyId: string | undefined;
  let originalKeySecret: string | undefined;

  beforeEach(() => {
    originalRouteEnabled = process.env.RAZORPAY_ROUTE_ENABLED;
    originalKeyId = process.env.RAZORPAY_KEY_ID;
    originalKeySecret = process.env.RAZORPAY_KEY_SECRET;

    process.env.RAZORPAY_KEY_ID = "rzp_test_fixture_key";
    process.env.RAZORPAY_KEY_SECRET = "rzp_test_fixture_secret";
  });

  afterEach(() => {
    setTestGateway(platformGateway);
    setTestSdk(null);

    if (originalRouteEnabled !== undefined) {
      process.env.RAZORPAY_ROUTE_ENABLED = originalRouteEnabled;
    } else {
      delete process.env.RAZORPAY_ROUTE_ENABLED;
    }

    if (originalKeyId !== undefined) {
      process.env.RAZORPAY_KEY_ID = originalKeyId;
    } else {
      delete process.env.RAZORPAY_KEY_ID;
    }

    if (originalKeySecret !== undefined) {
      process.env.RAZORPAY_KEY_SECRET = originalKeySecret;
    } else {
      delete process.env.RAZORPAY_KEY_SECRET;
    }
  });

  describe("1. Order-Level Route Transfers (on_hold: false)", () => {
    test("passes on_hold: 0 when onHold is false so funds sweep automatically", async () => {
      process.env.RAZORPAY_ROUTE_ENABLED = "true";

      let capturedOptions: Record<string, unknown> | null = null;
      setTestSdk({
        orders: {
          create: async (options: Record<string, unknown>) => {
            capturedOptions = options;
            return {
              id: "order_route_auto_1",
              amount: options.amount,
              currency: options.currency,
              receipt: options.receipt,
              transfers: options.transfers,
            };
          },
        },
      });

      const adapter = new RazorpayGatewayAdapter();
      const order = await adapter.createOrder(100000, "rcpt_route_auto_001", {
        gatewayAccountId: "acc_organizer_linked_01",
        organizerNetPaise: 92000,
        onHold: false,
      });

      expect(order.id).toBe("order_route_auto_1");
      expect(capturedOptions).not.toBeNull();
      const transfers = (capturedOptions as any)?.transfers as Array<{
        account: string;
        amount: number;
        currency: string;
        on_hold: number;
      }>;

      expect(transfers).toBeDefined();
      expect(transfers).toHaveLength(1);
      const trf = transfers?.[0];
      expect(trf).toBeDefined();
      if (!trf) throw new Error("Expected transfer");
      expect(trf.account).toBe("acc_organizer_linked_01");
      expect(trf.amount).toBe(92000);
      expect(trf.currency).toBe("INR");
      expect(trf.on_hold).toBe(0);
    });

    test("passes on_hold: 1 when onHold is explicitly true", async () => {
      process.env.RAZORPAY_ROUTE_ENABLED = "true";

      let capturedOptions: Record<string, unknown> | null = null;
      setTestSdk({
        orders: {
          create: async (options: Record<string, unknown>) => {
            capturedOptions = options;
            return {
              id: "order_route_hold_1",
              amount: options.amount,
              currency: options.currency,
              receipt: options.receipt,
              transfers: options.transfers,
            };
          },
        },
      });

      const adapter = new RazorpayGatewayAdapter();
      const order = await adapter.createOrder(100000, "rcpt_route_hold_001", {
        gatewayAccountId: "acc_organizer_linked_01",
        organizerNetPaise: 92000,
        onHold: true,
      });

      expect(order.id).toBe("order_route_hold_1");
      const transfers = (capturedOptions as any)?.transfers as Array<{
        on_hold: number;
      }>;
      const trfHold = transfers?.[0];
      expect(trfHold).toBeDefined();
      if (!trfHold) throw new Error("Expected transfer");
      expect(trfHold.on_hold).toBe(1);
    });
  });

  describe("2. Gateway Webhook Normalization & Route Settlements", () => {
    const adapter = new RazorpayGatewayAdapter();

    test("normalizes transfer.processed webhook", () => {
      const payload = {
        event: "transfer.processed",
        payload: {
          transfer: {
            entity: {
              id: "trf_proc_999",
              status: "processed",
              recipient: "acc_organizer_abc",
              amount: 50000,
            },
          },
        },
      };

      const buffer = Buffer.from(JSON.stringify(payload));
      const parsed = adapter.verifyAndParseWebhook(buffer, {
        "x-skip-signature-verify": "true",
        "x-razorpay-event-id": "evt_trf_proc_1",
      });

      expect(parsed.normalizedEvent.kind).toBe("transfer");
      if (parsed.normalizedEvent.kind === "transfer") {
        expect(parsed.normalizedEvent.transfer.id).toBe("trf_proc_999");
        expect(parsed.normalizedEvent.transfer.status).toBe("processed");
      }
    });

    test("normalizes settlement.processed webhook for linked sub-account", () => {
      const payload = {
        event: "settlement.processed",
        account_id: "acc_organizer_linked_01",
        payload: {
          settlement: {
            entity: {
              id: "setl_razorpay_bank_888",
              amount: 92000,
              currency: "INR",
              status: "processed",
              utr: "UTR-HDFC-SETL-888999",
              created_at: 1731500000,
            },
          },
        },
      };

      const buffer = Buffer.from(JSON.stringify(payload));
      const parsed = adapter.verifyAndParseWebhook(buffer, {
        "x-skip-signature-verify": "true",
        "x-razorpay-event-id": "evt_setl_proc_1",
      });

      expect(parsed.normalizedEvent.kind).toBe("settlement");
      if (parsed.normalizedEvent.kind === "settlement") {
        expect(parsed.normalizedEvent.settlement.id).toBe("setl_razorpay_bank_888");
        expect(parsed.normalizedEvent.settlement.accountId).toBe("acc_organizer_linked_01");
        expect(parsed.normalizedEvent.settlement.amount).toBe(92000);
        expect(parsed.normalizedEvent.settlement.utr).toBe("UTR-HDFC-SETL-888999");
        expect(parsed.normalizedEvent.settlement.status).toBe("processed");
      }
    });

    test("normalizes transfer.failed webhook", () => {
      const payload = {
        event: "transfer.failed",
        payload: {
          transfer: {
            entity: {
              id: "trf_fail_001",
              status: "failed",
              error: {
                description: "Beneficiary bank down",
              },
            },
          },
        },
      };

      const buffer = Buffer.from(JSON.stringify(payload));
      const parsed = adapter.verifyAndParseWebhook(buffer, {
        "x-skip-signature-verify": "true",
        "x-razorpay-event-id": "evt_trf_fail_1",
      });

      expect(parsed.normalizedEvent.kind).toBe("transfer");
      if (parsed.normalizedEvent.kind === "transfer") {
        expect(parsed.normalizedEvent.transfer.id).toBe("trf_fail_001");
        expect(parsed.normalizedEvent.transfer.status).toBe("failed");
      }
    });
  });

  describe("3. Dashboard Refund Clawback (reverse_all: 1)", () => {
    test("passes reverse_all: 1 when reverseAll is true in createRefund", async () => {
      let capturedPayload: Record<string, unknown> | null = null;
      setTestSdk({
        payments: {
          refund: async (_payId: string, payload: Record<string, unknown>) => {
            capturedPayload = payload;
            return {
              id: "rfnd_reverse_clawback_1",
              payment_id: "pay_test_clawback_1",
              amount: payload.amount,
              status: "processed",
              notes: payload.notes,
            };
          },
        },
      });

      const adapter = new RazorpayGatewayAdapter();
      const refund = await adapter.createRefund(
        "pay_test_clawback_1",
        50000,
        "cmd_clawback_1",
        { reverseAll: true },
      );

      expect(refund.id).toBe("rfnd_reverse_clawback_1");
      expect(capturedPayload).not.toBeNull();
      const payloadClawback = capturedPayload as { amount?: number; reverse_all?: number } | null;
      expect(payloadClawback?.amount).toBe(50000);
      expect(payloadClawback?.reverse_all).toBe(1);
    });

    test("does not pass reverse_all when reverseAll is false or omitted", async () => {
      let capturedPayload: Record<string, unknown> | null = null;
      setTestSdk({
        payments: {
          refund: async (_payId: string, payload: Record<string, unknown>) => {
            capturedPayload = payload;
            return {
              id: "rfnd_no_reverse_1",
              payment_id: "pay_test_no_reverse_1",
              amount: payload.amount,
              status: "processed",
              notes: payload.notes,
            };
          },
        },
      });

      const adapter = new RazorpayGatewayAdapter();
      await adapter.createRefund("pay_test_no_reverse_1", 25000, "cmd_no_reverse_1");

      expect(capturedPayload).not.toBeNull();
      const payloadNoRev = capturedPayload as { amount?: number; reverse_all?: number } | null;
      expect(payloadNoRev?.reverse_all).toBeUndefined();
    });
  });

  describe("4. Organizer Dashboard Refund 3-Gate Protection", () => {
    test("Gate 1: throws 400 if ticket tier allowRefunds is false", async () => {
      const order = {
        id: "order_g1_test",
        eventId: "event_g1_test",
        totalPaise: 50000,
        paymentId: "pay_g1_test",
        currency: "INR",
        status: "paid" as const,
      } as any;

      let selectCallCount = 0;
      const mockTx: any = {
        select: () => ({
          from: () => ({
            where: () => {
              selectCallCount++;
              if (selectCallCount === 3) {
                return [{ id: "tkt_1", orderId: order.id }];
              }
              return [];
            },
            innerJoin: () => ({
              where: () => [
                {
                  ticketId: "tkt_1",
                  allowRefunds: false, // gate 1 failing
                },
              ],
            }),
          }),
        }),
      };

      await expect(
        queueRefund(
          mockTx,
          order,
          "cmd_key_1",
          { amountPaise: 50000, reason: "Attendee request", voidTicketIds: ["tkt_1"] },
          "user_organizer_id",
          order.paymentId,
        ),
      ).rejects.toThrow("Refunds are not enabled for this ticket tier");
    });

    test("Gate 2: throws 400 if event has already started", async () => {
      const order = {
        id: "order_g2_test",
        eventId: "event_g2_test",
        totalPaise: 50000,
        paymentId: "pay_g2_test",
        currency: "INR",
        status: "paid" as const,
      } as any;

      const pastStartDate = new Date(Date.now() - 3600000); // 1 hour ago

      let selectCallCount = 0;
      const mockTx: any = {
        select: () => ({
          from: () => ({
            where: () => {
              selectCallCount++;
              if (selectCallCount === 3) {
                return [{ id: "tkt_2", orderId: order.id }];
              }
              if (selectCallCount >= 4) {
                return [{ startDate: pastStartDate }];
              }
              return [];
            },
            innerJoin: () => ({
              where: () => [
                {
                  ticketId: "tkt_2",
                  allowRefunds: true, // Gate 1 passes
                },
              ],
            }),
          }),
        }),
      };

      await expect(
        queueRefund(
          mockTx,
          order,
          "cmd_key_2",
          { amountPaise: 50000, reason: "Attendee request", voidTicketIds: ["tkt_2"] },
          "user_organizer_id",
          order.paymentId,
        ),
      ).rejects.toThrow("Automated refunds are disabled once the event has started");
    });

    test("Gate 3: throws 400 if organizer unsettled balance is less than refund amount", async () => {
      const order = {
        id: "order_g3_test",
        eventId: "event_g3_test",
        totalPaise: 50000,
        paymentId: "pay_g3_test",
        currency: "INR",
        status: "paid" as const,
      } as any;

      const futureStartDate = new Date(Date.now() + 86400000); // tomorrow

      let selectCallCount = 0;
      const mockTx: any = {
        select: () => ({
          from: () => ({
            where: () => {
              selectCallCount++;
              if (selectCallCount === 3) {
                return [{ id: "tkt_3", orderId: order.id }];
              }
              if (selectCallCount === 4) {
                return [{ startDate: futureStartDate }];
              }
              if (selectCallCount === 5) {
                // order ids list
                return [{ id: "order_other" }];
              }
              if (selectCallCount === 6) {
                // organizerNetPaise sum = 30000 (< 50000)
                return [{ organizerNetPaise: 30000 }];
              }
              if (selectCallCount === 7) {
                return [];
              }
              return [];
            },
            innerJoin: () => ({
              where: () => [
                {
                  ticketId: "tkt_3",
                  allowRefunds: true,
                },
              ],
            }),
          }),
        }),
      };

      await expect(
        queueRefund(
          mockTx,
          order,
          "cmd_key_3",
          { amountPaise: 50000, reason: "Attendee request", voidTicketIds: ["tkt_3"] },
          "user_organizer_id",
          order.paymentId,
        ),
      ).rejects.toThrow("Insufficient unsettled balance in the Razorpay settlement cycle");
    });

    test("All 3 Gates Pass: queues refund successfully", async () => {
      const order = {
        id: "order_g_pass",
        eventId: "event_g_pass",
        totalPaise: 50000,
        paymentId: "pay_g_pass",
        currency: "INR",
        status: "paid" as const,
      } as any;

      const futureStartDate = new Date(Date.now() + 86400000); // tomorrow

      let selectCallCount = 0;
      let insertedRefund: any = null;

      const mockTx: any = {
        select: () => ({
          from: () => ({
            where: () => {
              selectCallCount++;
              if (selectCallCount === 3) {
                return [{ id: "tkt_pass", orderId: order.id }];
              }
              if (selectCallCount === 4) {
                return [{ startDate: futureStartDate }];
              }
              if (selectCallCount === 5) {
                // eligible orders
                return [{ id: order.id }];
              }
              if (selectCallCount === 6) {
                // unsettled total = 100000 (enough for 50000 refund)
                return [{ organizerNetPaise: 100000 }];
              }
              if (selectCallCount === 7) {
                // active refunds
                return [];
              }
              return [];
            },
            innerJoin: () => ({
              where: () => [
                {
                  ticketId: "tkt_pass",
                  allowRefunds: true,
                },
              ],
            }),
          }),
        }),
        insert: () => ({
          values: (vals: any) => {
            insertedRefund = vals;
            return {
              returning: () => [vals],
            };
          },
        }),
        update: () => ({
          set: () => ({
            where: () => ({
              returning: () => [{ version: 1 }],
            }),
          }),
        }),
      };

      const result = await queueRefund(
        mockTx,
        order,
        "cmd_key_pass",
        { amountPaise: 50000, reason: "Attendee request", voidTicketIds: ["tkt_pass"] },
        "user_organizer_id",
        order.paymentId,
      );

      expect(result).toBeDefined();
      expect(result.orderId).toBe(order.id);
      expect(result.amountPaise).toBe(50000);
      expect(result.reason).toBe("Attendee request");
    });
  });
});
