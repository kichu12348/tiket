import type { OrganizerBankAccount } from "@/types/commerce";
import { Landmark, ShieldCheck, AlertCircle, Plus, Edit2 } from "lucide-react";
import styles from "./BankAccountCard.module.css";

export interface BankAccountCardProps {
  eventId?: string;
  bankAccount?: OrganizerBankAccount | null;
  initialAccount?: OrganizerBankAccount | null;
  onOpenModal?: () => void;
  onUpdated?: () => void;
}

function maskAccountNumber(acc: string): string {
  const trimmed = acc.trim();
  if (trimmed.length <= 4) return trimmed;
  const last4 = trimmed.slice(-4);
  return `•••• •••• ${last4}`;
}

export default function BankAccountCard({
  bankAccount,
  initialAccount,
  onOpenModal,
}: BankAccountCardProps) {
  const account = bankAccount || initialAccount || null;
  const isConnected = Boolean(
    account?.accountHolderName &&
      (account?.configured || account?.accountNumber),
  );

  if (!isConnected) {
    return (
      <div className={styles.card} data-testid="bank-unconnected-card">
        <div className={styles.unconnectedWrapper}>
          <div className={styles.unconnectedInfo}>
            <div className={styles.warningIconWrapper}>
              <AlertCircle size={20} />
            </div>
            <div className={styles.unconnectedText}>
              <h3 className={styles.unconnectedTitle}>Bank Account Required</h3>
              <p className={styles.unconnectedDesc}>
                A verified bank account is required before launching paid ticket
                tiers. Ticket earnings will automatically settle directly to this
                account via Razorpay Route.
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={onOpenModal}
            data-testid="add-bank-btn"
          >
            <Plus size={15} />
            <span>Add Bank Account</span>
          </button>
        </div>
      </div>
    );
  }

  const maskedNumber =
    account?.maskedAccountNumber ||
    (account?.accountNumber ? maskAccountNumber(account.accountNumber) : "•••• •••• —");

  return (
    <div className={styles.card} data-testid="bank-connected-card">
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <div className={styles.iconWrapper}>
            <Landmark size={18} />
          </div>
          <div className={styles.titleText}>
            <h3 className={styles.cardTitle}>Payout Bank Account</h3>
            <p className={styles.cardSubtitle}>
              Direct settlements via Razorpay Route (T+2 cycle)
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.statusBadge}>
            <span className={styles.statusDot} />
            <ShieldCheck size={13} />
            <span>Connected · Automatic Razorpay Settlement</span>
          </div>

          {account?.gatewayAccountId && (
            <span className={styles.accountIdBadge}>
              {account.gatewayAccountId}
            </span>
          )}

          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onOpenModal}
            data-testid="edit-bank-btn"
          >
            <Edit2 size={13} />
            <span>Update Bank Details</span>
          </button>
        </div>
      </div>

      <div className={styles.detailsGrid}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Account Holder</span>
          <span className={styles.detailValue}>
            {account?.accountHolderName || "—"}
          </span>
        </div>

        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Account Type</span>
          <span className={styles.detailValue}>
            {account?.accountType === "saving" ? "Savings" : "Current"}
          </span>
        </div>

        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Bank Name</span>
          <span className={styles.detailValue}>
            {account?.bankName || "—"}
          </span>
        </div>

        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Account Number</span>
          <span className={`${styles.detailValue} ${styles.fontMono}`}>
            {maskedNumber}
          </span>
        </div>

        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>IFSC Code</span>
          <span className={`${styles.detailValue} ${styles.fontMono}`}>
            {account?.ifscCode || "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
