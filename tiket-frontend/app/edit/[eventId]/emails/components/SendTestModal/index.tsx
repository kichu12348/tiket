"use client";

import React, { useState } from "react";
import Modal from "@/components/Modal";
import { Send, CheckCircle2 } from "lucide-react";
import styles from "./SendTestModal.module.css";

interface SendTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendTest: (email: string, name: string) => Promise<void>;
  templateName: string;
}

export default function SendTestModal({
  isOpen,
  onClose,
  onSendTest,
  templateName,
}: SendTestModalProps) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail) return;

    try {
      setIsSending(true);
      await onSendTest(recipientEmail, recipientName);
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Test Email"
      width={440}
    >
      <form onSubmit={handleSubmit} className={styles.formBody}>
        <p className={styles.infoText}>
          Test email template <strong>"{templateName}"</strong> with sample event and attendee data.
        </p>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Recipient Name (Optional)</label>
          <input
            type="text"
            className={styles.input}
            placeholder="e.g. Alex Morgan"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Recipient Email Address</label>
          <input
            type="email"
            className={styles.input}
            placeholder="you@example.com"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            required
          />
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.btnPrimary} disabled={isSending}>
            <CheckCircle2 size={16} />
            <span>{isSending ? "Sending..." : "Dispatch Test Email"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
