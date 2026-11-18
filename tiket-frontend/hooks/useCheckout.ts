import { useCallback, useEffect, useState } from "react";
import { useRazorpay } from "react-razorpay";
import {
  createOrder,
  getEventOrderStatus,
  type EventOrderStatusResponse,
} from "@/api/orders";
import { verifyPayment } from "@/api/payments";
import { cancelPendingOrder, loadRazorpayScript } from "@/lib/razorpay";
import { getErrorMessage } from "@/lib/errors";
import type {
  CreateOrderPayload,
  CreateOrderResponse,
} from "@/types/order";

export interface ActiveBuyerOrder {
  id: string;
  status: "pending" | "completed" | "pending_approval";
  totalAmount: string;
  ticketId: string | null;
  ticketTypeName: string | null;
}

export function useCheckout(
  eventId: string,
  user: { id: string; name: string; email: string; phone?: string },
) {
  const { Razorpay } = useRazorpay();
  const [activeOrder, setActiveOrder] = useState<ActiveBuyerOrder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [completedTicketId, setCompletedTicketId] = useState<string | null>(
    null,
  );
  const [createdOrderResponse, setCreatedOrderResponse] =
    useState<CreateOrderResponse | null>(null);

  const storageKey = `${user?.id || "guest"}_${eventId}`;

  // 1. Check order status ONCE on mount without setInterval polling
  const checkActiveOrder = useCallback(async () => {
    if (!eventId) return null;
    try {
      const res: EventOrderStatusResponse = await getEventOrderStatus(eventId);
      if (res.hasActiveOrder && res.order) {
        setActiveOrder(res.order);
        if (res.order.ticketId) {
          setCompletedTicketId(res.order.ticketId);
        }
        return res.order;
      }
      return null;
    } catch {
      return null;
    }
  }, [eventId]);

  useEffect(() => {
    void checkActiveOrder();
  }, [checkActiveOrder]);

  // 2. Submit Checkout (Called ONLY when clicking the final Pay / Register button)
  const submitCheckout = useCallback(
    async (payload: CreateOrderPayload): Promise<boolean> => {
      if (isSubmitting) return false;
      setIsSubmitting(true);
      setErrorMessage("");

      try {
        const orderResponse = await createOrder(payload);
        setCreatedOrderResponse(orderResponse);

        const { order, ticketId, razorpayOrder } = orderResponse;
        const totalAmountNum = parseFloat(order.totalAmount || "0");
        const isFree = totalAmountNum === 0 || !razorpayOrder;

        if (isFree) {
          // Free order: completes immediately
          if (typeof window !== "undefined") {
            try {
              localStorage.removeItem(storageKey);
            } catch {}
          }
          if (ticketId) {
            setCompletedTicketId(ticketId);
          }
          await checkActiveOrder();
          setIsSubmitting(false);
          return true;
        }

        // Paid order: open Razorpay modal
        const ActiveRazorpay = Razorpay || window.Razorpay;
        if (!ActiveRazorpay) {
          await loadRazorpayScript();
        }
        const RazorpayCtor = Razorpay || window.Razorpay;

        if (!RazorpayCtor) {
          throw new Error("Payment gateway SDK failed to load.");
        }

        return new Promise<boolean>((resolve) => {
          let paymentHandled = false;

          const rzp = new RazorpayCtor({
            key: razorpayOrder.keyId,
            amount: razorpayOrder.amount,
            currency: (razorpayOrder.currency || "INR") as "INR",
            name: "Tiket",
            order_id: razorpayOrder.id,
            prefill: {
              name: user.name || "",
              email: user.email || "",
              contact: user.phone || "",
            },
            handler: async (res) => {
              paymentHandled = true;
              try {
                await verifyPayment({
                  orderId: order.id,
                  razorpayOrderId: res.razorpay_order_id,
                  razorpayPaymentId: res.razorpay_payment_id,
                  razorpaySignature: res.razorpay_signature,
                  providerOrderId: res.razorpay_order_id,
                  providerPaymentId: res.razorpay_payment_id,
                  providerSignature: res.razorpay_signature,
                });

                if (typeof window !== "undefined") {
                  try {
                    localStorage.removeItem(storageKey);
                  } catch {}
                }

                if (ticketId) {
                  setCompletedTicketId(ticketId);
                }

                // Check active order ONCE immediately after payment verification
                await checkActiveOrder();
                setIsSubmitting(false);
                resolve(true);
              } catch (err) {
                setErrorMessage(
                  `${getErrorMessage(err)}. Please check your passes or refresh.`,
                );
                setIsSubmitting(false);
                resolve(false);
              }
            },
            modal: {
              ondismiss: () => {
                if (!paymentHandled) {
                  // Buyer cancelled/dismissed modal: hard delete unpaid order
                  void cancelPendingOrder(order.id);
                  setIsSubmitting(false);
                  resolve(false);
                }
              },
            },
          });

          rzp.on("payment.failed", () => {
            if (!paymentHandled) {
              void cancelPendingOrder(order.id);
              setIsSubmitting(false);
              setErrorMessage("Payment failed or was declined by bank.");
              resolve(false);
            }
          });

          rzp.open();
        });
      } catch (err) {
        setErrorMessage(getErrorMessage(err));
        setIsSubmitting(false);
        return false;
      }
    },
    [isSubmitting, Razorpay, user, storageKey, checkActiveOrder],
  );

  const resetCheckout = useCallback(() => {
    setIsSubmitting(false);
    setErrorMessage("");
    setCompletedTicketId(null);
    setCreatedOrderResponse(null);
  }, []);

  return {
    activeOrder,
    hasActiveOrder: Boolean(activeOrder),
    isSubmitting,
    busy: isSubmitting,
    errorMessage,
    error: errorMessage,
    completedTicketId,
    orderResponse: createdOrderResponse,
    checkout: createdOrderResponse,
    submitCheckout,
    checkActiveOrder,
    resetCheckout,
  };
}
