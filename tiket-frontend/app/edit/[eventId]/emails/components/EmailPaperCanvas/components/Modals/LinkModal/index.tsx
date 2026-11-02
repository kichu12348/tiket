"use client";

import React from "react";
import Modal from "@/components/Modal";
import styles from "./LinkModal.module.css";

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  linkUrl: string;
  setLinkUrl: (url: string) => void;
  linkText?: string;
  setLinkText?: (text: string) => void;
  handleApplyLink: () => void;
}

export default function LinkModal({
  isOpen,
  onClose,
  linkUrl,
  setLinkUrl,
  linkText,
  setLinkText,
  handleApplyLink,
}: LinkModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Insert Hyperlink"
      width={420}
    >
      <div className={styles.modalContentBody}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>URL Address</label>
          <input
            type="text"
            className={styles.formInput}
            placeholder="https://example.com or {{event.url}}"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            autoFocus
          />
        </div>

        {setLinkText && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Link Text (Optional)</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="e.g. Click here to register"
              value={linkText || ""}
              onChange={(e) => setLinkText(e.target.value)}
            />
          </div>
        )}

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleApplyLink}
          >
            Apply Link
          </button>
        </div>
      </div>
    </Modal>
  );
}
