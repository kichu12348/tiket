import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FiCheckCircle,
  FiArrowRight,
} from "react-icons/fi";
import { Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useCheckout } from "@/hooks/useCheckout";
import { useAvailability } from "@/hooks/useAvailability";
import { validateRegistrationResponses } from "@/lib/validators/registration.validator";
import CheckoutReview from "../CheckoutReview";
import type { RegistrationFormProps } from "./types";
import {
  isTicketActive,
  buildZodSchema,
  buildFormResponses,
  getFieldAction,
  formatPrice,
} from "./utils";

import ApprovalBanner from "./ApprovalBanner";
import { TicketSelector } from "./TicketSelector";
import FormFieldsSection from "./FormFieldsSection";
import AttendeePreview from "./AttendeePreview";

import styles from "./RegistrationForm.module.css";

type FlowStep = "tickets" | "form" | "checkout";

/**
 * Orchestrator component.
 * Implements 3-step registration flow:
 * Step 1: Ticket Selection (auto-skipped when ?t=<ticket_type> is valid)
 * Step 2: Form Questions & Attendee Details (debounced localStorage persistence)
 * Step 3: Checkout Review & Payment (immediate ready state via react-razorpay)
 */
export default function RegistrationForm({
  event,
  user,
  ticketTypes,
  formFields,
}: RegistrationFormProps) {
  const checkout = useCheckout(event.id, user);
  const { availability, refreshAvailability } = useAvailability(event.id);

  const search = useSearch({ strict: false }) as Record<
    string,
    string | undefined
  >;
  const ticketParam = search.t || search.ticketTypeId || search.ticket_id;

  const storageKey = `${user?.id || "guest"}_${event.id}`;

  const [currentStep, setCurrentStep] = useState<FlowStep>("tickets");
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<
    string | null
  >(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [currentPage, setCurrentPage] = useState(1);

  // ── Ticket filtering ───────────────────────────────────────────────────────
  const activeTicketTypes = useMemo(() => {
    return (availability?.tiers ?? ticketTypes).filter(isTicketActive);
  }, [ticketTypes, availability]);

  // ── Normalize 0-indexed page numbers & sort fields ─────────────────────────
  const normalizedFormFields = useMemo(() => {
    if (!formFields || formFields.length === 0) return [];
    const minPage = Math.min(...formFields.map((f) => f.page));
    const pageOffset = minPage === 0 ? 1 : 0;

    return [...formFields]
      .map((f) => ({
        ...f,
        page: f.page + pageOffset,
      }))
      .sort((a, b) => {
        if (a.page !== b.page) return a.page - b.page;
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return (
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
        );
      });
  }, [formFields]);

  const defaultValues = useMemo(() => {
    const defaults: Record<string, string> = {};
    for (const f of normalizedFormFields) {
      if (f.name === "email" || f.fieldType === "email") {
        defaults[f.id] = user.email || "";
      } else if (f.name === "name") {
        defaults[f.id] = user.name || "";
      } else if (
        f.name === "phone" ||
        f.fieldType === "phone"
      ) {
        defaults[f.id] =
          "phone" in user && typeof user.phone === "string"
            ? user.phone
            : "";
      }
    }
    return defaults;
  }, [normalizedFormFields, user]);

  const schema = useMemo(
    () => buildZodSchema(normalizedFormFields, selectedTicketTypeId || undefined),
    [normalizedFormFields, selectedTicketTypeId],
  );

  const {
    control,
    trigger,
    watch,
    reset,
    formState: { errors: formErrors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onBlur",
  });

  const formValues = watch();

  const answers = useMemo(() => {
    const map = new Map<string, string>();
    for (const [key, val] of Object.entries(formValues || {})) {
      if (val !== undefined && val !== null) {
        map.set(
          key,
          Array.isArray(val) ? JSON.stringify(val) : String(val).trim(),
        );
      }
    }
    return map;
  }, [formValues]);

  // Visible form fields evaluated conditionally
  const visibleFormFields = useMemo(() => {
    return normalizedFormFields.filter(
      (f) =>
        getFieldAction(f, answers, selectedTicketTypeId || undefined) !==
        "hide",
    );
  }, [normalizedFormFields, answers, selectedTicketTypeId]);

  const maxPage =
    visibleFormFields.length > 0
      ? Math.max(...visibleFormFields.map((f) => f.page))
      : 0;

  const pages = useMemo(() => {
    const map: Record<number, typeof visibleFormFields> = {};
    for (const f of visibleFormFields) {
      if (!map[f.page]) map[f.page] = [];
      map[f.page]!.push(f);
    }
    return map;
  }, [visibleFormFields]);

  // ── Initial Hydration from localStorage & ?t=<ticket_type> Shortcut ───────
  useEffect(() => {
    let savedTicketId: string | null = null;
    let savedResponses: Record<string, unknown> | null = null;
    let savedCode = "";

    try {
      if (typeof window !== "undefined") {
        const item = localStorage.getItem(storageKey);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed && typeof parsed === "object") {
            if (typeof parsed.ticketTypeId === "string")
              savedTicketId = parsed.ticketTypeId;
            if (parsed.formResponses && typeof parsed.formResponses === "object")
              savedResponses = parsed.formResponses;
            if (typeof parsed.couponCode === "string")
              savedCode = parsed.couponCode;
          }
        }
      }
    } catch {}

    if (savedCode) {
      setCouponCode(savedCode);
    }

    if (savedResponses) {
      reset({ ...defaultValues, ...savedResponses });
    }

    // Step 1 shortcut: ?t=<ticket_type>
    if (ticketParam && activeTicketTypes.length > 0) {
      const match = activeTicketTypes.find(
        (t) =>
          t.id.toLowerCase() === ticketParam.toLowerCase() ||
          t.name.toLowerCase() === ticketParam.toLowerCase(),
      );
      if (match && !match.isSoldOut) {
        setSelectedTicketTypeId(match.id);
        setCurrentStep("form");
        return;
      }
    }

    if (
      savedTicketId &&
      activeTicketTypes.some((t) => t.id === savedTicketId && !t.isSoldOut)
    ) {
      setSelectedTicketTypeId(savedTicketId);
    } else if (activeTicketTypes.length === 1 && !activeTicketTypes[0].isSoldOut) {
      setSelectedTicketTypeId(activeTicketTypes[0].id);
    }
  }, [storageKey, ticketParam, activeTicketTypes, defaultValues, reset]);

  // ── Debounced (400ms) writes to localStorage ──────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            ticketTypeId: selectedTicketTypeId,
            formResponses: formValues,
            couponCode,
            updatedAt: Date.now(),
          }),
        );
      } catch {}
    }, 400);

    return () => clearTimeout(timer);
  }, [storageKey, selectedTicketTypeId, formValues, couponCode]);

  // ── Effective Selected Ticket ─────────────────────────────────────────────
  const selectedTicket = useMemo(() => {
    return activeTicketTypes.find((t) => t.id === selectedTicketTypeId) || null;
  }, [activeTicketTypes, selectedTicketTypeId]);

  // ── Pagination handlers ───────────────────────────────────────────────────
  const handleNextPage = async () => {
    const fieldIds = (pages[currentPage] ?? []).map((f) => f.id);
    const valid = await trigger(fieldIds);
    if (valid) setCurrentPage((p) => p + 1);
  };

  const handleBackPage = () => setCurrentPage((p) => p - 1);

  // ── Step Navigation Handlers ──────────────────────────────────────────────
  const handleContinueToForm = () => {
    if (!selectedTicketTypeId) return;
    setCurrentStep("form");
  };

  const handleChangeTicket = () => {
    void refreshAvailability();
    setCurrentStep("tickets");
  };

  const handleContinueToReview = () => {
    // Client-side pure validation via validateRegistrationResponses
    const result = validateRegistrationResponses(
      visibleFormFields,
      formValues,
    );
    if (!result.success) {
      setValidationErrors(result.errors);
      return;
    }
    setValidationErrors({});
    setCurrentStep("checkout");
  };

  const handleApplyCoupon = useCallback(
    async (codeToApply: string) => {
      setIsApplyingCoupon(true);
      setCouponError("");
      setCouponApplied(false);
      try {
        const data = await refreshAvailability(codeToApply);
        if (data) {
          setCouponApplied(true);
        } else {
          setCouponError("Invalid or expired coupon code.");
        }
      } catch {
        setCouponError("Could not apply coupon code.");
      } finally {
        setIsApplyingCoupon(false);
      }
    },
    [refreshAvailability],
  );

  const handleFinalSubmit = async () => {
    if (!selectedTicketTypeId) return;
    const purchases = [
      {
        ticketTypeId: selectedTicketTypeId,
        formResponses: buildFormResponses(
          normalizedFormFields,
          formValues,
          selectedTicketTypeId,
        ),
      },
    ];

    await checkout.submitCheckout({
      eventId: event.id,
      code: couponCode.trim() || undefined,
      purchases,
    });
  };

  // ── If registration already completed ──────────────────────────────────────
  const effectiveTicketId =
    checkout.completedTicketId || checkout.activeOrder?.ticketId;
  const isComplete =
    Boolean(effectiveTicketId) ||
    checkout.activeOrder?.status === "completed" ||
    checkout.activeOrder?.status === "pending_approval";

  if (isComplete) {
    return (
      <div className={styles.successCard}>
        <div className={styles.successIconWrapper}>
          <FiCheckCircle size={32} />
        </div>
        <h2 className={styles.successTitle}>
          {checkout.activeOrder?.status === "pending_approval"
            ? "Registration Submitted"
            : "Registration Confirmed!"}
        </h2>
        <p className={styles.successSubtitle}>
          {checkout.activeOrder?.status === "pending_approval"
            ? "Your registration is awaiting approval by the organizer. You will be notified once reviewed."
            : "Your entry pass has been issued and is ready for the event."}
        </p>
        {effectiveTicketId ? (
          <Link
            to="/passes/$ticketId"
            params={{ ticketId: effectiveTicketId }}
            className={styles.successPassBtn}
          >
            <Ticket size={16} />
            <span>View Entry Pass</span>
          </Link>
        ) : (
          <Link
            to="/$eventSlug"
            params={{ eventSlug: event.slug }}
            className={styles.successPassBtn}
          >
            <span>Return to Event</span>
          </Link>
        )}
      </div>
    );
  }

  // ── Render Form ────────────────────────────────────────────────────────────
  return (
    <div className={styles.form}>
      {/* 3-Step Breadcrumbs */}
      <div className={styles.stepBar} role="navigation" aria-label="Registration Steps">
        <div
          className={`${styles.stepItem} ${currentStep === "tickets" ? styles.stepItemActive : styles.stepItemDone}`}
          onClick={() => setCurrentStep("tickets")}
        >
          <span
            className={`${styles.stepNumber} ${currentStep === "tickets" ? styles.stepNumberActive : ""}`}
          >
            1
          </span>
          <span>Pass</span>
        </div>
        <span className={styles.stepDivider}>/</span>
        <div
          className={`${styles.stepItem} ${currentStep === "form" ? styles.stepItemActive : currentStep === "checkout" ? styles.stepItemDone : ""}`}
          onClick={() => {
            if (selectedTicketTypeId) setCurrentStep("form");
          }}
        >
          <span
            className={`${styles.stepNumber} ${currentStep === "form" ? styles.stepNumberActive : ""}`}
          >
            2
          </span>
          <span>Details</span>
        </div>
        <span className={styles.stepDivider}>/</span>
        <div
          className={`${styles.stepItem} ${currentStep === "checkout" ? styles.stepItemActive : ""}`}
        >
          <span
            className={`${styles.stepNumber} ${currentStep === "checkout" ? styles.stepNumberActive : ""}`}
          >
            3
          </span>
          <span>Review</span>
        </div>
      </div>

      {event.requireApproval && <ApprovalBanner />}

      {/* ── STEP 1: Ticket Selection ─────────────────────────────────────── */}
      {currentStep === "tickets" && (
        <>
          <TicketSelector
            ticketTypes={activeTicketTypes}
            selectedId={selectedTicketTypeId}
            onSelect={(id) => setSelectedTicketTypeId(id)}
            hasError={false}
          />

          <Button
            type="button"
            disabled={!selectedTicketTypeId || Boolean(selectedTicket?.isSoldOut)}
            onClick={handleContinueToForm}
            className={styles.submitBtn}
          >
            <span>Continue to Form</span>
            <FiArrowRight size={16} />
          </Button>
        </>
      )}

      {/* ── STEP 2: Registration Form ─────────────────────────────────────── */}
      {currentStep === "form" && (
        <>
          {selectedTicket && (
            <div className={styles.selectedTicketBar}>
              <div className={styles.ticketBarLeft}>
                <div className={styles.ticketBarIcon}>
                  <Ticket size={16} />
                </div>
                <div className={styles.ticketBarMeta}>
                  <span className={styles.ticketBarLabel}>Selected Pass</span>
                  <span className={styles.ticketBarName}>
                    {selectedTicket.name}
                  </span>
                </div>
              </div>
              <div className={styles.ticketBarRight}>
                <span className={styles.ticketBarPrice}>
                  {formatPrice(selectedTicket.price)}
                </span>
                <button
                  type="button"
                  onClick={handleChangeTicket}
                  className={styles.changeTicketBtn}
                >
                  Change Ticket
                </button>
              </div>
            </div>
          )}

          {visibleFormFields.length > 0 ? (
            <FormFieldsSection
              fields={visibleFormFields}
              currentPage={currentPage}
              maxPage={maxPage}
              pages={pages}
              control={control}
              errors={formErrors}
              timezone={event.timezone}
              onNext={handleNextPage}
              onBack={handleBackPage}
            />
          ) : (
            <AttendeePreview user={user} />
          )}

          {Object.keys(validationErrors).length > 0 && (
            <div className={styles.errorBanner} role="alert">
              <span>
                Please check the required fields:{" "}
                {Object.values(validationErrors).slice(0, 2).join(", ")}
              </span>
            </div>
          )}

          <Button
            type="button"
            onClick={handleContinueToReview}
            className={styles.submitBtn}
          >
            <span>Continue to Review</span>
            <FiArrowRight size={16} />
          </Button>
        </>
      )}

      {/* ── STEP 3: Checkout Review ───────────────────────────────────────── */}
      {currentStep === "checkout" && (
        <CheckoutReview
          selectedTicket={selectedTicket}
          user={user}
          formResponses={formValues}
          couponCode={couponCode}
          onCouponChange={setCouponCode}
          onApplyCoupon={handleApplyCoupon}
          isApplyingCoupon={isApplyingCoupon}
          couponError={couponError}
          couponApplied={couponApplied}
          onEditDetails={() => setCurrentStep("form")}
          onSubmit={handleFinalSubmit}
          isSubmitting={checkout.isSubmitting}
          errorMessage={checkout.errorMessage}
          requireApproval={event.requireApproval}
        />
      )}
    </div>
  );
}
