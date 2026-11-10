"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getFinance,
  getCoupons,
  putCoupon,
  refundOrder,
  decideRegistration,
  getMailConnection,
  saveMailConnection,
  resetMailConnection,
  getPermissions,
  getPendingApprovals,
  scanTicket,
} from "@/api/commerce";
import type { Coupon, Finance, MailConfig } from "@/types/commerce";
import { getErrorMessage } from "@/lib/errors";
import { useEventRevision, useLiveEvent } from "./useLiveEvent";
import { toggleCheckIn } from "@/api/attendees";
export function useOperations(eventId: string) {
  useLiveEvent(eventId);
  const [finance, setFinance] = useState<Finance | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [approvals, setApprovals] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [owner, setOwner] = useState(false);
  const [customMail, setCustomMail] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const revision = useEventRevision(eventId);
  const latest = useRef(0);
  const refresh = useCallback(() => {
    const generation = ++latest.current;
    return getPermissions(eventId).then(async (access) => {
      if (generation !== latest.current) return;
      setPermissions(access.permissions);
      setOwner(access.owner);
      if (!access.permissions.includes("view_payments")) setFinance(null);
      if (!access.permissions.includes("manage_tickets")) setCoupons([]);
      if (!access.permissions.includes("manage_guests")) setApprovals([]);
      const results = await Promise.allSettled([
        access.permissions.includes("view_payments")
          ? getFinance(eventId).then((data) => {
              if (generation === latest.current) setFinance(data);
            })
          : Promise.resolve(),
        access.permissions.includes("manage_tickets")
          ? getCoupons(eventId).then((data) => {
              if (generation === latest.current) setCoupons(data);
            })
          : Promise.resolve(),
        access.permissions.includes("manage_guests")
          ? getPendingApprovals(eventId).then((data) => {
              if (generation === latest.current) setApprovals(data);
            })
          : Promise.resolve(),
        access.owner
          ? getMailConnection(eventId).then((data) =>
              setCustomMail(data.custom),
            )
          : Promise.resolve(),
      ]);
      if (generation !== latest.current) return;
      const failed = results.find((result) => result.status === "rejected");
      if (failed?.status === "rejected")
        setError(getErrorMessage(failed.reason));
      setLoading(false);
    });
  }, [eventId]);
  useEffect(() => {
    let active = true;
    void refresh().catch((err) => {
      if (active) {
        setPermissions([]);
        setOwner(false);
        setFinance(null);
        setError(getErrorMessage(err));
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [refresh, revision]);
  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError("");
    try {
      await action();
      toast.success(message);
      await refresh();
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const refund = (orderId: string, amount: number, reason: string) =>
    run(async () => {
      const storage = `tiket:refund:${eventId}:${orderId}:${amount}:${reason}`;
      let key = crypto.randomUUID();
      if (
        typeof window !== "undefined" &&
        typeof window.sessionStorage !== "undefined"
      ) {
        key = window.sessionStorage.getItem(storage) || key;
        window.sessionStorage.setItem(storage, key);
      }
      await refundOrder(eventId, orderId, amount, reason, key);
      if (
        typeof window !== "undefined" &&
        typeof window.sessionStorage !== "undefined"
      ) {
        window.sessionStorage.removeItem(storage);
      }
    }, "Refund queued. Its status will update after Razorpay processes it.");
  return {
    finance,
    coupons,
    approvals,
    permissions,
    owner,
    customMail,
    error,
    busy,
    loading,
    refund,
    decide: (id: string, decision: "approve" | "decline") =>
      run(
        () => decideRegistration(eventId, id, decision),
        decision === "approve"
          ? "Registration approved."
          : "Registration declined and refund queued where applicable.",
      ),
    saveCoupon: (coupon: Coupon) =>
      run(() => putCoupon(eventId, coupon), "Code saved."),
    saveMail: (config: MailConfig) =>
      run(() => saveMailConnection(eventId, config), "Email connection saved."),
    resetMail: () =>
      run(
        () => resetMailConnection(eventId),
        "Default Brevo delivery restored.",
      ),
    scan: async (qrCode: string) => {
      setBusy(true);
      setError("");
      try {
        const res = (await scanTicket(eventId, qrCode)) as {
          message?: string;
          ticket?: { id: string };
          ticketId?: string;
          status?: string;
          todayCheckInCount?: number;
          totalCheckIns?: number;
          checkInDate?: string;
        };
        toast.success(res?.message || "Attendee checked in.");
        await refresh();
        return {
          success: true,
          ticketId: res?.ticket?.id || res?.ticketId || "",
          message: res?.message || "Attendee checked in.",
          status: res?.status || "used",
          todayCheckInCount: res?.todayCheckInCount,
          totalCheckIns: res?.totalCheckIns,
          checkInDate: res?.checkInDate,
        };
      } catch (err) {
        const msg = getErrorMessage(err);
        setError(msg);
        return {
          success: false,
          error: msg,
        };
      } finally {
        setBusy(false);
      }
    },
    undoCheckIn: (ticketId: string) =>
      run(
        () => toggleCheckIn(eventId, ticketId, "undo"),
        "Check-in undone.",
      ),
  };
}
