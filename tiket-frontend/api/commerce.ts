import api from "@/lib/api";
import { API_ENDPOINTS } from "@/constants/config";
import type {
  Availability,
  BlacklistEntry,
  Coupon,
  CreateBlacklistPayload,
  Finance,
  MailConfig,
  OrganizerBankAccount,
  PayoutRequest,
  RequestPayoutPayload,
  SaveBankAccountPayload,
  SmtpMailPayload,
} from "@/types/commerce";

export async function getAvailability(
  eventId: string,
  code?: string,
): Promise<Availability> {
  return (
    await api.get(API_ENDPOINTS.COMMERCE.AVAILABILITY(eventId), {
      params: { code },
    })
  ).data;
}

export async function getFinance(eventId: string): Promise<Finance> {
  return (await api.get(API_ENDPOINTS.COMMERCE.FINANCE(eventId))).data;
}
export const getEventFinance = getFinance;

export async function getBankAccount(
  eventId: string,
): Promise<{ bankAccount: OrganizerBankAccount | null }> {
  return (await api.get(API_ENDPOINTS.COMMERCE.BANK_ACCOUNT(eventId))).data;
}

export async function saveBankAccount(
  eventId: string,
  payload: SaveBankAccountPayload,
): Promise<{ success: boolean; bankAccount: OrganizerBankAccount }> {
  return (await api.put(API_ENDPOINTS.COMMERCE.BANK_ACCOUNT(eventId), payload))
    .data;
}
export const upsertBankAccount = saveBankAccount;

export async function requestPayout(
  eventId: string,
  payload: RequestPayoutPayload,
): Promise<PayoutRequest> {
  return (await api.post(API_ENDPOINTS.COMMERCE.PAYOUTS(eventId), payload))
    .data;
}

export async function refundOrder(
  eventId: string,
  orderId: string,
  amountPaise: number,
  reason: string,
  key: string,
) {
  return (
    await api.post(
      API_ENDPOINTS.COMMERCE.REFUND(eventId, orderId),
      { amountPaise, reason },
      { headers: { "Idempotency-Key": key } },
    )
  ).data;
}

export async function decideRegistration(
  eventId: string,
  orderId: string,
  decision: "approve" | "decline",
) {
  return (
    await api.post(API_ENDPOINTS.COMMERCE.DECISION(eventId, orderId), {
      decision,
    })
  ).data;
}

export async function getCoupons(eventId: string): Promise<Coupon[]> {
  return (await api.get(API_ENDPOINTS.COMMERCE.COUPONS(eventId))).data;
}

export async function putCoupon(eventId: string, coupon: Coupon): Promise<Coupon> {
  return (await api.put(API_ENDPOINTS.COMMERCE.COUPONS(eventId), coupon)).data;
}

export async function createCoupon(
  eventId: string,
  data: Coupon,
): Promise<Coupon> {
  return (await api.put(API_ENDPOINTS.COMMERCE.COUPONS(eventId), data)).data;
}

export async function updateCoupon(
  eventId: string,
  _couponId: string,
  data: Coupon,
): Promise<Coupon> {
  return (await api.put(API_ENDPOINTS.COMMERCE.COUPONS(eventId), data)).data;
}

export async function deleteCoupon(
  eventId: string,
  couponId: string,
): Promise<{ success: boolean }> {
  return (
    await api.delete(API_ENDPOINTS.COMMERCE.COUPON_DELETE(eventId, couponId))
  ).data;
}

export async function getMailConnection(
  eventId: string,
): Promise<{ custom: boolean; config?: Record<string, unknown> }> {
  return (await api.get(API_ENDPOINTS.CONNECTIONS.MAIL(eventId))).data;
}

export async function saveMailConnection(
  eventId: string,
  config: MailConfig | SmtpMailPayload,
) {
  const payload =
    "provider" in config ? config : { ...config, provider: "smtp" as const };
  return (await api.put(API_ENDPOINTS.CONNECTIONS.MAIL(eventId), payload)).data;
}

export async function testMailConnection(
  eventId: string,
  testRecipient: string,
): Promise<{ success: boolean; messageId?: string; previewUrl?: string }> {
  return (
    await api.post(API_ENDPOINTS.CONNECTIONS.TEST_MAIL(eventId), {
      testRecipient,
    })
  ).data;
}

export async function deleteMailConnection(
  eventId: string,
): Promise<{ success: boolean }> {
  return (await api.delete(API_ENDPOINTS.CONNECTIONS.MAIL(eventId))).data;
}
export const resetMailConnection = deleteMailConnection;

export async function beginUpload(payload: {
  eventId: string;
  fieldId: string;
  filename: string;
  contentType: string;
  size: number;
}): Promise<{ id: string; url: string }> {
  return (await api.post(API_ENDPOINTS.CONNECTIONS.UPLOAD, payload)).data;
}

export async function completeUpload(id: string): Promise<{ value: string }> {
  return (await api.post(API_ENDPOINTS.CONNECTIONS.COMPLETE_UPLOAD(id))).data;
}

export async function getUpload(
  id: string,
): Promise<{ url: string; filename: string }> {
  return (await api.get(API_ENDPOINTS.CONNECTIONS.FILE(id))).data;
}

export async function getPermissions(
  eventId: string,
): Promise<{ owner: boolean; permissions: string[] }> {
  return (await api.get(API_ENDPOINTS.COMMERCE.PERMISSIONS(eventId))).data;
}

export async function getPendingApprovals(
  eventId: string,
): Promise<{ id: string; name: string; email: string }[]> {
  return (await api.get(API_ENDPOINTS.COMMERCE.APPROVALS(eventId))).data;
}

export async function scanTicket(eventId: string, qrCode: string) {
  return (await api.post(API_ENDPOINTS.CHECK_IN, { eventId, qrCode })).data;
}

export async function getBlacklist(eventId: string): Promise<BlacklistEntry[]> {
  return (await api.get(API_ENDPOINTS.COMMERCE.BLACKLIST(eventId))).data;
}

export async function createBlacklistEntry(
  eventId: string,
  payload: CreateBlacklistPayload,
): Promise<BlacklistEntry> {
  return (
    await api.post(API_ENDPOINTS.COMMERCE.BLACKLIST(eventId), payload)
  ).data;
}

export async function addBlacklistEntry(
  eventId: string,
  payload:
    | {
        emailOrDomain?: string;
        pattern?: string;
        reason?: string;
        scope?: "event" | "organization";
        cancelExistingTickets?: boolean;
      }
    | CreateBlacklistPayload,
): Promise<BlacklistEntry> {
  const pattern =
    ("pattern" in payload && payload.pattern) ||
    ("emailOrDomain" in payload && payload.emailOrDomain) ||
    undefined;
  return (
    await api.post(API_ENDPOINTS.COMMERCE.BLACKLIST(eventId), {
      ...payload,
      pattern,
    })
  ).data;
}

export async function deleteBlacklistEntry(
  eventId: string,
  blacklistId: string,
): Promise<{ success: boolean }> {
  return (
    await api.delete(
      API_ENDPOINTS.COMMERCE.BLACKLIST_DELETE(eventId, blacklistId),
    )
  ).data;
}
export const removeBlacklistEntry = deleteBlacklistEntry;

