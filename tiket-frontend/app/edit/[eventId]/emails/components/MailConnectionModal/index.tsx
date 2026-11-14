"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Send, Trash2, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  saveMailConnection,
  testMailConnection,
  deleteMailConnection,
} from "@/api/emails";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import type { SmtpMailPayload } from "@/types/commerce";
import type { SmtpConfigSummary } from "@/types/email";
import {
  validateSmtpConfig,
  type SmtpConfigInput,
} from "@/validators/email.validator";
import styles from "./MailConnectionModal.module.css";

interface MailConnectionModalProps {
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
  const [host, setHost] = useState(initialConfig?.host || "");
  const [port, setPort] = useState(String(initialConfig?.port || 587));
  const [username, setUsername] = useState(initialConfig?.username || "");
  const [password, setPassword] = useState("");
  const [fromName, setFromName] = useState(initialConfig?.fromName || "");
  const [fromEmail, setFromEmail] = useState(initialConfig?.fromEmail || "");
  const [secure, setSecure] = useState(Boolean(initialConfig?.secure));
  const [testRecipient, setTestRecipient] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSave = async () => {
    const parsedPort = parseInt(port, 10);
    const hasPassword = Boolean(initialConfig?.hasPassword);

    const payload: SmtpConfigInput = {
      host: host.trim(),
      port: parsedPort,
      secure,
      username: username.trim(),
      password: password.trim() ? password.trim() : undefined,
      hasPassword,
      fromEmail: fromEmail.trim(),
      fromName: fromName.trim() || undefined,
    };

    const validation = validateSmtpConfig(payload);
    if (!validation.success) {
      toast.error(validation.error);
      return;
    }

    try {
      setIsSaving(true);
      const savePayload: SmtpMailPayload = {
        host: validation.data.host,
        port: validation.data.port,
        secure: validation.data.secure,
        username: validation.data.username,
        password: validation.data.password,
        fromEmail: validation.data.fromEmail,
        fromName: validation.data.fromName,
      };
      await saveMailConnection(eventId, savePayload);
      toast.success("Custom SMTP settings saved successfully!");
      onStatusChange?.(true);
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to save SMTP settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async () => {
    const recipient = testRecipient.trim() || fromEmail.trim();
    if (!recipient) {
      toast.error("Please provide a test recipient email address.");
      return;
    }

    if (!validateEmail(recipient)) {
      toast.error("Please provide a valid test recipient email address.");
      return;
    }

    try {
      setIsTesting(true);
      await testMailConnection(eventId, recipient);
      toast.success(`Test email sent successfully to ${recipient}!`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to send test email.");
    } finally {
      setIsTesting(false);
    }
  };

  const handleRemove = async () => {
    try {
      setIsRemoving(true);
      await deleteMailConnection(eventId);
      toast.success("Custom SMTP removed. Reset to default mailer.");
      onStatusChange?.(false);
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to remove custom SMTP.");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mail-connection-title"
    >
      <div className={styles.shell} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 id="mail-connection-title" className={styles.title}>
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
        <div className={`${styles.body} scrollbar`}>
          <div className={styles.fieldRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="smtp-host" className={styles.label}>
                SMTP Host
              </label>
              <input
                id="smtp-host"
                type="text"
                className={styles.input}
                placeholder="smtp.yourdomain.com"
                value={host}
                onChange={(e) => setHost(e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="smtp-port" className={styles.label}>
                SMTP Port
              </label>
              <input
                id="smtp-port"
                type="number"
                className={styles.input}
                placeholder="587"
                value={port}
                onChange={(e) => setPort(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="smtp-username" className={styles.label}>
              Username
            </label>
            <input
              id="smtp-username"
              type="text"
              className={styles.input}
              placeholder="smtp-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="smtp-password" className={styles.label}>
              Password / API Key
            </label>
            <input
              id="smtp-password"
              type="password"
              className={styles.input}
              placeholder={
                initialConfig?.hasPassword
                  ? "•••••••••••• (Leave blank to keep unchanged)"
                  : "••••••••••••"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="smtp-from-name" className={styles.label}>
              From Name
            </label>
            <input
              id="smtp-from-name"
              type="text"
              className={styles.input}
              placeholder="Event Organizer"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="smtp-from-email" className={styles.label}>
              From Email
            </label>
            <input
              id="smtp-from-email"
              type="email"
              className={styles.input}
              placeholder="notifications@yourdomain.com"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
            />
          </div>

          <div className={styles.switchRow}>
            <div className={styles.switchInfo}>
              <label htmlFor="smtp-secure" className={styles.label}>
                Use TLS / SSL Encryption
              </label>
              <span className={styles.helperText}>
                Enable for SSL direct connections (port 465) or STARTTLS enforcement.
              </span>
            </div>
            <Switch
              id="smtp-secure"
              checked={secure}
              onCheckedChange={setSecure}
            />
          </div>

          <div className={styles.testSection}>
            <div className={styles.inputGroup}>
              <label htmlFor="smtp-test-recipient" className={styles.label}>
                Test Recipient Email (Optional)
              </label>
              <input
                id="smtp-test-recipient"
                type="email"
                className={styles.input}
                placeholder="you@example.com (defaults to From Email)"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
              />
              <span className={styles.helperText}>
                Target inbox for the &quot;Send Test Email&quot; verification.
              </span>
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className={styles.footer}>
          {isCustom ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isRemoving || isSaving || isTesting}
              onClick={handleRemove}
            >
              <Trash2 size={15} />
              <span>{isRemoving ? "Removing..." : "Remove Custom SMTP"}</span>
            </Button>
          ) : (
            <div />
          )}

          <div className={styles.footerActions}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isTesting || isSaving || isRemoving}
              onClick={handleSendTest}
            >
              <Send size={15} />
              <span>{isTesting ? "Sending Test..." : "Send Test Email"}</span>
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={isSaving || isTesting || isRemoving}
              onClick={handleSave}
            >
              <Check size={15} />
              <span>{isSaving ? "Saving..." : "Save SMTP Details"}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MailConnectionModal(props: MailConnectionModalProps) {
  if (!props.isOpen) return null;
  return (
    <MailConnectionModalContent
      key={props.initialConfig?.host || "new"}
      {...props}
    />
  );
}
