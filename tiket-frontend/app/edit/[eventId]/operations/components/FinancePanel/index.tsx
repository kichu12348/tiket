"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import type {
  Finance,
  OrganizerBankAccount,
  PayoutRequest,
  Refund,
} from "@/types/commerce";
import { formatMoney, parseMinorUnits } from "@/lib/money";
import { getErrorMessage } from "@/lib/errors";
import {
  getFinance,
  requestPayout,
  saveBankAccount,
} from "@/api/commerce";
import { toast } from "sonner";
import {
  Coins,
  CircleDollarSign,
  ArrowUpRight,
  Wallet,
  Receipt,
  ChevronDown,
  RotateCcw,
  AlertCircle,
  Landmark,
  ArrowDownToLine,
  X,
  ShieldCheck,
  Clock,
  AlertTriangle,
} from "lucide-react";
import styles from "./FinancePanel.module.css";

interface FinancePanelProps {
  data: Finance;
  canRefund: boolean;
  disabled: boolean;
  onRefund: (id: string, amount: number, reason: string) => Promise<boolean>;
}

export default function FinancePanel({
  data,
  canRefund,
  disabled,
  onRefund,
}: FinancePanelProps) {
  const params = useParams<{ eventId?: string }>();
  const eventId = params?.eventId || "";

  const [customFinance, setCustomFinance] = useState<Finance | null>(null);
  const [prevData, setPrevData] = useState(data);

  if (prevData !== data) {
    setPrevData(data);
    setCustomFinance(null);
  }

  const financeData = customFinance ?? data;
  const [activeTab, setActiveTab] = useState<"orders" | "payouts" | "refunds">("orders");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const summary = financeData.summary || {
    grossSalesPaise: financeData.capturedPaise || 0,
    totalDiscountsPaise: 0,
    platformFeesPaise: 0,
    taxesPaise: 0,
    totalRefundedPaise:
      financeData.refunds
        ?.filter((r) => r.status === "processed")
        .reduce((sum, r) => sum + r.amountPaise, 0) || 0,
    netEarningsPaise:
      (financeData.capturedPaise || 0) -
      (financeData.refunds
        ?.filter((r) => r.status === "processed")
        .reduce((sum, r) => sum + r.amountPaise, 0) || 0),
    withdrawnOrPendingPaise: 0,
    availableToWithdrawPaise:
      (financeData.capturedPaise || 0) -
      (financeData.refunds
        ?.filter((r) => r.status === "processed")
        .reduce((sum, r) => sum + r.amountPaise, 0) || 0),
  };

  const bankAccount = financeData.bankAccount || null;
  const payouts = financeData.payouts || [];
  const allRefunds = financeData.refunds || [];
  const platformFeesAndTaxes = summary.platformFeesPaise + summary.taxesPaise;

  const toggleOrder = (orderId: string) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  const reloadFinance = async () => {
    if (!eventId) return;
    try {
      const refreshed = await getFinance(eventId);
      setCustomFinance(refreshed);
    } catch {
      // Ignored if background sync fails
    }
  };

  return (
    <section className={styles.card} aria-label="Payments & Financials">
      {/* Card Header with Main Action Buttons */}
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.iconBox}>
            <Coins size={20} />
          </div>
          <div className={styles.headerText}>
            <h2 className={styles.title}>Payments & Financials</h2>
            <p className={styles.subtitle}>
              Ledger of ticket sales, platform fees, taxes, refunds, and bank payouts.
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => setShowBankModal(true)}
            disabled={disabled}
            aria-label="Manage Bank Account"
          >
            <Landmark size={15} />
            <span>{bankAccount ? "Bank Account" : "Connect Bank"}</span>
          </button>

          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => setShowWithdrawModal(true)}
            disabled={
              disabled ||
              summary.availableToWithdrawPaise <= 0 ||
              !bankAccount
            }
            aria-label="Withdraw Funds"
          >
            <ArrowDownToLine size={15} />
            <span>Withdraw Funds</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Metric Summary Cards */}
      <div className={styles.metricsGrid}>
        {/* 1. Gross Revenue */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Gross Revenue</span>
            <CircleDollarSign size={18} className={styles.metricIcon} />
          </div>
          <span className={styles.metricValue}>
            {formatMoney(summary.grossSalesPaise)}
          </span>
          <span className={styles.metricDesc}>Total Captured</span>
        </div>

        {/* 2. Platform Fees & Taxes */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Platform Fees & Taxes</span>
            <Receipt size={18} className={styles.metricIcon} />
          </div>
          <span className={styles.metricValue}>
            {formatMoney(platformFeesAndTaxes)}
          </span>
          <span className={styles.metricDesc}>Platform & statutory taxes</span>
        </div>

        {/* 3. Refunded */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Refunded</span>
            <ArrowUpRight size={18} className={styles.metricIcon} />
          </div>
          <span className={styles.metricValue}>
            {formatMoney(summary.totalRefundedPaise)}
          </span>
          <span className={styles.metricDesc}>
            {allRefunds.filter((r) => r.status === "processed").length} processed refund
            {allRefunds.filter((r) => r.status === "processed").length === 1 ? "" : "s"}
          </span>
        </div>

        {/* 4. Withdrawn / Processing */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Withdrawn / Processing</span>
            <Clock size={18} className={styles.metricIcon} />
          </div>
          <span className={styles.metricValue}>
            {formatMoney(summary.withdrawnOrPendingPaise)}
          </span>
          <span className={styles.metricDesc}>Settled & pending payouts</span>
        </div>

        {/* 5. Available Balance */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Available Balance</span>
            <Wallet size={18} className={styles.metricIcon} />
          </div>
          <span className={styles.metricValue}>
            {formatMoney(summary.availableToWithdrawPaise)}
          </span>
          <span className={styles.metricDesc}>Available for withdrawal</span>
        </div>
      </div>

      {/* Connected Bank Account Snapshot or Warning Banner */}
      {bankAccount ? (
        <div className={styles.bankCard}>
          <div className={styles.bankCardHeader}>
            <div className={styles.bankCardLeft}>
              <Landmark size={20} className={styles.bankIcon} />
              <div>
                <h3 className={styles.bankCardTitle}>
                  Payout Account: {bankAccount.bankName}
                </h3>
                <span className={styles.bankCardSubtitle}>
                  Primary settlement destination for ticket revenue
                </span>
              </div>
            </div>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setShowBankModal(true)}
              disabled={disabled}
            >
              <span>Edit Details</span>
            </button>
          </div>

          <div className={styles.bankDetailsGrid}>
            <div className={styles.bankDetailItem}>
              <span className={styles.bankDetailLabel}>Account Holder</span>
              <span className={styles.bankDetailValue}>
                {bankAccount.accountHolderName}
              </span>
            </div>
            <div className={styles.bankDetailItem}>
              <span className={styles.bankDetailLabel}>Account Number</span>
              <span className={styles.bankDetailValue}>
                {bankAccount.accountNumber}
              </span>
            </div>
            <div className={styles.bankDetailItem}>
              <span className={styles.bankDetailLabel}>IFSC Code</span>
              <span className={styles.bankDetailValue}>
                {bankAccount.ifscCode}
              </span>
            </div>
            {bankAccount.upiId && (
              <div className={styles.bankDetailItem}>
                <span className={styles.bankDetailLabel}>UPI ID</span>
                <span className={styles.bankDetailValue}>
                  {bankAccount.upiId}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.bankAlertBanner}>
          <div className={styles.bankAlertLeft}>
            <AlertTriangle size={20} />
            <div className={styles.bankAlertText}>
              <span className={styles.bankAlertTitle}>
                No Bank Account Connected
              </span>
              <span className={styles.bankAlertDesc}>
                Add your verified bank details to receive automatic settlements and request withdrawals.
              </span>
            </div>
          </div>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => setShowBankModal(true)}
            disabled={disabled}
          >
            <Landmark size={14} />
            <span>Add Bank Account</span>
          </button>
        </div>
      )}

      {/* Tabbed Finance Logs Section */}
      <div className={styles.ledgerSection}>
        <div className={styles.tabsNav} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "orders"}
            className={styles.tabBtn}
            data-active={activeTab === "orders"}
            onClick={() => setActiveTab("orders")}
          >
            <Receipt size={15} />
            <span>Order & Payment Logs</span>
            <span className={styles.tabBadge}>{financeData.orders.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "payouts"}
            className={styles.tabBtn}
            data-active={activeTab === "payouts"}
            onClick={() => setActiveTab("payouts")}
          >
            <ArrowDownToLine size={15} />
            <span>Withdrawal / Payout Logs</span>
            <span className={styles.tabBadge}>{payouts.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "refunds"}
            className={styles.tabBtn}
            data-active={activeTab === "refunds"}
            onClick={() => setActiveTab("refunds")}
          >
            <RotateCcw size={15} />
            <span>Refund Logs</span>
            <span className={styles.tabBadge}>{allRefunds.length}</span>
          </button>
        </div>

        {/* Tab 1: Orders & Payment Records */}
        {activeTab === "orders" && (
          <div>
            {financeData.orders.length === 0 ? (
              <div className={styles.emptyState}>
                <Receipt size={32} className={styles.emptyIcon} />
                <h4 className={styles.emptyTitle}>No transaction records</h4>
                <p className={styles.emptyDesc}>
                  No ticket purchases or orders have been processed for this event yet.
                </p>
              </div>
            ) : (
              <div className={`${styles.ordersList} scrollbar`}>
                {financeData.orders.map(({ order, attendee }) => {
                  const refunds = financeData.refunds.filter(
                    (refund) => refund.orderId === order.id,
                  );
                  const nonFailedRefunds = refunds.filter(
                    (refund) => refund.status !== "failed",
                  );
                  const refundedAmount = nonFailedRefunds.reduce(
                    (sum, refund) => sum + refund.amountPaise,
                    0,
                  );
                  const balance = order.totalPaise - refundedAmount;
                  const items = financeData.items.filter(
                    (item) => item.orderId === order.id,
                  );
                  const isExpanded = expandedOrderId === order.id;

                  const attendeeInitials = attendee.name
                    ? attendee.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "??";

                  const isRefundEligible =
                    canRefund &&
                    (!order.paymentProvider ||
                      order.paymentProvider === "razorpay") &&
                    ["success", "partially_refunded"].includes(
                      order.paymentStatus,
                    ) &&
                    balance > 0;

                  return (
                    <div key={order.id} className={styles.orderCard}>
                      <div
                        className={styles.orderHeader}
                        onClick={() => toggleOrder(order.id)}
                      >
                        <div className={styles.orderHeaderLeft}>
                          <div className={styles.avatar}>{attendeeInitials}</div>
                          <div className={styles.attendeeInfo}>
                            <div className={styles.attendeeName}>
                              <span>{attendee.name || "Anonymous Guest"}</span>
                              <span className={styles.orderIdPill}>
                                #{order.id.slice(0, 8)}
                              </span>
                            </div>
                            <span className={styles.attendeeEmail}>
                              {attendee.email}
                            </span>
                          </div>
                        </div>

                        <div className={styles.orderHeaderRight}>
                          <span
                            className={styles.statusPill}
                            data-status={order.paymentStatus}
                          >
                            {order.paymentStatus.replaceAll("_", " ")}
                          </span>
                          <span
                            className={styles.statusPill}
                            data-status={order.registrationStatus}
                          >
                            {order.registrationStatus.replaceAll("_", " ")}
                          </span>
                          <span className={styles.orderAmount}>
                            {formatMoney(order.totalPaise)}
                          </span>
                          <ChevronDown
                            size={17}
                            className={styles.chevronIcon}
                            data-open={isExpanded}
                          />
                        </div>
                      </div>

                      {isExpanded && (
                        <div className={styles.orderDetails}>
                          <div className={styles.orderMetaRow}>
                            <span>Order ID: {order.id}</span>
                            <span>
                              Provider: {order.paymentProvider || "Direct"}
                            </span>
                            <span>
                              Created:{" "}
                              {new Date(order.createdAt).toLocaleString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>

                          {/* Items breakdown */}
                          <div className={styles.itemsContainer}>
                            <span className={styles.itemTitle}>
                              Purchased Items Breakdown
                            </span>
                            {items.length === 0 ? (
                              <p className={styles.emptyDesc}>
                                No individual ticket line items recorded.
                              </p>
                            ) : (
                              items.map((item) => (
                                <div key={item.id} className={styles.itemRow}>
                                  <span className={styles.itemName}>
                                    {item.name}
                                  </span>
                                  <span className={styles.itemFormula}>
                                    {formatMoney(item.unitPricePaise)} (Base)
                                    {item.discountPaise > 0 &&
                                      ` − ${formatMoney(item.discountPaise)} (Discount)`}
                                    {item.ticketTaxPaise > 0 &&
                                      ` + ${formatMoney(item.ticketTaxPaise)} (Tax)`}
                                    {item.platformFeePaise > 0 &&
                                      ` + ${formatMoney(item.platformFeePaise)} (Fee)`}
                                  </span>
                                  <span className={styles.itemTotal}>
                                    {formatMoney(item.totalPaise)}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Refund history */}
                          {refunds.length > 0 && (
                            <div className={styles.refundHistory}>
                              <span className={styles.itemTitle}>
                                Refund History
                              </span>
                              {refunds.map((refund: Refund) => (
                                <div
                                  key={refund.id}
                                  className={styles.refundRow}
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={styles.statusPill}
                                      data-status={refund.status}
                                    >
                                      {refund.status}
                                    </span>
                                    <span className={styles.orderAmount}>
                                      {formatMoney(refund.amountPaise)}
                                    </span>
                                  </div>
                                  <span className={styles.refundReason}>
                                    Reason: {refund.reason}
                                    {refund.error ? ` (${refund.error})` : ""}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Refund form */}
                          {isRefundEligible && (
                            <RefundForm
                              key={balance}
                              balance={balance}
                              disabled={disabled}
                              submit={async (amount, reason) => {
                                const ok = await onRefund(order.id, amount, reason);
                                if (ok) await reloadFinance();
                                return ok;
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Withdrawal / Payout Logs */}
        {activeTab === "payouts" && (
          <div>
            {payouts.length === 0 ? (
              <div className={styles.emptyState}>
                <ArrowDownToLine size={32} className={styles.emptyIcon} />
                <h4 className={styles.emptyTitle}>No withdrawal records</h4>
                <p className={styles.emptyDesc}>
                  Withdrawal requests made to your bank account will be listed here.
                </p>
              </div>
            ) : (
              <div className={`${styles.ordersList} scrollbar`}>
                {payouts.map((payout: PayoutRequest) => (
                  <div key={payout.id} className={styles.payoutCard}>
                    <div className={styles.payoutCardHeader}>
                      <div className={styles.payoutHeaderLeft}>
                        <span className={styles.payoutAmount}>
                          {formatMoney(payout.amountPaise)}
                        </span>
                        <span
                          className={styles.statusPill}
                          data-status={payout.status}
                        >
                          {payout.status}
                        </span>
                      </div>
                      <div className={styles.payoutHeaderRight}>
                        <span className={styles.payoutDate}>
                          {new Date(payout.createdAt).toLocaleString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>
                    </div>

                    <div className={styles.payoutDetailsGrid}>
                      <div className={styles.payoutDetailItem}>
                        <span className={styles.payoutDetailLabel}>
                          Beneficiary
                        </span>
                        <span className={styles.payoutDetailValue}>
                          {payout.bankSnapshot.accountHolderName}
                        </span>
                      </div>
                      <div className={styles.payoutDetailItem}>
                        <span className={styles.payoutDetailLabel}>
                          Destination Bank
                        </span>
                        <span className={styles.payoutDetailValue}>
                          {payout.bankSnapshot.bankName} (
                          {payout.bankSnapshot.maskedAccountNumber})
                        </span>
                      </div>
                      <div className={styles.payoutDetailItem}>
                        <span className={styles.payoutDetailLabel}>
                          IFSC Code
                        </span>
                        <span className={styles.payoutDetailValue}>
                          {payout.bankSnapshot.ifscCode}
                        </span>
                      </div>
                      {payout.referenceNumber && (
                        <div className={styles.payoutDetailItem}>
                          <span className={styles.payoutDetailLabel}>
                            Reference / UTR
                          </span>
                          <span className={styles.payoutDetailValue}>
                            {payout.referenceNumber}
                          </span>
                        </div>
                      )}
                      {payout.notes && (
                        <div className={styles.payoutDetailItem}>
                          <span className={styles.payoutDetailLabel}>
                            Notes
                          </span>
                          <span className={styles.payoutDetailValue}>
                            {payout.notes}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Refund Logs */}
        {activeTab === "refunds" && (
          <div>
            {allRefunds.length === 0 ? (
              <div className={styles.emptyState}>
                <RotateCcw size={32} className={styles.emptyIcon} />
                <h4 className={styles.emptyTitle}>No refund records</h4>
                <p className={styles.emptyDesc}>
                  Any partial or full refunds processed for attendees will appear here.
                </p>
              </div>
            ) : (
              <div className={`${styles.ordersList} scrollbar`}>
                {allRefunds.map((refund: Refund) => (
                  <div key={refund.id} className={styles.refundCard}>
                    <div className={styles.refundCardHeader}>
                      <div className={styles.refundHeaderLeft}>
                        <span className={styles.refundAmount}>
                          {formatMoney(refund.amountPaise)}
                        </span>
                        <span
                          className={styles.statusPill}
                          data-status={refund.status}
                        >
                          {refund.status}
                        </span>
                      </div>
                      <div className={styles.refundHeaderRight}>
                        {refund.createdAt && (
                          <span className={styles.refundDate}>
                            {new Date(refund.createdAt).toLocaleString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={styles.refundDetailsGrid}>
                      <div className={styles.refundDetailItem}>
                        <span className={styles.refundDetailLabel}>
                          Associated Order
                        </span>
                        <span className={styles.refundDetailValue}>
                          #{refund.orderId.slice(0, 8)}
                        </span>
                      </div>
                      <div className={styles.refundDetailItem}>
                        <span className={styles.refundDetailLabel}>
                          Reason
                        </span>
                        <span className={styles.refundDetailValue}>
                          {refund.reason}
                        </span>
                      </div>
                      {refund.providerRefundId && (
                        <div className={styles.refundDetailItem}>
                          <span className={styles.refundDetailLabel}>
                            Gateway Refund ID
                          </span>
                          <span className={styles.refundDetailValue}>
                            {refund.providerRefundId}
                          </span>
                        </div>
                      )}
                      {refund.error && (
                        <div className={styles.refundDetailItem}>
                          <span className={styles.refundDetailLabel}>
                            Error
                          </span>
                          <span className="text-red-400 font-medium">
                            {refund.error}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bank Account Modal */}
      {showBankModal && (
        <BankAccountModal
          eventId={eventId}
          initialData={bankAccount}
          onClose={() => setShowBankModal(false)}
          onSaved={async (saved) => {
            setCustomFinance((prev) => ({
              ...(prev ?? data),
              bankAccount: saved,
            }));
            await reloadFinance();
            setShowBankModal(false);
          }}
        />
      )}

      {/* Withdraw Funds Modal */}
      {showWithdrawModal && bankAccount && (
        <WithdrawModal
          eventId={eventId}
          availableBalance={summary.availableToWithdrawPaise}
          bankAccount={bankAccount}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={async () => {
            await reloadFinance();
            setShowWithdrawModal(false);
          }}
        />
      )}
    </section>
  );
}

// -------------------------------------------------------------
// Bank Account Modal Component
// -------------------------------------------------------------
interface BankAccountModalProps {
  eventId: string;
  initialData: OrganizerBankAccount | null;
  onClose: () => void;
  onSaved: (account: OrganizerBankAccount) => void;
}

function BankAccountModal({
  eventId,
  initialData,
  onClose,
  onSaved,
}: BankAccountModalProps) {
  const [holderName, setHolderName] = useState(
    initialData?.accountHolderName || "",
  );
  const [bankName, setBankName] = useState(initialData?.bankName || "");
  const [accountNumber, setAccountNumber] = useState(
    initialData?.accountNumber && !initialData.accountNumber.includes("•")
      ? initialData.accountNumber
      : "",
  );
  const [ifscCode, setIfscCode] = useState(initialData?.ifscCode || "");
  const [upiId, setUpiId] = useState(initialData?.upiId || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHolder = holderName.trim();
    const cleanBank = bankName.trim();
    const cleanAccount = accountNumber.trim();
    const cleanIfsc = ifscCode.trim().toUpperCase();
    const cleanUpi = upiId.trim();

    if (!cleanHolder) {
      setError("Please enter the account holder name.");
      return;
    }
    if (!cleanBank) {
      setError("Please enter the bank name.");
      return;
    }
    if (!/^[0-9]{6,20}$/.test(cleanAccount)) {
      setError("Account number must be between 6 and 20 numeric digits.");
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      setError("Invalid IFSC code format (e.g. HDFC0001234).");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await saveBankAccount(eventId, {
        accountHolderName: cleanHolder,
        bankName: cleanBank,
        accountNumber: cleanAccount,
        ifscCode: cleanIfsc,
        upiId: cleanUpi || null,
      });
      toast.success("Bank account details saved successfully");
      onSaved(res.bankAccount);
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
            <h3 className={styles.modalTitle}>
              {initialData ? "Edit Bank Account Details" : "Connect Bank Account"}
            </h3>
            <p className={styles.modalSubtitle}>
              Ticket sales settlements will be transferred to this bank account.
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
              <label className={styles.inputLabel}>Account Holder Name</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. Rahul Sharma or TechFest Org"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Bank Name</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. HDFC Bank, State Bank of India"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Account Number</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. 50100234567890"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                inputMode="numeric"
                disabled={loading}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>IFSC Code</label>
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
                placeholder="e.g. rahul@okaxis"
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
              <ShieldCheck size={15} />
              <span>{loading ? "Saving..." : "Save Bank Details"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Withdraw Funds Modal Component
// -------------------------------------------------------------
interface WithdrawModalProps {
  eventId: string;
  availableBalance: number;
  bankAccount: OrganizerBankAccount;
  onClose: () => void;
  onSuccess: () => void;
}

function WithdrawModal({
  eventId,
  availableBalance,
  bankAccount,
  onClose,
  onSuccess,
}: WithdrawModalProps) {
  const [amount, setAmount] = useState((availableBalance / 100).toFixed(2));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amountPaise = parseMinorUnits(amount);
      if (amountPaise <= 0) {
        setError("Withdrawal amount must be greater than ₹0.00.");
        return;
      }
      if (amountPaise > availableBalance) {
        setError(
          `Withdrawal amount cannot exceed available balance of ${formatMoney(availableBalance)}.`,
        );
        return;
      }

      setLoading(true);
      setError("");
      await requestPayout(eventId, {
        amountPaise,
        notes: notes.trim() || null,
      });
      toast.success("Payout request submitted successfully");
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to submit withdrawal request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>Request Fund Withdrawal</h3>
            <p className={styles.modalSubtitle}>
              Transfer available event earnings to your connected bank account.
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

            {/* Available Balance Box */}
            <div className={styles.modalBalanceCard}>
              <span className={styles.modalBalanceLabel}>Available Balance</span>
              <span className={styles.modalBalanceValue}>
                {formatMoney(availableBalance)}
              </span>
            </div>

            {/* Destination Account Snapshot */}
            <div className={styles.bankDetailItem}>
              <span className={styles.bankDetailLabel}>
                Destination Account
              </span>
              <span className={styles.bankDetailValue}>
                {bankAccount.bankName} • {bankAccount.accountNumber} (
                {bankAccount.accountHolderName})
              </span>
            </div>

            {/* Amount Input with Quick Action */}
            <div className={styles.inputGroup}>
              <div className={styles.quickActionRow}>
                <label className={styles.inputLabel}>Withdrawal Amount (₹)</label>
                <button
                  type="button"
                  className={styles.quickActionBtn}
                  onClick={() => setAmount((availableBalance / 100).toFixed(2))}
                  disabled={loading}
                >
                  Withdraw All
                </button>
              </div>
              <input
                type="text"
                className={styles.input}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                inputMode="decimal"
                disabled={loading}
              />
            </div>

            {/* Optional Notes */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Reference Notes (Optional)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. Venue settlement, partial event withdrawal"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
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
              <ArrowDownToLine size={15} />
              <span>{loading ? "Submitting..." : "Confirm Withdrawal"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Inline Refund Form Component
// -------------------------------------------------------------
function RefundForm({
  balance,
  disabled,
  submit,
}: {
  balance: number;
  disabled: boolean;
  submit: (amount: number, reason: string) => Promise<boolean>;
}) {
  const [amount, setAmount] = useState((balance / 100).toFixed(2));
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const value = parseMinorUnits(amount);
      if (value <= 0 || value > balance) {
        throw new Error(
          `Refund amount must be between ₹0.01 and ${formatMoney(balance)}.`,
        );
      }
      if (!reason.trim()) {
        throw new Error("Please provide a reason for the refund.");
      }
      setError("");
      setIsSubmitting(true);
      await submit(value, reason.trim());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process refund.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.refundFormBox} onSubmit={handleSubmit}>
      <div className={styles.refundFormHeader}>
        <div className="flex items-center gap-2">
          <RotateCcw size={15} className="text-amber-400" />
          <span className={styles.refundFormTitle}>Issue Refund</span>
        </div>
        <span className={styles.refundableBadge}>
          Refundable Balance: {formatMoney(balance)}
        </span>
      </div>

      <p className={styles.refundNote}>
        Partial refunds retain attendee admission; issuing a full refund cancels
        the tickets and releases held spots.
      </p>

      <div className={styles.refundInputsGrid}>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>Amount (₹)</label>
          <input
            className={styles.input}
            required
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={disabled || isSubmitting}
            placeholder="0.00"
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>Reason</label>
          <input
            className={styles.input}
            required
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={disabled || isSubmitting}
            placeholder="e.g. Requested cancellation, duplicate charge..."
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-red-400 text-xs">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        className={styles.refundSubmitBtn}
        disabled={disabled || isSubmitting}
      >
        <RotateCcw size={14} />
        <span>{isSubmitting ? "Processing..." : "Process Refund"}</span>
      </button>
    </form>
  );
}
