import type { CreateOrderResponse } from "@/types/order";
import { verifyPayment } from "@/api/payments";

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

interface Result {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface Options {
  key: string;
  amount: number;
  currency: string;
  name: string;
  order_id: string;
  prefill: { name: string; email: string };
  handler: (result: Result) => void;
  modal: { ondismiss: () => void };
}

interface Checkout {
  open: () => void;
  on: (event: "payment.failed", callback: () => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Options) => Checkout;
  }
}

let loading: Promise<void> | undefined;

function loadScript() {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => {
      loading = undefined;
      reject(new Error("Could not load checkout. Please try again."));
    };
    document.body.appendChild(script);
  });
  return loading;
}

export async function openRazorpay(
  order: CreateOrderResponse | OrderWithGateway,
  user: { name: string; email: string },
): Promise<"submitted" | "abandoned"> {
  await loadScript();
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
    !window.Razorpay
  ) {
    throw new Error(
      "Payment initialization is pending. Refresh the order status shortly.",
    );
  }

  return new Promise((resolve, reject) => {
    let submitted = false;
    const checkout = new window.Razorpay!({
      key: keyId,
      amount,
      currency,
      name: "Tiket",
      order_id: orderId,
      prefill: user,
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
          if (!submitted) resolve("abandoned");
        },
      },
    });
    checkout.on("payment.failed", () => {
      if (!submitted) resolve("abandoned");
    });
    checkout.open();
  });
}
