import api from "@/lib/api";
import { API_ENDPOINTS } from "@/constants/config";

export interface VerifyPaymentPayload {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResponse {
  message: string;
  order: {
    id: string;
    eventId: string;
    userId: string;
    totalAmount: string;
    paymentStatus: string;
    paymentProvider: string;
    paymentIntentId: string;
  };
}

export const verifyPayment = async (
  payload: VerifyPaymentPayload
): Promise<VerifyPaymentResponse> => {
  const response = await api.post(API_ENDPOINTS.PAYMENTS.VERIFY, payload);
  return response.data;
};
