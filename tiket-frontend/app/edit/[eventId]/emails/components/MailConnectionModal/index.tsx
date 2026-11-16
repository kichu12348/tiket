"use client";

import { createPortal } from "react-dom";
import { X, Send, Trash2 } from "lucide-react";
import Switch from "@/components/Switch";
import { Input } from "@/components/ui/input";
import { useMailConnection } from "@/hooks/useMailConnection";
import type { SmtpConfigSummary } from "@/types/email";
import styles from "./MailConnectionModal.module.css";

export interface MailConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  isCustom?: boolean;
  initialConfig?: SmtpConfigSummary | null;
  onStatusChange?: (isCustom: boolean) => void;
}

function MailConnectionModalContent({
  onClose,
  eventId,
  isCustom = false,
  initialConfig,
  onStatusChange,
}: Omit<MailConnectionModalProps, "isOpen">) {
  const {
    host,
    setHost,
    port,
    setPort,
    username,
    setUsername,
    password,
    setPassword,
    fromName,
    setFromName,
    fromEmail,
    setFromEmail,
    secure,
    setSecure,
    testRecipient,
    setTestRecipient,
    isSaving,
    isTesting,
    isRemoving,
    handleSave,
    handleSendTest,
    handleRemove,
  } = useMailConnection({
    eventId,
    initialConfig,
    onStatusChange,
    onClose,
  });

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mail-connection-title"
    >
      <div className={styles.modalShell} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 id="mail-connection-title" className={styles.modalTitle}>
            Custom SMTP Connection
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className={`${styles.modalBody} scrollbar`}>
          {/* Host & Port */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`sm:col-span-2 ${styles.formGroup}`}>
              <label htmlFor="smtp-host" className={styles.label}>
                SMTP Host
              </label>
              <Input
                id="smtp-host"
                type="text"
                placeholder="smtp.yourdomain.com"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="!rounded-[var(--radius-md)]"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="smtp-port" className={styles.label}>
                SMTP Port
              </label>
              <Input
                id="smtp-port"
                type="number"
                placeholder="587"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="!rounded-[var(--radius-md)]"
              />
            </div>
          </div>

          {/* Username */}
          <div className={styles.formGroup}>
            <label htmlFor="smtp-username" className={styles.label}>
              Username
            </label>
            <Input
              id="smtp-username"
              type="text"
              placeholder="smtp-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="!rounded-[var(--radius-md)]"
            />
          </div>

          {/* Password */}
          <div className={styles.formGroup}>
            <label htmlFor="smtp-password" className={styles.label}>
              Password / API Key
            </label>
            <Input
              id="smtp-password"
              type="password"
              placeholder={
                initialConfig?.hasPassword
                  ? "•••••••••••• (Leave blank to keep unchanged)"
                  : "••••••••••••"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="!rounded-[var(--radius-md)]"
            />
          </div>

          {/* From Name & From Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={styles.formGroup}>
              <label htmlFor="smtp-from-name" className={styles.label}>
                From Name
              </label>
              <Input
                id="smtp-from-name"
                type="text"
                placeholder="Event Organizer"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="!rounded-[var(--radius-md)]"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="smtp-from-email" className={styles.label}>
                From Email
              </label>
              <Input
                id="smtp-from-email"
                type="email"
                placeholder="notifications@yourdomain.com"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="!rounded-[var(--radius-md)]"
              />
            </div>
          </div>

          {/* TLS/SSL Toggle */}
          <div className={styles.switchRow}>
            <div className={styles.switchLabelBlock}>
              <label htmlFor="smtp-secure" className={styles.switchTitle}>
                Use TLS / SSL Encryption
              </label>
              <span className={styles.switchSubtext}>
                Enable for SSL direct connections (port 465) or STARTTLS
                enforcement.
              </span>
            </div>
            <Switch
              id="smtp-secure"
              checked={secure}
              onChange={setSecure}
              aria-label="Use TLS / SSL Encryption"
            />
          </div>

          {/* Test Recipient Section */}
          <div className={styles.testSection}>
            <div className={styles.formGroup}>
              <label htmlFor="smtp-test-recipient" className={styles.label}>
                Test Recipient Email (Optional)
              </label>
              <Input
                id="smtp-test-recipient"
                type="email"
                placeholder="you@example.com (defaults to From Email)"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                className="!rounded-[var(--radius-md)]"
              />
              <span className={styles.helperText}>
                Target inbox for the &quot;Send Test Email&quot; verification.
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={styles.modalFooter}>
          {isCustom ? (
            <button
              type="button"
              className={styles.deleteBtn}
              disabled={isRemoving || isSaving || isTesting}
              onClick={handleRemove}
            >
              <Trash2 size={15} />
              <span>{isRemoving ? "Removing..." : "Remove Custom SMTP"}</span>
            </button>
          ) : (
            <div />
          )}

          <div className={styles.footerActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={isSaving || isTesting || isRemoving}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.testBtn}
              disabled={isTesting || isSaving || isRemoving}
              onClick={handleSendTest}
            >
              <Send size={15} />
              <span>{isTesting ? "Sending Test..." : "Send Test Email"}</span>
            </button>
            <button
              type="button"
              className={styles.saveBtn}
              disabled={isSaving || isTesting || isRemoving}
              onClick={handleSave}
            >
              <span>{isSaving ? "Saving..." : "Save SMTP Details"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MailConnectionModal(props: MailConnectionModalProps) {
  if (!props.isOpen) return null;

  const modalKey = props.initialConfig?.host || "new-mail-connection";

  return typeof document !== "undefined"
    ? createPortal(
        <MailConnectionModalContent key={modalKey} {...props} />,
        document.body,
      )
    : null;
}
