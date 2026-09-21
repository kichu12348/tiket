import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import Switch from "@/components/Switch";
import Dropdown from "@/components/Dropdown";
import { LocalField, FieldType, FIELD_TYPES } from "../../types";
import styles from "./InlineEditForm.module.css";

interface Props {
  field: LocalField;
  onSave: (updated: Omit<LocalField, "isEditing">) => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function InlineEditForm({ field, onSave, onDelete }: Props) {
  const [label, setLabel] = useState(field.label);
  const [fieldType, setFieldType] = useState<FieldType>(field.fieldType);
  const [isRequired, setIsRequired] = useState(field.isRequired);
  const [optionsStr, setOptionsStr] = useState(field.options?.join(", ") || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    if (!label.trim()) {
      toast.error("Question text is required.");
      return;
    }

    // Auto-generate name from label if none exists
    const finalName = field.name || label.toLowerCase().replace(/\s+/g, "_");

    const options =
      fieldType === "select" && optionsStr.trim()
        ? optionsStr
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : null;

    setIsSaving(true);
    try {
      await onSave({
        ...field,
        label: label.trim(),
        name: finalName,
        fieldType,
        isRequired,
        options,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this question?")) {
      setIsDeleting(true);
      try {
        await onDelete();
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className={styles.editForm}>
      <div className={styles.editFormRow}>
        <div className={styles.formGroup} style={{ flex: 1 }}>
          <label>Question</label>
          <input
            type="text"
            className={styles.input}
            placeholder="e.g. What is your t-shirt size?"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className={styles.editFormRow}>
        <div className={styles.formGroup}>
          <label>Response Type</label>
          <Dropdown
            options={FIELD_TYPES}
            value={fieldType}
            onChange={(val) => setFieldType(val as FieldType)}
            alignSelf="flex-start"
          />
        </div>
        {fieldType === "select" && (
          <div className={styles.formGroup} style={{ flex: 2 }}>
            <label>Options (comma separated)</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Small, Medium, Large"
              value={optionsStr}
              onChange={(e) => setOptionsStr(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className={styles.editFormFooter}>
        <div className={styles.switchRow}>
          <Switch checked={isRequired} onChange={setIsRequired} />
          <label>Required field</label>
        </div>
        <div className={styles.btnGroup}>
          <button
            className={styles.btnDangerIcon}
            onClick={handleDelete}
            title="Delete"
            disabled={isDeleting || isSaving}
          >
            <Trash2 size={16} />
          </button>
          <button
            className={styles.btnPrimary}
            onClick={handleSave}
            disabled={isSaving || isDeleting}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
