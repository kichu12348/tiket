"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useParams } from "next/navigation";
import { getEventFinance } from "@/api/commerce";
import type { Finance } from "@/types/commerce";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/card";
import {
  CircleDollarSign,
  Wallet,
  Landmark,
  Receipt,
  RotateCcw,
} from "lucide-react";
import BankAccountCard from "./components/BankAccountCard";
import SettlementsTable from "./components/SettlementsTable";
import styles from "./FinancePage.module.css";

interface FinancePageProps {
  params?: Promise<{ eventId: string }>;
}

export default function FinancePage({ params }: FinancePageProps) {
  const routeParams = useParams();
  const unwrapped = params ? use(params) : null;
  const eventId = unwrapped?.eventId || (routeParams?.eventId as string) || "";

  const [finance, setFinance] = useState<Finance | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(eventId));
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    if (!eventId) return;

    getEventFinance(eventId)
      .then((data) => {
        if (mounted) {
          setFinance(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          toast.error(getErrorMessage(err) || "Failed to load finance details");
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [eventId, refreshKey]);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setRefreshKey((k) => k + 1);
  }, []);

  const summary = finance?.summary || {
    grossSalesPaise: finance?.capturedPaise || 0,
    totalDiscountsPaise: 0,
    platformFeesPaise: 0,
    taxesPaise: 0,
    totalRefundedPaise: 0,
    netEarningsPaise: 0,
    withdrawnOrPendingPaise: 0,
    availableToWithdrawPaise: 0,
    unsettledBalancePaise: 0,
  };

  const netEarnings =
    summary.netEarningsPaise ||
    (finance?.capturedPaise
      ? finance.capturedPaise - (summary.platformFeesPaise || 0)
      : 0);

  const unsettledBalancePaise =
    finance?.unsettledBalancePaise ?? summary.unsettledBalancePaise ?? 0;

  const payouts = finance?.payouts || [];
  const settledPaise = payouts
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amountPaise, 0);

  const orders = finance?.orders || [];
  const paidOrdersCount = orders.filter(
    (item) =>
      item.order.paymentStatus === "success" ||
      item.order.registrationStatus === "confirmed" ||
      (item.order.totalPaise > 0 &&
        item.order.paymentStatus !== "failed" &&
        item.order.paymentStatus !== "pending"),
  ).length;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Event Finance</h1>
          <p className={styles.subtitle}>
            Overview of revenue, automated Razorpay Route payouts, and linked bank details.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className={styles.refreshButton}
            aria-label="Refresh financial data"
          >
            <RotateCcw size={15} className={isLoading ? styles.spinning : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 4-Card KPI Summary Grid */}
      <div className={styles.metricsGrid}>
        {/* 1. Net Organizer Revenue */}
        <Card className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Net Organizer Revenue</span>
            <CircleDollarSign size={18} className={styles.metricIcon} />
          </div>
          <span className={styles.metricValue}>
            {formatMoney(netEarnings)}
          </span>
          <span className={styles.metricDesc}>
            Net earnings after platform fees
          </span>
        </Card>

        {/* 2. Unsettled Balance (Available for Refunds) */}
        <Card className={styles.metricCard}>
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
        </Card>

        {/* 3. Settled to Bank */}
        <Card className={styles.metricCard}>
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
        </Card>

        {/* 4. Paid Orders count */}
        <Card className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Paid Orders</span>
            <Receipt size={18} className={styles.metricIcon} />
          </div>
          <span className={styles.metricValue}>
            {paidOrdersCount.toLocaleString()}
          </span>
          <span className={styles.metricDesc}>
            Completed ticket orders
          </span>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className={styles.mainGrid}>
        {/* Bank Account Connection Card */}
        <BankAccountCard
          eventId={eventId}
          initialAccount={finance?.bankAccount || null}
          onUpdated={handleRefresh}
        />

        {/* Settlements and Transfers Table */}
        <SettlementsTable
          orders={orders}
          payouts={payouts}
          items={finance?.items || []}
        />
      </div>
    </div>
  );
}
