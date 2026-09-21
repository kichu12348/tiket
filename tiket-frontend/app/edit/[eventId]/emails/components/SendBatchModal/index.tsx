"use client";

import React, { useState } from "react";
import Modal from "@/components/Modal";
import { Checkbox } from "@/components/ui/checkbox";
import { Send } from "lucide-react";
import styles from "./SendBatchModal.module.css";

interface SendBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendBatch: (
    targetGroup: "all" | "checked_in" | "not_checked_in" | "custom",
    customEmails?: string[],
  ) => Promise<void>;
  templateName: string;
}

export default function SendBatchModal({
  isOpen,
  onClose,
  onSendBatch,
  templateName,
}: SendBatchModalProps) {
  const [targetGroup, setTargetGroup] = useState<
    "all" | "checked_in" | "not_checked_in" | "custom"
  >("all");
  const [customEmailsStr, setCustomEmailsStr] = useState("");
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let customEmails: string[] = [];
    if (targetGroup === "custom") {
      customEmails = customEmailsStr
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (customEmails.length === 0) return;
    }

    try {
      setIsSending(true);
      await onSendBatch(targetGroup, customEmails);
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  const groups: {
    id: "all" | "checked_in" | "not_checked_in" | "custom";
    title: string;
    sub: string;
  }[] = [
    {
      id: "all",
      title: "All Registered Attendees",
      sub: "Send to every registered pass holder",
    },
    {
      id: "checked_in",
      title: "Checked-In Attendees Only",
      sub: "Send thank-you / post-event updates",
    },
    {
      id: "not_checked_in",
      title: "Not Checked-In (Missed Event)",
      sub: "Send post-event missed email / sorry message",
    },
    {
      id: "custom",
      title: "Custom Email List",
      sub: "Specify manual comma-separated emails",
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Broadcast Email Blast"
      width={500}
    >
      <form onSubmit={handleSubmit} className={styles.formBody}>
        <p className={styles.infoText}>
          Send email template <strong>"{templateName}"</strong> to a targeted group of attendees.
        </p>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Select Target Recipient Group</label>

          <div className={styles.checkboxGroup}>
            {groups.map((grp) => {
              const isChecked = targetGroup === grp.id;
              return (
                <div
                  key={grp.id}
                  className={styles.groupOptionCard}
                  data-selected={isChecked}
                  onClick={() => setTargetGroup(grp.id)}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => setTargetGroup(grp.id)}
                  />
                  <div className={styles.optionTextCol}>
                    <span className={styles.optionTitle}>{grp.title}</span>
                    <span className={styles.optionSub}>{grp.sub}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {targetGroup === "custom" && (
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Comma-Separated Emails</label>
            <textarea
              className={`${styles.textarea} scrollbar`}
              rows={3}
              placeholder="alex@example.com, sara@example.com, john@example.com"
              value={customEmailsStr}
              onChange={(e) => setCustomEmailsStr(e.target.value)}
              required
            />
          </div>
        )}

        <div className={styles.footer}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.btnPrimary} disabled={isSending}>
            <Send size={16} />
            <span>{isSending ? "Dispatching..." : "Send Email Blast"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
