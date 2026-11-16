"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import type { EmailLog } from "@/types/email";
import { Mail, X, CheckCircle2 } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import {
  getTemplateTypeLabel,
  formatDateTime,
  formatTimeOnly,
} from "../../functions/formatLogValues";
import styles from "./SentEmailPreviewModal.module.css";

interface SentEmailPreviewModalProps {
  log: EmailLog | null;
  onClose: () => void;
}

export default function SentEmailPreviewModal({
  log,
  onClose,
}: SentEmailPreviewModalProps) {
  useEffect(() => {
    if (!log) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [log, onClose]);

  if (typeof document === "undefined" || !log) return null;

  const typeName = getTemplateTypeLabel(log.templateType);

  return createPortal(
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={styles.modalDialog}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleBox}>
            <Mail size={18} className={styles.modalHeaderIcon} />
            <h3 className={styles.modalTitle}>Sent Email HTML Preview</h3>
          </div>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            aria-label="Close Preview"
          >
            <X size={18} />
          </button>
        </div>

        {/* Email Meta Bar */}
        <div className={styles.modalMetaBar}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>To:</span>
            <span className={styles.metaValue}>
              {log.recipientName
                ? `${log.recipientName} <${log.recipientEmail}>`
                : log.recipientEmail}
            </span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Subject:</span>
            <span className={styles.metaValue}>{log.subject}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Type:</span>
            <span className={styles.typeBadge}>{typeName}</span>
            <span className={styles.metaDivider}>•</span>
            <span className={styles.metaLabel}>Sent:</span>
            <span className={styles.metaTime}>
              {formatDateTime(log.sentAt)}
            </span>
            {log.openedAt && (
              <>
                <span className={styles.metaDivider}>•</span>
                <span className={styles.openedBadge}>
                  <CheckCircle2 size={12} />
                  <span>
                    Opened at {formatTimeOnly(log.openedAt)} ({log.openCount || 1}x)
                  </span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Rendered Email Body in sandboxed iframe */}
        <div className={styles.modalBodyWrapper}>
          <iframe
            title="Sent Email Preview"
            srcDoc={DOMPurify.sanitize(
              log.renderedBody || log.subject,
            )}
            sandbox="allow-same-origin"
            className={styles.previewIframe}
          />
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.btnCloseModal}
            onClick={onClose}
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
