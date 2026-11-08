"use client";

import React, { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import Modal from "@/components/Modal";
import { getSignedUrl, uploadToCDN } from "@/api/events";
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
  eventId?: string;
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
  eventId: propEventId,
}: ImageModalProps) {
  const params = useParams();
  const resolvedEventId =
    propEventId || (params?.eventId as string | undefined);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const contentType = file.type || "image/jpeg";
      const {
        url: signedUrl,
        filename: cdnUrl,
        fileUrl,
      } = await getSignedUrl(file.name, contentType, {
        eventId: resolvedEventId,
        objType: "email",
      });
      const { filename } = await uploadToCDN(
        signedUrl,
        file,
        fileUrl || cdnUrl,
      );
      setImageUrl(filename);
      toast.success("Image uploaded successfully.");
    } catch (err) {
      console.error("Failed to upload image:", err);
      toast.error("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <label className={styles.formLabel}>Image Source URL *</label>
            <button
              type="button"
              className={styles.btnSecondary}
              style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Upload Image"}
            </button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            style={{ display: "none" }}
          />
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
            When set, recipients clicking this image in their email will open
            this URL.
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
            disabled={!imageUrl.trim() || isUploading}
          >
            Insert Image
          </button>
        </div>
      </div>
    </Modal>
  );
}
