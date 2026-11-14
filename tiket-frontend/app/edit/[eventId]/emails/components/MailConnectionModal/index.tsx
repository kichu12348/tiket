"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Send, Trash2, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  saveMailConnection,
  testMailConnection,
  deleteMailConnection,
} from "@/api/commerce";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import type { SmtpMailPayload } from "@/types/commerce";
import styles from "./MailConnectionModal.module.css";

interface MailConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  isCustom?: boolean;
  onStatusChange?: (isCustom: boolean) => void;
}

export default function MailConnectionModal({
  isOpen,
  onClose,
  eventId,
  isCustom = false,
  onStatusChange,
}: MailConnectionModalProps) {
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [secure, setSecure] = useState(false);
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
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSave = async () => {
    const trimmedHost = host.trim();
    if (!trimmedHost) {
      toast.error("SMTP Host is required.");
      return;
    }

    const parsedPort = parseInt(port, 10);
    if (!parsedPort || isNaN(parsedPort)) {
      toast.error("A valid SMTP Port is required (e.g. 587, 465, 2525).");
      return;
    }

    if (![465, 587, 2525].includes(parsedPort)) {
      toast.error("Port must be 465, 587, or 2525.");
      return;
    }

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      toast.error("SMTP Username is required.");
      return;
    }

    if (!password) {
      toast.error("Password or API Key is required.");
      return;
    }

    const trimmedFromEmail = fromEmail.trim();
    if (!trimmedFromEmail) {
      toast.error("From Email address is required.");
      return;
    }

    if (!validateEmail(trimmedFromEmail)) {
      toast.error("Please enter a valid From Email address.");
      return;
    }

    const payload: SmtpMailPayload = {
      host: trimmedHost,
      port: parsedPort,
      secure,
      username: trimmedUsername,
      password,
      fromEmail: trimmedFromEmail,
      fromName: fromName.trim() || undefined,
    };

    try {
      setIsSaving(true);
      await saveMailConnection(eventId, payload);
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
              placeholder="••••••••••••"
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
