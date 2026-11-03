import React from "react";
import QRCode from "react-qr-code";
import { Clock, Ban, RotateCcw, CheckCircle2 } from "lucide-react";
import type { TicketStatus } from "@/types/ticket";
import styles from "./PassQRCode.module.css";

interface PassQRCodeProps {
  ticketId: string;
  qrCode: string;
  status: TicketStatus;
}

export function PassQRCode({ ticketId, qrCode, status }: PassQRCodeProps) {
  const isPendingApproval = status === "pending_approval";
  const isCancelled = status === "cancelled";
  const isRefunded = status === "refunded";
  const isPending = status === "pending";
  const isUsed = status === "used";
  const isActive = status === "active";

  // Hide entry QR code for pending_approval, cancelled, refunded, pending
  const shouldHideQr =
    isPendingApproval || isCancelled || isRefunded || isPending;

  const getStatusBadgeConfig = () => {
    if (isPendingApproval) {
      return {
        label: "PENDING APPROVAL",
        icon: Clock,
        bgVar: "var(--status-warning-bg, rgba(255, 193, 7, 0.15))",
        colorVar: "var(--status-warning, #ffc107)",
        instruction:
          "Registration awaiting organizer approval. Not valid for entry.",
      };
    }
    if (isCancelled) {
      return {
        label: "CANCELLED",
        icon: Ban,
        bgVar: "var(--status-danger-bg, rgba(255, 80, 80, 0.15))",
        colorVar: "var(--status-danger, rgba(255, 80, 80, 1))",
        instruction: "This ticket registration has been cancelled.",
      };
    }
    if (isRefunded) {
      return {
        label: "REFUNDED",
        icon: RotateCcw,
        bgVar: "var(--status-danger-bg, rgba(255, 80, 80, 0.15))",
        colorVar: "var(--status-danger, rgba(255, 80, 80, 1))",
        instruction: "This ticket has been refunded and is no longer valid.",
      };
    }
    if (isPending) {
      return {
        label: "PAYMENT PENDING",
        icon: Clock,
        bgVar: "var(--status-warning-bg, rgba(255, 193, 7, 0.15))",
        colorVar: "var(--status-warning, #ffc107)",
        instruction: "Payment confirmation is pending. Not valid for entry.",
      };
    }
    return null;
  };

  const badgeConfig = getStatusBadgeConfig();

  return (
    <div className={styles.qrSection}>
      {shouldHideQr && badgeConfig ? (
        <div
          data-testid="status-badge-container"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.25rem 1rem",
            borderRadius: "var(--radius-md, 10px)",
            backgroundColor: badgeConfig.bgVar,
            border: `1px solid ${badgeConfig.colorVar}`,
            width: "100%",
            boxSizing: "border-box",
            gap: "0.5rem",
          }}
        >
          <badgeConfig.icon size={28} style={{ color: badgeConfig.colorVar }} />
          <span
            data-testid="ticket-status-badge"
            style={{
              fontSize: "0.82rem",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: badgeConfig.colorVar,
            }}
          >
            {badgeConfig.label}
          </span>
        </div>
      ) : (
        <div
          data-testid="qr-container"
          className={`${styles.qrContainer} ${!isActive ? styles.invalidQr : ""}`}
        >
          <QRCode
            value={qrCode || ticketId}
            size={140}
            level="H"
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          />

          {isUsed && (
            <div
              className={`${styles.watermark} ${styles.watermarkCheckedIn}`}
              data-testid="ticket-status-badge"
            >
              <CheckCircle2
                size={14}
                style={{ marginRight: "4px", display: "inline" }}
              />
              CHECKED IN
            </div>
          )}
        </div>
      )}

      <span className={styles.instructions}>
        {badgeConfig
          ? badgeConfig.instruction
          : isActive
            ? "Present this code at venue entrance"
            : isUsed
              ? "Already checked in"
              : "This pass is not valid for entry."}
      </span>
    </div>
  );
}

