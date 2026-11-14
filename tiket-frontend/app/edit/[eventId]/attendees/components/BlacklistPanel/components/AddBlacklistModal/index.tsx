"use client";

import { useState } from "react";
import { X, Loader2, ShieldAlert } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { validatePattern } from "../../functions/blacklistHelpers";
import styles from "./AddBlacklistModal.module.css";

export interface AddBlacklistPayload {
  pattern: string;
  reason?: string;
  scope?: "event" | "organization";
  cancelExistingTickets?: boolean;
}

interface AddBlacklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: AddBlacklistPayload) => Promise<void>;
  isSubmitting?: boolean;
}

export default function AddBlacklistModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: AddBlacklistModalProps) {
  const [pattern, setPattern] = useState("");
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState<"event" | "organization">("event");
  const [cancelExistingTickets, setCancelExistingTickets] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validatePattern(pattern);
    if (!result.isValid) {
      setValidationError(result.error || "Invalid pattern");
      return;
    }

    setValidationError(null);
    await onSubmit({
      pattern: result.normalized,
      reason: reason.trim() || undefined,
      scope,
      cancelExistingTickets,
    });
  };

  const handlePatternChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPattern(e.target.value);
    if (validationError) {
      setValidationError(null);
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className={styles.shell} role="dialog" aria-modal="true">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h2 className={styles.title}>Add to Blacklist</h2>
            <p className={styles.subtitle}>
              Prevent specific emails or entire domains from registering or checking in.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className={`${styles.body} scrollbar`}>
            {/* Pattern Field */}
            <div className={styles.fieldGroup}>
              <label htmlFor="blacklist-pattern" className={styles.label}>
                Email or Domain Pattern *
              </label>
              <input
                id="blacklist-pattern"
                type="text"
                className={styles.input}
                placeholder="spammer@gmail.com or @example.com"
                value={pattern}
                onChange={handlePatternChange}
                disabled={isSubmitting}
                autoFocus
              />
              <p className={styles.hint}>
                Use an exact email (e.g. <code>spammer@gmail.com</code>) or a domain starting with @ (e.g. <code>@example.com</code>).
              </p>
              {validationError && (
                <p className={styles.errorText}>{validationError}</p>
              )}
            </div>

            {/* Scope Selection */}
            <div className={styles.fieldGroup}>
              <span className={styles.label}>Restriction Scope</span>
              <div className={styles.scopeOptions}>
                <div
                  className={`${styles.scopeCard} ${
                    scope === "event" ? styles.scopeCardActive : ""
                  }`}
                  onClick={() => !isSubmitting && setScope("event")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setScope("event");
                  }}
                >
                  <span className={styles.scopeCardTitle}>This Event Only</span>
                  <span className={styles.scopeCardDesc}>
                    Blocks matching attendees for this event only.
                  </span>
                </div>
                <div
                  className={`${styles.scopeCard} ${
                    scope === "organization" ? styles.scopeCardActive : ""
                  }`}
                  onClick={() => !isSubmitting && setScope("organization")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      setScope("organization");
                  }}
                >
                  <span className={styles.scopeCardTitle}>Organization-Wide</span>
                  <span className={styles.scopeCardDesc}>
                    Blocks matching attendees across all organization events.
                  </span>
                </div>
              </div>
            </div>

            {/* Reason Field */}
            <div className={styles.fieldGroup}>
              <label htmlFor="blacklist-reason" className={styles.label}>
                Reason (Optional)
              </label>
              <input
                id="blacklist-reason"
                type="text"
                className={styles.input}
                placeholder="e.g. Repeated chargebacks, fraudulent booking, spam"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
              />
              <p className={styles.hint}>
                Internal note visible only to event organizers.
              </p>
            </div>

            {/* Cancel Existing Tickets Toggle */}
            <div className={styles.toggleRow}>
              <div className={styles.toggleMeta}>
                <span className={styles.toggleLabel}>Cancel Existing Tickets</span>
                <p className={styles.toggleHint}>
                  Immediately void and revoke any existing confirmed tickets matching this pattern.
                </p>
              </div>
              <Switch
                id="cancel-existing-tickets"
                checked={cancelExistingTickets}
                onCheckedChange={setCancelExistingTickets}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={!pattern.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Blocking...</span>
                </>
              ) : (
                <>
                  <ShieldAlert size={15} />
                  <span>Block & Blacklist</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
