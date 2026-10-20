"use client";

import { useState } from "react";
import { ScanLine, QrCode, CheckCircle2, X, Info } from "lucide-react";
import styles from "./DoorScanner.module.css";

interface DoorScannerProps {
  disabled: boolean;
  scan: (value: string) => Promise<boolean>;
}

export default function DoorScanner({ disabled, scan }: DoorScannerProps) {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || disabled || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const success = await scan(trimmed);
      if (success) {
        setCode("");
      }
    } finally {
      setIsSubmitting(false);
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
