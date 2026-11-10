"use client";

import { useState } from "react";
import {
  ScanLine,
  QrCode,
  CheckCircle2,
  X,
  Info,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import styles from "./DoorScanner.module.css";

interface ScanResponse {
  success: boolean;
  ticketId?: string;
  message?: string;
  error?: string;
  todayCheckInCount?: number;
  totalCheckIns?: number;
  checkInDate?: string;
}

interface DoorScannerProps {
  disabled: boolean;
  scan: (value: string) => Promise<boolean | ScanResponse>;
  undoCheckIn?: (ticketId: string) => Promise<boolean>;
}

function playAudioFeedback(type: "success" | "error") {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Ignore environments where AudioContext is blocked or unsupported
  }
}

export default function DoorScanner({
  disabled,
  scan,
  undoCheckIn,
}: DoorScannerProps) {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    type: "success" | "error";
    message: string;
    ticketId?: string;
    code?: string;
    todayCheckInCount?: number;
    totalCheckIns?: number;
  } | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || disabled || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const res = await scan(trimmed);
      const isSuccess = typeof res === "boolean" ? res : res.success;

      if (isSuccess) {
        const ticketId = typeof res === "object" ? res.ticketId : undefined;
        const msg =
          (typeof res === "object" && res.message) ||
          "Attendee checked in successfully.";
        const todayCheckInCount =
          typeof res === "object" ? res.todayCheckInCount : undefined;
        const totalCheckIns =
          typeof res === "object" ? res.totalCheckIns : undefined;
        setLastResult({
          type: "success",
          message: msg,
          ticketId,
          code: trimmed,
          todayCheckInCount,
          totalCheckIns,
        });
        playAudioFeedback("success");
        setCode("");
      } else {
        const errMsg =
          (typeof res === "object" && res.error) ||
          "Ticket is not eligible for this admission change.";
        setLastResult({
          type: "error",
          message: errMsg,
          code: trimmed,
        });
        playAudioFeedback("error");
      }
    } catch (err: unknown) {
      setLastResult({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Ticket not found or admission failed.",
        code: trimmed,
      });
      playAudioFeedback("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndo = async () => {
    if (!lastResult?.ticketId || !undoCheckIn || isUndoing) return;
    try {
      setIsUndoing(true);
      const ok = await undoCheckIn(lastResult.ticketId);
      if (ok) {
        setLastResult({
          type: "success",
          message: `Check-in undone for pass ${lastResult.code || ""}.`,
        });
      }
    } finally {
      setIsUndoing(false);
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.iconBox}>
            <ScanLine size={20} />
          </div>
          <div className={styles.headerText}>
            <h2 className={styles.title}>Door Check-in</h2>
            <p className={styles.subtitle}>
              Fast check-in scanner for front-of-house staff. Scan passes using
              a handheld 2D barcode reader or enter QR codes manually.
            </p>
          </div>
        </div>
        <div className={styles.statusBadge}>
          <span className={styles.pulseDot} />
          Scanner Active
        </div>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.inputWrapper}>
          <QrCode size={18} className={styles.inputIcon} />
          <input
            className={styles.input}
            placeholder="Scan pass or paste ticket QR code..."
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={disabled || isSubmitting}
            autoFocus
          />
          {code && (
            <button
              type="button"
              className={styles.clearInputBtn}
              onClick={() => setCode("")}
              aria-label="Clear code"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button
          type="submit"
          className={styles.scanBtn}
          disabled={disabled || isSubmitting || !code.trim()}
        >
          <CheckCircle2 size={17} />
          <span>{isSubmitting ? "Checking..." : "Check In"}</span>
        </button>
      </form>

      {/* Visual Scan Feedback */}
      {lastResult && (
        <div
          role={lastResult.type === "error" ? "alert" : "status"}
          className={`flex items-center justify-between p-3 rounded-lg text-sm border ${
            lastResult.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
              : "bg-red-950/40 border-red-500/30 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {lastResult.type === "success" ? (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle size={18} className="shrink-0 text-red-400" />
            )}
            <span>{lastResult.message}</span>
            {lastResult.todayCheckInCount !== undefined && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-medium">
                Scan #{lastResult.todayCheckInCount} today ({lastResult.totalCheckIns} total)
              </span>
            )}
            {lastResult.code && (
              <span className="font-mono text-xs opacity-75">
                ({lastResult.code})
              </span>
            )}
          </div>

          {lastResult.type === "success" &&
            lastResult.ticketId &&
            undoCheckIn && (
              <button
                type="button"
                onClick={handleUndo}
                disabled={isUndoing}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors shrink-0"
              >
                <RotateCcw size={13} className={isUndoing ? "animate-spin" : ""} />
                <span>{isUndoing ? "Undoing..." : "Undo Check-In"}</span>
              </button>
            )}
        </div>
      )}

      <div className={styles.infoBar}>
        <Info size={14} className={styles.infoIcon} />
        <span>
          Only paid, approved, and active passes for this event will be accepted
          for admission.
        </span>
      </div>
    </section>
  );
}
