import { describe, expect, spyOn, test } from "bun:test";
import { deliverMail } from "../src/services/mail.service";
import { presignUpload } from "../src/services/storage.service";
import {
  gateway,
  platformGateway,
  setTestGateway,
  type GatewayOrder,
  type GatewayPayment,
  type GatewayRefund,
  type NormalizedWebhookEvent,
  type PaymentGateway,
} from "../src/services/gateway.service";
import { HttpError } from "../src/utils/errors";

describe("provider transport contracts without external delivery", () => {
  test("Brevo uses provider delivery and a stable UUID mail key", async () => {
    const oldKey = process.env.BREVO_API_KEY;
    const oldFrom = process.env.EMAIL_FROM;
    process.env.BREVO_API_KEY = "fixture-brevo";
    process.env.EMAIL_FROM = "fixture@example.test";
    const fetcher = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ messageId: "fixture" }), { status: 201 }),
    );
    try {
      await deliverMail(
        {
          recipientEmail: "attendee@example.test",
          subject: "Fixture",
          body: "<p>Fixture</p>",
        },
        undefined,
        "order:fixture:confirmation",
      );
      const call = fetcher.mock.calls[0]!;
      expect(call[0]).toBe("https://api.brevo.com/v3/smtp/email");
      const body = JSON.parse(String(call[1]?.body)) as {
        headers: { idempotencyKey: string };
        to: { email: string }[];
      };
      expect(body.headers.idempotencyKey).toMatch(/^[a-f0-9-]{36}$/);
      expect(body.to[0]?.email).toBe("attendee@example.test");
    } finally {
      fetcher.mockRestore();
      if (oldKey === undefined) delete process.env.BREVO_API_KEY;
      else process.env.BREVO_API_KEY = oldKey;
      if (oldFrom === undefined) delete process.env.EMAIL_FROM;
      else process.env.EMAIL_FROM = oldFrom;
    }
  });

  test("browser R2 upload URL binds metadata and has a five-minute expiry", async () => {
    const keys = [
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET",
    ] as const;
    const previous = keys.map((key) => process.env[key]);
    [
      process.env.R2_ACCOUNT_ID,
      process.env.R2_ACCESS_KEY_ID,
      process.env.R2_SECRET_ACCESS_KEY,
      process.env.R2_BUCKET,
    ] = ["fixture", "fixture-access", "fixture-secret", "fixture-bucket"];
    try {
      const url = new URL(
        await presignUpload("staging/fixture", "application/pdf", 123),
      );
      expect(url.hostname).toBe("fixture.r2.cloudflarestorage.com");
      expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
      expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain(
        "content-type",
      );
      expect(url.searchParams.has("x-amz-checksum-crc32")).toBe(false);
    } finally {
      keys.forEach((key, i) => {
        if (previous[i] === undefined) delete process.env[key];
        else process.env[key] = previous[i];
      });
    }
  });

  test("custom mock PaymentGateway adapter handles order creation, client callback verification, and webhook parsing without Razorpay assumptions", async () => {
    const mockCreatedOrders = new Map<string, GatewayOrder>();
    const mockPayments = new Map<string, GatewayPayment>();
    const mockRefunds = new Map<string, GatewayRefund>();

    class MockGatewayAdapter implements PaymentGateway {
      readonly providerName = "mockpay";

      getClientConfig(order: {
        paymentIntentId: string;
        totalPaise: number;
        currency: string;
      }) {
        return {
          provider: this.providerName,
          orderId: order.paymentIntentId,
          amount: order.totalPaise,
          currency: order.currency,
          publicKey: "mock_pk_test_12345",
        };
      }

      verifyClientCallback(params: {
        expectedGatewayOrderId: string;
        payload: Record<string, string>;
      }): boolean {
        const orderId =
          params.payload.providerOrderId ?? params.payload.orderId;
        const signature =
          params.payload.providerSignature ?? params.payload.signature;
        if (orderId !== params.expectedGatewayOrderId) return false;
        return signature === `sig_valid_for_${orderId}`;
      }

      verifyAndParseWebhook(
        rawBody: Buffer,
        headers: Record<string, string | string[] | undefined>,
      ): {
        eventId: string;
        normalizedEvent: NormalizedWebhookEvent;
      } {
        const signature = headers["x-mock-signature"];
        const eventId = headers["x-mock-event-id"];
        if (
          signature !== "valid_mock_signature" ||
          typeof eventId !== "string"
        ) {
          throw new HttpError(400, "Invalid webhook signature or missing ID.");
        }
        const parsed = JSON.parse(rawBody.toString("utf8")) as {
          topic: string;
          data: Record<string, unknown>;
        };

        if (parsed.topic === "mock.payment.success") {
          return {
            eventId,
            normalizedEvent: {
              kind: "payment",
              payment: {
                id: String(parsed.data.paymentId),
                order_id: String(parsed.data.orderId),
                amount: Number(parsed.data.amount),
                currency: String(parsed.data.currency),
                status: "captured",
                amount_refunded: 0,
              },
            },
          };
        }

        if (parsed.topic === "mock.refund.completed") {
          return {
            eventId,
            normalizedEvent: {
              kind: "refund",
              refund: {
                id: String(parsed.data.refundId),
                payment_id: String(parsed.data.paymentId),
                amount: Number(parsed.data.amount),
                status: "processed",
                notes: {},
              },
            },
          };
        }

        return {
          eventId,
          normalizedEvent: { kind: "ignored" },
        };
      }

      async createOrder(
        amount: number,
        receipt: string,
      ): Promise<GatewayOrder> {
        const order: GatewayOrder = {
          id: `mock_ord_${Date.now()}`,
          amount,
          currency: "INR",
          receipt,
        };
        mockCreatedOrders.set(order.id, order);
        return order;
      }

      async findOrder(receipt: string): Promise<GatewayOrder | undefined> {
        return [...mockCreatedOrders.values()].find(
          (o) => o.receipt === receipt,
        );
      }

      async fetchPayment(id: string): Promise<GatewayPayment> {
        const p = mockPayments.get(id);
        if (!p) throw new Error("Payment not found");
        return p;
      }

      async orderPayments(id: string): Promise<GatewayPayment[]> {
        return [...mockPayments.values()].filter((p) => p.order_id === id);
      }

      async createRefund(
        paymentId: string,
        amount: number,
        commandId: string,
      ): Promise<GatewayRefund> {
        const refund: GatewayRefund = {
          id: `mock_rfnd_${Date.now()}`,
          payment_id: paymentId,
          amount,
          status: "processed",
          notes: { commandId },
        };
        mockRefunds.set(refund.id, refund);
        return refund;
      }

      async refunds(paymentId: string): Promise<GatewayRefund[]> {
        return [...mockRefunds.values()].filter(
          (r) => r.payment_id === paymentId,
        );
      }
    }

    const mockAdapter = new MockGatewayAdapter();
    setTestGateway(mockAdapter);

    try {
      // 1. Verify provider metadata and client config
      expect(gateway().providerName).toBe("mockpay");
      const clientConfig = gateway().getClientConfig({
        paymentIntentId: "intent_123",
        totalPaise: 49900,
        currency: "INR",
      });
      expect(clientConfig.provider).toBe("mockpay");
      expect(clientConfig.orderId).toBe("intent_123");
      expect(clientConfig.amount).toBe(49900);
      expect(clientConfig.publicKey).toBe("mock_pk_test_12345");

      // 2. Verify order creation
      const createdOrder = await gateway().createOrder(49900, "rec_test_1");
      expect(createdOrder.id).toMatch(/^mock_ord_/);
      expect(createdOrder.amount).toBe(49900);
      expect(createdOrder.receipt).toBe("rec_test_1");

      // 3. Verify client callback verification
      const validCallback = gateway().verifyClientCallback({
        expectedGatewayOrderId: createdOrder.id,
        payload: {
          providerOrderId: createdOrder.id,
          providerPaymentId: "pay_xyz",
          providerSignature: `sig_valid_for_${createdOrder.id}`,
        },
      });
      expect(validCallback).toBe(true);

      const invalidCallback = gateway().verifyClientCallback({
        expectedGatewayOrderId: createdOrder.id,
        payload: {
          providerOrderId: createdOrder.id,
          providerPaymentId: "pay_xyz",
          providerSignature: "sig_wrong",
        },
      });
      expect(invalidCallback).toBe(false);

      // 4. Verify webhook parsing and normalization
      const paymentWebhookBody = Buffer.from(
        JSON.stringify({
          topic: "mock.payment.success",
          data: {
            paymentId: "mock_pay_999",
            orderId: createdOrder.id,
            amount: 49900,
            currency: "INR",
          },
        }),
      );

      const parsedPaymentWebhook = gateway().verifyAndParseWebhook(
        paymentWebhookBody,
        {
          "x-mock-signature": "valid_mock_signature",
          "x-mock-event-id": "mock_evt_111",
        },
      );
      expect(parsedPaymentWebhook.eventId).toBe("mock_evt_111");
      expect(parsedPaymentWebhook.normalizedEvent.kind).toBe("payment");
      if (parsedPaymentWebhook.normalizedEvent.kind === "payment") {
        expect(parsedPaymentWebhook.normalizedEvent.payment.id).toBe(
          "mock_pay_999",
        );
        expect(parsedPaymentWebhook.normalizedEvent.payment.order_id).toBe(
          createdOrder.id,
        );
        expect(parsedPaymentWebhook.normalizedEvent.payment.amount).toBe(49900);
      }

      // 5. Verify refund webhook parsing and normalization
      const refundWebhookBody = Buffer.from(
        JSON.stringify({
          topic: "mock.refund.completed",
          data: {
            refundId: "mock_rfnd_555",
            paymentId: "mock_pay_999",
            amount: 49900,
          },
        }),
      );

      const parsedRefundWebhook = gateway().verifyAndParseWebhook(
        refundWebhookBody,
        {
          "x-mock-signature": "valid_mock_signature",
          "x-mock-event-id": "mock_evt_222",
        },
      );
      expect(parsedRefundWebhook.eventId).toBe("mock_evt_222");
      expect(parsedRefundWebhook.normalizedEvent.kind).toBe("refund");
      if (parsedRefundWebhook.normalizedEvent.kind === "refund") {
        expect(parsedRefundWebhook.normalizedEvent.refund.id).toBe(
          "mock_rfnd_555",
        );
        expect(parsedRefundWebhook.normalizedEvent.refund.payment_id).toBe(
          "mock_pay_999",
        );
      }

      // 6. Verify webhook signature rejection
      expect(() =>
        gateway().verifyAndParseWebhook(paymentWebhookBody, {
          "x-mock-signature": "invalid_sig",
          "x-mock-event-id": "mock_evt_333",
        }),
      ).toThrow();
    } finally {
      setTestGateway(platformGateway);
    }
  });
});
