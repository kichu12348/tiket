"use client";

import { useState } from "react";
import type { Coupon } from "@/types/commerce";
import type { TicketType } from "@/types/ticketType";
import { formatMoney, parseMinorUnits } from "@/lib/money";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tag, Plus, Check, AlertCircle, Percent } from "lucide-react";
import DateTimeControl from "../DateTimeControl";
import styles from "./CouponPanel.module.css";

interface CouponPanelProps {
  coupons: Coupon[];
  tiers: TicketType[];
  disabled: boolean;
  save: (coupon: Coupon) => Promise<boolean>;
}

export default function CouponPanel({
  coupons,
  tiers,
  disabled,
  save,
}: CouponPanelProps) {
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<Coupon["kind"]>("percent");
  const [value, setValue] = useState("10");
  const [maxUses, setMaxUses] = useState("");
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const amount = kind === "access" ? 0 : parseMinorUnits(value);
      if (kind === "percent" && amount > 10000) {
        throw new Error("Percentage discount cannot exceed 100%.");
      }
      setError("");
      setIsSubmitting(true);
      const success = await save({
        code: code.trim(),
        kind,
        value: amount,
        ticketTypeIds: selectedTiers,
        maxUses: maxUses ? Number(maxUses) : null,
        startsAt: start ? new Date(start).toISOString() : null,
        endsAt: end ? new Date(end).toISOString() : null,
        isActive: true,
      });

      if (success) {
        setCode("");
        setValue("10");
        setMaxUses("");
        setSelectedTiers([]);
        setStart("");
        setEnd("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid promo code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTierSelection = (tierId: string) => {
    setSelectedTiers((prev) =>
      prev.includes(tierId)
        ? prev.filter((id) => id !== tierId)
        : [...prev, tierId],
    );
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.iconBox}>
            <Tag size={20} />
          </div>
          <div className={styles.headerText}>
            <h2 className={styles.title}>Coupons & Access Codes</h2>
            <p className={styles.subtitle}>
              Promotional discounts and secret access codes. Usage count is
              reserved at checkout and locked upon confirmed registration.
            </p>
          </div>
        </div>
        <div className={styles.countBadge}>
          <Percent size={14} />
          <span>{coupons.length} Active Codes</span>
        </div>
      </div>

      {/* Existing Coupons List */}
      <div className={styles.couponsList}>
        {coupons.length === 0 ? (
          <div className={styles.emptyState}>
            <Tag size={28} className={styles.emptyIcon} />
            <h4 className={styles.emptyTitle}>No promo codes configured</h4>
            <p className={styles.emptyDesc}>
              Create discount coupons or VIP tier unlock codes below.
            </p>
          </div>
        ) : (
          coupons.map((coupon) => {
            const displayValue =
              coupon.kind === "percent"
                ? `${coupon.value / 100}% OFF`
                : coupon.kind === "fixed"
                  ? `${formatMoney(coupon.value)} OFF`
                  : "Access Code";

            return (
              <div key={coupon.code} className={styles.couponCard}>
                <div className={styles.couponLeft}>
                  <span className={styles.codeBadge}>{coupon.code}</span>
                  <span
                    className={styles.discountBadge}
                    data-kind={coupon.kind}
                  >
                    {displayValue}
                  </span>
                  <div className={styles.metaTags}>
                    <span>
                      {coupon.maxUses
                        ? `Max ${coupon.maxUses} uses`
                        : "Unlimited uses"}
                    </span>
                    {coupon.ticketTypeIds && coupon.ticketTypeIds.length > 0 && (
                      <>
                        <span className={styles.metaDot}>•</span>
                        <span>
                          {coupon.ticketTypeIds.length} tier
                          {coupon.ticketTypeIds.length === 1 ? "" : "s"} restricted
                        </span>
                      </>
                    )}
                    {coupon.endsAt && (
                      <>
                        <span className={styles.metaDot}>•</span>
                        <span>
                          Expires{" "}
                          {new Date(coupon.endsAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.statusToggleBtn}
                  data-active={coupon.isActive}
                  disabled={disabled}
                  onClick={() =>
                    save({ ...coupon, isActive: !coupon.isActive })
                  }
                  title={
                    coupon.isActive
                      ? "Click to disable code"
                      : "Click to enable code"
                  }
                >
                  <span
                    className={styles.statusDot}
                    data-active={coupon.isActive}
                  />
                  <span>{coupon.isActive ? "Active" : "Disabled"}</span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Create Code Form */}
      <form className={styles.formContainer} onSubmit={handleSubmit}>
        <div className={styles.formHeader}>
          <div>
            <h3 className={styles.formTitle}>Add Promotional Code</h3>
            <p className={styles.formSubtitle}>
              Configure code settings, discount amounts, and eligible tiers.
            </p>
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Code Identifier</label>
            <input
              className={styles.input}
              required
              pattern="[A-Za-z0-9_-]{2,64}"
              placeholder="e.g. EARLYBIRD20"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={disabled || isSubmitting}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Discount Type</label>
            <Select
              value={kind}
              onValueChange={(val) => {
                if (val === "percent" || val === "fixed" || val === "access") {
                  setKind(val);
                }
              }}
              disabled={disabled || isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percentage discount (%)</SelectItem>
                <SelectItem value="fixed">Fixed discount (₹)</SelectItem>
                <SelectItem value="access">Secret tier access only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {kind !== "access" && (
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                {kind === "percent" ? "Discount Value (%)" : "Discount Amount (₹)"}
              </label>
              <input
                className={styles.input}
                required
                inputMode="decimal"
                placeholder={kind === "percent" ? "10" : "100.00"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={disabled || isSubmitting}
              />
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>
              Max Registrations (blank for unlimited)
            </label>
            <input
              className={styles.input}
              type="number"
              min={1}
              step={1}
              placeholder="Unlimited"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              disabled={disabled || isSubmitting}
            />
          </div>
        </div>

        {/* Date window */}
        <div className={styles.dateGrid}>
          <DateTimeControl
            label="Valid From (Starts at)"
            value={start}
            onChange={setStart}
          />
          <DateTimeControl
            label="Valid Until (Ends at)"
            value={end}
            onChange={setEnd}
          />
        </div>

        {/* Eligible ticket tiers */}
        {tiers.length > 0 && (
          <div className={styles.tiersSection}>
            <span className={styles.tiersTitle}>Eligible Ticket Tiers</span>
            <p className={styles.tiersHint}>
              Select specific tiers to restrict this code. If none are selected,
              the code will apply to all ticket types.
            </p>
            <div className={styles.tiersGrid}>
              {tiers.map((tier) => {
                const isSelected = selectedTiers.includes(tier.id);
                return (
                  <div
                    key={tier.id}
                    className={styles.tierCard}
                    data-selected={isSelected}
                    onClick={() => toggleTierSelection(tier.id)}
                  >
                    <span className={styles.tierName}>{tier.name}</span>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleTierSelection(tier.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-1.5 text-red-400 text-xs">
            <AlertCircle size={14} />
            <span className={styles.errorText}>{error}</span>
          </div>
        )}

        <button
          type="submit"
          className={styles.saveBtn}
          disabled={disabled || isSubmitting || !code.trim()}
        >
          <Plus size={16} />
          <span>{isSubmitting ? "Saving..." : "Save Code"}</span>
        </button>
      </form>
    </section>
  );
}
