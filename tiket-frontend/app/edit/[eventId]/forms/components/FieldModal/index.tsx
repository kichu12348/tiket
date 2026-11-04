import React, { useState, useRef } from "react";
import {
  ChevronLeft,
  Type,
  AlignLeft,
  List,
  CheckSquare,
  Calendar,
  Mail,
  Hash,
  X,
  Trash2,
  Phone,
  ChevronDown,
  CircleDot,
  CalendarClock,
  Star,
  Clock,
  Link,
  Upload,
} from "lucide-react";
import Modal from "@/components/Modal";
import { confirm } from "@/components/ConfirmModal";
import Switch from "@/components/Switch";
import type { LocalField, FieldType } from "../../types";
import { FIELD_TYPES } from "../../types";
import {
  isChoiceField,
  isMultiChoiceField,
} from "../../functions/formHelpers";
import styles from "./FieldModal.module.css";
import { toast } from "sonner";
import type { ConditionRule, FieldConditionConfig } from "@/types/form";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  initialField?:
    | (LocalField & { conditions?: FieldConditionConfig | null })
    | null;
  onSave: (
    field: Omit<LocalField, "isEditing" | "localId"> & {
      conditions?: FieldConditionConfig | null;
    },
  ) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <Type size={18} />,
  long_text: <AlignLeft size={18} />,
  email: <Mail size={18} />,
  phone: <Phone size={18} />,
  number: <Hash size={18} />,
  single_select: <ChevronDown size={18} />,
  multi_select: <List size={18} />,
  select: <List size={18} />,
  radio: <CircleDot size={18} />,
  checkbox: <CheckSquare size={18} />,
  date: <Calendar size={18} />,
  datetime: <CalendarClock size={18} />,
  time: <Clock size={18} />,
  rating: <Star size={18} />,
  url: <Link size={18} />,
  file: <Upload size={18} />,
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  text: "Ask for a free-form response",
  long_text: "Ask for a multi-line response",
  email: "Ask for an email address",
  phone: "Ask for a phone number",
  number: "Ask for a numerical value",
  single_select: "Let the guest choose one option from a list",
  multi_select: "Let the guest choose multiple options",
  select: "Let the guest choose from a dropdown list",
  radio: "Let the guest choose one option via radio buttons",
  checkbox: "Ask guests to check one or more boxes",
  date: "Ask guests for a specific date",
  datetime: "Ask guests for a specific date and time",
  time: "Ask guests for a specific time",
  rating: "Ask guests for a rating out of 5",
  url: "Ask guests for a website link",
  file: "Collect a private registration file",
};

function FieldModalContent({
  isOpen,
  onClose,
  mode,
  initialField,
  onSave,
  onDelete,
}: Props) {
  const [step, setStep] = useState<"type" | "details">(
    mode === "edit" ? "details" : "type",
  );
  const [fieldType, setFieldType] = useState<FieldType>(
    initialField?.fieldType ?? "text",
  );
  const [label, setLabel] = useState(initialField?.label ?? "");
  const [isRequired, setIsRequired] = useState(
    initialField?.isRequired ?? false,
  );

  const [options, setOptions] = useState<string[]>(initialField?.options ?? []);
  const [tagInput, setTagInput] = useState("");
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const [minOptions, setMinOptions] = useState<number | "">(
    typeof initialField?.minOptions === "number" ? initialField.minOptions : "",
  );
  const [maxOptions, setMaxOptions] = useState<number | "">(
    typeof initialField?.maxOptions === "number" ? initialField.maxOptions : "",
  );

  const initialConditions =
    (initialField as unknown as { conditions?: FieldConditionConfig | null })
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
  const tagInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const optionSetRef = useRef<Set<string>>(
    new Set(initialField?.options ?? []),
  );

  const isChoice = isChoiceField(fieldType);
  const isMulti = isMultiChoiceField(fieldType);

  const handleTypeSelect = (type: FieldType) => {
    setFieldType(type);
    setStep("details");
  };

  const processFileContent = (content: string) => {
    let newOptions: string[] = [];
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        newOptions = parsed.map(String);
      } else {
        throw new Error("Not an array");
      }
    } catch {
      newOptions = content
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (newOptions.length > 0) {
      const addedOptions: string[] = [];
      newOptions.forEach((opt) => {
        if (!optionSetRef.current.has(opt)) {
          optionSetRef.current.add(opt);
          addedOptions.push(opt);
        }
      });

      if (addedOptions.length > 0) {
        setOptions((prev) => [...prev, ...addedOptions]);
        setIsBulkAdding(false);
        toast.success(`Added ${addedOptions.length} new options.`);
      } else {
        toast.error("No valid options found to add or all were duplicates.");
      }
    } else {
      toast.error("No valid options found to add.");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      readFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      readFile(e.target.files[0]);
    }
    e.target.value = "";
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        processFileContent(event.target.result as string);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read file.");
    };
    reader.readAsText(file);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const val = tagInput.trim();
      if (val && !optionSetRef.current.has(val)) {
        optionSetRef.current.add(val);
        setOptions([...options, val]);
        setTagInput("");
      } else if (val) {
        toast.error("Option already exists.");
      }
    } else if (e.key === "Backspace" && tagInput === "" && options.length > 0) {
      e.preventDefault();
      const lastIndex = options.length - 1;
      const optToRemove = options[lastIndex];
      optionSetRef.current.delete(optToRemove);
      setOptions(options.slice(0, lastIndex));
    }
  };

  const removeTag = (index: number) => {
    const optToRemove = options[index];
    optionSetRef.current.delete(optToRemove);
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!label.trim()) {
      toast.error("Question text is required.");
      return;
    }

    const validOptions = options.map((s) => s.trim()).filter(Boolean);

    if (isChoice && validOptions.length === 0) {
      toast.error("At least one option is required.");
      return;
    }

    let finalMin = typeof minOptions === "number" ? minOptions : null;
    let finalMax = typeof maxOptions === "number" ? maxOptions : null;

    if (isMulti) {
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
      if (finalMin !== null && finalMin > validOptions.length) {
        toast.error("Minimum selections cannot exceed the number of options.");
        return;
      }
      if (finalMax !== null && finalMax > validOptions.length) {
        toast.error("Maximum selections cannot exceed the number of options.");
        return;
      }
    } else {
      finalMin = null;
      finalMax = null;
    }

    setIsSaving(true);
    try {
      const finalName =
        initialField?.name || label.toLowerCase().replace(/\s+/g, "_");

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
        name: finalName,
        label: label.trim(),
        fieldType,
        isRequired,
        options: isChoice ? validOptions : null,
        conditions: conditionsConfig,
        minOptions: finalMin,
        maxOptions: finalMax,
        sortOrder: initialField?.sortOrder || 0,
        page: initialField?.page || 1,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!onDelete) return;

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
            onClose();
          } finally {
            setIsDeleting(false);
          }
        },
      },
    );
  };

  if (!isOpen) return null;

  const typeConfig = FIELD_TYPES.find((t) => t.value === fieldType);

  const leftAction =
    step === "details" && mode === "add" ? (
      <button className={styles.backBtn} onClick={() => setStep("type")}>
        <ChevronLeft size={18} />
      </button>
    ) : undefined;

  const title =
    step === "type"
      ? "Add Question"
      : mode === "add"
        ? "Add Question"
        : "Edit Question";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      leftAction={leftAction}
      width={465}
      className={styles.modalContent}
    >
      {step === "type" ? (
        <>
          <p className={styles.modalSubtitle}>
            Ask guests custom questions when they register.
          </p>
          <div className={styles.typeGrid}>
            {FIELD_TYPES.map((type) => (
              <button
                key={type.value}
                className={styles.typeBtn}
                onClick={() => handleTypeSelect(type.value as FieldType)}
              >
                <div className={styles.typeIcon}>
                  {TYPE_ICONS[type.value] || <Type size={18} />}
                </div>
                {type.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.formBody}>
          {/* Type summary card */}
          <div className={styles.selectedTypeCard}>
            <div className={styles.selectedTypeIcon}>
              {TYPE_ICONS[fieldType] || <Type size={20} />}
            </div>
            <div className={styles.selectedTypeText}>
              <h3>{typeConfig?.label}</h3>
              <p>{TYPE_DESCRIPTIONS[fieldType] || "Custom question"}</p>
            </div>
          </div>

          {/* Question input */}
          <div className={styles.formGroup}>
            <label>Question</label>
            <input
              type="text"
              className={styles.input}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoFocus
            />
          </div>

          {isChoice && (
            <div className={styles.formGroup}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <label style={{ margin: 0 }}>Options</label>
                <button
                  type="button"
                  className={styles.bulkAddBtn}
                  onClick={() => setIsBulkAdding(!isBulkAdding)}
                >
                  {isBulkAdding ? "Done" : "Bulk Add"}
                </button>
              </div>

              <div
                className={`${styles.expandableContainer} ${isBulkAdding ? styles.expanded : ""}`}
              >
                <div className={styles.expandableInner}>
                  <div
                    className={`${styles.fileDropzone} ${isDraggingFile ? styles.dragOver : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={20} className={styles.uploadIcon} />
                    <p>
                      Click or drag a CSV or JSON file here to import options
                    </p>
                    <input
                      type="file"
                      accept=".csv,.json,.txt"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      onChange={handleFileSelect}
                    />
                  </div>
                </div>
              </div>

              <div
                className={`${styles.expandableContainer} ${!isBulkAdding ? styles.expanded : ""}`}
              >
                <div className={styles.expandableInner}>
                  <div
                    className={styles.tagInputWrapper}
                    onClick={() => tagInputRef.current?.focus()}
                  >
                    {options.map((opt, i) => (
                      <span key={i} className={styles.tag}>
                        {opt}
                        <button
                          className={styles.removeTagBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTag(i);
                          }}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <input
                      ref={tagInputRef}
                      type="text"
                      className={styles.tagInput}
                      placeholder={options.length === 0 ? "Add options" : ""}
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                    />
                  </div>
                  <p className={styles.hint}>
                    Press Enter or Tab key to add a new option.
                  </p>
                </div>
              </div>

              {isMulti && (
                <div
                  style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}
                >
                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label style={{ fontSize: "0.85rem" }}>
                      Min Selections
                    </label>
                    <input
                      type="number"
                      className={styles.input}
                      min={0}
                      max={options.length}
                      placeholder="No min"
                      value={minOptions}
                      onChange={(e) =>
                        setMinOptions(
                          e.target.value ? parseInt(e.target.value, 10) : "",
                        )
                      }
                    />
                  </div>
                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label style={{ fontSize: "0.85rem" }}>
                      Max Selections
                    </label>
                    <input
                      type="number"
                      className={styles.input}
                      min={1}
                      max={options.length}
                      placeholder="No max"
                      value={maxOptions}
                      onChange={(e) =>
                        setMaxOptions(
                          e.target.value ? parseInt(e.target.value, 10) : "",
                        )
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Required toggle */}
          <div className={styles.switchRow}>
            <span>Required</span>
            <Switch checked={isRequired} onChange={setIsRequired} />
          </div>

          {/* Conditional Logic (If / Then / Else) */}
          <div className={styles.switchRow}>
            <span>Conditional Logic (If / Then / Else)</span>
            <Switch checked={hasConditions} onChange={setHasConditions} />
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
                marginBottom: "0.5rem",
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
                className={styles.bulkAddBtn}
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
                style={{ alignSelf: "flex-start", marginTop: "0.25rem" }}
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

          {/* Submit + Delete */}
          <div className={styles.footer}>
            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={isSaving || isDeleting}
            >
              {isSaving
                ? "Saving..."
                : mode === "add"
                  ? "Add Question"
                  : "Save Changes"}
            </button>
            {mode === "edit" && onDelete && (
              <button
                className={styles.deleteBtn}
                onClick={handleDeleteClick}
                disabled={isDeleting || isSaving}
                title="Delete Question"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function FieldModal(props: Props) {
  return props.isOpen ? (
    <FieldModalContent key={props.initialField?.localId ?? "new"} {...props} />
  ) : null;
}
