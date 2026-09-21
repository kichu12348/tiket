import Razorpay from "razorpay";
import crypto from "crypto";

export interface CreateRazorpayOrderOptions {
  amountInINR: number | string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  id: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifySignatureOptions {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyWebhookOptions {
  rawPayload: string;
  signature: string;
  webhookSecret?: string;
}

let razorpayClient: Razorpay | null = null;

function getRazorpayInstance(): Razorpay {
  if (razorpayClient) return razorpayClient;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay API credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are missing from environment variables."
    );
  }

  razorpayClient = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayClient;
}

/**
 * Creates a Razorpay order in INR (amount converted to paise).
 */
export async function createRazorpayOrder({
  amountInINR,
  receipt,
  notes,
}: CreateRazorpayOrderOptions): Promise<RazorpayOrderResult> {
  const razorpay = getRazorpayInstance();
  const keyId = process.env.RAZORPAY_KEY_ID!;
  const amountInPaise = Math.round(Number(amountInINR) * 100);

  const orderOptions = {
    amount: amountInPaise,
    currency: "INR",
    receipt,
    notes: notes || {},
  };

  const razorpayOrder = await razorpay.orders.create(orderOptions);

  return {
    id: razorpayOrder.id,
    amount: Number(razorpayOrder.amount),
    currency: razorpayOrder.currency,
    keyId,
  };
}

/**
 * Verifies Razorpay checkout response payment signature using HMAC SHA256.
 */
export function verifyPaymentSignature({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: VerifySignatureOptions): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return false;
  }

  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
  const generatedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(payload)
    .digest("hex");

  try {
    const a = Buffer.from(generatedSignature, "utf8");
    const b = Buffer.from(razorpaySignature, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Verifies Razorpay webhook header signature.
 */
export function verifyWebhookSignature({
  rawPayload,
  signature,
  webhookSecret,
}: VerifyWebhookOptions): boolean {
  const secret = webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !rawPayload || !signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawPayload)
    .digest("hex");

  try {
    const a = Buffer.from(expectedSignature, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
