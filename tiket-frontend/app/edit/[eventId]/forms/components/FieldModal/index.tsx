import React, { useState, useRef } from "react";
import {
  ChevronLeft,
  Type,
  AlignLeft,
  List,
  Calendar,
  Mail,
  Hash,
  X,
  Trash2,
  Phone,
  ChevronDown,
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
import { isChoiceField } from "../../functions/formHelpers";
import styles from "./FieldModal.module.css";
import { toast } from "sonner";
import type {
  FormField,
  VisibilityConditionRule,
  VisibilityConditionsConfig,
  VisibilityConditions,
  VisibilityConditionOperator,
  FieldConditionConfig,
} from "@/types/form";
import ConditionBuilder from "@/components/ConditionBuilder";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  initialField?:
    | (LocalField & { conditions?: VisibilityConditions | FieldConditionConfig | null })
    | null;
  availableFields?: (LocalField | FormField)[];
  onSave: (
    field: Omit<LocalField, "isEditing" | "localId"> & {
      conditions?: VisibilityConditions | FieldConditionConfig | null;
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
  date: <Calendar size={18} />,
  datetime: <CalendarClock size={18} />,
  time: <Clock size={18} />,
  rating: <Star size={18} />,
  url: <Link size={18} />,
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  text: "Ask for a free-form response",
  long_text: "Ask for a multi-line response",
  email: "Ask for an email address",
  phone: "Ask for a phone number",
  number: "Ask for a numerical value",
  single_select: "Let the guest choose one option from a dropdown",
  multi_select: "Let the guest choose from a list of options",
  date: "Ask guests for a specific date",
  datetime: "Ask guests for a specific date and time",
  time: "Ask guests for a specific time",
  rating: "Ask guests for a rating out of 5",
  url: "Ask guests for a website link",
};

function FieldModalContent({
  isOpen,
  onClose,
  mode,
  initialField,
  availableFields = [],
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
  const [allowCustom, setAllowCustom] = useState<boolean>(
    Boolean(initialField?.allowCustom),
  );
  const [isMulti, setIsMulti] = useState<boolean>(() => {
    if (typeof initialField?.isMulti === "boolean") return initialField.isMulti;
    if (initialField?.fieldType === "multi_select") return true;
    return false;
  });

  const initialConditions =
    (initialField as unknown as {
      conditions?: VisibilityConditions | FieldConditionConfig | null;
    })?.conditions ?? null;

  const [hasConditions, setHasConditions] = useState(() => {
    if (!initialConditions) return false;
    if (Array.isArray(initialConditions)) return initialConditions.length > 0;
    return Boolean(initialConditions.rules && initialConditions.rules.length > 0);
  });

  const [conditions, setConditions] = useState<VisibilityConditionsConfig>(() => {
    if (!initialConditions) return { match: "all", rules: [] };
    if (Array.isArray(initialConditions)) {
      return {
        match: "all",
        rules: initialConditions.map((r) => ({
          fieldId: r.fieldId,
          operator: r.operator ?? (r.allowedValues.length > 1 ? "in" : "equals"),
          allowedValues: r.allowedValues,
        })),
      };
    }
    if ("rules" in initialConditions && Array.isArray(initialConditions.rules)) {
      const match = (initialConditions.match as "all" | "any") ?? "all";
      return {
        match,
        rules: initialConditions.rules.map((r) => {
          if ("fieldId" in r) {
            const vr = r as VisibilityConditionRule;
            return {
              fieldId: vr.fieldId,
              operator: vr.operator ?? (vr.allowedValues.length > 1 ? "in" : "equals"),
              allowedValues: vr.allowedValues,
            };
          }
          const legacyR = r as unknown as { sourceId: string; value?: unknown; operator?: string };
          return {
            fieldId: legacyR.sourceId,
            operator: (legacyR.operator as VisibilityConditionOperator) ?? "equals",
            allowedValues: Array.isArray(legacyR.value)
              ? (legacyR.value as string[])
              : legacyR.value
                ? [String(legacyR.value)]
                : [],
          };
        }),
      };
    }
    return { match: "all", rules: [] };
  });

  const normalizedAvailableFields: FormField[] = (availableFields || []).map(
    (f) => {
      const isFormField = "options" in f && !Array.isArray(f.options);
      return {
        id: (f as LocalField).serverId || (f as LocalField).localId || (f as FormField).id,
        eventId: (f as FormField).eventId || "",
        name: f.name,
        label: f.label,
        fieldType: f.fieldType,
        isRequired: f.isRequired,
        options: isFormField ? (f as FormField).options : f.options,
        sortOrder: f.sortOrder || 0,
        page: f.page || 1,
        createdAt: (f as FormField).createdAt || "",
      };
    },
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const optionSetRef = useRef<Set<string>>(
    new Set(initialField?.options ?? []),
  );

  const isChoice = isChoiceField(fieldType);

  const handleTypeSelect = (type: FieldType) => {
    setFieldType(type);
    if (type === "multi_select" && initialField?.isMulti === undefined) {
      setIsMulti(false);
    }
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

    if (fieldType === "multi_select" && isMulti) {
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

      let conditionsConfig: VisibilityConditionsConfig | null = null;
      if (hasConditions) {
        const validRules = conditions.rules.filter(
          (r) => r.fieldId.trim() && r.allowedValues.length > 0,
        );
        if (validRules.length > 0) {
          conditionsConfig = {
            match: conditions.match || "all",
            rules: validRules,
          };
        }
      }

      await onSave({
        name: finalName,
        label: label.trim(),
        fieldType,
        isRequired,
        options: isChoice ? validOptions : null,
        allowCustom: isChoice ? allowCustom : false,
        isMulti: fieldType === "multi_select" ? isMulti : undefined,
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
      headerClassName={styles.modalHeaderStyle}
      withoutPadding
    >
      {step === "type" ? (
        <div className={styles.typeStepWrapper}>
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
        </div>
      ) : (
        <div className={styles.detailsContainer}>
          <div className={`${styles.modalScrollWrapper} scrollbar`}>
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

              {fieldType === "multi_select" && (
                <div className={styles.switchRow} style={{ marginTop: "0.5rem" }}>
                  <span>Multi Select</span>
                  <Switch checked={isMulti} onChange={setIsMulti} />
                </div>
              )}

              {fieldType === "multi_select" && isMulti && (
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

              <div className={styles.switchRow} style={{ marginTop: "0.5rem" }}>
                <span>Allow Custom Answer</span>
                <Switch checked={allowCustom} onChange={setAllowCustom} />
              </div>
            </div>
          )}

          {/* Required toggle */}
          <div className={styles.switchRow}>
            <span>Required</span>
            <Switch checked={isRequired} onChange={setIsRequired} />
          </div>

          {/* Visibility Conditions */}
          <div className={styles.switchRow}>
            <span>Visibility Rules</span>
            <Switch checked={hasConditions} onChange={setHasConditions} />
          </div>

          {hasConditions && (
            <div className={styles.conditionSection}>
              <ConditionBuilder
                conditions={conditions}
                onChange={setConditions}
                availableFields={normalizedAvailableFields.filter(
                  (f) =>
                    f.id !==
                    (initialField?.serverId || initialField?.localId),
                )}
              />
            </div>
          )}
            </div>
          </div>

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
