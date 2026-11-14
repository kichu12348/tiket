"use client";

import { useState, useEffect, useCallback } from "react";
import type { Coupon } from "@/types/commerce";
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "@/api/commerce";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import {
  Plus,
  Trash2,
  Edit2,
  X,
  TicketPercent,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DateRangeBlock from "@/components/DateRangeBlock";
import { format } from "date-fns";
import { createPortal } from "react-dom";
import styles from "./CouponsPanel.module.css";

interface CouponsPanelProps {
  eventId: string;
  onCountChange?: (count: number) => void;
}

export default function CouponsPanel({
  eventId,
  onCountChange,
}: CouponsPanelProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [startsAt, setStartsAt] = useState<string>("");
  const [endsAt, setEndsAt] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCoupons = useCallback(async () => {
    try {
      const data = await getCoupons(eventId);
      const list = Array.isArray(data) ? data : [];
      setCoupons(list);
      onCountChange?.(list.length);
    } catch (err: unknown) {
      console.error("Failed to load coupons", err);
      toast.error(getErrorMessage(err) || "Failed to load coupons.");
    } finally {
      setLoading(false);
    }
  }, [eventId, onCountChange]);

  useEffect(() => {
    let isCancelled = false;
    getCoupons(eventId)
      .then((data) => {
        if (!isCancelled) {
          const list = Array.isArray(data) ? data : [];
          setCoupons(list);
          onCountChange?.(list.length);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          console.error("Failed to load coupons", err);
          toast.error(getErrorMessage(err) || "Failed to load coupons.");
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });
    return () => {
      isCancelled = true;
    };
  }, [eventId, onCountChange]);

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setCode("");
    setKind("percent");
    setDiscountValue("");
    setMaxUses("");
    setStartsAt("");
    setEndsAt("");
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCode(coupon.code);
    const resolvedKind = coupon.kind === "fixed" ? "fixed" : "percent";
    setKind(resolvedKind);

    if (resolvedKind === "percent") {
      const displayVal =
        coupon.value > 100 ? (coupon.value / 100).toString() : coupon.value.toString();
      setDiscountValue(displayVal);
    } else {
      const displayVal =
        coupon.value >= 100 ? (coupon.value / 100).toString() : coupon.value.toString();
      setDiscountValue(displayVal);
    }

    setMaxUses(coupon.maxUses ? coupon.maxUses.toString() : "");
    setStartsAt(coupon.startsAt || "");
    setEndsAt(coupon.endsAt || "");
    setIsActive(coupon.isActive);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCoupon(null);
  };

  const handleSaveModal = async () => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      toast.error("Coupon code is required.");
      return;
    }

    const numValue = Number(discountValue);
    if (isNaN(numValue) || numValue <= 0) {
      toast.error("Please enter a valid discount value.");
      return;
    }

    let calculatedValue = 0;
    if (kind === "percent") {
      if (numValue > 100) {
        toast.error("Percentage discount cannot exceed 100%.");
        return;
      }
      calculatedValue = Math.round(numValue * 100); // Basis points (e.g. 2000 for 20%)
    } else {
      calculatedValue = Math.round(numValue * 100); // Paise (e.g. 10000 for ₹100)
    }

    if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) {
      toast.error("Valid from date must be before valid until date.");
      return;
    }

    const parsedMaxUses = maxUses.trim() ? parseInt(maxUses, 10) : null;
    if (parsedMaxUses !== null && (isNaN(parsedMaxUses) || parsedMaxUses <= 0)) {
      toast.error("Usage limit must be a positive number.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: Coupon = {
        code: trimmedCode,
        kind,
        value: calculatedValue,
        ticketTypeIds: editingCoupon?.ticketTypeIds || [],
        maxUses: parsedMaxUses,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        isActive,
      };

      if (editingCoupon) {
        await updateCoupon(
          eventId,
          editingCoupon.id || editingCoupon.code,
          payload,
        );
        toast.success(`Coupon ${trimmedCode} updated.`);
      } else {
        await createCoupon(eventId, payload);
        toast.success(`Coupon ${trimmedCode} created.`);
      }

      handleCloseModal();
      await fetchCoupons();
    } catch (err: unknown) {
      console.error("Failed to save coupon", err);
      toast.error(getErrorMessage(err) || "Failed to save coupon.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (coupon: Coupon, checked: boolean) => {
    try {
      setCoupons((prev) =>
        prev.map((c) =>
          c.id === coupon.id || c.code === coupon.code
            ? { ...c, isActive: checked }
            : c,
        ),
      );

      const updatedPayload: Coupon = {
        ...coupon,
        isActive: checked,
      };

      await updateCoupon(
        eventId,
        coupon.id || coupon.code,
        updatedPayload,
      );
      toast.success(
        `Coupon ${coupon.code} ${checked ? "activated" : "deactivated"}.`,
      );
    } catch (err: unknown) {
      console.error("Failed to update coupon status", err);
      toast.error(getErrorMessage(err) || "Failed to update coupon status.");
      // Rollback
      fetchCoupons();
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    try {
      await deleteCoupon(eventId, coupon.id || coupon.code);
      setCoupons((prev) => {
        const next = prev.filter(
          (c) => c.id !== coupon.id && c.code !== coupon.code,
        );
        onCountChange?.(next.length);
        return next;
      });
      toast.success(`Coupon ${coupon.code} deleted.`);
    } catch (err: unknown) {
      console.error("Failed to delete coupon", err);
      toast.error(getErrorMessage(err) || "Failed to delete coupon.");
    }
  };

  return (
    <div className={styles.container}>
      {/* Header Bar */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h2 className={styles.title}>Coupons & Discounts</h2>
          <p className={styles.subtitle}>
            Create promotional codes and discounts for attendee checkout.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className={styles.addBtn}
          data-testid="add-coupon-btn"
        >
          <Plus size={16} />
          <span>Add Coupon</span>
        </button>
      </div>

      {/* Table Card */}
      <div className={styles.card}>
        {loading ? (
          <div className="p-8 text-center text-sm text-white/50">
            Loading coupons...
          </div>
        ) : coupons.length === 0 ? (
          <div className={styles.emptyState}>
            <TicketPercent size={40} className="text-white/20 mb-1" />
            <h3 className={styles.emptyTitle}>No coupons yet</h3>
            <p className={styles.emptyText}>
              Create custom discount codes to boost registration and reward early
              attendees.
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className={styles.addBtn}
              style={{ marginTop: "0.5rem" }}
            >
              <Plus size={16} />
              <span>Create First Coupon</span>
            </button>
          </div>
        ) : (
          <Table>
            <TableHeader className={styles.tableHeader}>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-xs text-white/60 font-medium">
                  Code
                </TableHead>
                <TableHead className="text-xs text-white/60 font-medium">
                  Discount
                </TableHead>
                <TableHead className="text-xs text-white/60 font-medium">
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
                const max = coupon.maxUses;
                const percent =
                  max && max > 0
                    ? Math.min(100, Math.round((used / max) * 100))
                    : 0;

                const discountLabel =
                  coupon.kind === "percent"
                    ? `${
                        coupon.value > 100
                          ? Math.round(coupon.value / 100)
                          : coupon.value
                      }% OFF`
                    : `₹${
                        coupon.value >= 100
                          ? (coupon.value / 100).toFixed(0)
                          : coupon.value
                      } OFF`;

                return (
                  <TableRow
                    key={coupon.id || coupon.code}
                    className={styles.tableRow}
                    data-testid={`coupon-row-${coupon.code}`}
                  >
                    {/* Code */}
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className="font-mono uppercase font-semibold text-xs tracking-wider bg-white/[0.06] border-white/10 text-white"
                      >
                        {coupon.code}
                      </Badge>
                    </TableCell>

                    {/* Discount */}
                    <TableCell className="py-3 font-medium text-sm text-white">
                      {discountLabel}
                    </TableCell>

                    {/* Usage */}
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-1 w-28">
                        <div className="flex justify-between text-xs text-white/70">
                          <span>{used}</span>
                          <span>{max ? `/ ${max}` : "/ ∞"}</span>
                        </div>
                        <Progress value={max ? percent : 0} className="h-1.5" />
                      </div>
                    </TableCell>

                    {/* Expiry */}
                    <TableCell className="py-3 text-xs text-white/80">
                      {coupon.endsAt ? (
                        format(new Date(coupon.endsAt), "MMM d, yyyy")
                      ) : (
                        <span className="text-white/40">No Expiry</span>
                      )}
                    </TableCell>

                    {/* Active */}
                    <TableCell className="py-3">
                      <Switch
                        checked={coupon.isActive}
                        onCheckedChange={(checked) =>
                          handleToggleActive(coupon, checked)
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
                          onClick={() => handleOpenEdit(coupon)}
                          title="Edit Coupon"
                          aria-label="Edit Coupon"
                          data-testid={`edit-coupon-${coupon.code}`}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.deleteBtn}`}
                          onClick={() => handleDelete(coupon)}
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
        )}
      </div>

      {/* Create / Edit Coupon Modal (Forms Page Standard, Portaled to Body) */}
      {isModalOpen &&
        (typeof document !== "undefined"
          ? createPortal(
              <div className={styles.modalOverlay} onClick={handleCloseModal}>
                <div
                  className={styles.modalShell}
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                >
                  {/* Modal Header */}
                  <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>
                      {editingCoupon ? "Edit Coupon" : "Create Coupon"}
                    </h3>
                    <button
                      type="button"
                      className={styles.closeBtn}
                      onClick={handleCloseModal}
                      aria-label="Close modal"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className={`${styles.modalBody} scrollbar`}>
                    {/* Coupon Code */}
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Coupon Code</label>
                      <Input
                        type="text"
                        placeholder="e.g. EARLYBIRD20"
                        value={code}
                        onChange={(e) =>
                          setCode(
                            e.target.value
                              .toUpperCase()
                              .replace(/[^A-Z0-9_-]/g, ""),
                          )
                        }
                        className="font-mono uppercase tracking-wider !rounded-[var(--radius-md)]"
                        data-testid="coupon-code-input"
                      />
                    </div>

                    {/* Discount Type & Value */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Discount Type</label>
                        <Select
                          value={kind}
                          onValueChange={(val) =>
                            setKind(val as "percent" | "fixed")
                          }
                        >
                          <SelectTrigger
                            className="w-full !rounded-[var(--radius-md)]"
                            data-testid="coupon-kind-select"
                          >
                            <SelectValue placeholder="Discount Type" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1c1c1e] border-white/10 text-white z-[9999]">
                            <SelectItem value="percent">
                              Percentage (%)
                            </SelectItem>
                            <SelectItem value="fixed">
                              Fixed Amount (₹)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>
                          {kind === "percent"
                            ? "Discount Value (%)"
                            : "Discount Amount (₹)"}
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          placeholder={
                            kind === "percent" ? "e.g. 20" : "e.g. 100"
                          }
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          className="!rounded-[var(--radius-md)]"
                          data-testid="coupon-value-input"
                        />
                      </div>
                    </div>

                    {/* Usage Limit */}
                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        Usage Limit (Optional)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Leave empty for unlimited redemptions"
                        value={maxUses}
                        onChange={(e) => setMaxUses(e.target.value)}
                        className="!rounded-[var(--radius-md)]"
                        data-testid="coupon-max-uses-input"
                      />
                    </div>

                    {/* Validity Period (DateRangeBlock design from details page) */}
                    <div className={styles.formGroup}>
                      <div className="flex justify-between items-center">
                        <label className={styles.label}>
                          Validity Period (Optional)
                        </label>
                        {(startsAt || endsAt) && (
                          <button
                            type="button"
                            className="text-xs text-white/50 hover:text-white transition-colors"
                            onClick={() => {
                              setStartsAt("");
                              setEndsAt("");
                            }}
                          >
                            Clear dates
                          </button>
                        )}
                      </div>
                      <DateRangeBlock
                        startDate={startsAt}
                        endDate={endsAt}
                        hideTimezone={true}
                        onStartDateChange={setStartsAt}
                        onEndDateChange={setEndsAt}
                      />
                    </div>

                    {/* Active Toggle */}
                    <div className={styles.switchRow}>
                      <div className={styles.switchLabelBlock}>
                        <span className={styles.switchTitle}>Active</span>
                        <span className={styles.switchSubtext}>
                          Enable attendees to redeem this code at checkout
                        </span>
                      </div>
                      <Switch
                        checked={isActive}
                        onCheckedChange={setIsActive}
                        data-testid="coupon-active-switch"
                      />
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className={styles.modalFooter}>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={handleCloseModal}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={styles.saveBtn}
                      onClick={handleSaveModal}
                      disabled={isSubmitting}
                      data-testid="coupon-save-btn"
                    >
                      {isSubmitting
                        ? "Saving..."
                        : editingCoupon
                          ? "Update Coupon"
                          : "Create Coupon"}
                    </button>
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null)}
    </div>
  );
}
