import { API_ENDPOINTS, API_URL } from "@/constants/config";
import { TicketType } from "@/types/ticketType";
import { FormField } from "@/types/form";
import { createOrder } from "@/api/orders";
import { verifyPayment } from "@/api/payments";
import { PurchaseFormResponse } from "@/types/order";

/**
 * Loads Razorpay Checkout SDK script dynamically.
 */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function fetchTicketTypes(eventId: string): Promise<TicketType[]> {
  try {
    const res = await fetch(
      `${API_URL}${API_ENDPOINTS.TICKET_TYPES.GET_ALL(eventId)}`,
      {
        next: { revalidate: 60 },
      },
    );
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error("Failed to fetch ticket types:", error);
    return [];
  }
}

export async function fetchFormFields(eventId: string): Promise<FormField[]> {
  try {
    const res = await fetch(
      `${API_URL}${API_ENDPOINTS.FORMS.GET_ALL(eventId)}`,
      {
        next: { revalidate: 60 },
      },
    );
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error("Failed to fetch form fields:", error);
    return [];
  }
}

export interface SubmitRegistrationParams {
  eventId: string;
  ticketTypeId: string;
  formResponses: PurchaseFormResponse[];
  userEmail?: string;
  userName?: string;
}

export async function submitRegistrationOrder({
  eventId,
  ticketTypeId,
  formResponses,
  userEmail,
  userName,
}: SubmitRegistrationParams): Promise<{ createdTicketId: string | null }> {
  const orderResponse = await createOrder({
    eventId,
    purchases: [{ ticketTypeId, formResponses }],
  });

  const createdTicketId = orderResponse?.tickets?.[0]?.id ?? null;
  const razorpayOrder = orderResponse?.razorpayOrder;

  // Paid order requiring Razorpay checkout modal
  if (razorpayOrder && orderResponse.order) {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      throw new Error("Failed to load Razorpay payment gateway script.");
    }

    const orderId = orderResponse.order.id;

    return new Promise((resolve, reject) => {
      const options = {
        key: razorpayOrder.keyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || "INR",
        name: "Tiket",
        description: "Event Ticket Registration",
        order_id: razorpayOrder.id,
        prefill: {
          name: userName || "",
          email: userEmail || "",
        },
        theme: {
          color: "#000000",
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verifyPayment({
              orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            resolve({ createdTicketId });
          } catch (err) {
            reject(err);
          }
        },
        modal: {
          ondismiss: () => {
            reject(new Error("Payment cancelled by user."));
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (response: { error?: { description?: string } }) => {
        reject(new Error(response.error?.description || "Payment failed."));
      });
      rzp.open();
    });
  }

  // Free ticket order (₹0) - completed immediately
  return { createdTicketId };
}
