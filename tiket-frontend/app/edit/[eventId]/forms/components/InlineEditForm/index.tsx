import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { confirm } from "@/components/ConfirmModal";
import Switch from "@/components/Switch";
import Dropdown from "@/components/Dropdown";
import type { LocalField, FieldType } from "../../types";
import { FIELD_TYPES } from "../../types";
import { isChoiceField, isMultiChoiceField } from "../../functions/formHelpers";
import styles from "./InlineEditForm.module.css";

interface Props {
  field: LocalField;
  onSave: (updated: Omit<LocalField, "isEditing">) => Promise<void>;
  onDelete: () => Promise<void>;
  onCancel?: () => void;
}

export default function InlineEditForm({
  field,
  onSave,
  onDelete,
  onCancel,
}: Props) {
  const [label, setLabel] = useState(field.label);
  const [fieldType, setFieldType] = useState<FieldType>(field.fieldType);
  const [isRequired, setIsRequired] = useState(field.isRequired);
  const [optionsStr, setOptionsStr] = useState(field.options?.join(", ") || "");
  const [minOptions, setMinOptions] = useState<number | "">(
    typeof field.minOptions === "number" ? field.minOptions : "",
  );
  const [maxOptions, setMaxOptions] = useState<number | "">(
    typeof field.maxOptions === "number" ? field.maxOptions : "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isChoice = isChoiceField(fieldType);
  const isMulti = isMultiChoiceField(fieldType);

  const handleSave = async () => {
    if (!label.trim()) {
      toast.error("Question text is required.");
      return;
    }

    const finalName = field.name || label.toLowerCase().replace(/\s+/g, "_");

    let parsedOptions: string[] | null = null;
    let finalMin: number | null = null;
    let finalMax: number | null = null;

    if (isChoice) {
      parsedOptions = optionsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (parsedOptions.length === 0) {
        toast.error("At least one option is required.");
        return;
      }

      if (isMulti) {
        finalMin = typeof minOptions === "number" ? minOptions : null;
        finalMax = typeof maxOptions === "number" ? maxOptions : null;

        if (finalMin !== null && finalMin < 0) {
          toast.error("Minimum selections cannot be negative.");
          return;
        }
        if (finalMax !== null && finalMax <= 0) {
          toast.error("Maximum selections must be at least 1.");
          return;
        }
        if (finalMin !== null && finalMax !== null && finalMin > finalMax) {
          toast.error("Minimum selections cannot exceed maximum.");
          return;
        }
        if (finalMin !== null && finalMin > parsedOptions.length) {
          toast.error("Minimum selections cannot exceed the number of options.");
          return;
        }
        if (finalMax !== null && finalMax > parsedOptions.length) {
          toast.error("Maximum selections cannot exceed the number of options.");
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      await onSave({
        ...field,
        label: label.trim(),
        name: finalName,
        fieldType,
        isRequired,
        options: parsedOptions,
        minOptions: finalMin,
        maxOptions: finalMax,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    await confirm(
      "Are you sure you want to delete this question? This action cannot be undone.",
      {
        title: "Delete Question",
        confirmText: "Delete",
        danger: true,
        onConfirm: async () => {
          setIsDeleting(true);
          try {
            await onDelete();
          } finally {
            setIsDeleting(false);
          }
        },
      },
    );
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
            options={FIELD_TYPES.map((t) => ({ label: t.label, value: t.value }))}
            value={fieldType}
            onChange={(val) => setFieldType(val as FieldType)}
            alignSelf="flex-start"
          />
        </div>
        {isChoice && (
          <div className={styles.formGroup} style={{ flex: 2 }}>
            <label>Options (comma separated)</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Small, Medium, Large"
              value={optionsStr}
              onChange={(e) => setOptionsStr(e.target.value)}
            />
          </div>
        )}
      </div>

      {isChoice && isMulti && (
        <div className={styles.editFormRow}>
          <div className={styles.formGroup}>
            <label>Min Selections</label>
            <input
              type="number"
              className={styles.input}
              min={0}
              placeholder="No min"
              value={minOptions}
              onChange={(e) =>
                setMinOptions(
                  e.target.value !== "" ? parseInt(e.target.value, 10) : "",
                )
              }
            />
          </div>
          <div className={styles.formGroup}>
            <label>Max Selections</label>
            <input
              type="number"
              className={styles.input}
              min={1}
              placeholder="No max"
              value={maxOptions}
              onChange={(e) =>
                setMaxOptions(
                  e.target.value !== "" ? parseInt(e.target.value, 10) : "",
                )
              }
            />
          </div>
        </div>
      )}

      <div className={styles.editFormFooter}>
        <div className={styles.switchRow}>
          <Switch checked={isRequired} onChange={setIsRequired} />
          <label>Required field</label>
        </div>
        <div className={styles.btnGroup}>
          {onCancel && (
            <button
              type="button"
              className={styles.btnDangerIcon}
              onClick={onCancel}
              title="Cancel"
              style={{
                color: "var(--text-secondary)",
                width: "auto",
                padding: "0.5rem 0.85rem",
              }}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            className={styles.btnDangerIcon}
            onClick={handleDelete}
            title="Delete"
            disabled={isDeleting || isSaving}
          >
            <Trash2 size={16} />
          </button>
          <button
            type="button"
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
