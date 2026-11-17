import { Link } from "@tanstack/react-router";
import { Check, ChevronLeft } from "lucide-react";
import type { SuccessCardProps } from "../types";
import styles from "./SuccessCard.module.css";

export default function SuccessCard({
  event,
  createdTicketId,
}: SuccessCardProps) {
  const isApproval = event.requireApproval;

  return (
    <div className={styles.successCard}>
      <div className={styles.successIcon}>
        <Check size={28} />
      </div>

      <h2 className={styles.successTitle}>
        {isApproval ? "Request Submitted!" : "You're Registered!"}
      </h2>

      <p className={styles.successDesc}>
        {isApproval
          ? "Your registration request has been submitted. The organiser will review and approve it shortly."
          : `You're all set for ${event.title}. Your ticket has been issued.`}
      </p>

      <div className={styles.successActions}>
        {createdTicketId && !isApproval && (
          <Link
            to="/passes/$ticketId"
            params={{ ticketId: createdTicketId }}
            className={styles.btnPrimary}
          >
            View My Ticket
          </Link>
        )}
        <Link
          to="/$eventSlug"
          params={{ eventSlug: event.slug }}
          className={styles.btnSecondary}
        >
          <ChevronLeft size={18} />
          <span>Back to Event</span>
        </Link>
      </div>
    </div>
  );
}
