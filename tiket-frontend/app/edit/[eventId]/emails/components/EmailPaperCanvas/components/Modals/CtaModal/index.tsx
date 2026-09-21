"use client";

import React from "react";
import Modal from "@/components/Modal";
import styles from "./CtaModal.module.css";

interface CtaModalProps {
  isOpen: boolean;
  onClose: () => void;
  ctaLabel: string;
  setCtaLabel: (label: string) => void;
  ctaUrl: string;
  setCtaUrl: (url: string) => void;
  handleInsertCtaButton: () => void;
}

export default function CtaModal({
  isOpen,
  onClose,
  ctaLabel,
  setCtaLabel,
  ctaUrl,
  setCtaUrl,
  handleInsertCtaButton,
}: CtaModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Insert Call-to-Action Button"
      width={460}
    >
      <div className={styles.modalContentBody}>
        <p className={styles.modalSub}>
          Generate an inbox-optimized CTA button linking to pass or registration
          details.
        </p>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Button Text</label>
          <input
            type="text"
            className={styles.formInput}
            placeholder="e.g. View Your Digital Pass"
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Target URL / Variable</label>
          <input
            type="text"
            className={styles.formInput}
            placeholder="e.g. {{event.passUrl}} or https://..."
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
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
            onClick={handleInsertCtaButton}
            disabled={!ctaLabel.trim() || !ctaUrl.trim()}
          >
            Insert Button
          </button>
        </div>
      </div>
    </Modal>
  );
}
