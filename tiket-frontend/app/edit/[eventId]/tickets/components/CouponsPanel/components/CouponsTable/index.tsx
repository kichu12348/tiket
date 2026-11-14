"use client";

import React from "react";
import type { Coupon } from "@/types/commerce";
import { Plus, Trash2, Edit2, TicketPercent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Switch from "@/components/Switch";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDiscountLabel,
  calculateUsageDisplay,
  getExpiryDisplayInfo,
} from "../../functions";
import styles from "./CouponsTable.module.css";

interface CouponsTableProps {
  coupons: Coupon[];
  loading: boolean;
  onOpenCreate: () => void;
  onOpenEdit: (coupon: Coupon) => void;
  onToggleActive: (coupon: Coupon, checked: boolean) => void;
  onDelete: (coupon: Coupon) => void;
}

export default function CouponsTable({
  coupons,
  loading,
  onOpenCreate,
  onOpenEdit,
  onToggleActive,
  onDelete,
}: CouponsTableProps) {
  if (loading) {
    return (
      <div className={styles.card}>
        <div className="p-8 text-center text-sm text-white/50">
          Loading coupons...
        </div>
      </div>
    );
  }

  if (coupons.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.emptyState}>
          <TicketPercent size={40} className="text-white/20 mb-1" />
          <h3 className={styles.emptyTitle}>No coupons yet</h3>
          <p className={styles.emptyText}>
            Create custom discount codes to boost registration and reward early
            attendees.
          </p>
          <button
            type="button"
            onClick={onOpenCreate}
            className={styles.addBtn}
          >
            <Plus size={16} />
            <span>Create First Coupon</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <Table>
        <TableHeader className={styles.tableHeader}>
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead className="text-xs text-white/60 font-medium">
              Code
            </TableHead>
            <TableHead className="text-xs text-white/60 font-medium">
              Discount
            </TableHead>
            <TableHead
              className={cn(
                "text-xs text-white/60 font-medium",
                styles.usageColumn,
              )}
            >
              Usage
            </TableHead>
            <TableHead className="text-xs text-white/60 font-medium">
              Expiry
            </TableHead>
            <TableHead className="text-xs text-white/60 font-medium">
              Active
            </TableHead>
            <TableHead className="text-xs text-white/60 font-medium text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coupons.map((coupon) => {
            const used =
              (coupon as Coupon & { usedCount?: number }).usedCount ?? 0;
            const usageInfo = calculateUsageDisplay(used, coupon.maxUses);
            const expiryInfo = getExpiryDisplayInfo(
              coupon.endsAt,
              coupon.startsAt,
            );
            const discountLabel = formatDiscountLabel(
              coupon.kind,
              coupon.value,
            );

            return (
              <TableRow
                key={coupon.id || coupon.code}
                className={styles.tableRow}
                data-testid={`coupon-row-${coupon.code}`}
              >
                {/* Code */}
                <TableCell className="py-3">
                  <div className="flex flex-col gap-0.5 items-start">
                    <Badge
                      variant="outline"
                      className="font-mono uppercase font-semibold text-xs tracking-wider bg-white/[0.06] border-white/10 text-white"
                    >
                      {coupon.code}
                    </Badge>
                    {coupon.ticketTypeIds && coupon.ticketTypeIds.length > 0 ? (
                      <span className="text-[10px] text-white/50">
                        {coupon.ticketTypeIds.length === 1
                          ? "1 ticket tier"
                          : `${coupon.ticketTypeIds.length} ticket tiers`}
                      </span>
                    ) : (
                      <span className="text-[10px] text-white/35">
                        All tickets
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Discount */}
                <TableCell className="py-3 font-medium text-sm text-white">
                  {discountLabel}
                </TableCell>

                {/* Usage */}
                <TableCell className={cn("py-3", styles.usageColumn)}>
                  <div className={styles.usageContainer}>
                    {usageInfo.isFull ? (
                      <span className={styles.usedUpText}>Used up</span>
                    ) : (
                      <div className={styles.usageText}>
                        <span className={styles.usedCount}>
                          {usageInfo.used}
                        </span>
                        <span className={styles.usageLimit}>
                          {usageInfo.hasLimit
                            ? `/ ${usageInfo.limit}`
                            : "/ ∞"}
                        </span>
                      </div>
                    )}

                    {usageInfo.hasLimit && (
                      <div
                        role="progressbar"
                        aria-valuenow={usageInfo.percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Usage: ${usageInfo.used} of ${usageInfo.limit}`}
                        className={styles.progressTrack}
                      >
                        <div
                          className={cn(
                            styles.progressFill,
                            usageInfo.isFull && styles.progressFillFull,
                          )}
                          style={{ width: `${usageInfo.percent}%` }}
                        />
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Expiry */}
                <TableCell className="py-3">
                  <div className={styles.expiryCell}>
                    <span
                      className={cn(
                        styles.expiryDate,
                        expiryInfo.isDimmed && styles.expiryDateDimmed,
                      )}
                    >
                      {expiryInfo.dateText}
                    </span>
                    {expiryInfo.subtext && (
                      <span
                        className={cn(
                          styles.expirySubtext,
                          expiryInfo.urgency === "amber" &&
                            styles.expirySubtextAmber,
                          expiryInfo.urgency === "danger" &&
                            styles.expirySubtextDanger,
                        )}
                      >
                        {expiryInfo.subtext}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Active */}
                <TableCell className="py-3">
                  <Switch
                    checked={coupon.isActive}
                    onChange={(checked) =>
                      onToggleActive(coupon, checked)
                    }
                    aria-label={`Toggle active for ${coupon.code}`}
                  />
                </TableCell>

                {/* Actions */}
                <TableCell className="py-3 text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => onOpenEdit(coupon)}
                      title="Edit Coupon"
                      aria-label="Edit Coupon"
                      data-testid={`edit-coupon-${coupon.code}`}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconBtn} ${styles.deleteBtn}`}
                      onClick={() => onDelete(coupon)}
                      title="Delete Coupon"
                      aria-label="Delete Coupon"
                      data-testid={`delete-coupon-${coupon.code}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
