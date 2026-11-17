import React from "react";
import { Edit2, Trash2, GripVertical, Palette } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TicketType } from "@/types/ticketType";
import styles from "./TicketTypesPanel.module.css";

interface Props {
  ticket: TicketType;
  onEdit: () => void;
  onDelete: () => void;
  onDesign?: () => void;
}

export default function SortableTicketCard({
  ticket,
  onEdit,
  onDelete,
  onDesign,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={styles.ticketCard}
        data-dragging={isDragging ? "true" : "false"}
      >
        <div className={styles.dragHandle} {...attributes} {...listeners}>
          <GripVertical size={18} />
        </div>
        <div className={styles.ticketInfo}>
          <div className={styles.ticketHeader}>
            <div className={styles.ticketTitleGroup}>
              <span className={styles.ticketName}>{ticket.name}</span>
              {ticket.isHidden && (
                <span className={styles.hiddenBadge}>
                  Hidden
                </span>
              )}
              {Number(ticket.price) > 0 && (
                <span
                  className={`${styles.feeBadge} ${
                    ticket.passFeeToCustomer !== false
                      ? styles.feeBadgePassed
                      : styles.feeBadgeAbsorbed
                  }`}
                >
                  {ticket.passFeeToCustomer !== false
                    ? "Fee passed to buyer"
                    : "Fee absorbed by host"}
                </span>
              )}
            </div>
            <span className={styles.ticketPrice}>
              {Number(ticket.price) === 0 ? "Free" : `₹${ticket.price}`}
            </span>
          </div>
          {ticket.description && (
            <div className={styles.ticketDescription}>
              {ticket.description}
            </div>
          )}
          <div className={styles.ticketMeta}>
            <span>
              {ticket.quantityLimit
                ? `Limit: ${ticket.quantityLimit}`
                : "Unlimited"}
            </span>
            <span> • </span>
            <span>
              {ticket.isRefundable ? "Refundable" : "Non-refundable"}
            </span>
            <span> • </span>
            <span>
              {ticket.isTransferable
                ? `Transferable (${ticket.maxTransfers || 1} max)`
                : "Non-transferable"}
            </span>
          </div>
        </div>
        <div className={styles.ticketActions}>
          {onDesign && (
            <button
              type="button"
              className={styles.designBtn}
              onClick={onDesign}
              title="Design Pass / Edit Layout"
              aria-label="Design Pass"
              data-testid={`design-pass-btn-${ticket.id}`}
            >
              <Palette size={15} />
              <span className={styles.designBtnText}>Design Pass</span>
            </button>
          )}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onEdit}
            title="Edit Ticket"
            aria-label="Edit Ticket"
          >
            <Edit2 size={16} />
          </button>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
            onClick={onDelete}
            title="Delete Ticket"
            aria-label="Delete Ticket"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
