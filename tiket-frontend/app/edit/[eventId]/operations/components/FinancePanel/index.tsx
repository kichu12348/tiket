"use client";

import { useState } from "react";
import type { Finance, Refund } from "@/types/commerce";
import { formatMoney, parseMinorUnits } from "@/lib/money";
import {
  Coins,
  CircleDollarSign,
  ArrowUpRight,
  Wallet,
  ShoppingBag,
  Receipt,
  ChevronDown,
  RotateCcw,
  AlertCircle,
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
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const captured = data.capturedPaise;
  const processedRefunds = data.refunds.filter(
    (refund) => refund.status === "processed",
  );
  const refunded = processedRefunds.reduce(
    (sum, refund) => sum + refund.amountPaise,
    0,
  );
  const netRevenue = captured - refunded;

  const toggleOrder = (orderId: string) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.iconBox}>
            <Coins size={20} />
          </div>
          <div className={styles.headerText}>
            <h2 className={styles.title}>Payments & Financials</h2>
            <p className={styles.subtitle}>
              Real-time payment ledger, ticket price breakdowns, and refund
              reconciliation for this event.
            </p>
          </div>
        </div>
        <div className={styles.countBadge}>
          <Receipt size={14} />
          <span>Latest {data.orders.length} Orders</span>
        </div>
      </div>

      {/* Financial Metric Cards Grid */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Total Captured</span>
            <CircleDollarSign size={18} className={styles.metricIcon} />
          </div>
          <span className={styles.metricValue}>{formatMoney(captured)}</span>
          <span className={styles.metricDesc}>Gross payments recorded</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Total Refunded</span>
            <ArrowUpRight size={18} className={styles.metricIcon} />
          </div>
          <span className={styles.metricValue}>{formatMoney(refunded)}</span>
          <span className={styles.metricDesc}>
            {processedRefunds.length} processed refund
            {processedRefunds.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Net Settlement</span>
            <Wallet size={18} className={styles.metricIcon} />
          </div>
          <span className={styles.metricValue}>{formatMoney(netRevenue)}</span>
          <span className={styles.metricDesc}>Net retained balance</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Orders Processed</span>
            <ShoppingBag size={18} className={styles.metricIcon} />
          </div>
          <span className={styles.metricValue}>{data.orders.length}</span>
          <span className={styles.metricDesc}>Total checkout records</span>
        </div>
      </div>

      {/* Orders Ledger Section */}
      <div className={styles.ledgerSection}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Transaction Records</h3>
        </div>

        {data.orders.length === 0 ? (
          <div className={styles.emptyState}>
            <Receipt size={32} className={styles.emptyIcon} />
            <h4 className={styles.emptyTitle}>No transaction records</h4>
            <p className={styles.emptyDesc}>
              No ticket purchases or orders have been processed for this event
              yet.
            </p>
          </div>
        ) : (
          <div className={`${styles.ordersList} scrollbar`}>
            {data.orders.map(({ order, attendee }) => {
              const refunds = data.refunds.filter(
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
              const items = data.items.filter(
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
                order.paymentProvider === "razorpay" &&
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
                          {new Date(order.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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
                            <div key={refund.id} className={styles.refundRow}>
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
                          submit={(amount, reason) =>
                            onRefund(order.id, amount, reason)
                          }
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
    </section>
  );
}

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
