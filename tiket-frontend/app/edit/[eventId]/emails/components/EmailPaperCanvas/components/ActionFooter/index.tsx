"use client";

import React from "react";
import { RotateCcw, Trash2, Send, Users, Save } from "lucide-react";
import styles from "./ActionFooter.module.css";

interface ActionFooterProps {
  templateType: string;
  onReset: () => Promise<void>;
  onDelete?: () => Promise<void>;
  onOpenSendTest: () => void;
  onOpenSendBatch: () => void;
  isSaving: boolean;
}

export default function ActionFooter({
  templateType,
  onReset,
  onDelete,
  onOpenSendTest,
  onOpenSendBatch,
  isSaving,
}: ActionFooterProps) {
  return (
    <div className={styles.actionFooter}>
      <div className={styles.leftActions}>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={onReset}
          title="Reset template to system default email layout"
        >
          <RotateCcw size={14} />
          <span>Reset Default</span>
        </button>

        {templateType === "custom" && onDelete && (
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

      <div className={styles.rightActions}>
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
  );
}
