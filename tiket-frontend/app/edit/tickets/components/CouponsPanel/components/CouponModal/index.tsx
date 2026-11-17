
import React, { useState } from "react";
import { createPortal } from "react-dom";
import type { Coupon } from "@/types/commerce";
import type { TicketType } from "@/types/ticketType";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import Switch from "@/components/Switch";
import Dropdown from "@/components/Dropdown";
import DatePicker from "@/components/DatePicker";
import TimePicker from "@/components/TimePicker";
import TicketSelector from "./components/TicketSelector";
import {
  getInitialFormValues,
  validateAndBuildCouponPayload,
  type CouponFormValues,
} from "../../functions";
import styles from "./CouponModal.module.css";

interface CouponModalProps {
  isOpen: boolean;
  ticketTypes?: TicketType[];
  editingCoupon: Coupon | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (payload: Coupon) => Promise<void>;
}

interface CouponModalContentProps {
  ticketTypes?: TicketType[];
  editingCoupon: Coupon | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (payload: Coupon) => Promise<void>;
}

const DISCOUNT_TYPE_OPTIONS = [
  { label: "Percentage (%)", value: "percent" as const },
  { label: "Fixed Amount (₹)", value: "fixed" as const },
];

function CouponModalContent({
  ticketTypes = [],
  editingCoupon,
  isSubmitting,
  onClose,
  onSave,
}: CouponModalContentProps) {
  const [formValues, setFormValues] = useState<CouponFormValues>(() =>
    getInitialFormValues(editingCoupon),
  );
  const [appliesTo, setAppliesTo] = useState<"all" | "specific">(() =>
    formValues.ticketTypeIds && formValues.ticketTypeIds.length > 0
      ? "specific"
      : "all",
  );

  const isDateRangeInvalid = Boolean(
    formValues.startsAt &&
    formValues.endsAt &&
    new Date(formValues.startsAt) >= new Date(formValues.endsAt),
  );

  const handleSubmit = async () => {
    const finalTicketTypeIds =
      appliesTo === "all" ? [] : formValues.ticketTypeIds;

    if (appliesTo === "specific" && finalTicketTypeIds.length === 0) {
      toast.error(
        "Please select at least one ticket tier, or switch to All Tickets.",
      );
      return;
    }

    const { error, payload } = validateAndBuildCouponPayload(
      {
        ...formValues,
        ticketTypeIds: finalTicketTypeIds,
      },
      editingCoupon,
    );

    if (error) {
      toast.error(error);
      return;
    }

    if (payload) {
      await onSave(payload);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
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
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className={`${styles.modalBody} scrollbar`}>
          {/* Coupon Code */}
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="coupon-code-input">
              Coupon Code
            </label>
            <Input
              id="coupon-code-input"
              type="text"
              placeholder="e.g. EARLYBIRD20"
              value={formValues.code}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  code: e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9_-]/g, ""),
                }))
              }
              className="font-mono uppercase tracking-wider !rounded-[var(--radius-md)]"
              data-testid="coupon-code-input"
            />
          </div>

          {/* Discount Type & Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={styles.formGroup}>
              <label className={styles.label}>Discount Type</label>
              <div data-testid="coupon-kind-select">
                <Dropdown<"percent" | "fixed">
                  options={DISCOUNT_TYPE_OPTIONS}
                  value={formValues.kind}
                  onChange={(val) =>
                    setFormValues((prev) => ({
                      ...prev,
                      kind: val,
                    }))
                  }
                  variant="dark"
                  width="100%"
                  btnWidth="100%"
                  triggerClassName={styles.dropdownTrigger}
                  popoverClassName="z-[9999]"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="coupon-value-input">
                {formValues.kind === "percent"
                  ? "Discount Value (%)"
                  : "Discount Amount (₹)"}
              </label>
              <Input
                id="coupon-value-input"
                type="number"
                min="0"
                step="any"
                placeholder={
                  formValues.kind === "percent" ? "e.g. 20" : "e.g. 100"
                }
                value={formValues.discountValue}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    discountValue: e.target.value,
                  }))
                }
                className="!rounded-[var(--radius-md)]"
                data-testid="coupon-value-input"
              />
            </div>
          </div>

          {/* Applicable Tickets */}
          <TicketSelector
            ticketTypes={ticketTypes}
            selectedTicketIds={formValues.ticketTypeIds}
            onChange={(ticketIds) =>
              setFormValues((prev) => ({ ...prev, ticketTypeIds: ticketIds }))
            }
            appliesTo={appliesTo}
            onAppliesToChange={setAppliesTo}
          />

          {/* Usage Limit */}
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="coupon-max-uses-input">
              Usage Limit (Optional)
            </label>
            <Input
              id="coupon-max-uses-input"
              type="number"
              min="1"
              placeholder="Leave empty for unlimited redemptions"
              value={formValues.maxUses}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  maxUses: e.target.value,
                }))
              }
              className="!rounded-[var(--radius-md)]"
              data-testid="coupon-max-uses-input"
            />
          </div>

          {/* Validity Period */}
          <div className={styles.validitySection}>
            <div className="flex justify-between items-center mb-0.5">
              <span className={styles.sectionHeaderLabel}>Validity Period</span>
              {(formValues.startsAt || formValues.endsAt) && (
                <button
                  type="button"
                  className="text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
                  onClick={() =>
                    setFormValues((prev) => ({
                      ...prev,
                      startsAt: "",
                      endsAt: "",
                    }))
                  }
                >
                  Clear dates
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Start Date & Time */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Start date</label>
                <div className={styles.segmentedControl}>
                  <div className={styles.dateSegment}>
                    <DatePicker
                      date={formValues.startsAt}
                      onChange={(val) =>
                        setFormValues((prev) => ({ ...prev, startsAt: val }))
                      }
                    />
                  </div>
                  <div className={styles.segmentDivider} />
                  <div className={styles.timeSegment}>
                    <TimePicker
                      date={formValues.startsAt}
                      onChange={(val) =>
                        setFormValues((prev) => ({ ...prev, startsAt: val }))
                      }
                      disabled={!formValues.startsAt}
                      placeholder="--:-- --"
                    />
                  </div>
                </div>
              </div>

              {/* End Date & Time */}
              <div className={styles.formGroup}>
                <label className={styles.label}>End date</label>
                <div
                  className={`${styles.segmentedControl} ${
                    isDateRangeInvalid ? styles.segmentedControlError : ""
                  }`}
                >
                  <div className={styles.dateSegment}>
                    <DatePicker
                      date={formValues.endsAt}
                      onChange={(val) =>
                        setFormValues((prev) => ({ ...prev, endsAt: val }))
                      }
                    />
                  </div>
                  <div className={styles.segmentDivider} />
                  <div className={styles.timeSegment}>
                    <TimePicker
                      date={formValues.endsAt}
                      onChange={(val) =>
                        setFormValues((prev) => ({ ...prev, endsAt: val }))
                      }
                      disabled={!formValues.endsAt}
                      placeholder="--:-- --"
                    />
                  </div>
                </div>
                {isDateRangeInvalid && (
                  <span className={styles.inlineError} role="alert">
                    End date must be after start date
                  </span>
                )}
              </div>
            </div>

            <p className={styles.helperText}>Leave empty for no time limit</p>
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
              checked={formValues.isActive}
              onChange={(checked) =>
                setFormValues((prev) => ({ ...prev, isActive: checked }))
              }
              data-testid="coupon-active-switch"
              aria-label="Active"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSubmit}
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
    </div>
  );
}

export default function CouponModal({
  isOpen,
  ticketTypes = [],
  editingCoupon,
  isSubmitting,
  onClose,
  onSave,
}: CouponModalProps) {
  if (!isOpen) return null;

  const modalKey = editingCoupon?.id || editingCoupon?.code || "new-coupon";

  return typeof document !== "undefined"
    ? createPortal(
        <CouponModalContent
          key={modalKey}
          ticketTypes={ticketTypes}
          editingCoupon={editingCoupon}
          isSubmitting={isSubmitting}
          onClose={onClose}
          onSave={onSave}
        />,
        document.body,
      )
    : null;
}
