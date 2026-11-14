"use client";

import { useState } from "react";
import type { Order, PriceLine } from "@/types/order";
import type { PayoutRequest } from "@/types/commerce";
import { formatMoney } from "@/lib/money";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import styles from "./SettlementsTable.module.css";

export interface SettlementOrder {
  order: Order & {
    organizerNetPaise?: number;
    transferStatus?: string;
  };
  attendee: {
    name: string;
    email: string;
  };
}

export interface SettlementsTableProps {
  orders?: SettlementOrder[];
  payouts?: PayoutRequest[];
  items?: (PriceLine & {
    id: string;
    orderId: string;
    name: string;
    ticketId: string;
  })[];
}

export default function SettlementsTable({
  orders = [],
  payouts = [],
  items = [],
}: SettlementsTableProps) {
  const [activeTab, setActiveTab] = useState<string>("transfers");

  const renderTransferBadge = (status?: string) => {
    const s = (status || "pending").toLowerCase();
    if (s === "settled" || s === "processed") {
      return (
        <Badge variant="secondary" className={styles.badgeSuccess}>
          {s}
        </Badge>
      );
    }
    if (s === "failed" || s === "reversed") {
      return (
        <Badge variant="destructive" className={styles.badgeDanger}>
          {s}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className={styles.badgeWarning}>
        {s}
      </Badge>
    );
  };

  return (
    <Card className={styles.card}>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className={styles.tabsRoot}
      >
        <CardHeader className={styles.cardHeader}>
          <div className={styles.headerRow}>
            <div>
              <CardTitle className={styles.cardTitle}>
                Transfers & Settlements
              </CardTitle>
              <CardDescription className={styles.cardDescription}>
                Order-level transfers and automated Razorpay Route bank disbursements.
              </CardDescription>
            </div>
            <TabsList className={styles.tabsList}>
              <TabsTrigger
                value="transfers"
                className={styles.tabsTrigger}
                onClick={() => setActiveTab("transfers")}
              >
                Order Transfers ({orders.length})
              </TabsTrigger>
              <TabsTrigger
                value="settlements"
                className={styles.tabsTrigger}
                onClick={() => setActiveTab("settlements")}
              >
                Bank Settlements ({payouts.length})
              </TabsTrigger>
            </TabsList>
          </div>
        </CardHeader>

        <CardContent className={styles.cardContent}>
          <TabsContent value="transfers" className="mt-0">
            {orders.length === 0 ? (
              <div className={styles.emptyState}>
                No order transfers recorded yet.
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <Table>
                  <TableHeader>
                    <TableRow className={styles.tableHeaderRow}>
                      <TableHead className={styles.tableHead}>Order ID</TableHead>
                      <TableHead className={styles.tableHead}>Buyer</TableHead>
                      <TableHead className={styles.tableHead}>Gross</TableHead>
                      <TableHead className={styles.tableHead}>
                        Organizer Net
                      </TableHead>
                      <TableHead className={styles.tableHead}>
                        Transfer Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((item) => {
                      const order = item.order;
                      const orderItems = items.filter(
                        (it) => it.orderId === order.id,
                      );
                      const computedNet = orderItems.length
                        ? orderItems.reduce(
                            (sum, it) =>
                              sum +
                              (it.organizerNetPaise ??
                                it.unitPricePaise -
                                  it.discountPaise -
                                  it.platformFeePaise),
                            0,
                          )
                        : order.totalPaise;

                      const netPaise = order.organizerNetPaise ?? computedNet;

                      return (
                        <TableRow key={order.id} className={styles.tableRow}>
                          <TableCell className={styles.fontMonoCell}>
                            <span title={order.id}>
                              {order.id.slice(0, 8)}...
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className={styles.buyerCell}>
                              <span className={styles.buyerName}>
                                {item.attendee?.name || "Guest"}
                              </span>
                              <span className={styles.buyerEmail}>
                                {item.attendee?.email || "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className={styles.amountCell}>
                            {formatMoney(order.totalPaise)}
                          </TableCell>
                          <TableCell className={styles.netAmountCell}>
                            {formatMoney(netPaise)}
                          </TableCell>
                          <TableCell>
                            {renderTransferBadge(order.transferStatus)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settlements" className="mt-0">
            {payouts.length === 0 ? (
              <div className={styles.emptyState}>
                No bank settlements yet. Razorpay Route will automatically disburse
                funds per your settlement schedule.
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
                      <TableHead className={styles.tableHead}>Amount</TableHead>
                      <TableHead className={styles.tableHead}>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => {
                      const dateStr = payout.processedAt || payout.createdAt;
                      const formattedDate = dateStr
                        ? new Date(dateStr).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—";

                      const settlementId =
                        payout.gatewaySettlementId ||
                        payout.gatewayPayoutId ||
                        payout.id;

                      const isSettled = payout.status === "paid";

                      return (
                        <TableRow key={payout.id} className={styles.tableRow}>
                          <TableCell className={styles.dateCell}>
                            {formattedDate}
                          </TableCell>
                          <TableCell className={styles.fontMonoCell}>
                            <span title={settlementId}>
                              {settlementId.length > 20
                                ? `${settlementId.slice(0, 18)}...`
                                : settlementId}
                            </span>
                          </TableCell>
                          <TableCell className={styles.fontMonoCell}>
                            {payout.referenceNumber || "—"}
                          </TableCell>
                          <TableCell className={styles.amountCell}>
                            {formatMoney(payout.amountPaise)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                isSettled
                                  ? styles.badgeSuccess
                                  : styles.badgeWarning
                              }
                            >
                              {isSettled ? "Settled" : payout.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
