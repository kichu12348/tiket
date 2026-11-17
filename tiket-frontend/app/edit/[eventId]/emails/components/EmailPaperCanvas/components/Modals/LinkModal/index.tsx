
import React, { useState } from "react";
import { Globe, Mail, Unlink } from "lucide-react";
import Modal from "@/components/Modal";
import styles from "./LinkModal.module.css";

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  linkUrl: string;
  setLinkUrl: (url: string) => void;
  linkText?: string;
  setLinkText?: (text: string) => void;
  handleApplyLink: (urlOverride?: string, textOverride?: string) => void;
  isEditing?: boolean;
  onRemoveLink?: () => void;
}

function LinkModalForm({
  onClose,
  linkUrl,
  setLinkUrl,
  linkText,
  setLinkText,
  handleApplyLink,
  isEditing = false,
  onRemoveLink,
}: Omit<LinkModalProps, "isOpen">) {
  const isMail = linkUrl.toLowerCase().startsWith("mailto:");
  const [linkType, setLinkType] = useState<"url" | "email">(
    isMail ? "email" : "url",
  );
  const [emailDraft, setEmailDraft] = useState(
    isMail ? linkUrl.replace(/^mailto:/i, "") : "",
  );

  const onApply = () => {
    let finalUrl = linkUrl.trim();
    if (linkType === "email") {
      const cleanEmail = emailDraft.trim();
      if (cleanEmail) {
        finalUrl = cleanEmail.toLowerCase().startsWith("mailto:")
          ? cleanEmail
          : `mailto:${cleanEmail}`;
      } else {
        finalUrl = "";
      }
    }
    handleApplyLink(finalUrl, linkText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      onApply();
    }
  };

  return (
    <div className={styles.modalContentBody}>
      {/* Link Type Switcher (Web URL vs Email Address) */}
      <div className={styles.tabSwitcher}>
        <button
          type="button"
          className={styles.tabBtn}
          data-active={linkType === "url"}
          onClick={() => setLinkType("url")}
        >
          <Globe size={14} />
          <span>Web URL</span>
        </button>
        <button
          type="button"
          className={styles.tabBtn}
          data-active={linkType === "email"}
          onClick={() => setLinkType("email")}
        >
          <Mail size={14} />
          <span>Email Address</span>
        </button>
      </div>

      {linkType === "url" ? (
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>URL Address</label>
          <input
            type="text"
            className={styles.formInput}
            placeholder="https://example.com or {{event.url}}"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
      ) : (
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Email Address</label>
          <input
            type="email"
            className={styles.formInput}
            placeholder="support@tiket.com or {{organizer.email}}"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
      )}

      {setLinkText && (
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Link Text (Optional)</label>
          <input
            type="text"
            className={styles.formInput}
            placeholder={
              linkType === "email"
                ? "e.g. Contact Support"
                : "e.g. Click here to register"
            }
            value={linkText || ""}
            onChange={(e) => setLinkText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      )}

      <div className={styles.modalActions}>
        {isEditing && onRemoveLink && (
          <button
            type="button"
            className={styles.btnDanger}
            onClick={() => {
              onRemoveLink();
              onClose();
            }}
            title="Remove this hyperlink"
          >
            <Unlink size={14} />
            <span>Remove Link</span>
          </button>
        )}
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
          onClick={onApply}
        >
          {isEditing ? "Update Link" : "Apply Link"}
        </button>
      </div>
    </div>
  );
}

export default function LinkModal(props: LinkModalProps) {
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={props.isEditing ? "Edit Hyperlink" : "Insert Hyperlink"}
      width={440}
    >
      {props.isOpen && <LinkModalForm {...props} />}
    </Modal>
  );
}
