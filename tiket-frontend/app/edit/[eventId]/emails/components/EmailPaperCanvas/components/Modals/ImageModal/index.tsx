"use client";

import React from "react";
import Modal from "@/components/Modal";
import styles from "./ImageModal.module.css";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  setImageUrl: (url: string) => void;
  imageLinkUrl: string;
  setImageLinkUrl: (url: string) => void;
  imageAlt: string;
  setImageAlt: (alt: string) => void;
  imageWidth: string;
  setImageWidth: (width: string) => void;
  handleInsertImage: () => void;
}

export default function ImageModal({
  isOpen,
  onClose,
  imageUrl,
  setImageUrl,
  imageLinkUrl,
  setImageLinkUrl,
  imageAlt,
  setImageAlt,
  imageWidth,
  setImageWidth,
  handleInsertImage,
}: ImageModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Insert Linked Image"
      width={480}
    >
      <div className={styles.modalContentBody}>
        <p className={styles.modalSub}>
          Embed an image graphic or banner with an optional click-through link
          destination.
        </p>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Image Source URL *</label>
          <input
            type="text"
            className={styles.formInput}
            placeholder="e.g. https://example.com/banner.png"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            autoFocus
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Click-Through Link URL (Optional)
          </label>
          <input
            type="text"
            className={styles.formInput}
            placeholder="e.g. https://example.com or {{event.url}}"
            value={imageLinkUrl}
            onChange={(e) => setImageLinkUrl(e.target.value)}
          />
          <span className={styles.inspectorInstructionText}>
            When set, recipients clicking this image in their email will open this
            URL.
          </span>
        </div>

        <div className={styles.rowTwoGrid}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Alt Description (Optional)
            </label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="e.g. Event Header Banner"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Width (Optional)</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="e.g. 100% or 300px"
              value={imageWidth}
              onChange={(e) => setImageWidth(e.target.value)}
            />
          </div>
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
            onClick={handleInsertImage}
            disabled={!imageUrl.trim()}
          >
            Insert Image
          </button>
        </div>
      </div>
    </Modal>
  );
}
