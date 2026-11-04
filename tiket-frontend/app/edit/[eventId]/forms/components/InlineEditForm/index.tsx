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
import type { ConditionRule, FieldConditionConfig } from "@/types/form";

interface Props {
  field: LocalField & { conditions?: FieldConditionConfig | null };
  onSave: (
    updated: Omit<LocalField, "isEditing"> & {
      conditions?: FieldConditionConfig | null;
    },
  ) => Promise<void>;
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

  const initialConditions =
    (field as unknown as { conditions?: FieldConditionConfig | null })
      ?.conditions ?? null;

  const [hasConditions, setHasConditions] = useState(
    Boolean(
      initialConditions &&
        initialConditions.rules &&
        initialConditions.rules.length > 0,
    ),
  );
  const [condMatch, setCondMatch] = useState<"all" | "any">(
    initialConditions?.match ?? "all",
  );
  const [condRules, setCondRules] = useState<ConditionRule[]>(
    initialConditions?.rules?.length
      ? initialConditions.rules
      : [
          {
            sourceType: "field",
            sourceId: "",
            operator: "equals",
            value: "",
          },
        ],
  );
  const [thenAction, setThenAction] = useState<"show" | "require" | "hide">(
    initialConditions?.thenAction ?? "require",
  );
  const [elseAction, setElseAction] = useState<"hide" | "optional" | "show">(
    initialConditions?.elseAction ?? "hide",
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
      let conditionsConfig: FieldConditionConfig | null = null;
      if (hasConditions) {
        const validRules = condRules.filter(
          (r) =>
            r.sourceId.trim() &&
            (Array.isArray(r.value)
              ? r.value.length > 0
              : String(r.value).trim()),
        );
        if (validRules.length > 0) {
          conditionsConfig = {
            match: condMatch,
            rules: validRules,
            thenAction,
            elseAction,
          };
        }
      }

      await onSave({
        ...field,
        label: label.trim(),
        name: finalName,
        fieldType,
        isRequired,
        options: parsedOptions,
        conditions: conditionsConfig,
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

      <div className={styles.editFormRow}>
        <div className={styles.switchRow}>
          <Switch checked={hasConditions} onChange={setHasConditions} />
          <label>Conditional Logic (If / Then / Else)</label>
        </div>
      </div>

      {hasConditions && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.85rem",
            padding: "0.85rem",
            background: "rgba(255, 255, 255, 0.03)",
            borderRadius: "8px",
            border: "1px solid var(--border-subtle)",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              Condition Rules
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                }}
              >
                Match:
              </span>
              <select
                className={styles.input}
                value={condMatch}
                onChange={(e) =>
                  setCondMatch(e.target.value as "all" | "any")
                }
                style={{
                  background: "#1c1c1e",
                  color: "#fff",
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.75rem",
                  width: "auto",
                }}
              >
                <option value="all">All rules (AND)</option>
                <option value="any">Any rule (OR)</option>
              </select>
            </div>
          </div>

          {condRules.map((rule, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                padding: "0.6rem",
                background: "rgba(0, 0, 0, 0.2)",
                borderRadius: "6px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    width: "20px",
                  }}
                >
                  IF
                </span>
                <select
                  className={styles.input}
                  value={rule.sourceType}
                  onChange={(e) => {
                    const updated = [...condRules];
                    updated[idx] = {
                      ...rule,
                      sourceType: e.target.value as "field" | "ticketType",
                      sourceId:
                        e.target.value === "ticketType"
                          ? "ticketTypeId"
                          : rule.sourceId,
                    };
                    setCondRules(updated);
                  }}
                  style={{
                    background: "#1c1c1e",
                    color: "#fff",
                    flex: 1,
                    fontSize: "0.8rem",
                  }}
                >
                  <option value="field">Form Question</option>
                  <option value="ticketType">Ticket Type</option>
                </select>
                {rule.sourceType === "field" && (
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Field ID or Name (e.g. role)"
                    value={rule.sourceId}
                    onChange={(e) => {
                      const updated = [...condRules];
                      updated[idx] = { ...rule, sourceId: e.target.value };
                      setCondRules(updated);
                    }}
                    style={{ flex: 1, fontSize: "0.8rem" }}
                  />
                )}
                {condRules.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setCondRules(condRules.filter((_, i) => i !== idx))
                    }
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--status-danger)",
                      cursor: "pointer",
                      padding: "0.25rem",
                    }}
                    title="Remove rule"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                }}
              >
                <select
                  className={styles.input}
                  value={rule.operator}
                  onChange={(e) => {
                    const updated = [...condRules];
                    updated[idx] = {
                      ...rule,
                      operator: e.target.value as
                        | "equals"
                        | "not_equals"
                        | "contains"
                        | "in",
                    };
                    setCondRules(updated);
                  }}
                  style={{
                    background: "#1c1c1e",
                    color: "#fff",
                    flex: 1,
                    fontSize: "0.8rem",
                  }}
                >
                  <option value="equals">Equals</option>
                  <option value="not_equals">Does not equal</option>
                  <option value="contains">Contains</option>
                  <option value="in">In list</option>
                </select>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Expected value (e.g. Student)"
                  value={
                    Array.isArray(rule.value)
                      ? rule.value.join(", ")
                      : rule.value
                  }
                  onChange={(e) => {
                    const updated = [...condRules];
                    updated[idx] = {
                      ...rule,
                      value:
                        rule.operator === "in"
                          ? e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean)
                          : e.target.value,
                    };
                    setCondRules(updated);
                  }}
                  style={{ flex: 1, fontSize: "0.8rem" }}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              setCondRules([
                ...condRules,
                {
                  sourceType: "field",
                  sourceId: "",
                  operator: "equals",
                  value: "",
                },
              ])
            }
            style={{
              alignSelf: "flex-start",
              background: "rgba(255, 255, 255, 0.05)",
              border: "none",
              borderRadius: "6px",
              padding: "0.3rem 0.6rem",
              color: "var(--color-text-soft)",
              cursor: "pointer",
              fontSize: "0.78rem",
            }}
          >
            + Add Rule
          </button>

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              marginTop: "0.5rem",
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: "0.75rem",
            }}
          >
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: "0.75rem",
                  display: "block",
                  marginBottom: "0.25rem",
                }}
              >
                THEN Action
              </label>
              <select
                className={styles.input}
                value={thenAction}
                onChange={(e) =>
                  setThenAction(
                    e.target.value as "show" | "require" | "hide",
                  )
                }
                style={{
                  background: "#1c1c1e",
                  color: "#fff",
                  fontSize: "0.8rem",
                }}
              >
                <option value="require">Show & Require</option>
                <option value="show">Show</option>
                <option value="hide">Hide</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: "0.75rem",
                  display: "block",
                  marginBottom: "0.25rem",
                }}
              >
                ELSE Action
              </label>
              <select
                className={styles.input}
                value={elseAction}
                onChange={(e) =>
                  setElseAction(
                    e.target.value as "hide" | "optional" | "show",
                  )
                }
                style={{
                  background: "#1c1c1e",
                  color: "#fff",
                  fontSize: "0.8rem",
                }}
              >
                <option value="hide">Hide</option>
                <option value="optional">Show & Optional</option>
                <option value="show">Show</option>
              </select>
            </div>
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
