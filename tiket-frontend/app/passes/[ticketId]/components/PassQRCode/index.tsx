import React from "react";
import QRCode from "react-qr-code";
import { TicketStatus } from "@/types/ticket";
import styles from "./PassQRCode.module.css";

interface PassQRCodeProps {
  ticketId: string;
  qrCode: string;
  status: TicketStatus;
}

export function PassQRCode({ ticketId, qrCode, status }: PassQRCodeProps) {
  const isInvalid = status !== "active";

  return (
    <div className={styles.qrSection}>
      <div className={`${styles.qrContainer} ${isInvalid ? styles.invalidQr : ""}`}>
        <QRCode
          value={qrCode || ticketId}
          size={140}
          level="H"
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
        />

        {isInvalid && (
          <div
            className={`${styles.watermark} ${
              status === "used" ? styles.watermarkCheckedIn : ""
            }`}
          >
            {status === "used" ? "CHECKED IN" : status.toUpperCase()}
          </div>
        )}
      </div>

      <span className={styles.instructions}>Present this code at venue entrance</span>
    </div>
  );
}
