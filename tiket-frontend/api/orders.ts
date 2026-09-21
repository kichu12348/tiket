import api from "@/lib/api";
import { API_ENDPOINTS } from "@/constants/config";
import {
  CreateOrderPayload,
  CreateOrderResponse,
  PayOrderResponse,
} from "@/types/order";

export const createOrder = async (
  payload: CreateOrderPayload
): Promise<CreateOrderResponse> => {
  const response = await api.post(API_ENDPOINTS.ORDERS.CREATE, payload);
  return response.data;
};

export const payOrderMock = async (
  orderId: string
): Promise<PayOrderResponse> => {
  const response = await api.post(API_ENDPOINTS.ORDERS.PAY(orderId));
  return response.data;
};
