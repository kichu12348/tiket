import type { CreateOrderResponse } from "@/types/order";
import api from "@/lib/api";
import { API_ENDPOINTS } from "@/constants/config";

export interface VerifyPaymentPayload {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export const verifyPayment = async (
  payload: VerifyPaymentPayload
): Promise<CreateOrderResponse> => {
  const response = await api.post(API_ENDPOINTS.PAYMENTS.VERIFY, payload);
  return response.data;
};
