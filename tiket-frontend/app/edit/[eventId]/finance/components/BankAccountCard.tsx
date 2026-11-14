"use client";

import { useState } from "react";
import { upsertBankAccount } from "@/api/commerce";
import type { OrganizerBankAccount } from "@/types/commerce";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Landmark, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import styles from "./BankAccountCard.module.css";

export interface BankAccountCardProps {
  eventId: string;
  initialAccount?: OrganizerBankAccount | null;
  onUpdated?: () => void;
}

export default function BankAccountCard({
  eventId,
  initialAccount,
  onUpdated,
}: BankAccountCardProps) {
  const [prevAccount, setPrevAccount] = useState<
    OrganizerBankAccount | null | undefined
  >(initialAccount);
  const [accountHolderName, setAccountHolderName] = useState(
    initialAccount?.accountHolderName || "",
  );
  const [phone, setPhone] = useState(initialAccount?.phone || "");
  const [accountNumber, setAccountNumber] = useState(
    initialAccount?.accountNumber || "",
  );
  const [ifscCode, setIfscCode] = useState(initialAccount?.ifscCode || "");
  const [bankName, setBankName] = useState(initialAccount?.bankName || "");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (initialAccount !== prevAccount) {
    setPrevAccount(initialAccount);
    setAccountHolderName(initialAccount?.accountHolderName || "");
    setPhone(initialAccount?.phone || "");
    setAccountNumber(initialAccount?.accountNumber || "");
    setIfscCode(initialAccount?.ifscCode || "");
    setBankName(initialAccount?.bankName || "");
  }

  const isGatewayActive = Boolean(
    initialAccount?.gatewayAccountId &&
      initialAccount?.onboardingStatus !== "suspended" &&
      initialAccount?.onboardingStatus !== "failed",
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedName = accountHolderName.trim();
    if (!trimmedName) {
      setErrorMessage("Account holder name is required.");
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 20) {
      setErrorMessage("Please enter a valid 10-digit mobile number for bank KYC.");
      return;
    }

    const trimmedAccount = accountNumber.trim();
    if (trimmedAccount.length < 9 || trimmedAccount.length > 34) {
      setErrorMessage("Bank account number must be between 9 and 34 characters.");
      return;
    }

    const cleanIfsc = ifscCode.trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      setErrorMessage("Invalid IFSC code format (e.g. HDFC0001234).");
      return;
    }

    const trimmedBankName = bankName.trim();
    if (!trimmedBankName) {
      setErrorMessage("Bank name is required.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      await upsertBankAccount(eventId, {
        accountHolderName: trimmedName,
        phone: cleanPhone,
        accountNumber: trimmedAccount,
        ifscCode: cleanIfsc,
        bankName: trimmedBankName,
      });

      toast.success("Bank account details saved successfully.");
      onUpdated?.();
    } catch (err) {
      const msg = getErrorMessage(err) || "Failed to save bank account details.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={styles.card}>
      <CardHeader className={styles.cardHeader}>
        <div className={styles.headerTitleRow}>
          <div className={styles.titleWithIcon}>
            <div className={styles.iconWrapper}>
              <Landmark size={18} />
            </div>
            <div>
              <CardTitle className={styles.cardTitle}>Payout Bank Account</CardTitle>
              <CardDescription className={styles.cardDescription}>
                Direct settlements via Razorpay Route require verified KYC details.
              </CardDescription>
            </div>
          </div>
          {isGatewayActive && (
            <Badge variant="secondary" className={styles.connectedBadge}>
              <ShieldCheck size={14} />
              Connected · Automatic Razorpay Settlement
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className={styles.cardContent}>
        {!isGatewayActive && (
          <Alert className={styles.alertWarning}>
            <AlertCircle size={16} />
            <AlertTitle className={styles.alertTitle}>Bank Account Required</AlertTitle>
            <AlertDescription className={styles.alertDescription}>
              A verified bank account is required before creating paid tickets to receive automatic settlements.
            </AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert className={styles.alertDestructive}>
            <AlertCircle size={16} />
            <AlertTitle className={styles.alertTitle}>Error</AlertTitle>
            <AlertDescription className={styles.alertDescription}>
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <div className={styles.inputGroup}>
            <Label htmlFor="accountHolderName" className={styles.label}>
              Account Holder Name <span className={styles.required}>*</span>
            </Label>
            <Input
              id="accountHolderName"
              name="accountHolderName"
              placeholder="As registered with your bank"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              disabled={isSaving}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <Label htmlFor="phone" className={styles.label}>
              Phone Number (for KYC) <span className={styles.required}>*</span>
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSaving}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroupFull}>
            <Label htmlFor="bankName" className={styles.label}>
              Bank Name <span className={styles.required}>*</span>
            </Label>
            <Input
              id="bankName"
              name="bankName"
              placeholder="e.g. HDFC Bank, ICICI Bank, State Bank of India"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              disabled={isSaving}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <Label htmlFor="accountNumber" className={styles.label}>
              Bank Account Number <span className={styles.required}>*</span>
            </Label>
            <Input
              id="accountNumber"
              name="accountNumber"
              type="text"
              placeholder="Enter bank account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              disabled={isSaving}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <Label htmlFor="ifscCode" className={styles.label}>
              IFSC Code <span className={styles.required}>*</span>
            </Label>
            <Input
              id="ifscCode"
              name="ifscCode"
              placeholder="e.g. HDFC0001234"
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              disabled={isSaving}
              required
              maxLength={11}
              className={`${styles.input} ${styles.fontMonoUppercase}`}
            />
          </div>

          <div className={styles.submitRow}>
            <Button
              type="submit"
              disabled={isSaving}
              className={styles.btnPrimary}
            >
              {isSaving
                ? "Saving..."
                : initialAccount
                  ? "Update Bank Account"
                  : "Save Bank Account"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
