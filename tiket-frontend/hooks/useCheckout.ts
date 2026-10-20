"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { cancelOrder, createOrder, getOrder, resumeOrder } from "@/api/orders";
import type { CreateOrderPayload, CreateOrderResponse } from "@/types/order";
import { openRazorpay } from "@/lib/razorpay";
import { getErrorMessage } from "@/lib/errors";
import { useLiveStore } from "@/store/useLiveStore";
interface Attempt { key: string; hash: string; orderId?: string }
export function useCheckout(eventId: string, user: { id: string; name: string; email: string }) {
  const [checkout, setCheckout] = useState<CreateOrderResponse | null>(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [remaining, setRemaining] = useState<number | null>(null);
  const storageKey = `tiket:checkout:${user.id}:${eventId}`;
  const attempt = useRef<Attempt | null>(null); const offset = useRef(0);
  const signature = useRef("");
  const accept = useCallback((data: CreateOrderResponse) => { offset.current = Date.parse(data.serverTime) - Date.now(); setCheckout(data); const next = `${data.order.id}:${data.order.reservationState}:${data.order.registrationStatus}:${data.order.paymentStatus}`; if (signature.current !== next) { signature.current = next; useLiveStore.getState().changed(data.order.eventId); } }, []);
  useEffect(() => {
    try {
      const record: Attempt | null = JSON.parse(sessionStorage.getItem(storageKey) || "null"); attempt.current = record;
      if (record) void (record.orderId ? getOrder(record.orderId) : resumeOrder(record.key)).then(accept).catch(() => {});
    } catch { sessionStorage.removeItem(storageKey); }
  }, [storageKey, accept]);
  const id = checkout?.order.id; const held = checkout?.order.reservationState === "held";
  useEffect(() => {
    if (!id) return;
    const timer = setInterval(() => { void getOrder(id).then(accept).catch(() => {}); }, held ? 3000 : 15000);
    return () => clearInterval(timer);
  }, [id, held, accept]);
  const expiresAt = checkout?.order.expiresAt;
  useEffect(() => {
    if (!expiresAt) return;
    const update = () => setRemaining(Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now() - offset.current) / 1000)));
    const timer = setInterval(update, 500); return () => clearInterval(timer);
  }, [expiresAt]);
  const prepare = async (payload: CreateOrderPayload) => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload)));
      const hash = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
      if (!attempt.current || attempt.current.hash !== hash) attempt.current = { key: crypto.randomUUID(), hash };
      sessionStorage.setItem(storageKey, JSON.stringify(attempt.current));
      const data = await createOrder(payload, attempt.current.key);
      attempt.current.orderId = data.order.id; sessionStorage.setItem(storageKey, JSON.stringify(attempt.current)); accept(data);
    } catch (err) { setError(getErrorMessage(err)); } finally { setBusy(false); }
  };
  const pay = async () => {
    if (!checkout || busy) return; setBusy(true); setError("");
    try {
      const result = await openRazorpay(checkout, user);
      if (result === "abandoned") accept(await cancelOrder(checkout.order.id)); else accept(await getOrder(checkout.order.id));
    } catch (err) { setError(`${getErrorMessage(err)} Your order status will update when the payment is confirmed.`); } finally { setBusy(false); }
  };
  const cancel = async () => { if (!checkout || busy) return; setBusy(true); try { accept(await cancelOrder(checkout.order.id)); } catch (err) { setError(getErrorMessage(err)); } finally { setBusy(false); } };
  const restart = () => { attempt.current = null; sessionStorage.removeItem(storageKey); setCheckout(null); setRemaining(null); setError(""); useLiveStore.getState().changed(eventId); };
  return { checkout, remaining, busy, error, prepare, pay, cancel, restart };
}
