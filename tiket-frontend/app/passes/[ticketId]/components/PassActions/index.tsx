import React, { useState } from "react";
import { Download, Send, X, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { initiateTicketTransfer } from "@/api/tickets";
import type { TicketStatus } from "@/types/ticket";
import styles from "./PassActions.module.css";

export interface PassActionsProps {
  handleDownload: () => void;
  ticketId?: string;
  isTransferable?: boolean;
  status?: TicketStatus;
  onTransferSuccess?: (targetEmail: string) => void;
}

export function PassActions({
  handleDownload,
  ticketId,
  isTransferable = false,
  status = "active",
  onTransferSuccess,
}: PassActionsProps) {
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [targetEmail, setTargetEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState(false);

  const canTransfer = isTransferable && status === "active";

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId) return;

    const trimmedEmail = targetEmail.trim();
    if (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setTransferError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setTransferError(null);

    try {
      await initiateTicketTransfer(ticketId, { targetEmail: trimmedEmail });
      toast.success(`Transfer initiated to ${trimmedEmail}`);
      setTransferCompleted(true);
      onTransferSuccess?.(trimmedEmail);
      setTimeout(() => {
        setIsTransferModalOpen(false);
        setTransferCompleted(false);
        setTargetEmail("");
      }, 1500);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to initiate transfer.";
      setTransferError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={styles.actionsRow}
      style={{ flexDirection: "column", gap: "0.6rem" }}
    >
      <button
        type="button"
        onClick={handleDownload}
        className={styles.btnDownload}
        data-testid="download-pass-btn"
      >
        <Download size={16} />
        <span>Download Pass</span>
      </button>

      {canTransfer && (
        <button
          type="button"
          onClick={() => {
            setIsTransferModalOpen(true);
            setTransferError(null);
          }}
          data-testid="transfer-ticket-btn"
          style={{
            width: "100%",
            background: "var(--color-soft-bg, rgba(255, 255, 255, 0.05))",
            color: "var(--color-text-soft, rgba(255, 255, 255, 0.65))",
            border: "none",
            borderRadius: "var(--radius-md, 10px)",
            padding: "0.65rem 1rem",
            fontSize: "0.85rem",
            fontWeight: 500,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.45rem",
            transition: "all 0.2s ease",
          }}
        >
          <Send size={15} />
          <span>Transfer Ticket</span>
        </button>
      )}

      {isTransferModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="transfer-modal-title"
          data-testid="transfer-modal"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "380px",
              backgroundColor: "var(--surface-base, #1c1c1e)",
              border:
                "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
              borderRadius: "var(--radius-lg, 16px)",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3
                id="transfer-modal-title"
                style={{
                  margin: 0,
                  fontSize: "1.05rem",
                  fontWeight: 600,
                  color: "var(--text-primary, #ffffff)",
                }}
              >
                Transfer Ticket Pass
              </h3>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                aria-label="Close transfer dialog"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted, rgba(255, 255, 255, 0.4))",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.25rem",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {transferCompleted ? (
              <div
                data-testid="transfer-success-message"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: "0.5rem",
                  padding: "1rem 0",
                  color: "var(--status-success, #28a745)",
                }}
              >
                <span>Transfer initiated successfully!</span>
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-secondary, rgba(255, 255, 255, 0.7))",
                  }}
                >
                  An invitation has been sent to {targetEmail}.
                </span>
              </div>
            ) : (
              <form
                data-testid="transfer-form"
                onSubmit={handleTransferSubmit}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.9rem",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.84rem",
                    color: "var(--text-secondary, rgba(255, 255, 255, 0.7))",
                    lineHeight: 1.4,
                  }}
                >
                  Enter the recipient&apos;s email address. Once accepted, your
                  ticket will be transferred to their account.
                </p>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                  }}
                >
                  <label
                    htmlFor="transfer-email-input"
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 500,
                      color: "var(--text-muted, rgba(255, 255, 255, 0.4))",
                    }}
                  >
                    Recipient Email
                  </label>
                  <input
                    id="transfer-email-input"
                    type="email"
                    required
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    placeholder="recipient@example.com"
                    data-testid="transfer-email-input"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "0.6rem 0.8rem",
                      borderRadius: "var(--radius-sm, 8px)",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      border:
                        "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
                      color: "var(--text-primary, #ffffff)",
                      fontSize: "0.92rem",
                      outline: "none",
                    }}
                  />
                  {transferError && (
                    <span
                      data-testid="transfer-error"
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--status-danger, rgba(255, 80, 80, 1))",
                      }}
                    >
                      {transferError}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginTop: "0.4rem",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setIsTransferModalOpen(false)}
                    style={{
                      flex: 1,
                      background:
                        "var(--color-soft-bg, rgba(255, 255, 255, 0.05))",
                      color:
                        "var(--color-text-soft, rgba(255, 255, 255, 0.65))",
                      border: "none",
                      borderRadius: "var(--radius-md, 8px)",
                      padding: "0.6rem 1rem",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    data-testid="submit-transfer-btn"
                    style={{
                      flex: 1,
                      background: "var(--btn-primary-bg, #ffffff)",
                      color: "var(--btn-primary-text, #000000)",
                      border: "none",
                      borderRadius: "var(--radius-md, 8px)",
                      padding: "0.6rem 1rem",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      opacity: isSubmitting ? 0.7 : 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.35rem",
                    }}
                  >
                    {isSubmitting ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <>
                        <span>Transfer</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

