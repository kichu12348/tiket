import api, { frontendApi } from "@/lib/api";
import { API_ENDPOINTS } from "@/constants/config";
import type { Availability, Coupon, Finance, MailConfig } from "@/types/commerce";
export async function getAvailability(eventId: string, code?: string): Promise<Availability> { return (await api.get(API_ENDPOINTS.COMMERCE.AVAILABILITY(eventId), { params: { code } })).data; }
export async function getFinance(eventId: string): Promise<Finance> { return (await api.get(API_ENDPOINTS.COMMERCE.FINANCE(eventId))).data; }
export async function refundOrder(eventId: string, orderId: string, amountPaise: number, reason: string, key: string) { return (await api.post(API_ENDPOINTS.COMMERCE.REFUND(eventId, orderId), { amountPaise, reason }, { headers: { "Idempotency-Key": key } })).data; }
export async function decideRegistration(eventId: string, orderId: string, decision: "approve" | "decline") { return (await api.post(API_ENDPOINTS.COMMERCE.DECISION(eventId, orderId), { decision })).data; }
export async function getCoupons(eventId: string): Promise<Coupon[]> { return (await api.get(API_ENDPOINTS.COMMERCE.COUPONS(eventId))).data; }
export async function putCoupon(eventId: string, coupon: Coupon) { return (await api.put(API_ENDPOINTS.COMMERCE.COUPONS(eventId), coupon)).data; }
export async function connectDashboard(eventId: string): Promise<{ ticket: string }> { return (await frontendApi.post(API_ENDPOINTS.FRONTEND.REALTIME_CONNECT, { eventId })).data; }
export async function getMailConnection(eventId: string): Promise<{ custom: boolean }> { return (await api.get(API_ENDPOINTS.CONNECTIONS.MAIL(eventId))).data; }
export async function saveMailConnection(eventId: string, config: MailConfig) { return (await api.put(API_ENDPOINTS.CONNECTIONS.MAIL(eventId), config)).data; }
export async function resetMailConnection(eventId: string) { return (await api.delete(API_ENDPOINTS.CONNECTIONS.MAIL(eventId))).data; }
export async function beginUpload(payload: { eventId: string; fieldId: string; filename: string; contentType: string; size: number }): Promise<{ id: string; url: string }> { return (await api.post(API_ENDPOINTS.CONNECTIONS.UPLOAD, payload)).data; }
export async function completeUpload(id: string): Promise<{ value: string }> { return (await api.post(API_ENDPOINTS.CONNECTIONS.COMPLETE_UPLOAD(id))).data; }
export async function getUpload(id: string): Promise<{ url: string; filename: string }> { return (await api.get(API_ENDPOINTS.CONNECTIONS.FILE(id))).data; }
export async function getPermissions(eventId: string): Promise<{ owner: boolean; permissions: string[] }> { return (await api.get(API_ENDPOINTS.COMMERCE.PERMISSIONS(eventId))).data; }
export async function getPendingApprovals(eventId: string): Promise<{ id: string; name: string; email: string }[]> { return (await api.get(API_ENDPOINTS.COMMERCE.APPROVALS(eventId))).data; }
export async function scanTicket(eventId: string, qrCode: string) { return (await api.post(API_ENDPOINTS.CHECK_IN, { eventId, qrCode })).data; }
