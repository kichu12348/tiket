import api from "@/lib/api";
import { API_ENDPOINTS } from "@/constants/config";
import type { CreateOrderPayload, CreateOrderResponse } from "@/types/order";

export const createOrder = async (
  payload: CreateOrderPayload,
  key = crypto.randomUUID(),
): Promise<CreateOrderResponse> => {
  const response = await api.post(API_ENDPOINTS.ORDERS.CREATE, payload, {
    headers: { "Idempotency-Key": key },
  });
  return response.data;
};

export async function getOrder(id: string): Promise<CreateOrderResponse> {
  return (await api.get(API_ENDPOINTS.ORDERS.GET(id))).data;
}
export async function resumeOrder(key: string): Promise<CreateOrderResponse> {
  return (await api.get(API_ENDPOINTS.ORDERS.RESUME(key))).data;
}
export async function cancelOrder(id: string): Promise<CreateOrderResponse> {
  return (await api.post(API_ENDPOINTS.ORDERS.CANCEL(id))).data;
}
