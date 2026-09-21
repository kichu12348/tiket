import { Check, Ticket, Sparkles } from "lucide-react";
import { TicketSelectorProps, AutoSelectedBadgeProps } from "../types";
import { formatPrice } from "../utils";
import styles from "./TicketSelector.module.css";

export function TicketSelector({
  ticketTypes,
  selectedId,
  onSelect,
  hasError,
}: TicketSelectorProps) {
  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <div className={styles.headerBadge}>
          <Ticket size={14} className={styles.headerIcon} />
          <span>Select Ticket Pass</span>
        </div>
      </div>

      <div className={styles.ticketGrid}>
        {ticketTypes.map((tt) => {
          const isSelected = selectedId === tt.id;

          return (
            <div
              key={tt.id}
              id={`ticket-${tt.id}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(tt.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(tt.id);
                }
              }}
              className={`${styles.ticketCard} ${
                isSelected ? styles.ticketCardActive : ""
              }`}
            >
              <div className={styles.cardLeft}>
                <div className={styles.ticketIconBox}>
                  <Ticket size={18} />
                </div>
                <div className={styles.ticketMeta}>
                  <div className={styles.titleRow}>
                    <span className={styles.ticketName}>{tt.name}</span>
                  </div>
                  {tt.description && (
                    <span className={styles.ticketDesc}>{tt.description}</span>
                  )}
                </div>
              </div>

              <div className={styles.cardRight}>
                <span className={styles.ticketPrice}>
                  {formatPrice(tt.price)}
                </span>
                <div
                  className={`${styles.radioCheck} ${
                    isSelected ? styles.radioCheckActive : ""
                  }`}
                >
                  {isSelected && <Check size={13} strokeWidth={3} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasError && !selectedId && (
        <div className={styles.errorBanner}>
          <span>Please select a ticket type to continue</span>
        </div>
      )}
    </section>
  );
}

export function AutoSelectedBadge({ ticket }: AutoSelectedBadgeProps) {
  return (
    <div className={styles.autoSelectedCard}>
      <div className={styles.autoSelectedLeft}>
        <div className={styles.ticketIconBox}>
          <Sparkles size={16} />
        </div>
        <div className={styles.autoSelectedText}>
          <span className={styles.autoSelectedLabel}>Included Pass</span>
          <span className={styles.autoSelectedName}>{ticket.name}</span>
        </div>
      </div>
      <span className={styles.autoSelectedPrice}>
        {formatPrice(ticket.price)}
      </span>
    </div>
  );
}
