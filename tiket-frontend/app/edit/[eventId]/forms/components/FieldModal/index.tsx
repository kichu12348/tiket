import React, { useState, useEffect, useRef } from "react";
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
import { LocalField, FieldType, FIELD_TYPES } from "../../types";
import styles from "./FieldModal.module.css";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  initialField?: LocalField | null;
  onSave: (field: Omit<LocalField, "isEditing" | "localId">) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <Type size={18} />,
  long_text: <AlignLeft size={18} />,
  email: <Mail size={18} />,
  phone: <Phone size={18} />,
  single_select: <ChevronDown size={18} />,
  multi_select: <List size={18} />,
  radio: <CircleDot size={18} />,
  checkbox: <CheckSquare size={18} />,
  number: <Hash size={18} />,
  datetime: <CalendarClock size={18} />,
  date: <Calendar size={18} />,
  time: <Clock size={18} />,
  rating: <Star size={18} />,
  url: <Link size={18} />,
  select: <List size={18} />,
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  text: "Ask for a free-form response",
  long_text: "Ask for a multi-line response",
  email: "Ask for an email address",
  phone: "Ask for a phone number",
  single_select: "Let the guest choose one option from a list",
  multi_select: "Let the guest choose multiple options",
  radio: "Let the guest choose one option via radio buttons",
  checkbox: "Ask guests to check a box",
  number: "Ask for a numerical value",
  datetime: "Ask guests for a specific date and time",
  date: "Ask guests for a specific date",
  time: "Ask guests for a specific time",
  rating: "Ask guests for a rating out of 5",
  url: "Ask guests for a website link",
  select: "Let the guest choose from a list of options",
};

export default function FieldModal({
  isOpen,
  onClose,
  mode,
  initialField,
  onSave,
  onDelete,
}: Props) {
  const [step, setStep] = useState<"type" | "details">("type");
  const [fieldType, setFieldType] = useState<FieldType>("text");
  const [label, setLabel] = useState("");
  const [isRequired, setIsRequired] = useState(false);

  const [options, setOptions] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const [minOptions, setMinOptions] = useState<number | "">(0);
  const [maxOptions, setMaxOptions] = useState<number | "">("");

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const optionSetRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && initialField) {
        setStep("details");
        setFieldType(initialField.fieldType);
        setLabel(initialField.label);
        setIsRequired(initialField.isRequired);
        setOptions(initialField.options || []);
        optionSetRef.current = new Set(initialField.options || []);
        setMinOptions(initialField.minOptions ?? 0);
        setMaxOptions(initialField.maxOptions ?? "");
      } else {
        setStep("type");
        setFieldType("text");
        setLabel("");
        setIsRequired(false);
        setOptions([]);
        optionSetRef.current = new Set();
        setTagInput("");
        setIsBulkAdding(false);
        setIsDraggingFile(false);
        setMinOptions(0);
        setMaxOptions("");
      }
    }
  }, [isOpen, mode, initialField]);

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
    // reset input so the same file can be selected again
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
    const needsOptions = [
      "single_select",
      "multi_select",
      "radio",
      "select",
    ].includes(fieldType);
    if (needsOptions && options.length === 0) {
      toast.error("At least one option is required.");
      return;
    }

    setIsSaving(true);
    try {
      const finalName =
        initialField?.name || label.toLowerCase().replace(/\s+/g, "_");

      let finalMin = typeof minOptions === "number" ? minOptions : null;
      let finalMax = typeof maxOptions === "number" ? maxOptions : null;

      if (fieldType === "multi_select") {
        if (finalMin !== null && finalMax !== null && finalMin > finalMax) {
          toast.error("Minimum selections cannot exceed maximum.");
          setIsSaving(false);
          return;
        }
      } else {
        finalMin = null;
        finalMax = null;
      }

      await onSave({
        name: finalName,
        label: label.trim(),
        fieldType,
        isRequired,
        options: needsOptions ? options : null,
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
        }
      }
    );
  };

  useEffect(() => {
    if (fieldType === "multi_select" && options.length > 0) {
      if (maxOptions !== "" && Number(maxOptions) > options.length) {
        setMaxOptions(options.length);
      }
      if (minOptions !== "" && Number(minOptions) > options.length) {
        setMinOptions(options.length);
      }
    }
  }, [options.length, maxOptions, minOptions, fieldType]);

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
              multiple
            />
          </div>

          {["single_select", "multi_select", "radio", "select"].includes(
            fieldType,
          ) && (
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

              <div className={`${styles.expandableContainer} ${isBulkAdding ? styles.expanded : ""}`}>
                <div className={styles.expandableInner}>
                  <div
                    className={`${styles.fileDropzone} ${isDraggingFile ? styles.dragOver : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={20} className={styles.uploadIcon} />
                    <p>Click or drag a CSV or JSON file here to import options</p>
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

              <div className={`${styles.expandableContainer} ${!isBulkAdding ? styles.expanded : ""}`}>
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
                          e.target.value ? parseInt(e.target.value) : "",
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
                          e.target.value ? parseInt(e.target.value) : "",
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
