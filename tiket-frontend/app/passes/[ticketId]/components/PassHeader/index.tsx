import React from "react";
import { Ticket } from "lucide-react";
import styles from "./PassHeader.module.css";

interface PassHeaderProps {
  eventTitle: string;
  ticketTypeName: string;
}

export function PassHeader({ eventTitle, ticketTypeName }: PassHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.topRow}>
        <span className={styles.ticketTypeTag}>
          <Ticket size={12} />
          {ticketTypeName}
        </span>
      </div>

      <h1 className={styles.eventName}>{eventTitle}</h1>
    </div>
  );
}
