import type { CreateOrderResponse } from "@/types/order";
import { verifyPayment } from "@/api/payments";
interface Result { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }
interface Options { key: string; amount: number; currency: string; name: string; order_id: string; prefill: { name: string; email: string }; handler: (result: Result) => void; modal: { ondismiss: () => void } }
interface Checkout { open: () => void; on: (event: "payment.failed", callback: () => void) => void }
declare global { interface Window { Razorpay?: new (options: Options) => Checkout } }
let loading: Promise<void> | undefined;
function loadScript() {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(); script.onerror = () => { loading = undefined; reject(new Error("Could not load checkout. Please try again.")); }; document.body.appendChild(script);
  });
  return loading;
}
export async function openRazorpay(order: CreateOrderResponse, user: { name: string; email: string }): Promise<"submitted" | "abandoned"> {
  await loadScript();
  const remote = order.razorpayOrder;
  if (!remote || !window.Razorpay || !remote.keyId) throw new Error("Payment initialization is pending. Refresh the order status shortly.");
  return new Promise((resolve, reject) => {
    let submitted = false;
    const checkout = new window.Razorpay!({ key: remote.keyId, amount: remote.amount, currency: remote.currency, name: "Tiket", order_id: remote.id, prefill: user,
      handler: result => { submitted = true; void verifyPayment({ orderId: order.order.id, razorpayOrderId: result.razorpay_order_id, razorpayPaymentId: result.razorpay_payment_id, razorpaySignature: result.razorpay_signature }).then(() => resolve("submitted")).catch(reject); },
      modal: { ondismiss: () => { if (!submitted) resolve("abandoned"); } },
    });
    checkout.on("payment.failed", () => { if (!submitted) resolve("abandoned"); }); checkout.open();
  });
}
