import { useState } from "react";
import type { Order, PriceLine } from "@/types/order";
import type {
  PayoutRequest,
  TransferRecord,
  SettlementRecord,
} from "@/types/commerce";
import { formatMoney } from "@/lib/money";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Copy, Check, ArrowRightLeft, Landmark } from "lucide-react";
import { toast } from "sonner";
import styles from "./SettlementsTable.module.css";

export interface SettlementOrder {
  order: Order & {
    organizerNetPaise?: number;
    transferStatus?: string | null;
  };
  attendee: {
    name: string;
    email: string;
  };
}

export interface SettlementsTableProps {
  transfers?: TransferRecord[];
  settlements?: SettlementRecord[];
  orders?: SettlementOrder[];
  payouts?: PayoutRequest[];
  items?: (PriceLine & {
    id: string;
    orderId: string;
    name: string;
    ticketId: string;
  })[];
  activeTab?: "transfers" | "settlements";
  onTabChange?: (tab: "transfers" | "settlements") => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (s: string) => void;
}

export default function SettlementsTable({
  transfers: propTransfers,
  settlements: propSettlements,
  orders = [],
  payouts = [],
  items = [],
  activeTab: controlledTab,
  onTabChange,
  searchQuery: controlledSearch,
  onSearchChange,
  statusFilter: controlledStatus,
  onStatusFilterChange,
}: SettlementsTableProps) {
  const [internalTab, setInternalTab] = useState<"transfers" | "settlements">(
    "transfers",
  );
  const [internalSearch, setInternalSearch] = useState<string>("");
  const [internalStatus, setInternalStatus] = useState<string>("all");
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  const activeTab = controlledTab ?? internalTab;
  const setTab = (t: "transfers" | "settlements") => {
    setInternalTab(t);
    onTabChange?.(t);
  };

  const searchQuery = controlledSearch ?? internalSearch;
  const setSearch = (q: string) => {
    setInternalSearch(q);
    onSearchChange?.(q);
  };

  const statusFilter = controlledStatus ?? internalStatus;
  const setStatus = (s: string) => {
    setInternalStatus(s);
    onStatusFilterChange?.(s);
  };

  // Build transfers list if not provided directly
  const transfers: TransferRecord[] =
    propTransfers && propTransfers.length > 0
      ? propTransfers
      : orders.map((item) => {
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
          const netPaise =
            o.organizerNetPaise ??
            (ordItems.length
              ? ordItems.reduce(
                  (sum, it) =>
                    sum +
                    (it.organizerNetPaise !== undefined &&
                    !Number.isNaN(it.organizerNetPaise)
                      ? it.organizerNetPaise
                      : it.unitPricePaise - it.discountPaise),
                  0,
                )
              : o.totalPaise);

          let status: "pending" | "in_cycle" | "settled" | "reversed" =
            "pending";
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

  // Build settlements list if not provided directly
  const settlements: SettlementRecord[] =
    propSettlements && propSettlements.length > 0
      ? propSettlements
      : payouts.map((p) => {
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

  // Filter transfers locally if not using controlled props
  const displayedTransfers =
    controlledSearch !== undefined && controlledStatus !== undefined
      ? transfers
      : transfers.filter((t) => {
          if (statusFilter !== "all" && t.status !== statusFilter) {
            return false;
          }
          const q = searchQuery.trim().toLowerCase();
          if (!q) return true;
          return (
            t.orderId.toLowerCase().includes(q) ||
            t.buyerName.toLowerCase().includes(q) ||
            t.buyerEmail.toLowerCase().includes(q) ||
            (t.transferId && t.transferId.toLowerCase().includes(q))
          );
        });

  // Filter settlements locally if not using controlled props
  const displayedSettlements =
    controlledSearch !== undefined && controlledStatus !== undefined
      ? settlements
      : settlements.filter((s) => {
          if (statusFilter !== "all" && s.status !== statusFilter) {
            return false;
          }
          const q = searchQuery.trim().toLowerCase();
          if (!q) return true;
          return (
            s.id.toLowerCase().includes(q) ||
            s.settlementId.toLowerCase().includes(q) ||
            (s.utr && s.utr.toLowerCase().includes(q)) ||
            (s.referenceNumber && s.referenceNumber.toLowerCase().includes(q))
          );
        });

  const handleCopyUtr = (utr: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(utr);
      setCopiedUtr(utr);
      toast.success("UTR copied to clipboard");
      setTimeout(() => setCopiedUtr(null), 2000);
    }
  };

  const renderTransferStatusBadge = (status: string) => {
    switch (status) {
      case "settled":
        return <span className={styles.badgeSettled}>Settled to Bank</span>;
      case "in_cycle":
        return (
          <span className={styles.badgeInCycle}>In Cycle · Refundable</span>
        );
      case "reversed":
        return (
          <span className={styles.badgeReversed}>Reversed (Refunded)</span>
        );
      default:
        return <span className={styles.badgePending}>Pending</span>;
    }
  };

  const renderSettlementStatusBadge = (status: string) => {
    switch (status) {
      case "settled":
        return <span className={styles.badgeSettled}>Settled</span>;
      case "failed":
        return <span className={styles.badgeReversed}>Failed</span>;
      default:
        return <span className={styles.badgeInCycle}>Processing</span>;
    }
  };

  return (
    <div className={styles.card} data-testid="settlements-table-container">
      <div className={styles.cardHeader}>
        <div className={styles.headerTop}>
          <div className={styles.titleGroup}>
            <h3 className={styles.cardTitle}>Transfers & Settlements</h3>
            <p className={styles.cardDescription}>
              Per-ticket Route split transfers and batch disbursements deposited
              into your bank account.
            </p>
          </div>
        </div>

        {/* Toolbar: Sliding Tabs + Search + Filter */}
        <div className={styles.toolbarRow}>
          <div className={styles.tabsList} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "transfers"}
              className={`${styles.tabsTrigger} ${activeTab === "transfers" ? styles.tabsTriggerActive : ""}`}
              onClick={() => setTab("transfers")}
              data-testid="tab-order-transfers"
            >
              Order Transfers ({transfers.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "settlements"}
              className={`${styles.tabsTrigger} ${activeTab === "settlements" ? styles.tabsTriggerActive : ""}`}
              onClick={() => setTab("settlements")}
              data-testid="tab-bank-settlements"
            >
              Bank Settlements ({settlements.length})
            </button>
          </div>

          <div className={styles.filtersGroup}>
            <div className={styles.searchWrapper}>
              <Search size={14} className={styles.searchIcon} />
              <Input
                type="text"
                placeholder={
                  activeTab === "transfers"
                    ? "Search order, buyer..."
                    : "Search UTR, settlement ID..."
                }
                value={searchQuery}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
                data-testid="finance-table-search-input"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatus(e.target.value)}
              className={styles.statusFilterSelect}
              data-testid="finance-table-status-filter"
            >
              <option value="all">All Statuses</option>
              {activeTab === "transfers" ? (
                <>
                  <option value="in_cycle">In Cycle / Unsettled</option>
                  <option value="settled">Settled</option>
                  <option value="reversed">Reversed / Refunded</option>
                  <option value="pending">Pending</option>
                </>
              ) : (
                <>
                  <option value="settled">Settled</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Failed</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Tab 1: Order Transfers Table */}
      {activeTab === "transfers" && (
        <>
          {displayedTransfers.length === 0 ? (
            <div className={styles.emptyState}>
              <ArrowRightLeft size={24} />
              <span>No order transfers match your filter criteria.</span>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <Table>
                <TableHeader>
                  <TableRow className={styles.tableHeaderRow}>
                    <TableHead className={styles.tableHead}>Order ID</TableHead>
                    <TableHead className={styles.tableHead}>Buyer</TableHead>
                    <TableHead className={styles.tableHead}>Tier</TableHead>
                    <TableHead className={styles.tableHead}>Gross</TableHead>
                    <TableHead className={styles.tableHead}>Discount</TableHead>
                    <TableHead className={styles.tableHead}>
                      Net Organizer Share
                    </TableHead>
                    <TableHead className={styles.tableHead}>
                      Route Transfer ID
                    </TableHead>
                    <TableHead className={styles.tableHead}>Status</TableHead>
                    <TableHead className={styles.tableHead}>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedTransfers.map((item) => {
                    let formattedDate = item.createdAt;
                    try {
                      formattedDate = new Date(
                        item.createdAt,
                      ).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });
                    } catch {
                      formattedDate = item.createdAt;
                    }

                    return (
                      <TableRow key={item.orderId} className={styles.tableRow}>
                        <TableCell className={styles.fontMonoCell}>
                          <span title={item.orderId}>
                            {item.orderId.slice(0, 8)}...
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className={styles.buyerCell}>
                            <span className={styles.buyerName}>
                              {item.buyerName}
                            </span>
                            <span className={styles.buyerEmail}>
                              {item.buyerEmail}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={styles.tierBadge}>
                            {item.ticketTypeName}
                          </span>
                        </TableCell>
                        <TableCell className={styles.amountCell}>
                          {formatMoney(item.grossPaise)}
                        </TableCell>
                        <TableCell className={styles.discountCell}>
                          {item.discountPaise > 0
                            ? `-${formatMoney(item.discountPaise)}`
                            : "—"}
                        </TableCell>
                        <TableCell className={styles.netAmountCell}>
                          {formatMoney(item.netPaise)}
                        </TableCell>
                        <TableCell className={styles.fontMonoCell}>
                          {item.transferId ? (
                            <span title={item.transferId}>
                              {item.transferId.length > 16
                                ? `${item.transferId.slice(0, 14)}...`
                                : item.transferId}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {renderTransferStatusBadge(item.status)}
                        </TableCell>
                        <TableCell className={styles.dateCell}>
                          {formattedDate}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Tab 2: Bank Settlements Table */}
      {activeTab === "settlements" && (
        <>
          {displayedSettlements.length === 0 ? (
            <div className={styles.emptyState}>
              <Landmark size={24} />
              <span>No bank settlements match your filter criteria.</span>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <Table>
                <TableHeader>
                  <TableRow className={styles.tableHeaderRow}>
                    <TableHead className={styles.tableHead}>
                      Settlement Date
                    </TableHead>
                    <TableHead className={styles.tableHead}>
                      Settlement ID
                    </TableHead>
                    <TableHead className={styles.tableHead}>Bank UTR</TableHead>
                    <TableHead className={styles.tableHead}>
                      Settled Amount
                    </TableHead>
                    <TableHead className={styles.tableHead}>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedSettlements.map((settlement) => {
                    let formattedDate = settlement.settledAt;
                    try {
                      formattedDate = new Date(
                        settlement.settledAt,
                      ).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                    } catch {
                      formattedDate = settlement.settledAt;
                    }

                    const utrNumber =
                      settlement.utr || settlement.referenceNumber || null;

                    return (
                      <TableRow key={settlement.id} className={styles.tableRow}>
                        <TableCell className={styles.dateCell}>
                          {formattedDate}
                        </TableCell>
                        <TableCell className={styles.fontMonoCell}>
                          <span title={settlement.settlementId}>
                            {settlement.settlementId.length > 20
                              ? `${settlement.settlementId.slice(0, 18)}...`
                              : settlement.settlementId}
                          </span>
                        </TableCell>
                        <TableCell className={styles.fontMonoCell}>
                          {utrNumber ? (
                            <div className={styles.utrCell}>
                              <span>{utrNumber}</span>
                              <button
                                type="button"
                                className={styles.copyBtn}
                                onClick={() => handleCopyUtr(utrNumber)}
                                aria-label="Copy UTR number"
                                title="Copy Bank UTR"
                              >
                                {copiedUtr === utrNumber ? (
                                  <Check size={13} />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className={styles.netAmountCell}>
                          {formatMoney(settlement.amountPaise)}
                        </TableCell>
                        <TableCell>
                          {renderSettlementStatusBadge(settlement.status)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
