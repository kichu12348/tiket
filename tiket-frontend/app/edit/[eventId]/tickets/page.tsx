"use client";

import { useEventStore } from "@/store/useEventStore";
import TicketTypesPanel from "./components/TicketTypesPanel";
import styles from "./Tickets.module.css";

export default function EditTicketsPage() {
  const { event } = useEventStore();

  if (!event) return null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Tickets</h1>
        <p className={styles.subtitle}>
          Manage your ticket tiers, pricing, and availability.
        </p>
      </div>

      <TicketTypesPanel eventId={event.id} />
    </div>
  );
}
