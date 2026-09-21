import Link from "next/link";
import { Ticket, ChevronLeft } from "lucide-react";
import { EmptyStateProps } from "../types";
import styles from "./EmptyState.module.css";

export default function EmptyState({ slug }: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <Ticket size={32} className={styles.emptyIcon} />
      <h2 className={styles.emptyTitle}>Tickets Unavailable</h2>
      <p className={styles.emptyDesc}>
        Ticket sales for this event are not currently open.
      </p>
      <Link href={`/${slug}`} className={styles.backBtn}>
        <ChevronLeft size={18} />
        <span>Back to Event</span>
      </Link>
    </div>
  );
}
