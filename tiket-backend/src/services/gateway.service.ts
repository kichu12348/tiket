import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "node:crypto";

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
}
export interface GatewayRefund {
  id: string;
  payment_id: string;
  amount: number;
  status: string;
  notes: Record<string, string>;
}
export interface PaymentGateway {
  createOrder(amount: number, receipt: string): Promise<GatewayOrder>;
  findOrder(receipt: string): Promise<GatewayOrder | undefined>;
  fetchPayment(id: string): Promise<GatewayPayment>;
  orderPayments(id: string): Promise<GatewayPayment[]>;
  createRefund(
    paymentId: string,
    amount: number,
    commandId: string,
  ): Promise<GatewayRefund>;
  refunds(paymentId: string): Promise<GatewayRefund[]>;
}
function sdk() {
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
  amount?: number;
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
const platformGateway: PaymentGateway = {
  async createOrder(amount, receipt) {
    const order = await sdk().orders.create({
      amount,
      currency: "INR",
      receipt,
      notes: { orderId: receipt },
    });
    return {
      id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      receipt: order.receipt ?? null,
    };
  },
  async findOrder(receipt) {
    for (let skip = 0; skip < 10000; skip += 100) {
      const response = await sdk().orders.all({ count: 100, skip, receipt });
      const order = response.items.find((order) => order.receipt === receipt);
      if (order)
        return {
          id: order.id,
          amount: Number(order.amount),
          currency: order.currency,
          receipt: order.receipt ?? null,
        };
      if (response.items.length < 100) break;
    }
  },
  async fetchPayment(id) {
    return payment(await sdk().payments.fetch(id));
  },
  async orderPayments(id) {
    return (await sdk().orders.fetchPayments(id)).items.map(payment);
  },
  async createRefund(paymentId, amount, commandId) {
    return normalRefund(
      await sdk().payments.refund(paymentId, {
        amount,
        notes: { commandId },
        receipt: commandId,
      }),
    );
  },
  async refunds(paymentId) {
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
  },
};
let currentGateway = platformGateway;
function bounded<T>(request: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const expiry = new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error("Gateway response timed out; reconcile before retrying.")), 15000); timer.unref(); });
  return Promise.race([request, expiry]).finally(() => clearTimeout(timer));
}
export const gateway = (): PaymentGateway => ({
  createOrder: (amount, receipt) => bounded(currentGateway.createOrder(amount, receipt)),
  findOrder: receipt => bounded(currentGateway.findOrder(receipt)),
  fetchPayment: id => bounded(currentGateway.fetchPayment(id)),
  orderPayments: id => bounded(currentGateway.orderPayments(id)),
  createRefund: (id, amount, command) => bounded(currentGateway.createRefund(id, amount, command)),
  refunds: id => bounded(currentGateway.refunds(id)),
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
