import React, { useState } from "react";
import { createPortal } from "react-dom";
import type { OrganizerBankAccount } from "@/types/commerce";
import {
  bankAccountSchema,
  type BankAccountFormValues,
} from "@/lib/validators/finance.validator";
import { X, ShieldCheck, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import styles from "./BankAccountModal.module.css";

export interface BankAccountModalProps {
  isOpen: boolean;
  initialAccount?: OrganizerBankAccount | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (payload: BankAccountFormValues) => Promise<boolean | void>;
}

interface BankAccountModalContentProps {
  initialAccount?: OrganizerBankAccount | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (payload: BankAccountFormValues) => Promise<boolean | void>;
}

const BANK_PRESETS = [
  "HDFC Bank",
  "ICICI Bank",
  "State Bank of India",
  "Axis Bank",
  "Kotak Mahindra Bank",
];

function BankAccountModalContent({
  initialAccount,
  isSubmitting,
  onClose,
  onSave,
}: BankAccountModalContentProps) {
  const [accountHolderName, setAccountHolderName] = useState(
    initialAccount?.accountHolderName || "",
  );
  const [accountType, setAccountType] = useState<"current" | "saving">(
    initialAccount?.accountType || "current",
  );
  const [phone, setPhone] = useState(initialAccount?.phone || "");
  const [bankName, setBankName] = useState(initialAccount?.bankName || "");
  const [accountNumber, setAccountNumber] = useState(
    initialAccount?.accountNumber || "",
  );
  const [confirmAccountNumber, setConfirmAccountNumber] = useState(
    initialAccount?.accountNumber || "",
  );
  const [ifscCode, setIfscCode] = useState(initialAccount?.ifscCode || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isIfscValid = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(
    ifscCode.trim().toUpperCase(),
  );

  const isAccountMatch =
    accountNumber.length > 0 &&
    confirmAccountNumber.length > 0 &&
    accountNumber === confirmAccountNumber;

  const isAccountMismatch =
    confirmAccountNumber.length > 0 && accountNumber !== confirmAccountNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: BankAccountFormValues = {
      accountHolderName,
      accountType,
      phone,
      bankName,
      accountNumber,
      confirmAccountNumber,
      ifscCode: ifscCode.trim().toUpperCase(),
    };

    const result = bankAccountSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const err of result.error.errors) {
        const fieldName = String(err.path[0] || "general");
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = err.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    await onSave(result.data);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalShell}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bank-account-modal-title"
      >
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTextGroup}>
            <h3 id="bank-account-modal-title" className={styles.modalTitle}>
              {initialAccount?.configured || initialAccount?.accountHolderName
                ? "Update Bank Details"
                : "Connect Bank Account"}
            </h3>
            <p className={styles.modalSubtitle}>
              Direct settlements for ticket payouts via Razorpay Route
            </p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div className={`${styles.modalBody} scrollbar`}>
            {/* Security Notice */}
            <div className={styles.securityNotice}>
              <ShieldCheck size={16} className={styles.securityIcon} />
              <p className={styles.securityText}>
                <strong>Automated Payouts:</strong> Payouts are settled
                automatically via Razorpay Route (T+2 settlement cycle) directly
                to this bank account. No manual withdrawals required.
              </p>
            </div>

            {/* Account Holder Name */}
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="account-holder-name-input">
                Account Holder Name <span className={styles.required}>*</span>
              </label>
              <Input
                id="account-holder-name-input"
                type="text"
                placeholder="As registered in official bank records"
                value={accountHolderName}
                onChange={(e) => {
                  setAccountHolderName(e.target.value);
                  if (errors.accountHolderName) {
                    setErrors((prev) => ({ ...prev, accountHolderName: "" }));
                  }
                }}
                disabled={isSubmitting}
                className={errors.accountHolderName ? styles.inputError : ""}
                data-testid="bank-holder-input"
              />
              {errors.accountHolderName ? (
                <span className={styles.inlineError} role="alert">
                  {errors.accountHolderName}
                </span>
              ) : (
                <p className={styles.helperText}>
                  Must match the beneficiary name on the account
                </p>
              )}
            </div>

            {/* Mobile Number for KYC */}
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="bank-phone-input">
                Mobile Number (KYC) <span className={styles.required}>*</span>
              </label>
              <Input
                id="bank-phone-input"
                type="tel"
                placeholder="10-digit Indian mobile number (e.g. 9876543210)"
                maxLength={10}
                value={phone}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setPhone(cleaned);
                  if (errors.phone) {
                    setErrors((prev) => ({ ...prev, phone: "" }));
                  }
                }}
                disabled={isSubmitting}
                className={errors.phone ? styles.inputError : ""}
                data-testid="bank-phone-input"
              />
              {errors.phone ? (
                <span className={styles.inlineError} role="alert">
                  {errors.phone}
                </span>
              ) : (
                <p className={styles.helperText}>
                  Required for Razorpay Linked Account verification
                </p>
              )}
            </div>

            {/* Bank Name */}
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="bank-name-input">
                Bank Name <span className={styles.required}>*</span>
              </label>
              <Input
                id="bank-name-input"
                type="text"
                placeholder="e.g. HDFC Bank, ICICI Bank, State Bank of India"
                value={bankName}
                onChange={(e) => {
                  setBankName(e.target.value);
                  if (errors.bankName) {
                    setErrors((prev) => ({ ...prev, bankName: "" }));
                  }
                }}
                disabled={isSubmitting}
                className={errors.bankName ? styles.inputError : ""}
                data-testid="bank-name-input"
              />
              <div className={styles.presetsRow}>
                {BANK_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`${styles.presetBtn} ${bankName === preset ? styles.presetBtnActive : ""}`}
                    onClick={() => {
                      setBankName(preset);
                      if (errors.bankName) {
                        setErrors((prev) => ({ ...prev, bankName: "" }));
                      }
                    }}
                  >
                    {preset.replace(" Bank", "")}
                  </button>
                ))}
              </div>
              {errors.bankName && (
                <span className={styles.inlineError} role="alert">
                  {errors.bankName}
                </span>
              )}
            </div>

            {/* Account Type Slider */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Account Type <span className={styles.required}>*</span>
              </label>
              <div
                className={styles.segmentedControl}
                role="radiogroup"
                aria-label="Account Type"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={accountType === "current"}
                  className={`${styles.segmentBtn} ${accountType === "current" ? styles.segmentBtnActive : ""}`}
                  onClick={() => setAccountType("current")}
                  disabled={isSubmitting}
                  data-testid="account-type-current"
                >
                  Current
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={accountType === "saving"}
                  className={`${styles.segmentBtn} ${accountType === "saving" ? styles.segmentBtnActive : ""}`}
                  onClick={() => setAccountType("saving")}
                  disabled={isSubmitting}
                  data-testid="account-type-saving"
                >
                  Savings
                </button>
              </div>
              <p className={styles.helperText}>
                Select Current (business) or Savings (personal) account
              </p>
            </div>

            {/* IFSC Code */}
            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="bank-ifsc-input">
                  IFSC Code <span className={styles.required}>*</span>
                </label>
                {isIfscValid && (
                  <span className={styles.validBadge}>
                    <Check size={13} />
                    Valid IFSC
                  </span>
                )}
              </div>
              <div className={styles.inputWrapper}>
                <Input
                  id="bank-ifsc-input"
                  type="text"
                  placeholder="e.g. HDFC0001234"
                  maxLength={11}
                  value={ifscCode}
                  onChange={(e) => {
                    const uppercased = e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 11);
                    setIfscCode(uppercased);
                    if (errors.ifscCode) {
                      setErrors((prev) => ({ ...prev, ifscCode: "" }));
                    }
                  }}
                  disabled={isSubmitting}
                  className={`${styles.fontMono} ${errors.ifscCode ? styles.inputError : ""}`}
                  data-testid="bank-ifsc-input"
                />
              </div>
              {errors.ifscCode && (
                <span className={styles.inlineError} role="alert">
                  {errors.ifscCode}
                </span>
              )}
            </div>

            {/* Bank Account Number */}
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="bank-account-number-input">
                Bank Account Number <span className={styles.required}>*</span>
              </label>
              <Input
                id="bank-account-number-input"
                type="text"
                placeholder="Enter 9 to 18 digit account number"
                maxLength={18}
                value={accountNumber}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 18);
                  setAccountNumber(digits);
                  if (errors.accountNumber) {
                    setErrors((prev) => ({ ...prev, accountNumber: "" }));
                  }
                }}
                disabled={isSubmitting}
                className={`${styles.fontMono} ${errors.accountNumber ? styles.inputError : ""}`}
                data-testid="bank-account-number-input"
              />
              {errors.accountNumber && (
                <span className={styles.inlineError} role="alert">
                  {errors.accountNumber}
                </span>
              )}
            </div>

            {/* Confirm Bank Account Number */}
            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label
                  className={styles.label}
                  htmlFor="confirm-bank-account-number-input"
                >
                  Confirm Account Number <span className={styles.required}>*</span>
                </label>
                {isAccountMatch && (
                  <span className={styles.validBadge}>
                    <Check size={13} />
                    Numbers match
                  </span>
                )}
              </div>
              <Input
                id="confirm-bank-account-number-input"
                type="text"
                placeholder="Re-enter account number"
                maxLength={18}
                value={confirmAccountNumber}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 18);
                  setConfirmAccountNumber(digits);
                  if (errors.confirmAccountNumber) {
                    setErrors((prev) => ({
                      ...prev,
                      confirmAccountNumber: "",
                    }));
                  }
                }}
                disabled={isSubmitting}
                className={`${styles.fontMono} ${errors.confirmAccountNumber || isAccountMismatch ? styles.inputError : ""}`}
                data-testid="confirm-bank-account-number-input"
              />
              {errors.confirmAccountNumber ? (
                <span className={styles.inlineError} role="alert">
                  {errors.confirmAccountNumber}
                </span>
              ) : isAccountMismatch ? (
                <span className={styles.inlineError} role="alert">
                  Account numbers do not match
                </span>
              ) : null}
            </div>
          </div>

          {/* Modal Footer */}
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveBtn}
              disabled={isSubmitting}
              data-testid="bank-modal-save-btn"
            >
              {isSubmitting
                ? "Connecting..."
                : initialAccount?.configured || initialAccount?.accountHolderName
                  ? "Update Bank Details"
                  : "Save & Connect Bank Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BankAccountModal({
  isOpen,
  initialAccount,
  isSubmitting,
  onClose,
  onSave,
}: BankAccountModalProps) {
  if (!isOpen) return null;

  const modalKey =
    initialAccount?.gatewayAccountId ||
    initialAccount?.accountNumber ||
    "new-bank-account";

  return typeof document !== "undefined"
    ? createPortal(
        <BankAccountModalContent
          key={modalKey}
          initialAccount={initialAccount}
          isSubmitting={isSubmitting}
          onClose={onClose}
          onSave={onSave}
        />,
        document.body,
      )
    : null;
}
