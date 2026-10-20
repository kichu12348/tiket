"use client";

import React from "react";
import Modal from "@/components/Modal";
import styles from "./LinkModal.module.css";

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  linkUrl: string;
  setLinkUrl: (url: string) => void;
  handleApplyLink: () => void;
}

export default function LinkModal({
  isOpen,
  onClose,
  linkUrl,
  setLinkUrl,
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
            type="url"
            className={styles.formInput}
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            autoFocus
          />
        </div>

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
