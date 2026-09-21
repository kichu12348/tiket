import React from "react";
import { Edit2, Trash2, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TicketType } from "@/types/ticketType";
import styles from "./TicketTypesPanel.module.css";

interface Props {
  ticket: TicketType;
  onEdit: () => void;
  onDelete: () => void;
}

export default function SortableTicketCard({ ticket, onEdit, onDelete }: Props) {
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
        <div className={styles.ticketInfo} style={{ flex: 1, marginLeft: "0.5rem" }}>
          <div className={styles.ticketHeader}>
            <span className={styles.ticketName}>{ticket.name}</span>
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
            {ticket.quantityLimit ? `Limit: ${ticket.quantityLimit}` : "Unlimited"}
            {ticket.isTransferable ? " • Transferable" : " • Non-transferable"}
          </div>
        </div>
        <div className={styles.ticketActions}>
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
