"use client";

import { useEffect, useState, use } from "react";
import { getFinance, saveBankAccount } from "@/api/commerce";
import type { Finance, OrganizerBankAccount } from "@/types/commerce";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import {
  Coins,
  CircleDollarSign,
  Wallet,
  Landmark,
  ShieldCheck,
  X,
  AlertCircle,
} from "lucide-react";
import styles from "./FinancePage.module.css";

interface FinancePageProps {
  params: Promise<{ eventId: string }>;
}

export default function FinancePage({ params }: FinancePageProps) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.eventId;

  const [finance, setFinance] = useState<Finance | null>(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"settlements" | "orders" | "refunds">("settlements");

  const refreshData = async () => {
    try {
      const data = await getFinance(eventId);
      setFinance(data);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to load finance details");
    }
  };

  useEffect(() => {
    let mounted = true;
    getFinance(eventId)
      .then((data) => {
        if (mounted) setFinance(data);
      })
      .catch((err) => {
        toast.error(getErrorMessage(err) || "Failed to load finance details");
      });

    return () => {
      mounted = false;
    };
  }, [eventId]);

  const summary = finance?.summary || {
    grossSalesPaise: finance?.capturedPaise || 0,
    platformFeesPaise: 0,
    taxesPaise: 0,
    netEarningsPaise: 0,
    withdrawnOrPendingPaise: 0,
    availableToWithdrawPaise: 0,
    unsettledBalancePaise: 0,
  };

  const unsettledBalancePaise =
    finance?.unsettledBalancePaise ?? summary.unsettledBalancePaise ?? 0;

  const payouts = finance?.payouts || [];
  const settledPaise = payouts
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amountPaise, 0);

  const bankAccount = finance?.bankAccount || null;
  const orders = finance?.orders || [];
  const allRefunds = finance?.refunds || [];

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.iconBox}>
              <Coins size={20} />
            </div>
            <div className={styles.headerText}>
              <h2 className={styles.title}>Finance & Automatic Settlements</h2>
              <p className={styles.subtitle}>
                Earnings are automatically transferred to your verified bank account via Razorpay Route.
              </p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.statusBadge}>
              <ShieldCheck size={14} />
              <span>Active — Automatic Razorpay Settlement Cycle</span>
            </div>

            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setShowBankModal(true)}
            >
              <Landmark size={15} />
              <span>{bankAccount ? "Bank Account" : "Connect Bank"}</span>
            </button>
          </div>
        </div>

        {/* 3 KPI Metric Summary Cards */}
        <div className={styles.metricsGrid}>
          {/* 1. Net Organizer Revenue */}
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Net Organizer Revenue</span>
              <CircleDollarSign size={18} className={styles.metricIcon} />
            </div>
            <span className={styles.metricValue}>
              {formatMoney(summary.netEarningsPaise)}
            </span>
            <span className={styles.metricDesc}>Net sales after platform fees</span>
          </div>

          {/* 2. Unsettled Balance (Available for Refunds) */}
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>
                Unsettled Balance (Available for Refunds)
              </span>
              <Wallet size={18} className={styles.metricIcon} />
            </div>
            <span className={styles.metricValue}>
              {formatMoney(unsettledBalancePaise)}
            </span>
            <span className={styles.metricDesc}>
              Available in live Route cycle for attendee refunds
            </span>
          </div>

          {/* 3. Settled to Bank */}
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Settled to Bank</span>
              <Landmark size={18} className={styles.metricIcon} />
            </div>
            <span className={styles.metricValue}>
              {formatMoney(settledPaise)}
            </span>
            <span className={styles.metricDesc}>
              Disbursed directly to your connected bank account
            </span>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className={styles.tabsBar}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "settlements" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("settlements")}
          >
            Automatic Settlements ({payouts.length})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "orders" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            Orders ({orders.length})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "refunds" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("refunds")}
          >
            Refunds ({allRefunds.length})
          </button>
        </div>

        {/* Table Content */}
        {activeTab === "settlements" && (
          <div className={styles.tableContainer}>
            {payouts.length === 0 ? (
              <div className={styles.emptyState}>
                No settlements yet. Razorpay Route will automatically disburse funds per your settlement schedule.
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Settlement Date</th>
                    <th>Settlement ID</th>
                    <th>Bank UTR</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {p.processedAt
                          ? new Date(p.processedAt).toLocaleString()
                          : new Date(p.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <span className="font-mono text-xs">
                          {p.gatewaySettlementId || p.gatewayPayoutId || p.id}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-xs">
                          {p.referenceNumber || "—"}
                        </span>
                      </td>
                      <td className="font-semibold">{formatMoney(p.amountPaise)}</td>
                      <td>
                        <span
                          className={
                            p.status === "paid"
                              ? styles.badgeSuccess
                              : styles.badgePending
                          }
                        >
                          {p.status === "paid" ? "Settled" : p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "orders" && (
          <div className={styles.tableContainer}>
            {orders.length === 0 ? (
              <div className={styles.emptyState}>No orders captured yet.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Attendee</th>
                    <th>Gross</th>
                    <th>Net Organizer</th>
                    <th>Transfer Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((item) => {
                    const order = item.order as {
                      id: string;
                      totalPaise: number;
                      organizerNetPaise?: number;
                      transferStatus?: string;
                      createdAt: string;
                    };
                    return (
                      <tr key={order.id}>
                        <td className="font-mono text-xs">{order.id.slice(0, 8)}...</td>
                        <td>{item.attendee?.name || item.attendee?.email || "Guest"}</td>
                        <td>{formatMoney(order.totalPaise)}</td>
                        <td className="font-semibold">
                          {formatMoney(order.organizerNetPaise ?? 0)}
                        </td>
                        <td>
                          <span
                            className={
                              order.transferStatus === "settled"
                                ? styles.badgeSuccess
                                : styles.badgePending
                            }
                          >
                            {order.transferStatus || "pending"}
                          </span>
                        </td>
                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "refunds" && (
          <div className={styles.tableContainer}>
            {allRefunds.length === 0 ? (
              <div className={styles.emptyState}>No refunds issued.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Refund ID</th>
                    <th>Order ID</th>
                    <th>Amount</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {allRefunds.map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono text-xs">{r.id.slice(0, 8)}...</td>
                      <td className="font-mono text-xs">{r.orderId.slice(0, 8)}...</td>
                      <td className="font-semibold text-rose-400">
                        {formatMoney(r.amountPaise)}
                      </td>
                      <td>{r.reason || "Attendee refund"}</td>
                      <td>
                        <span
                          className={
                            r.status === "processed"
                              ? styles.badgeSuccess
                              : styles.badgePending
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                      <td>
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Bank Account Modal with Phone KYC */}
      {showBankModal && (
        <BankModal
          eventId={eventId}
          initialAccount={bankAccount}
          onClose={() => setShowBankModal(false)}
          onSuccess={() => {
            setShowBankModal(false);
            refreshData();
          }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Bank Account KYC Modal
// -------------------------------------------------------------
interface BankModalProps {
  eventId: string;
  initialAccount: OrganizerBankAccount | null;
  onClose: () => void;
  onSuccess: () => void;
}

function BankModal({
  eventId,
  initialAccount,
  onClose,
  onSuccess,
}: BankModalProps) {
  const [accountHolderName, setAccountHolderName] = useState(
    initialAccount?.accountHolderName || "",
  );
  const [phone, setPhone] = useState(initialAccount?.phone || "");
  const [accountNumber, setAccountNumber] = useState(
    initialAccount?.accountNumber || "",
  );
  const [confirmAccountNumber, setConfirmAccountNumber] = useState(
    initialAccount?.accountNumber || "",
  );
  const [ifscCode, setIfscCode] = useState(initialAccount?.ifscCode || "");
  const [bankName, setBankName] = useState(initialAccount?.bankName || "");
  const [upiId, setUpiId] = useState(initialAccount?.upiId || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountHolderName.trim()) {
      setError("Account holder name is required.");
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 20) {
      setError("Please provide a valid 10-digit mobile number for bank KYC.");
      return;
    }
    if (accountNumber !== confirmAccountNumber) {
      setError("Bank account numbers do not match.");
      return;
    }
    if (accountNumber.length < 9 || accountNumber.length > 34) {
      setError("Account number must be between 9 and 34 characters.");
      return;
    }
    const cleanIfsc = ifscCode.trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      setError("Invalid IFSC code format (e.g., HDFC0001234).");
      return;
    }
    if (!bankName.trim()) {
      setError("Bank name is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await saveBankAccount(eventId, {
        accountHolderName: accountHolderName.trim(),
        phone: cleanPhone,
        accountNumber: accountNumber.trim(),
        ifscCode: cleanIfsc,
        bankName: bankName.trim(),
        upiId: upiId.trim() || undefined,
      });
      toast.success("Bank account details & KYC linked successfully");
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to save bank account details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>Connect Payout Bank Account</h3>
            <p className={styles.modalSubtitle}>
              Direct settlements via Razorpay Route require verified KYC details.
            </p>
          </div>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && (
              <div className={styles.modalAlertBox}>
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Account Holder Name *</label>
              <input
                type="text"
                className={styles.input}
                placeholder="As registered with your bank"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                Phone Number (KYC Verification) *
              </label>
              <input
                type="tel"
                className={styles.input}
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Bank Name *</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. HDFC Bank, ICICI Bank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Account Number *</label>
              <input
                type="password"
                className={styles.input}
                placeholder="Enter bank account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Confirm Account Number *</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Re-enter bank account number"
                value={confirmAccountNumber}
                onChange={(e) => setConfirmAccountNumber(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>IFSC Code *</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. HDFC0001234"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                required
                maxLength={11}
                disabled={loading}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>UPI ID (Optional)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. organizer@okhdfc"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save & Connect Bank"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
