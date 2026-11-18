import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { FiAlertCircle, FiCheck, FiEdit2, FiLoader } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TicketType } from "@/types/ticketType";
import type { CreateOrderResponse } from "@/types/order";
import { formatPrice } from "../RegistrationForm/utils";
import styles from "./CheckoutReview.module.css";

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(paise / 100);

export interface CheckoutReviewProps {
  // Pre-submit 3-step state props
  selectedTicket?: TicketType | null;
  user?: { name: string; email: string; phone?: string };
  formResponses?: Record<string, unknown>;
  couponCode?: string;
  onCouponChange?: (code: string) => void;
  onApplyCoupon?: (code: string) => Promise<void>;
  isApplyingCoupon?: boolean;
  couponError?: string;
  couponApplied?: boolean;
  onEditDetails?: () => void;
  onSubmit?: () => Promise<void>;
  isSubmitting?: boolean;
  errorMessage?: string;
  requireApproval?: boolean;

  // Legacy post-create props (for backwards compatibility)
  data?: CreateOrderResponse;
  remaining?: number | null;
  busy?: boolean;
  error?: string;
  pay?: () => void;
  cancel?: () => void;
  restart?: () => void;
}

export default function CheckoutReview({
  selectedTicket,
  user,
  formResponses = {},
  couponCode = "",
  onCouponChange,
  onApplyCoupon,
  isApplyingCoupon = false,
  couponError = "",
  couponApplied = false,
  onEditDetails,
  onSubmit,
  isSubmitting = false,
  errorMessage = "",
  requireApproval = false,
  data,
  remaining,
  busy = false,
  error = "",
  pay,
  cancel,
  restart,
}: CheckoutReviewProps) {
  const [internalCode, setInternalCode] = useState(couponCode);

  // ── Mode A: Legacy / Post-Order View (if `data` was passed) ───────────────
  if (data) {
    const { order, items = [], tickets = [] } = data;
    const confirmed = ["confirmed", "pending_approval"].includes(
      order.registrationStatus || order.status || "",
    );
    const sum = (
      key:
        | "unitPricePaise"
        | "discountPaise"
        | "ticketTaxPaise"
        | "platformFeePaise"
        | "feeTaxPaise",
    ) => items.reduce((total, line) => total + (line[key] || 0), 0);

    const paidItems = items.filter((line) => line.unitPricePaise > 0);
    const allAbsorbed =
      paidItems.length > 0 &&
      paidItems.every((line) => line.passFeeToCustomer === false);
    const passedItems = items.filter(
      (line) => line.passFeeToCustomer !== false,
    );
    const passedPlatformFee = passedItems.reduce(
      (total, line) => total + (line.platformFeePaise || 0),
      0,
    );
    const passedFeeTax = passedItems.reduce(
      (total, line) => total + (line.feeTaxPaise || 0),
      0,
    );

    const totalPaise =
      order.totalPaise ??
      Math.round(parseFloat(order.totalAmount || "0") * 100);

    return (
      <section className={styles.card} aria-live="polite">
        <h2>
          {confirmed
            ? order.registrationStatus === "pending_approval" ||
              order.status === "pending_approval"
              ? "Awaiting approval"
              : "Registration confirmed"
            : order.reservationState === "held"
              ? "Review your order"
              : "Checkout ended"}
        </h2>
        <p>
          {confirmed
            ? order.registrationStatus === "pending_approval" ||
              order.status === "pending_approval"
              ? "Your registration is submitted and awaiting organizer approval."
              : "Your entry pass is ready."
            : order.reservationState === "held"
              ? "Your spot is reserved while you complete payment."
              : "Your registration has ended."}
        </p>

        {order.reservationState === "held" &&
          remaining !== null &&
          remaining !== undefined && (
          <strong>
            Time remaining:{" "}
            {Math.floor(remaining / 60)}:
            {String(remaining % 60).padStart(2, "0")}
          </strong>
        )}

        <dl className={styles.breakdown}>
          <div>
            <dt>Tickets</dt>
            <dd>{money(sum("unitPricePaise") || totalPaise)}</dd>
          </div>
          {sum("discountPaise") > 0 && (
            <div className={styles.discountRow}>
              <dt>Discount</dt>
              <dd>−{money(sum("discountPaise"))}</dd>
            </div>
          )}
          {sum("ticketTaxPaise") > 0 && (
            <div>
              <dt>Ticket tax</dt>
              <dd>{money(sum("ticketTaxPaise"))}</dd>
            </div>
          )}
          <div>
            <dt>Platform fee</dt>
            <dd>
              {allAbsorbed
                ? "Included in ticket price"
                : money(passedPlatformFee)}
            </dd>
          </div>
          {!allAbsorbed && passedFeeTax > 0 && (
            <div>
              <dt>Tax on fee</dt>
              <dd>{money(passedFeeTax)}</dd>
            </div>
          )}
          <div className={styles.totalRow}>
            <dt>Total</dt>
            <dd>{money(totalPaise)}</dd>
          </div>
        </dl>

        {error && (
          <div className={styles.errorBanner} role="alert">
            <FiAlertCircle size={15} />
            {error}
          </div>
        )}

        {confirmed ? (
          tickets.length > 0 ? (
            tickets.map((ticket) => (
              <Link
                key={ticket.id}
                to="/passes/$ticketId"
                params={{ ticketId: ticket.id }}
                className={styles.submitBtn}
                style={{ textDecoration: "none" }}
              >
                View Entry Pass
              </Link>
            ))
          ) : (
            <p className={styles.subtitle}>
              Registration complete. Check your email for details.
            </p>
          )
        ) : order.reservationState === "held" ? (
          <>
            <Button
              type="button"
              disabled={busy}
              onClick={pay}
              className={styles.submitBtn}
            >
              {busy
                ? "Processing…"
                : totalPaise > 0
                  ? `Pay ${money(totalPaise)}`
                  : "Complete Registration"}
            </Button>
            {cancel && (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={cancel}
                className={styles.editBtn}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Cancel reservation
              </Button>
            )}
          </>
        ) : (
          restart && (
            <Button
              type="button"
              onClick={restart}
              className={styles.submitBtn}
            >
              Start a new registration
            </Button>
          )
        )}
      </section>
    );
  }

  // ── Mode B: Pre-Submit 3-Step Checkout Review View ────────────────────────
  const attendeeName =
    (typeof formResponses.name === "string" && formResponses.name) ||
    user?.name ||
    "Guest Attendee";
  const attendeeEmail =
    (typeof formResponses.email === "string" && formResponses.email) ||
    user?.email ||
    "";
  const attendeePhone =
    (typeof formResponses.phone === "string" && formResponses.phone) ||
    user?.phone ||
    "";

  const rawBasePrice = selectedTicket ? parseFloat(selectedTicket.price) : 0;
  const discountedPriceNum = selectedTicket?.discountedPrice
    ? parseFloat(selectedTicket.discountedPrice)
    : rawBasePrice;

  const discountAmount = Math.max(0, rawBasePrice - discountedPriceNum);
  const effectiveBase = Math.max(0, rawBasePrice - discountAmount);

  // Platform fee (400 bps / 4% unless absorbed)
  const passFee = selectedTicket?.passFeeToCustomer !== false;
  const platformFee =
    effectiveBase > 0 && passFee
      ? Math.round(effectiveBase * 0.04 * 100) / 100
      : 0;

  const finalTotal = effectiveBase + platformFee;
  const isFree = finalTotal <= 0;

  const handleApplyClick = async () => {
    const code = internalCode.trim();
    if (onApplyCoupon) {
      await onApplyCoupon(code);
    }
  };

  const effectiveBusy = isSubmitting || busy;
  const effectiveError = errorMessage || error;

  return (
    <section className={styles.card} aria-live="polite">
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Review & Confirm</h2>
          <p className={styles.subtitle}>
            Please verify your details and ticket selection before completing
            order.
          </p>
        </div>
      </div>

      {/* Attendee Details Summary */}
      <div className={styles.sectionBlock}>
        <span className={styles.sectionLabel}>Attendee Details</span>
        <div className={styles.attendeeCard}>
          <div className={styles.attendeeMeta}>
            <span className={styles.attendeeName}>{attendeeName}</span>
            <span className={styles.attendeeContact}>
              {attendeeEmail}
              {attendeePhone ? ` • ${attendeePhone}` : ""}
            </span>
          </div>
          {onEditDetails && (
            <button
              type="button"
              onClick={onEditDetails}
              className={styles.editBtn}
            >
              <FiEdit2 size={13} />
              <span>Edit Details</span>
            </button>
          )}
        </div>
      </div>

      {/* Selected Ticket Summary */}
      {selectedTicket && (
        <div className={styles.sectionBlock}>
          <span className={styles.sectionLabel}>Ticket Selection</span>
          <div className={styles.ticketSummaryCard}>
            <span className={styles.ticketName}>{selectedTicket.name}</span>
            <span className={styles.ticketPrice}>
              {formatPrice(selectedTicket.price)}
            </span>
          </div>
        </div>
      )}

      {/* Coupon Code Section */}
      <div className={styles.sectionBlock}>
        <span className={styles.sectionLabel}>Coupon / Access Code</span>
        <div className={styles.couponRow}>
          <Input
            value={internalCode}
            onChange={(e) => {
              setInternalCode(e.target.value);
              if (onCouponChange) onCouponChange(e.target.value);
            }}
            placeholder="Enter coupon code"
            maxLength={64}
            disabled={isApplyingCoupon || effectiveBusy}
            className={styles.couponInput}
          />
          <button
            type="button"
            onClick={handleApplyClick}
            disabled={!internalCode.trim() || isApplyingCoupon || effectiveBusy}
            className={styles.applyBtn}
          >
            {isApplyingCoupon ? (
              <>
                <FiLoader size={14} className="animate-spin" />
                <span>Applying…</span>
              </>
            ) : (
              "Apply"
            )}
          </button>
        </div>
        {couponApplied && (
          <span className={styles.couponSuccess}>
            <FiCheck size={14} /> Coupon applied successfully!
          </span>
        )}
        {couponError && (
          <div className={styles.errorBanner}>
            <FiAlertCircle size={14} />
            <span>{couponError}</span>
          </div>
        )}
      </div>

      {/* Price Breakdown */}
      <dl className={styles.breakdown}>
        <div>
          <dt>Subtotal</dt>
          <dd>{rawBasePrice === 0 ? "Free" : `₹${rawBasePrice.toFixed(2)}`}</dd>
        </div>
        {discountAmount > 0 && (
          <div className={styles.discountRow}>
            <dt>Discount</dt>
            <dd>−₹{discountAmount.toFixed(2)}</dd>
          </div>
        )}
        {effectiveBase > 0 && (
          <div>
            <dt>Platform fee</dt>
            <dd>
              {passFee
                ? `₹${platformFee.toFixed(2)}`
                : "Included in ticket price"}
            </dd>
          </div>
        )}
        <div className={styles.totalRow}>
          <dt>Total Amount</dt>
          <dd>{isFree ? "Free" : `₹${finalTotal.toFixed(2)}`}</dd>
        </div>
      </dl>

      {effectiveError && (
        <div className={styles.errorBanner} role="alert">
          <FiAlertCircle size={15} />
          <span>{effectiveError}</span>
        </div>
      )}

      {/* Action Button: Immediately Ready */}
      <button
        id="submit-registration-btn"
        type="button"
        disabled={effectiveBusy}
        onClick={async () => {
          if (onSubmit) {
            await onSubmit();
          } else if (pay) {
            pay();
          }
        }}
        className={styles.submitBtn}
      >
        {effectiveBusy ? (
          <>
            <FiLoader size={16} className="animate-spin" />
            <span>Processing order…</span>
          </>
        ) : isFree ? (
          requireApproval ? (
            "Request to Join"
          ) : (
            "Register Now"
          )
        ) : (
          `Pay ₹${finalTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        )}
      </button>
    </section>
  );
}
