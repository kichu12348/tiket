"use client";

import React from "react";
import { EmailTemplate } from "@/types/email";
import { Save, RotateCcw, Send, Users, Power, Trash2 } from "lucide-react";
import EmailRichEditor, { EmailRichEditorRef } from "../EmailRichEditor";
import styles from "./EmailEditor.module.css";

interface EmailEditorProps {
  template: EmailTemplate;
  onSave: (updated: Partial<EmailTemplate>) => Promise<void>;
  onReset: () => Promise<void>;
  onDelete?: () => Promise<void>;
  onOpenSendTest: () => void;
  onOpenSendBatch: () => void;
  isSaving: boolean;
  focusedField: "subject" | "body";
  setFocusedField: (field: "subject" | "body") => void;
  subjectRef: React.RefObject<HTMLInputElement | null>;
  richEditorRef: React.RefObject<EmailRichEditorRef | null>;
  onBodyChange?: (body: string) => void;
}

export default function EmailEditor({
  template,
  onSave,
  onReset,
  onDelete,
  onOpenSendTest,
  onOpenSendBatch,
  isSaving,
  setFocusedField,
  subjectRef,
  richEditorRef,
}: EmailEditorProps) {
  const [name, setName] = React.useState(template.name);
  const [subject, setSubject] = React.useState(template.subject);
  const [body, setBody] = React.useState(template.body);
  const [isActive, setIsActive] = React.useState(template.isActive);

  // Sync internal state when template changes
  React.useEffect(() => {
    setName(template.name);
    setSubject(template.subject);
    setBody(template.body);
    setIsActive(template.isActive);
  }, [template]);

  const handleSave = async (e: React.SubmitEvent) => {
    e.preventDefault();
    await onSave({ name, subject, body, isActive });
  };

  return (
    <form className={styles.card} onSubmit={handleSave}>
      <div className={styles.header}>
        <div className={styles.titleCol}>
          <div className={styles.nameRow}>
            <input
              type="text"
              className={styles.nameInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template Name"
              required
            />
            <span className={styles.typeTag} data-type={template.type}>
              {template.type}
            </span>
          </div>
          <p className={styles.subtitle}>
            Compose and visually format automated or broadcast email templates
            for your attendees.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.toggleActiveBtn}
            data-active={isActive}
            onClick={() => setIsActive(!isActive)}
            title={isActive ? "Disable Template" : "Enable Template"}
          >
            <Power size={14} />
            <span>{isActive ? "Active" : "Inactive"}</span>
          </button>
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Email Subject</label>
        <input
          ref={subjectRef as any}
          type="text"
          className={styles.input}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onFocus={() => setFocusedField("subject")}
          placeholder="e.g. Your Ticket Confirmation for {{event.title}}"
          required
        />
      </div>

      <div className={styles.fieldGroup}>
        <div className={styles.labelRow}>
          <label className={styles.label}>Visual Email Editor</label>
          <span className={styles.hint}>WYSIWYG Rich Editor</span>
        </div>

        <div onClick={() => setFocusedField("body")}>
          {body && (
            <EmailRichEditor
              ref={richEditorRef}
              value={body}
              onChange={(html) => setBody(html)}
            />
          )}
        </div>
      </div>

      <div className={styles.footerBar}>
        <div className={styles.leftFooterActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={onReset}
            title="Reset template to system defaults"
          >
            <RotateCcw size={14} />
            <span>Reset Default</span>
          </button>

          {template.type === "custom" && onDelete && (
            <button
              type="button"
              className={styles.btnDanger}
              onClick={onDelete}
              title="Delete Custom Template"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          )}
        </div>

        <div className={styles.rightFooterActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={onOpenSendTest}
          >
            <Send size={14} />
            <span>Send Test</span>
          </button>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={onOpenSendBatch}
          >
            <Users size={14} />
            <span>Send Blast</span>
          </button>

          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={isSaving}
          >
            <Save size={16} />
            <span>{isSaving ? "Saving..." : "Save Template"}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
