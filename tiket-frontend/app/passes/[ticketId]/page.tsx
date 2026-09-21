"use client";

import React from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useTicketPass } from "./hooks/useTicketPass";
import { PassHeader } from "./components/PassHeader";
import { PassDetails } from "./components/PassDetails";
import { PassQRCode } from "./components/PassQRCode";
import { PassActions } from "./components/PassActions";
import { PassError } from "./components/PassError";
import { TornEdge } from "./components/TornEdge";
import styles from "./Pass.module.css";
import { downloadImg } from "./utils/downloadImage";

export default function TicketPassPage() {
  const params = useParams();
  const ticketId = params?.ticketId as string | undefined;

  const { ticket, isLoading, error, statusCode } = useTicketPass(ticketId);

  const ticketRef = React.useRef<HTMLDivElement>(null);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.glowTopRight} />
      <div className={styles.glowBottomLeft} />

      <div className={styles.machineWrapper}>
        {/* 3D Machine Opening Slot Assembly */}
        <div className={styles.slotContainer}>
          {/* Top Metallic Lip (Overlaps the top of the emerging ticket) */}
          <div className={styles.slotTopLip} />

          {/* Dark Inner Slot Mouth Cavity */}
          <div className={styles.slotCavity} />

          {/* Bottom Metallic Lip (Behind emerging ticket) */}
          <div className={styles.slotBottomLip} />

          {/* Viewport clipping ticket dispense motion */}
          <div className={styles.ticketViewport}>
            {error ? (
              <PassError message={error} statusCode={statusCode} />
            ) : ticket ? (
              <motion.div
                className={styles.ticketWrapper}
                initial={{ y: "-100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 85,
                  damping: 15,
                  mass: 0.9,
                }}
                ref={ticketRef}
              >
                <div className={styles.passCard}>
                  {/* Event Title & Ticket Type Pill */}
                  <PassHeader
                    eventTitle={ticket.event.title}
                    ticketTypeName={ticket.ticketType.name}
                  />

                  {/* Attendee, Date & Time, Location Details */}
                  <PassDetails attendee={ticket.attendee} event={ticket.event} />

                  {/* Horizontal Perforation Divider with Inward SVG Bite Cutout Notches */}
                  <div className={styles.perforationWrapper}>
                    <svg width="12" height="24" viewBox="0 0 12 24" className={styles.notchLeftSvg}>
                      <path d="M 0 0 A 12 12 0 0 1 0 24 Z" fill="var(--color-bg-base, #121316)" />
                    </svg>

                    <div className={styles.dashedLine} />

                    <svg width="12" height="24" viewBox="0 0 12 24" className={styles.notchRightSvg}>
                      <path d="M 12 0 A 12 12 0 0 0 12 24 Z" fill="var(--color-bg-base, #121316)" />
                    </svg>
                  </div>

                  {/* QR Code Section below Perforation */}
                  <PassQRCode
                    ticketId={ticket.id}
                    qrCode={ticket.qrCode}
                    status={ticket.status}
                  />
                </div>

                {/* Serrated / Torn Paper Triangle Bottom Edge */}
                <TornEdge />
              </motion.div>
            ) : null}
          </div>
        </div>

        {/* Download Pass Action */}
        {!isLoading && ticket && (
          <PassActions
            handleDownload={() => {
              downloadImg(ticketRef.current, ticket.event.title);
            }}
          />
        )}
      </div>
    </div>
  );
}
