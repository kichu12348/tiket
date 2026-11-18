import { useParams } from "@tanstack/react-router";
import {
  useFinanceManagement,
  type DateRangeOption,
} from "@/hooks/useFinanceManagement";
import { formatMoney } from "@/lib/money";
import { Card } from "@/components/ui/card";
import {
  CircleDollarSign,
  Wallet,
  Landmark,
  Receipt,
  RotateCcw,
  Download,
  Settings,
} from "lucide-react";
import BankAccountCard from "@/app/edit/finance/components/BankAccountCard";
import BankAccountModal from "@/app/edit/finance/components/BankAccountModal";
import FinanceCharts from "@/app/edit/finance/components/FinanceCharts";
import SettlementsTable from "@/app/edit/finance/components/SettlementsTable";
import styles from "@/app/edit/finance/FinancePage.module.css";

export default function FinancePage() {
  const routeParams = useParams({ strict: false });
  const eventId = (routeParams?.eventId as string) || "";

  const {
    summary,
    bankAccount,
    revenueByTier,
    dailyRevenueSeries,
    transfers,
    settlements,
    isLoading,
    isSavingBank,
    isBankModalOpen,
    openBankModal,
    closeBankModal,
    dateRangeFilter,
    setDateRangeFilter,
    ledgerTab,
    setLedgerTab,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    isLiveConnected,
    refresh,
    saveBankAccount,
    exportLedgerCsv,
  } = useFinanceManagement(eventId);

  const subtextNetRevenue = `Gross ${formatMoney(summary.grossRevenuePaise)} · Fees ${formatMoney(summary.platformFeesPaise)} · Discounts ${formatMoney(summary.totalDiscountsPaise)}`;
  const subtextSettled = `${settlements.length} bank ${settlements.length === 1 ? "settlement" : "settlements"} disbursed`;
  const subtextOrders = `${summary.refundedOrdersCount} refunds (${formatMoney(summary.totalRefundedPaise)} refunded)`;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Finance & Payouts</h1>
            {isLiveConnected && (
              <span className={styles.liveBadge}>
                <span className={styles.liveDot} />
                Live Sync
              </span>
            )}
          </div>
          <p className={styles.subtitle}>
            Overview of revenue, automated Razorpay Route payouts, and linked
            bank details.
          </p>
        </div>

        <div className={styles.headerActions}>
          {/* Date Range Selector */}
          <select
            value={dateRangeFilter}
            onChange={(e) =>
              setDateRangeFilter(e.target.value as DateRangeOption)
            }
            className={styles.dateFilterSelect}
            aria-label="Filter date range"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>

          {/* Export CSV */}
          <button
            type="button"
            onClick={() => exportLedgerCsv(ledgerTab)}
            className={styles.actionButton}
            aria-label="Export current ledger to CSV"
            data-testid="export-csv-btn"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          {/* Bank Settings */}
          <button
            type="button"
            onClick={openBankModal}
            className={styles.actionButton}
            aria-label="Configure bank account settings"
            data-testid="bank-settings-btn"
          >
            <Settings size={14} />
            <span>Bank Settings</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isLoading}
            className={styles.actionButton}
            aria-label="Refresh financial data"
          >
            <RotateCcw size={14} className={isLoading ? styles.spinning : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 4-Card KPI Telemetry Grid */}
      <div className={styles.metricsGrid} data-testid="kpi-metrics-grid">
        {/* 1. Net Organizer Revenue */}
        <Card className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Net Organizer Revenue</span>
            <CircleDollarSign size={18} className={styles.metricIcon} />
          </div>
          <span className={styles.metricValue}>
            {formatMoney(summary.netOrganizerRevenuePaise)}
          </span>
          <span className={styles.metricDesc}>{subtextNetRevenue}</span>
        </Card>

        {/* 2. Unsettled Balance (Refund Pool) */}
        <Card className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>
              Unsettled Balance (Refund Pool)
            </span>
            <Wallet size={18} className={styles.metricIcon} />
          </div>
          <span className={styles.metricValue}>
            {formatMoney(summary.unsettledBalancePaise)}
          </span>
          <span className={styles.metricDesc}>
            Available for pre-event attendee refunds before settling to bank.
          </span>
        </Card>

        {/* 3. Settled to Bank */}
        <Card className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Settled to Bank</span>
            <Landmark size={18} className={styles.metricIcon} />
          </div>
          <span className={styles.metricValue}>
            {formatMoney(summary.settledBalancePaise)}
          </span>
          <span className={styles.metricDesc}>{subtextSettled}</span>
        </Card>

        {/* 4. Paid Orders & Refunds */}
        <Card className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Paid Orders & Refunds</span>
            <Receipt size={18} className={styles.metricIcon} />
          </div>
          <span className={styles.metricValue}>
            {summary.paidOrdersCount.toLocaleString()} Paid
          </span>
          <span className={styles.metricDesc}>{subtextOrders}</span>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className={styles.mainGrid}>
        {/* Bank Account Connection Banner / Card */}
        <BankAccountCard
          eventId={eventId}
          bankAccount={bankAccount}
          onOpenModal={openBankModal}
        />

        {/* Visual Analytics Grid */}
        <FinanceCharts
          dailyRevenueSeries={dailyRevenueSeries}
          revenueByTier={revenueByTier}
          grossRevenuePaise={summary.grossRevenuePaise}
          netOrganizerRevenuePaise={summary.netOrganizerRevenuePaise}
          platformFeesPaise={summary.platformFeesPaise}
          totalDiscountsPaise={summary.totalDiscountsPaise}
        />

        {/* Dual Ledger (Transfers & Bank Settlements) */}
        <SettlementsTable
          transfers={transfers}
          settlements={settlements}
          activeTab={ledgerTab}
          onTabChange={setLedgerTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </div>

      {/* Bank Account Configuration Modal */}
      <BankAccountModal
        isOpen={isBankModalOpen}
        initialAccount={bankAccount}
        isSubmitting={isSavingBank}
        onClose={closeBankModal}
        onSave={saveBankAccount}
      />
    </div>
  );
}
