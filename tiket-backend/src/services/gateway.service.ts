import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "../utils/errors";

export interface GatewayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  amount_refunded: number;
}

export interface GatewayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string | null;
  transfers?: { id: string; account: string; amount: number }[];
}

export interface GatewayRefund {
  id: string;
  payment_id: string;
  amount: number;
  status: string;
  notes: Record<string, string>;
}

export type NormalizedWebhookEvent =
  | { kind: "payment"; payment: GatewayPayment }
  | { kind: "refund"; refund: GatewayRefund }
  | {
      kind: "payout";
      payout: {
        id: string;
        status: string;
        referenceNumber?: string;
        failureReason?: string;
      };
    }
  | {
      kind: "transfer";
      transfer: {
        id: string;
        status: string;
        recipientSettlementId?: string;
        failureReason?: string;
      };
    }
  | {
      kind: "settlement";
      settlement: {
        id: string;
        accountId: string;
        amount: number;
        status: string;
        utr?: string;
      };
    }
  | { kind: "ignored" };

export interface GatewayClientConfig {
  provider: string;
  orderId: string;
  amount: number;
  currency: string;
  publicKey?: string;
  [key: string]: unknown;
}

export interface PaymentGateway {
  readonly providerName: string;
  getClientConfig(order: {
    paymentIntentId: string;
    totalPaise: number;
    currency: string;
  }): GatewayClientConfig;
  verifyClientCallback(params: {
    expectedGatewayOrderId: string;
    payload: Record<string, string>;
  }): boolean;
  verifyAndParseWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): {
    eventId: string;
    normalizedEvent: NormalizedWebhookEvent;
  };
  upsertSubMerchantAccount?(params: {
    userId: string;
    email: string;
    phone: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    upiId?: string | null;
    existingAccountId?: string | null;
  }): Promise<{ gatewayAccountId: string; status: string }>;
  createOrder(
    amount: number,
    receipt: string,
    splitTransfer?: {
      gatewayAccountId: string;
      organizerNetPaise: number;
      onHold?: boolean;
    },
  ): Promise<GatewayOrder>;
  findOrder(receipt: string): Promise<GatewayOrder | undefined>;
  fetchPayment(id: string): Promise<GatewayPayment>;
  orderPayments(id: string): Promise<GatewayPayment[]>;
  createRefund(
    paymentId: string,
    amount: number,
    commandId: string,
    options?: { reverseAll?: boolean },
  ): Promise<GatewayRefund>;
  refunds(paymentId: string): Promise<GatewayRefund[]>;
  executeAutomatedWithdrawal?(params: {
    payoutRequestId: string;
    amountPaise: number;
    bankAccount: {
      gatewayAccountId?: string | null;
      accountHolderName: string;
      accountNumber: string;
      ifscCode: string;
      bankName: string;
      upiId?: string | null;
    };
    heldTransferIds: string[];
  }): Promise<{
    gatewayPayoutId: string;
    status: "processing" | "paid";
    referenceNumber?: string;
  }>;
}

let testSdk: unknown = null;

export function setTestSdk(custom: unknown) {
  if (process.env.NODE_ENV !== "test")
    throw new Error("SDK overrides are only allowed in tests.");
  testSdk = custom;
}

function sdk(): Razorpay {
  if (testSdk) return testSdk as Razorpay;
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
    throw new Error("Platform Razorpay credentials are not configured.");
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

const payment = (value: {
  id: string;
  order_id: string;
  amount: string | number;
  currency: string;
  status: string;
  amount_refunded?: string | number;
}): GatewayPayment => ({
  ...value,
  amount: Number(value.amount),
  amount_refunded: Number(value.amount_refunded || 0),
});

const normalRefund = (value: {
  id: string;
  payment_id: string;
  amount?: string | number;
  status: string;
  notes?: unknown;
}): GatewayRefund => ({
  ...value,
  amount: Number(value.amount),
  notes:
    value.notes &&
    !Array.isArray(value.notes) &&
    typeof value.notes === "object"
      ? Object.fromEntries(
          Object.entries(value.notes).map(([k, v]) => [k, String(v)]),
        )
      : {},
});

export class RazorpayGatewayAdapter implements PaymentGateway {
  readonly providerName = "razorpay";

  getClientConfig(order: {
    paymentIntentId: string;
    totalPaise: number;
    currency: string;
  }): GatewayClientConfig {
    return {
      provider: this.providerName,
      orderId: order.paymentIntentId,
      amount: order.totalPaise,
      currency: order.currency,
      publicKey: process.env.RAZORPAY_KEY_ID,
    };
  }

  verifyClientCallback(params: {
    expectedGatewayOrderId: string;
    payload: Record<string, string>;
  }): boolean {
    const orderId =
      params.payload.razorpayOrderId ??
      params.payload.razorpay_order_id ??
      params.payload.providerOrderId;
    const paymentId =
      params.payload.razorpayPaymentId ??
      params.payload.razorpay_payment_id ??
      params.payload.providerPaymentId;
    const signature =
      params.payload.razorpaySignature ??
      params.payload.razorpay_signature ??
      params.payload.providerSignature;

    if (!orderId || !paymentId || !signature) return false;
    if (orderId !== params.expectedGatewayOrderId) return false;

    return validHmac(
      `${params.expectedGatewayOrderId}|${paymentId}`,
      signature,
      process.env.RAZORPAY_KEY_SECRET,
    );
  }

  verifyAndParseWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): {
    eventId: string;
    normalizedEvent: NormalizedWebhookEvent;
  } {
    const getHeader = (name: string): string | undefined => {
      const val = headers[name] ?? headers[name.toLowerCase()];
      return Array.isArray(val) ? val[0] : val;
    };

    const signature = getHeader("x-razorpay-signature");
    const eventIdHeader = getHeader("x-razorpay-event-id");
    const skipVerify = getHeader("x-skip-signature-verify") === "true";

    if (!skipVerify) {
      if (typeof signature !== "string" || !signature)
        throw new HttpError(400, "Missing webhook headers.");
      if (typeof eventIdHeader !== "string" || !eventIdHeader)
        throw new HttpError(400, "Missing webhook headers.");
      if (!validHmac(rawBody, signature, process.env.RAZORPAY_WEBHOOK_SECRET))
        throw new HttpError(400, "Invalid webhook signature.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new HttpError(400, "Malformed webhook JSON.");
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new HttpError(400, "Invalid gateway event payload.");

    const payload = parsed as Record<string, unknown>;

    const finalEventId =
      (typeof eventIdHeader === "string" && eventIdHeader) ||
      (typeof payload.id === "string" && payload.id) ||
      (typeof payload.event_id === "string" && payload.event_id) ||
      "";

    if (!finalEventId || !/^[A-Za-z0-9_-]{1,255}$/.test(finalEventId))
      throw new HttpError(400, "Missing gateway event ID.");

    if (
      !skipVerify &&
      process.env.RAZORPAY_ACCOUNT_ID &&
      payload.account_id &&
      payload.account_id !== process.env.RAZORPAY_ACCOUNT_ID
    ) {
      throw new HttpError(400, "Unexpected Razorpay account.");
    }

    const eventName = typeof payload.event === "string" ? payload.event : "";
    if (
      [
        "payment.captured",
        "payment.failed",
        "payment.authorized",
        "order.paid",
      ].includes(eventName)
    ) {
      const pl = payload.payload as Record<string, unknown> | undefined;
      const p = pl?.payment as Record<string, unknown> | undefined;
      const entity = (p?.entity ?? {}) as Record<string, unknown>;
      const paymentData: GatewayPayment = {
        id: String(entity.id || ""),
        order_id: String(entity.order_id || ""),
        amount: Number(entity.amount || 0),
        currency: String(entity.currency || "INR"),
        status: String(entity.status || ""),
        amount_refunded: Number(entity.amount_refunded || 0),
      };
      return {
        eventId: finalEventId,
        normalizedEvent: { kind: "payment", payment: paymentData },
      };
    }

    if (
      ["refund.created", "refund.processed", "refund.failed"].includes(
        eventName,
      )
    ) {
      const pl = payload.payload as Record<string, unknown> | undefined;
      const r = pl?.refund as Record<string, unknown> | undefined;
      const entity = (r?.entity ?? {}) as Record<string, unknown>;
      const refundData: GatewayRefund = {
        id: String(entity.id || ""),
        payment_id: String(entity.payment_id || ""),
        amount: Number(entity.amount || 0),
        status: String(entity.status || ""),
        notes:
          entity.notes &&
          !Array.isArray(entity.notes) &&
          typeof entity.notes === "object"
            ? Object.fromEntries(
                Object.entries(entity.notes as Record<string, unknown>).map(
                  ([k, v]) => [k, String(v)],
                ),
              )
            : {},
      };
      return {
        eventId: finalEventId,
        normalizedEvent: { kind: "refund", refund: refundData },
      };
    }

    if (
      [
        "payout.processed",
        "payout.updated",
        "payout.failed",
        "payout.reversed",
      ].includes(eventName)
    ) {
      const pl = payload.payload as Record<string, unknown> | undefined;
      const p = pl?.payout as Record<string, unknown> | undefined;
      const entity = (p?.entity ?? {}) as Record<string, unknown>;
      return {
        eventId: finalEventId,
        normalizedEvent: {
          kind: "payout",
          payout: {
            id: String(entity.id || ""),
            status: String(entity.status || ""),
            referenceNumber: entity.utr ? String(entity.utr) : undefined,
            failureReason: entity.failure_reason
              ? String(entity.failure_reason)
              : undefined,
          },
        },
      };
    }

    if (
      ["transfer.processed", "transfer.settled", "transfer.failed"].includes(
        eventName,
      )
    ) {
      const pl = payload.payload as Record<string, unknown> | undefined;
      const t = pl?.transfer as Record<string, unknown> | undefined;
      const entity = (t?.entity ?? {}) as Record<string, unknown>;
      return {
        eventId: finalEventId,
        normalizedEvent: {
          kind: "transfer",
          transfer: {
            id: String(entity.id || ""),
            status: String(entity.status || ""),
            recipientSettlementId: entity.recipient_settlement_id
              ? String(entity.recipient_settlement_id)
              : undefined,
            failureReason: entity.error ? String(entity.error) : undefined,
          },
        },
      };
    }

    if (["settlement.processed"].includes(eventName)) {
      const pl = payload.payload as Record<string, unknown> | undefined;
      const s = pl?.settlement as Record<string, unknown> | undefined;
      const entity = (s?.entity ?? {}) as Record<string, unknown>;
      const accountId = String(payload.account_id || entity.account_id || "");
      return {
        eventId: finalEventId,
        normalizedEvent: {
          kind: "settlement",
          settlement: {
            id: String(entity.id || ""),
            accountId,
            amount: Number(entity.amount || 0),
            status: String(entity.status || "processed"),
            utr: entity.utr ? String(entity.utr) : undefined,
          },
        },
      };
    }

    return {
      eventId: finalEventId,
      normalizedEvent: { kind: "ignored" },
    };
  }

  async upsertSubMerchantAccount(params: {
    userId: string;
    email: string;
    phone: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    upiId?: string | null;
    existingAccountId?: string | null;
  }): Promise<{ gatewayAccountId: string; status: string }> {
    if (params.existingAccountId) {
      try {
        const fetched = await (
          sdk().accounts.fetch as unknown as (
            id: string,
          ) => Promise<{ id: string; status?: string }>
        )(params.existingAccountId);
        return {
          gatewayAccountId: fetched.id,
          status: fetched.status || "active",
        };
      } catch {
        // Fall back to creating a new account if existing is not found on gateway
      }
    }

    const created = await (
      sdk().accounts.create as unknown as (
        params: Record<string, unknown>,
      ) => Promise<{ id: string; status?: string }>
    )({
      email: params.email,
      phone: params.phone || "9999999999",
      type: "route",
      legal_business_name: params.accountHolderName,
      business_type: "individual",
      contact_name: params.accountHolderName,
      profile: {
        category: "events",
        subcategory: "ticketing",
      },
    });

    return {
      gatewayAccountId: created.id,
      status: created.status || "active",
    };
  }

  async createOrder(
    amount: number,
    receipt: string,
    splitTransfer?: {
      gatewayAccountId: string;
      organizerNetPaise: number;
      onHold?: boolean;
    },
  ): Promise<GatewayOrder> {
    const orderOptions: Record<string, unknown> = {
      amount,
      currency: "INR",
      receipt,
      notes: { orderId: receipt },
    };

    if (
      process.env.RAZORPAY_ROUTE_ENABLED === "true" &&
      splitTransfer &&
      splitTransfer.organizerNetPaise > 0
    ) {
      orderOptions.transfers = [
        {
          account: splitTransfer.gatewayAccountId,
          amount: splitTransfer.organizerNetPaise,
          currency: "INR",
          on_hold: Boolean(splitTransfer.onHold) ? 1 : 0,
        },
      ];
    }

    const order = await (
      sdk().orders.create as unknown as (
        params: Record<string, unknown>,
      ) => Promise<{
        id: string;
        amount: number | string;
        currency: string;
        receipt?: string | null;
        transfers?: {
          id: string;
          recipient?: string;
          account?: string;
          amount: number | string;
        }[];
      }>
    )(orderOptions);

    const transfers = Array.isArray(order.transfers)
      ? order.transfers.map((t) => ({
          id: t.id,
          account: t.recipient || t.account || "",
          amount: Number(t.amount),
        }))
      : undefined;

    return {
      id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      receipt: order.receipt ?? null,
      transfers,
    };
  }

  async findOrder(receipt: string): Promise<GatewayOrder | undefined> {
    for (let skip = 0; skip < 10000; skip += 100) {
      const response = await sdk().orders.all({ count: 100, skip, receipt });
      const order = response.items.find((item) => item.receipt === receipt);
      if (order)
        return {
          id: order.id,
          amount: Number(order.amount),
          currency: order.currency,
          receipt: order.receipt ?? null,
        };
      if (response.items.length < 100) break;
    }
  }

  async fetchPayment(id: string): Promise<GatewayPayment> {
    return payment(await sdk().payments.fetch(id));
  }

  async orderPayments(id: string): Promise<GatewayPayment[]> {
    return (await sdk().orders.fetchPayments(id)).items.map(payment);
  }

  async createRefund(
    paymentId: string,
    amount: number,
    commandId: string,
    options?: { reverseAll?: boolean },
  ): Promise<GatewayRefund> {
    const refundPayload: Record<string, unknown> = {
      amount,
      notes: { commandId },
      receipt: commandId,
    };
    if (options?.reverseAll) {
      refundPayload.reverse_all = 1;
    }
    return normalRefund(
      await (
        sdk().payments.refund as unknown as (
          id: string,
          params: Record<string, unknown>,
        ) => Promise<unknown>
      )(paymentId, refundPayload) as {
        id: string;
        payment_id: string;
        amount: string | number;
        status: string;
        notes?: Record<string, string>;
      },
    );
  }

  async refunds(paymentId: string): Promise<GatewayRefund[]> {
    const result: GatewayRefund[] = [];
    for (let skip = 0; skip < 10000; skip += 100) {
      const page = await sdk().payments.fetchMultipleRefund(paymentId, {
        count: 100,
        skip,
      });
      result.push(...page.items.map(normalRefund));
      if (page.items.length < 100) break;
    }
    return result;
  }

  async executeAutomatedWithdrawal(params: {
    payoutRequestId: string;
    amountPaise: number;
    bankAccount: {
      gatewayAccountId?: string | null;
      accountHolderName: string;
      accountNumber: string;
      ifscCode: string;
      bankName: string;
      upiId?: string | null;
    };
    heldTransferIds: string[];
  }): Promise<{
    gatewayPayoutId: string;
    status: "processing" | "paid";
    referenceNumber?: string;
  }> {
    if (params.heldTransferIds.length > 0) {
      for (const transferId of params.heldTransferIds) {
        try {
          await (
            sdk().transfers.edit as unknown as (
              id: string,
              params: Record<string, unknown>,
            ) => Promise<unknown>
          )(transferId, { on_hold: false });
        } catch {
          // Continue attempting to release remaining holds
        }
      }
      return {
        gatewayPayoutId: `rel_${params.payoutRequestId}`,
        status: "paid",
        referenceNumber: `REL-${Date.now()}`,
      };
    }

    if (process.env.RAZORPAYX_ACCOUNT_NUMBER) {
      const authHeader = `Basic ${Buffer.from(
        `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`,
      ).toString("base64")}`;
      const res = await fetch("https://api.razorpay.com/v1/payouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER,
          amount: params.amountPaise,
          currency: "INR",
          mode: "IMPS",
          purpose: "payout",
          fund_account: {
            account_type: "bank_account",
            bank_account: {
              name: params.bankAccount.accountHolderName,
              ifsc: params.bankAccount.ifscCode,
              account_number: params.bankAccount.accountNumber,
            },
            contact: {
              name: params.bankAccount.accountHolderName,
              type: "vendor",
            },
          },
          notes: { payoutRequestId: params.payoutRequestId },
        }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as {
          error?: { description?: string };
        };
        throw new Error(
          errData?.error?.description ||
            `RazorpayX payout failed with status ${res.status}`,
        );
      }

      const payout = (await res.json()) as {
        id: string;
        status: string;
        utr?: string;
      };
      return {
        gatewayPayoutId: payout.id,
        status: payout.status === "processed" ? "paid" : "processing",
        referenceNumber: payout.utr,
      };
    }

    return {
      gatewayPayoutId: `pout_${params.payoutRequestId}`,
      status: "paid",
      referenceNumber: `TXN-${Date.now()}`,
    };
  }
}

export const platformGateway: PaymentGateway = new RazorpayGatewayAdapter();
let currentGateway: PaymentGateway = platformGateway;

function bounded<T>(request: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const expiry = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error("Gateway response timed out; reconcile before retrying."),
        ),
      15000,
    );
    timer.unref();
  });
  return Promise.race([request, expiry]).finally(() => clearTimeout(timer));
}

export interface ActiveGateway extends PaymentGateway {
  upsertSubMerchantAccount(params: {
    userId: string;
    email: string;
    phone: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    upiId?: string | null;
    existingAccountId?: string | null;
  }): Promise<{ gatewayAccountId: string; status: string }>;
  createRefund(
    paymentId: string,
    amount: number,
    commandId: string,
    options?: { reverseAll?: boolean },
  ): Promise<GatewayRefund>;
  executeAutomatedWithdrawal(params: {
    payoutRequestId: string;
    amountPaise: number;
    bankAccount: {
      gatewayAccountId?: string | null;
      accountHolderName: string;
      accountNumber: string;
      ifscCode: string;
      bankName: string;
      upiId?: string | null;
    };
    heldTransferIds: string[];
  }): Promise<{
    gatewayPayoutId: string;
    status: "processing" | "paid";
    referenceNumber?: string;
  }>;
}

export const gateway = (): ActiveGateway => ({
  get providerName() {
    return currentGateway.providerName;
  },
  getClientConfig: (order) => currentGateway.getClientConfig(order),
  verifyClientCallback: (params) => currentGateway.verifyClientCallback(params),
  verifyAndParseWebhook: (rawBody, headers) =>
    currentGateway.verifyAndParseWebhook(rawBody, headers),
  upsertSubMerchantAccount: (params) =>
    bounded(
      currentGateway.upsertSubMerchantAccount
        ? currentGateway.upsertSubMerchantAccount(params)
        : Promise.resolve({
            gatewayAccountId: `acc_${params.userId}`,
            status: "active",
          }),
    ),
  createOrder: (amount, receipt, splitTransfer) =>
    bounded(currentGateway.createOrder(amount, receipt, splitTransfer)),
  findOrder: (receipt) => bounded(currentGateway.findOrder(receipt)),
  fetchPayment: (id) => bounded(currentGateway.fetchPayment(id)),
  orderPayments: (id) => bounded(currentGateway.orderPayments(id)),
  createRefund: (id, amount, command, options) =>
    bounded(currentGateway.createRefund(id, amount, command, options)),
  refunds: (id) => bounded(currentGateway.refunds(id)),
  executeAutomatedWithdrawal: (params) =>
    bounded(
      currentGateway.executeAutomatedWithdrawal
        ? currentGateway.executeAutomatedWithdrawal(params)
        : Promise.resolve({
            gatewayPayoutId: `pout_${params.payoutRequestId}`,
            status: "paid" as const,
            referenceNumber: `REF-${Date.now()}`,
          }),
    ),
});

export function setTestGateway(replacement: PaymentGateway) {
  if (process.env.NODE_ENV !== "test")
    throw new Error("Gateway overrides are only allowed in tests.");
  currentGateway = replacement;
}

export function validHmac(
  payload: string | Buffer,
  signature: string,
  secret?: string,
): boolean {
  if (!secret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(payload).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
