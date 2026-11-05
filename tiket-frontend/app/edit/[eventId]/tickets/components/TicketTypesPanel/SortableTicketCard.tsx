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
        <div
          className={styles.ticketInfo}
          style={{ flex: 1, marginLeft: "0.5rem" }}
        >
          <div className={styles.ticketHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className={styles.ticketName}>{ticket.name}</span>
              {ticket.isHidden && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    padding: "0.15rem 0.45rem",
                    borderRadius: "4px",
                    background: "var(--status-warning-bg, rgba(255, 193, 7, 0.15))",
                    color: "var(--status-warning, #ffc107)",
                  }}
                >
                  Hidden
                </span>
              )}
              {Number(ticket.price) > 0 && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    padding: "0.15rem 0.45rem",
                    borderRadius: "4px",
                    background:
                      ticket.passFeeToCustomer !== false
                        ? "rgba(59, 130, 246, 0.12)"
                        : "rgba(16, 185, 129, 0.12)",
                    color:
                      ticket.passFeeToCustomer !== false
                        ? "var(--color-primary, #60a5fa)"
                        : "var(--status-success, #34d399)",
                  }}
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
            <div
              style={{
                fontSize: "0.9rem",
                color: "var(--text-secondary)",
                marginTop: "0.25rem",
                marginBottom: "0.25rem",
              }}
            >
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
              data-testid={`design-pass-btn-${ticket.id}`}
            >
              <Palette size={15} />
              <span>Design Pass</span>
            </button>
          )}
          <button className={styles.iconBtn} onClick={onEdit}>
            <Edit2 size={16} />
          </button>
          <button
            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
            onClick={onDelete}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
