import type { CreateOrderResponse } from "@/types/order";
import { verifyPayment } from "@/api/payments";
import { cancelOrder } from "@/api/orders";

export interface GatewayCheckoutConfig {
  provider: string;
  orderId: string;
  amount: number;
  currency: string;
  publicKey?: string;
  [key: string]: unknown;
}

export type OrderWithGateway = CreateOrderResponse & {
  gatewayCheckout?: GatewayCheckoutConfig | null;
};

export interface RazorpayPaymentResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  order_id: string;
  prefill: { name: string; email: string; contact?: string };
  handler: (result: RazorpayPaymentResult) => void | Promise<void>;
  modal: { ondismiss: () => void | Promise<void> };
}

export interface RazorpayInstance {
  open: () => void;
  on: (event: "payment.failed", callback: () => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

export async function cancelPendingOrder(orderId: string): Promise<void> {
  if (!orderId) return;
  try {
    await cancelOrder(orderId);
  } catch {
    // Best-effort cleanup on abandonment
  }
}

let scriptLoadingPromise: Promise<void> | undefined;

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  scriptLoadingPromise ??= new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Could not load checkout. Please try again.")),
      );
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadingPromise = undefined;
      reject(new Error("Could not load checkout. Please try again."));
    };
    document.body.appendChild(script);
  });
  return scriptLoadingPromise;
}

export async function openRazorpay(
  order: CreateOrderResponse | OrderWithGateway,
  user: { name: string; email: string; phone?: string },
  customRazorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance,
): Promise<"submitted" | "abandoned"> {
  const RazorpayCtor = customRazorpay || window.Razorpay;
  if (!RazorpayCtor) {
    await loadRazorpayScript();
  }

  const ActiveCtor = customRazorpay || window.Razorpay;
  const gatewayConfig = (order as OrderWithGateway).gatewayCheckout;
  const keyId = gatewayConfig?.publicKey ?? order.razorpayOrder?.keyId;
  const orderId = gatewayConfig?.orderId ?? order.razorpayOrder?.id;
  const amount = gatewayConfig?.amount ?? order.razorpayOrder?.amount;
  const currency = gatewayConfig?.currency ?? order.razorpayOrder?.currency;

  if (
    !keyId ||
    !orderId ||
    amount === undefined ||
    !currency ||
    !ActiveCtor
  ) {
    throw new Error(
      "Payment initialization is pending. Refresh the order status shortly.",
    );
  }

  return new Promise((resolve, reject) => {
    let submitted = false;
    const checkout = new ActiveCtor({
      key: keyId,
      amount,
      currency,
      name: "Tiket",
      order_id: orderId,
      prefill: {
        name: user.name,
        email: user.email,
        contact: user.phone || "",
      },
      handler: (result) => {
        submitted = true;
        void verifyPayment({
          orderId: order.order.id,
          razorpayOrderId: result.razorpay_order_id,
          razorpayPaymentId: result.razorpay_payment_id,
          razorpaySignature: result.razorpay_signature,
          providerOrderId: result.razorpay_order_id,
          providerPaymentId: result.razorpay_payment_id,
          providerSignature: result.razorpay_signature,
        })
          .then(() => resolve("submitted"))
          .catch(reject);
      },
      modal: {
        ondismiss: () => {
          if (!submitted) {
            void cancelPendingOrder(order.order.id);
            resolve("abandoned");
          }
        },
      },
    });
    checkout.on("payment.failed", () => {
      if (!submitted) {
        void cancelPendingOrder(order.order.id);
        resolve("abandoned");
      }
    });
    checkout.open();
  });
}
