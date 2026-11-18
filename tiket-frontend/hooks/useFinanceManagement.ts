import { useState, useEffect, useCallback, useMemo } from "react";
import { getFinance, saveBankAccount as apiSaveBankAccount } from "@/api/commerce";
import type {
  Finance,
  TransferRecord,
  SettlementRecord,
  DailyRevenuePoint,
  TierRevenueSummary,
  OrganizerBankAccount,
} from "@/types/commerce";
import {
  bankAccountSchema,
  type BankAccountFormValues,
} from "@/lib/validators/finance.validator";
import { useLiveEvent, useEventVersion } from "@/hooks/useLiveEvent";
import { useLiveStore } from "@/store/useLiveStore";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

export type DateRangeOption = "7d" | "30d" | "all";
export type LedgerTabOption = "transfers" | "settlements";

export function useFinanceManagement(eventId: string) {
  // Connect realtime websocket and fallback polling
  useLiveEvent(eventId);
  const liveVersion = useEventVersion(eventId);
  const isLiveConnected = useLiveStore((state) => state.connected);

  const [finance, setFinance] = useState<Finance | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(eventId));
  const [isSavingBank, setIsSavingBank] = useState<boolean>(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState<boolean>(false);
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeOption>("30d");
  const [ledgerTab, setLedgerTab] = useState<LedgerTabOption>("transfers");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadFinance = useCallback(async () => {
    if (!eventId) return;
    try {
      const data = await getFinance(eventId);
      setFinance(data);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to load financial telemetry");
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  // Initial load and auto-refresh on real-time version bumps
  useEffect(() => {
    void loadFinance();
  }, [loadFinance, liveVersion]);

  const openBankModal = useCallback(() => setIsBankModalOpen(true), []);
  const closeBankModal = useCallback(() => setIsBankModalOpen(false), []);

  const saveBankAccount = useCallback(
    async (payload: BankAccountFormValues): Promise<boolean> => {
      const result = bankAccountSchema.safeParse(payload);
      if (!result.success) {
        const firstError = result.error.errors[0]?.message || "Validation failed";
        toast.error(firstError);
        return false;
      }

      setIsSavingBank(true);
      try {
        await apiSaveBankAccount(eventId, {
          accountHolderName: result.data.accountHolderName,
          accountType: result.data.accountType,
          phone: result.data.phone,
          accountNumber: result.data.accountNumber,
          ifscCode: result.data.ifscCode,
          bankName: result.data.bankName,
        });

        toast.success("Bank account connected successfully");
        await loadFinance();
        setIsBankModalOpen(false);
        return true;
      } catch (err) {
        toast.error(getErrorMessage(err) || "Failed to connect bank account");
        return false;
      } finally {
        setIsSavingBank(false);
      }
    },
    [eventId, loadFinance],
  );

  // Filter daily revenue series according to dateRangeFilter
  const filteredDailyRevenue = useMemo<DailyRevenuePoint[]>(() => {
    const series = finance?.dailyRevenueSeries || [];
    if (dateRangeFilter === "all" || series.length === 0) return series;

    const days = dateRangeFilter === "7d" ? 7 : 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);

    return series.filter((pt) => pt.date >= cutoffStr);
  }, [finance?.dailyRevenueSeries, dateRangeFilter]);

  // All transfers from finance or fallback to finance.orders
  const allTransfers = useMemo<TransferRecord[]>(() => {
    if (finance?.transfers && finance.transfers.length > 0) {
      return finance.transfers;
    }

    // Fallback if legacy response
    const orders = finance?.orders || [];
    const items = finance?.items || [];
    return orders.map((item) => {
      const o = item.order;
      const ordItems = items.filter((it) => it.orderId === o.id);
      const grossPaise = ordItems.length
        ? ordItems.reduce((sum, it) => sum + it.unitPricePaise, 0)
        : o.totalPaise;
      const discountPaise = ordItems.reduce(
        (sum, it) => sum + (it.discountPaise || 0),
        0,
      );
      const feePaise = ordItems.reduce(
        (sum, it) =>
          sum + (it.platformFeePaise || 0) + (it.feeTaxPaise || 0),
        0,
      );
      const netPaise = ordItems.length
        ? ordItems.reduce(
            (sum, it) =>
              sum +
              (it.organizerNetPaise !== undefined && !Number.isNaN(it.organizerNetPaise)
                ? it.organizerNetPaise
                : it.unitPricePaise - it.discountPaise),
            0,
          )
        : o.totalPaise;

      let status: "pending" | "in_cycle" | "settled" | "reversed" = "pending";
      if (
        o.paymentStatus === "refunded" ||
        o.paymentStatus === "partially_refunded" ||
        o.transferStatus === "reversed"
      ) {
        status = "reversed";
      } else if (o.transferStatus === "settled" || o.transferReleased) {
        status = "settled";
      } else if (o.transferStatus === "processed") {
        status = "in_cycle";
      }

      return {
        orderId: o.id,
        buyerName: item.attendee?.name || "Guest",
        buyerEmail: item.attendee?.email || "—",
        ticketTypeName: ordItems[0]?.name || "Standard Ticket",
        couponCode: null,
        grossPaise,
        discountPaise,
        feePaise,
        netPaise,
        transferId: o.gatewayTransferId || null,
        status,
        createdAt: o.createdAt || new Date().toISOString(),
      };
    });
  }, [finance]);

  // All settlements from finance or fallback to finance.payouts
  const allSettlements = useMemo<SettlementRecord[]>(() => {
    if (finance?.settlements && finance.settlements.length > 0) {
      return finance.settlements;
    }

    const payouts = finance?.payouts || [];
    return payouts.map((p) => {
      let status: "settled" | "processing" | "failed" = "processing";
      if (p.status === "paid") status = "settled";
      else if (p.status === "rejected") status = "failed";

      return {
        id: p.id,
        settlementId: p.gatewaySettlementId || p.gatewayPayoutId || p.id,
        utr: p.referenceNumber || null,
        referenceNumber: p.referenceNumber || null,
        amountPaise: p.amountPaise,
        status,
        settledAt: p.processedAt || p.createdAt,
      };
    });
  }, [finance]);

  // Filter transfers by search and status
  const filteredTransfers = useMemo<TransferRecord[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    return allTransfers.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        t.orderId.toLowerCase().includes(q) ||
        t.buyerName.toLowerCase().includes(q) ||
        t.buyerEmail.toLowerCase().includes(q) ||
        (t.transferId && t.transferId.toLowerCase().includes(q)) ||
        (t.ticketTypeName && t.ticketTypeName.toLowerCase().includes(q)) ||
        (t.couponCode && t.couponCode.toLowerCase().includes(q))
      );
    });
  }, [allTransfers, searchQuery, statusFilter]);

  // Filter settlements by search and status
  const filteredSettlements = useMemo<SettlementRecord[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    return allSettlements.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        s.id.toLowerCase().includes(q) ||
        s.settlementId.toLowerCase().includes(q) ||
        (s.utr && s.utr.toLowerCase().includes(q)) ||
        (s.referenceNumber && s.referenceNumber.toLowerCase().includes(q))
      );
    });
  }, [allSettlements, searchQuery, statusFilter]);

  // Export filtered ledger to CSV
  const exportLedgerCsv = useCallback(
    (type: LedgerTabOption = ledgerTab) => {
      if (typeof window === "undefined") return;

      const escapeCsv = (val: string | number | null | undefined): string => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      let csvContent = "";
      let filename = "";

      if (type === "transfers") {
        const headers = [
          "Order ID",
          "Buyer Name",
          "Buyer Email",
          "Ticket Tier",
          "Coupon Code",
          "Gross (INR)",
          "Discount (INR)",
          "Platform Fee (INR)",
          "Net Revenue (INR)",
          "Transfer ID",
          "Status",
          "Date",
        ];
        const rows = filteredTransfers.map((t) => [
          t.orderId,
          t.buyerName,
          t.buyerEmail,
          t.ticketTypeName,
          t.couponCode || "None",
          (t.grossPaise / 100).toFixed(2),
          (t.discountPaise / 100).toFixed(2),
          (t.feePaise / 100).toFixed(2),
          (t.netPaise / 100).toFixed(2),
          t.transferId || "Pending",
          t.status,
          t.createdAt,
        ]);
        csvContent = [
          headers.map(escapeCsv).join(","),
          ...rows.map((row) => row.map(escapeCsv).join(",")),
        ].join("\n");
        filename = `transfers-${eventId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`;
      } else {
        const headers = [
          "Settlement ID",
          "Bank UTR",
          "Amount (INR)",
          "Status",
          "Settled At",
        ];
        const rows = filteredSettlements.map((s) => [
          s.settlementId,
          s.utr || "Pending",
          (s.amountPaise / 100).toFixed(2),
          s.status,
          s.settledAt,
        ]);
        csvContent = [
          headers.map(escapeCsv).join(","),
          ...rows.map((row) => row.map(escapeCsv).join(",")),
        ].join("\n");
        filename = `settlements-${eventId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`;
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${type} to CSV`);
    },
    [eventId, filteredSettlements, filteredTransfers, ledgerTab],
  );

  // Derived metrics
  const summary = useMemo(() => {
    const s = finance?.summary;
    const grossPaise =
      finance?.grossRevenuePaise ?? s?.grossRevenuePaise ?? s?.grossSalesPaise ?? finance?.capturedPaise ?? 0;
    const netPaise =
      finance?.netOrganizerRevenuePaise ?? s?.netOrganizerRevenuePaise ?? s?.netEarningsPaise ?? 0;
    const discountsPaise =
      finance?.totalDiscountsPaise ?? s?.totalDiscountsPaise ?? 0;
    const feesPaise =
      finance?.platformFeesPaise ?? s?.platformFeesPaise ?? 0;
    const unsettledPaise =
      finance?.unsettledBalancePaise ?? s?.unsettledBalancePaise ?? 0;
    const settledPaise =
      finance?.settledBalancePaise ?? s?.settledBalancePaise ?? 0;
    const refundedPaise =
      finance?.totalRefundedPaise ?? s?.totalRefundedPaise ?? 0;
    const paidCount =
      finance?.paidOrdersCount ?? s?.paidOrdersCount ?? allTransfers.length;
    const refundedCount =
      finance?.refundedOrdersCount ?? s?.refundedOrdersCount ?? 0;

    return {
      grossRevenuePaise: grossPaise,
      netOrganizerRevenuePaise: netPaise,
      totalDiscountsPaise: discountsPaise,
      platformFeesPaise: feesPaise,
      unsettledBalancePaise: unsettledPaise,
      settledBalancePaise: settledPaise,
      totalRefundedPaise: refundedPaise,
      paidOrdersCount: paidCount,
      refundedOrdersCount: refundedCount,
    };
  }, [finance, allTransfers.length]);

  const bankAccount: OrganizerBankAccount | null = finance?.bankAccount ?? null;
  const revenueByTier: TierRevenueSummary[] = finance?.revenueByTier || [];

  return {
    finance,
    summary,
    bankAccount,
    revenueByTier,
    dailyRevenueSeries: filteredDailyRevenue,
    transfers: filteredTransfers,
    settlements: filteredSettlements,
    allTransfersCount: allTransfers.length,
    allSettlementsCount: allSettlements.length,
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
    refresh: loadFinance,
    saveBankAccount,
    exportLedgerCsv,
  };
}
