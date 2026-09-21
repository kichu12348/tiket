"use client";

import { useState, useEffect } from "react";
import { getFormFields, createFormField, updateFormField, deleteFormField } from "@/api/forms";
import { FormField } from "@/types/form";
import { toast } from "sonner";
import { Plus, Edit2, Trash2 } from "lucide-react";
import Modal from "@/components/Modal";
import Switch from "@/components/Switch";
import Dropdown from "@/components/Dropdown";
import styles from "./RegistrationFormPanel.module.css";

interface Props {
  eventId: string;
}

const FIELD_TYPES = [
  { label: "Short Text", value: "text" },
  { label: "Email", value: "email" },
  { label: "Number", value: "number" },
  { label: "Select (Dropdown)", value: "select" },
  { label: "Checkbox", value: "checkbox" },
  { label: "Date", value: "date" },
];

export default function RegistrationFormPanel({ eventId }: Props) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<"text" | "email" | "number" | "select" | "checkbox" | "date">("text");
  const [isRequired, setIsRequired] = useState(false);
  const [optionsStr, setOptionsStr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchFields();
  }, [eventId]);

  const fetchFields = async () => {
    try {
      setIsLoading(true);
      const data = await getFormFields(eventId);
      setFields(data?.sort((a, b) => a.sortOrder - b.sortOrder) || []);
    } catch (error) {
      console.error("Failed to fetch form fields", error);
      toast.error("Failed to load registration form fields.");
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (field?: FormField) => {
    if (field) {
      setEditingId(field.id);
      setName(field.name);
      setLabel(field.label);
      setFieldType(field.fieldType);
      setIsRequired(field.isRequired);
      setOptionsStr(field.options?.join(", ") || "");
    } else {
      setEditingId(null);
      setName("");
      setLabel("");
      setFieldType("text");
      setIsRequired(false);
      setOptionsStr("");
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !label.trim()) {
      toast.error("Internal Name and Label are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const optionsArray = fieldType === "select" && optionsStr.trim()
        ? optionsStr.split(",").map(s => s.trim()).filter(Boolean)
        : null;

      const payload = {
        name,
        label,
        fieldType,
        isRequired,
        options: optionsArray,
        sortOrder: editingId ? fields.find(f => f.id === editingId)?.sortOrder || 0 : fields.length,
      };

      if (editingId) {
        await updateFormField(eventId, editingId, payload);
        toast.success("Field updated.");
      } else {
        await createFormField(eventId, payload);
        toast.success("Field created.");
      }
      setIsModalOpen(false);
      fetchFields();
    } catch (error) {
      console.error("Failed to save field", error);
      toast.error("Failed to save field.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (fieldId: string) => {
    if (!window.confirm("Are you sure you want to delete this field?")) return;
    try {
      await deleteFormField(eventId, fieldId);
      toast.success("Field deleted.");
      fetchFields();
    } catch (error) {
      console.error("Failed to delete field", error);
      toast.error("Failed to delete field.");
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading form fields...</div>;
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Registration Form</h3>
        <button className={styles.addBtn} onClick={() => openModal()}>
          <Plus size={16} />
          <span>Add Field</span>
        </button>
      </div>

      <div className={styles.list}>
        {fields.length === 0 ? (
          <div className={styles.empty}>No custom fields added yet. Default Name and Email will be collected.</div>
        ) : (
          fields.map((field) => (
            <div key={field.id} className={styles.fieldCard}>
              <div className={styles.fieldInfo}>
                <div className={styles.fieldHeader}>
                  <span className={styles.fieldLabel}>{field.label}</span>
                  {field.isRequired && <span className={styles.requiredBadge}>Required</span>}
                </div>
                <div className={styles.fieldMeta}>
                  Type: {FIELD_TYPES.find(t => t.value === field.fieldType)?.label || field.fieldType}
                  {field.fieldType === 'select' && field.options && ` • Options: ${field.options.length}`}
                </div>
              </div>
              <div className={styles.fieldActions}>
                <button className={styles.iconBtn} onClick={() => openModal(field)}>
                  <Edit2 size={16} />
                </button>
                <button className={styles.iconBtnDanger} onClick={() => handleDelete(field.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Field" : "Add Field"}>
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label>Label (Shown to Attendee)</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. T-Shirt Size"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Internal Name (API Key)</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. t_shirt_size"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Field Type</label>
            <Dropdown
              options={FIELD_TYPES}
              value={fieldType}
              onChange={(val) => setFieldType(val as any)}
            />
          </div>
          {fieldType === 'select' && (
            <div className={styles.formGroup}>
              <label>Options (Comma separated)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Small, Medium, Large"
                value={optionsStr}
                onChange={(e) => setOptionsStr(e.target.value)}
              />
            </div>
          )}
          <div className={styles.formRow}>
            <label>Required Field</label>
            <Switch checked={isRequired} onChange={setIsRequired} />
          </div>
          <button className={styles.saveBtn} onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Field"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
