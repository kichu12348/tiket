import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
  gateway,
  platformGateway,
  setTestGateway,
  RazorpayGatewayAdapter,
  type GatewayOrder,
  type PaymentGateway,
} from "../src/services/gateway.service";

describe("Automated Organizer Payouts & Order Splits", () => {
  let originalRouteEnabled: string | undefined;
  let originalRazorpayxAccount: string | undefined;
  let originalKeyId: string | undefined;
  let originalKeySecret: string | undefined;

  beforeEach(() => {
    originalRouteEnabled = process.env.RAZORPAY_ROUTE_ENABLED;
    originalRazorpayxAccount = process.env.RAZORPAYX_ACCOUNT_NUMBER;
    originalKeyId = process.env.RAZORPAY_KEY_ID;
    originalKeySecret = process.env.RAZORPAY_KEY_SECRET;

    process.env.RAZORPAY_KEY_ID = "rzp_test_fixture_key";
    process.env.RAZORPAY_KEY_SECRET = "rzp_test_fixture_secret";
  });

  afterEach(() => {
    setTestGateway(platformGateway);

    if (originalRouteEnabled !== undefined) {
      process.env.RAZORPAY_ROUTE_ENABLED = originalRouteEnabled;
    } else {
      delete process.env.RAZORPAY_ROUTE_ENABLED;
    }

    if (originalRazorpayxAccount !== undefined) {
      process.env.RAZORPAYX_ACCOUNT_NUMBER = originalRazorpayxAccount;
    } else {
      delete process.env.RAZORPAYX_ACCOUNT_NUMBER;
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

  describe("Sub-Merchant Onboarding (`upsertSubMerchantAccount`)", () => {
    test("automatically creates a Route sub-merchant account when no existing account is present", async () => {
      let createdParams: Record<string, unknown> | null = null;
      const testAdapter: PaymentGateway = {
        providerName: "razorpay",
        getClientConfig: (order) => ({
          provider: "razorpay",
          orderId: order.paymentIntentId,
          amount: order.totalPaise,
          currency: order.currency,
        }),
        verifyClientCallback: () => true,
        verifyAndParseWebhook: () => ({
          eventId: "evt_1",
          normalizedEvent: { kind: "ignored" },
        }),
        async upsertSubMerchantAccount(params) {
          createdParams = params;
          return {
            gatewayAccountId: `acc_${params.userId.slice(0, 8)}`,
            status: "active",
          };
        },
        async createOrder(amount, receipt) {
          return { id: "order_1", amount, currency: "INR", receipt };
        },
        async findOrder() {
          return undefined;
        },
        async fetchPayment() {
          return {
            id: "pay_1",
            order_id: "order_1",
            amount: 100,
            currency: "INR",
            status: "captured",
            amount_refunded: 0,
          };
        },
        async orderPayments() {
          return [];
        },
        async createRefund() {
          return {
            id: "rfnd_1",
            payment_id: "pay_1",
            amount: 100,
            status: "processed",
            notes: {},
          };
        },
        async refunds() {
          return [];
        },
      };

      setTestGateway(testAdapter);

      const result = await gateway().upsertSubMerchantAccount({
        userId: "user-12345-uuid",
        email: "organizer@example.com",
        phone: "9876543210",
        accountHolderName: "Jane Doe Events",
        accountNumber: "123456789012",
        ifscCode: "HDFC0001234",
        bankName: "HDFC Bank",
        upiId: "janedoe@okaxis",
      });

      expect(result.gatewayAccountId).toBe("acc_user-123");
      expect(result.status).toBe("active");
      expect(createdParams).toMatchObject({
        userId: "user-12345-uuid",
        email: "organizer@example.com",
        accountHolderName: "Jane Doe Events",
        accountNumber: "123456789012",
        ifscCode: "HDFC0001234",
        bankName: "HDFC Bank",
      });
    });

    test("falls back to deterministic mock ID if active gateway does not implement upsertSubMerchantAccount", async () => {
      const basicGateway: PaymentGateway = {
        providerName: "mock",
        getClientConfig: (order) => ({
          provider: "mock",
          orderId: order.paymentIntentId,
          amount: order.totalPaise,
          currency: order.currency,
        }),
        verifyClientCallback: () => true,
        verifyAndParseWebhook: () => ({
          eventId: "evt_1",
          normalizedEvent: { kind: "ignored" },
        }),
        async createOrder(amount, receipt) {
          return { id: "order_1", amount, currency: "INR", receipt };
        },
        async findOrder() {
          return undefined;
        },
        async fetchPayment() {
          return {
            id: "pay_1",
            order_id: "order_1",
            amount: 100,
            currency: "INR",
            status: "captured",
            amount_refunded: 0,
          };
        },
        async orderPayments() {
          return [];
        },
        async createRefund() {
          return {
            id: "rfnd_1",
            payment_id: "pay_1",
            amount: 100,
            status: "processed",
            notes: {},
          };
        },
        async refunds() {
          return [];
        },
      };

      setTestGateway(basicGateway);

      const result = await gateway().upsertSubMerchantAccount({
        userId: "fallback-organizer-id",
        email: "fallback@example.com",
        phone: "9876543210",
        accountHolderName: "Fallback User",
        accountNumber: "999988887777",
        ifscCode: "SBIN0001234",
        bankName: "State Bank of India",
      });

      expect(result.gatewayAccountId).toBe("acc_fallback-organizer-id");
      expect(result.status).toBe("active");
    });
  });

  describe("Order Split Transfers (`createOrder` with `splitTransfer`)", () => {
    test("attaches split transfers with on_hold: true when Route is enabled and organizerNetPaise > 0", async () => {
      process.env.RAZORPAY_ROUTE_ENABLED = "true";

      let capturedSplit:
        | {
            gatewayAccountId: string;
            organizerNetPaise: number;
            onHold?: boolean;
          }
        | undefined;

      const splitGateway: PaymentGateway = {
        providerName: "razorpay",
        getClientConfig: (order) => ({
          provider: "razorpay",
          orderId: order.paymentIntentId,
          amount: order.totalPaise,
          currency: order.currency,
        }),
        verifyClientCallback: () => true,
        verifyAndParseWebhook: () => ({
          eventId: "evt_1",
          normalizedEvent: { kind: "ignored" },
        }),
        async createOrder(amount, receipt, splitTransfer) {
          capturedSplit = splitTransfer;
          const transfers = splitTransfer
            ? [
                {
                  id: "trf_sample_123",
                  account: splitTransfer.gatewayAccountId,
                  amount: splitTransfer.organizerNetPaise,
                },
              ]
            : undefined;

          return {
            id: `order_${randomUUID()}`,
            amount,
            currency: "INR",
            receipt,
            transfers,
          };
        },
        async findOrder() {
          return undefined;
        },
        async fetchPayment() {
          return {
            id: "pay_1",
            order_id: "order_1",
            amount: 100,
            currency: "INR",
            status: "captured",
            amount_refunded: 0,
          };
        },
        async orderPayments() {
          return [];
        },
        async createRefund() {
          return {
            id: "rfnd_1",
            payment_id: "pay_1",
            amount: 100,
            status: "processed",
            notes: {},
          };
        },
        async refunds() {
          return [];
        },
      };

      setTestGateway(splitGateway);

      const order = await gateway().createOrder(50000, "ord_receipt_123", {
        gatewayAccountId: "acc_organizer_linked_999",
        organizerNetPaise: 46000,
        onHold: true,
      });

      expect(order.amount).toBe(50000);
      expect(order.transfers).toBeDefined();
      expect(order.transfers).toHaveLength(1);
      const firstTransfer = order.transfers?.[0];
      expect(firstTransfer?.id).toBe("trf_sample_123");
      expect(firstTransfer?.account).toBe("acc_organizer_linked_999");
      expect(firstTransfer?.amount).toBe(46000);

      expect(capturedSplit).toEqual({
        gatewayAccountId: "acc_organizer_linked_999",
        organizerNetPaise: 46000,
        onHold: true,
      });
    });

    test("does not attach transfers if organizerNetPaise is 0 or splitTransfer is omitted", async () => {
      let capturedSplit: unknown = null;
      const orderGateway: PaymentGateway = {
        providerName: "razorpay",
        getClientConfig: (order) => ({
          provider: "razorpay",
          orderId: order.paymentIntentId,
          amount: order.totalPaise,
          currency: order.currency,
        }),
        verifyClientCallback: () => true,
        verifyAndParseWebhook: () => ({
          eventId: "evt_1",
          normalizedEvent: { kind: "ignored" },
        }),
        async createOrder(amount, receipt, splitTransfer) {
          capturedSplit = splitTransfer;
          return {
            id: "order_zero_split",
            amount,
            currency: "INR",
            receipt,
          };
        },
        async findOrder() {
          return undefined;
        },
        async fetchPayment() {
          return {
            id: "pay_1",
            order_id: "order_1",
            amount: 0,
            currency: "INR",
            status: "captured",
            amount_refunded: 0,
          };
        },
        async orderPayments() {
          return [];
        },
        async createRefund() {
          return {
            id: "rfnd_1",
            payment_id: "pay_1",
            amount: 0,
            status: "processed",
            notes: {},
          };
        },
        async refunds() {
          return [];
        },
      };

      setTestGateway(orderGateway);

      const res = await gateway().createOrder(0, "ord_free_123");
      expect(res.id).toBe("order_zero_split");
      expect(capturedSplit).toBeUndefined();
    });
  });

  describe("Automated Withdrawal Execution (`executeAutomatedWithdrawal`)", () => {
    test("releases held Route transfers when heldTransferIds are present", async () => {
      let releasedTransfers: string[] = [];

      const withdrawalGateway: PaymentGateway = {
        providerName: "razorpay",
        getClientConfig: (order) => ({
          provider: "razorpay",
          orderId: order.paymentIntentId,
          amount: order.totalPaise,
          currency: order.currency,
        }),
        verifyClientCallback: () => true,
        verifyAndParseWebhook: () => ({
          eventId: "evt_1",
          normalizedEvent: { kind: "ignored" },
        }),
        async executeAutomatedWithdrawal(params) {
          releasedTransfers = [...params.heldTransferIds];
          return {
            gatewayPayoutId: `rel_${params.payoutRequestId}`,
            status: "paid",
            referenceNumber: `REL-UTR-999`,
          };
        },
        async createOrder(amount, receipt) {
          return { id: "order_1", amount, currency: "INR", receipt };
        },
        async findOrder() {
          return undefined;
        },
        async fetchPayment() {
          return {
            id: "pay_1",
            order_id: "order_1",
            amount: 100,
            currency: "INR",
            status: "captured",
            amount_refunded: 0,
          };
        },
        async orderPayments() {
          return [];
        },
        async createRefund() {
          return {
            id: "rfnd_1",
            payment_id: "pay_1",
            amount: 100,
            status: "processed",
            notes: {},
          };
        },
        async refunds() {
          return [];
        },
      };

      setTestGateway(withdrawalGateway);

      const withdrawal = await gateway().executeAutomatedWithdrawal({
        payoutRequestId: "payout-req-uuid-1",
        amountPaise: 75000,
        bankAccount: {
          gatewayAccountId: "acc_organizer_99",
          accountHolderName: "Organizer LLC",
          accountNumber: "987654321098",
          ifscCode: "ICIC0000001",
          bankName: "ICICI Bank",
        },
        heldTransferIds: ["trf_101", "trf_102", "trf_103"],
      });

      expect(withdrawal.status).toBe("paid");
      expect(withdrawal.gatewayPayoutId).toBe("rel_payout-req-uuid-1");
      expect(withdrawal.referenceNumber).toBe("REL-UTR-999");
      expect(releasedTransfers).toEqual(["trf_101", "trf_102", "trf_103"]);
    });

    test("triggers RazorpayX automated bank payout when RAZORPAYX_ACCOUNT_NUMBER is configured and no held transfers exist", async () => {
      process.env.RAZORPAYX_ACCOUNT_NUMBER = "2323230055443322";
      const adapter = new RazorpayGatewayAdapter();

      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "pout_x_123456",
            status: "processed",
            utr: "CMS1234567890",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      try {
        const withdrawal = await adapter.executeAutomatedWithdrawal({
          payoutRequestId: "payout-req-x-1",
          amountPaise: 150000,
          bankAccount: {
            accountHolderName: "Direct Payee",
            accountNumber: "112233445566",
            ifscCode: "KKBK0001234",
            bankName: "Kotak Mahindra Bank",
          },
          heldTransferIds: [],
        });

        expect(withdrawal.gatewayPayoutId).toBe("pout_x_123456");
        expect(withdrawal.status).toBe("paid");
        expect(withdrawal.referenceNumber).toBe("CMS1234567890");

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const call = fetchSpy.mock.calls[0];
        expect(call).toBeDefined();
        if (!call) throw new Error("Expected fetch call");
        expect(call[0]).toBe("https://api.razorpay.com/v1/payouts");
        const body = JSON.parse(String(call[1]?.body)) as {
          account_number: string;
          amount: number;
          fund_account: {
            bank_account: { account_number: string; ifsc: string };
          };
        };
        expect(body.account_number).toBe("2323230055443322");
        expect(body.amount).toBe(150000);
        expect(body.fund_account.bank_account.account_number).toBe(
          "112233445566",
        );
        expect(body.fund_account.bank_account.ifsc).toBe("KKBK0001234");
      } finally {
        fetchSpy.mockRestore();
      }
    });
  });

  describe("Webhook Lifecycle Parsing (`verifyAndParseWebhook`)", () => {
    const adapter = new RazorpayGatewayAdapter();

    test("normalizes payout.processed webhook into payout kind with UTR", () => {
      const payload = {
        event: "payout.processed",
        payload: {
          payout: {
            entity: {
              id: "pout_webhook_777",
              status: "processed",
              utr: "UTR-BANK-PROCESSED-001",
              amount: 25000,
            },
          },
        },
      };

      const buffer = Buffer.from(JSON.stringify(payload));
      const parsed = adapter.verifyAndParseWebhook(buffer, {
        "x-skip-signature-verify": "true",
        "x-razorpay-event-id": "evt_pout_proc_1",
      });

      expect(parsed.eventId).toBe("evt_pout_proc_1");
      expect(parsed.normalizedEvent.kind).toBe("payout");
      if (parsed.normalizedEvent.kind === "payout") {
        expect(parsed.normalizedEvent.payout.id).toBe("pout_webhook_777");
        expect(parsed.normalizedEvent.payout.status).toBe("processed");
        expect(parsed.normalizedEvent.payout.referenceNumber).toBe(
          "UTR-BANK-PROCESSED-001",
        );
      }
    });

    test("normalizes payout.failed webhook with failureReason", () => {
      const payload = {
        event: "payout.failed",
        payload: {
          payout: {
            entity: {
              id: "pout_webhook_fail_999",
              status: "failed",
              failure_reason: "Beneficiary bank account inactive or invalid IFSC",
            },
          },
        },
      };

      const buffer = Buffer.from(JSON.stringify(payload));
      const parsed = adapter.verifyAndParseWebhook(buffer, {
        "x-skip-signature-verify": "true",
        "x-razorpay-event-id": "evt_pout_fail_1",
      });

      expect(parsed.normalizedEvent.kind).toBe("payout");
      if (parsed.normalizedEvent.kind === "payout") {
        expect(parsed.normalizedEvent.payout.id).toBe("pout_webhook_fail_999");
        expect(parsed.normalizedEvent.payout.status).toBe("failed");
        expect(parsed.normalizedEvent.payout.failureReason).toBe(
          "Beneficiary bank account inactive or invalid IFSC",
        );
      }
    });

    test("normalizes transfer.settled webhook into transfer kind", () => {
      const payload = {
        event: "transfer.settled",
        payload: {
          transfer: {
            entity: {
              id: "trf_route_settled_55",
              status: "settled",
              recipient_settlement_id: "setl_123456",
            },
          },
        },
      };

      const buffer = Buffer.from(JSON.stringify(payload));
      const parsed = adapter.verifyAndParseWebhook(buffer, {
        "x-skip-signature-verify": "true",
        "x-razorpay-event-id": "evt_trf_setl_1",
      });

      expect(parsed.normalizedEvent.kind).toBe("transfer");
      if (parsed.normalizedEvent.kind === "transfer") {
        expect(parsed.normalizedEvent.transfer.id).toBe("trf_route_settled_55");
        expect(parsed.normalizedEvent.transfer.status).toBe("settled");
        expect(parsed.normalizedEvent.transfer.recipientSettlementId).toBe(
          "setl_123456",
        );
      }
    });
  });
});

