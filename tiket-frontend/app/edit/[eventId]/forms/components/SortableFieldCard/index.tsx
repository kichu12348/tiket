import React from "react";
import {
  GripVertical,
  Edit2,
  Type,
  AlignLeft,
  List,
  CheckSquare,
  Calendar,
  Mail,
  Hash,
  Phone,
  ChevronDown,
  CircleDot,
  CalendarClock,
  Clock,
  Star,
  Link,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LocalField, FIELD_TYPES } from "../../types";
import styles from "./SortableFieldCard.module.css";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <Type size={14} />,
  long_text: <AlignLeft size={14} />,
  email: <Mail size={14} />,
  phone: <Phone size={14} />,
  single_select: <ChevronDown size={14} />,
  multi_select: <List size={14} />,
  radio: <CircleDot size={14} />,
  checkbox: <CheckSquare size={14} />,
  number: <Hash size={14} />,
  datetime: <CalendarClock size={14} />,
  date: <Calendar size={14} />,
  time: <Clock size={14} />,
  rating: <Star size={14} />,
  url: <Link size={14} />,
  select: <List size={14} />,
};

interface Props {
  field: LocalField;
  onEdit: () => void;
}

export default function SortableFieldCard({ field, onEdit }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.localId });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    position: "relative" as const,
  };

  const typeLabel =
    FIELD_TYPES.find((t) => t.value === field.fieldType)?.label ||
    field.fieldType;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={styles.customCard}
        data-dragging={isDragging ? "true" : "false"}
      >
        <div className={styles.dragHandle} {...attributes} {...listeners}>
          <GripVertical size={18} />
        </div>
        <div className={styles.customCardBody}>
          <div className={styles.customCardTitle}>
            {field.label || "Untitled Question"}
            {field.isRequired && (
              <span
                style={{
                  color: "var(--status-danger)",
                  marginLeft: "0.5rem",
                  fontSize: "1rem",
                }}
              >
                *
              </span>
            )}
          </div>
          <div className={styles.customCardType}>
            {["single_select", "multi_select", "radio", "select"].includes(
              field.fieldType,
            ) ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.15rem",
                }}
              >
                <span>
                  {field.options?.length || 0}
                  {field.options?.length === 1 ? " option" : " options"}
                </span>
                <span
                  style={{
                    opacity: 0.6,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {TYPE_ICONS[field.fieldType]} {typeLabel}
                </span>
              </div>
            ) : (
              <span
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                {TYPE_ICONS[field.fieldType]} {typeLabel}
              </span>
            )}
          </div>
        </div>
        <button className={styles.editBtn} onClick={onEdit} title="Edit">
          <Edit2 size={16} />
        </button>
      </div>
    </div>
  );
}
