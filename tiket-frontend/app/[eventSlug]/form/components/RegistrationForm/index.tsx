"use client";



import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FiAlertCircle, FiLoader } from "react-icons/fi";
import { Button } from "@/components/ui/button";

import { useCheckout } from "@/hooks/useCheckout";
import { useAvailability } from "@/hooks/useAvailability";
import CheckoutReview from "../CheckoutReview";
import { Input } from "@/components/ui/input";
import type { RegistrationFormProps, SubmitStep } from "./types";
import { isTicketActive, buildZodSchema, buildFormResponses } from "./utils";

import ApprovalBanner from "./ApprovalBanner";
import { TicketSelector, AutoSelectedBadge } from "./TicketSelector";
import FormFieldsSection from "./FormFieldsSection";
import AttendeePreview from "./AttendeePreview";


import styles from "./RegistrationForm.module.css";

/**
 * Orchestrator component.
 * Owns: form state, submission flow, page navigation state.
 * Delegates: all rendering to dedicated sub-components.
 */
export default function RegistrationForm({
  event,
  user,
  ticketTypes,
  formFields,
}: RegistrationFormProps) {
  const checkout = useCheckout(event.id, user);
  const [code, setCode] = useState("");
  const availability = useAvailability(event.id, code);
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [submitStep, setSubmitStep] = useState<SubmitStep>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // ── Ticket filtering ───────────────────────────────────────────────────────
  const activeTicketTypes = useMemo(
    () => (availability?.tiers ?? ticketTypes).filter(isTicketActive),
    [ticketTypes, availability],
  );
  const needsTicketSelection = activeTicketTypes.length > 1;



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

  // ── Page / field grouping ──────────────────────────────────────────────────
  const maxPage =
    normalizedFormFields.length > 0
      ? Math.max(...normalizedFormFields.map((f) => f.page))
      : 0;

  const pages = useMemo(() => {
    const map: Record<number, typeof normalizedFormFields> = {};
    for (const f of normalizedFormFields) {
      if (!map[f.page]) map[f.page] = [];
      map[f.page]!.push(f);
    }
    return map;
  }, [normalizedFormFields]);

  const hasForm = normalizedFormFields.length > 0;

  // ── Zod + react-hook-form ──────────────────────────────────────────────────
  const schema = useMemo(
    () => buildZodSchema(normalizedFormFields),
    [normalizedFormFields]
  );

  const defaultValues = useMemo(() => {
    const defaults: Record<string, string> = {};
    for (const f of normalizedFormFields) {
      if (f.name === "email" || f.fieldType === "email") {
        defaults[f.id] = user.email || "";
      } else if (f.name === "name") {
        defaults[f.id] = user.name || "";
      }
    }
    return defaults;
  }, [normalizedFormFields, user]);

  const {
    control,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onBlur",
  });

  // ── Pagination handlers ────────────────────────────────────────────────────
  const handleNextPage = async () => {
    const fieldIds = (pages[currentPage] ?? []).map((f) => f.id);
    const valid = await trigger(fieldIds);
    if (valid) setCurrentPage((p) => p + 1);
  };

  const handleBackPage = () => setCurrentPage((p) => p - 1);

  // ── Submission ─────────────────────────────────────────────────────────────
  const onSubmit = async (data: Record<string, unknown>) => {
    const effectiveTypeId = selectedTicketTypeId ?? activeTicketTypes[0]?.id;
    if (!effectiveTypeId) {
      setErrorMessage("Please select a ticket type.");
      setSubmitStep("error");
      return;
    }

    await checkout.prepare({ eventId: event.id, code: code.trim() || undefined, purchases: [{ ticketTypeId: effectiveTypeId, formResponses: buildFormResponses(normalizedFormFields, data) }] });
  };

  if (checkout.checkout) return <CheckoutReview data={checkout.checkout} remaining={checkout.remaining} busy={checkout.busy} error={checkout.error} pay={checkout.pay} cancel={checkout.cancel} restart={checkout.restart} />;
  const selectedTicket = activeTicketTypes.find(
    (t) => t.id === (selectedTicketTypeId ?? activeTicketTypes[0]?.id),
  );

  const canGoNext = currentPage < maxPage;
  const showSubmit = !canGoNext || !hasForm;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit(onSubmit as Parameters<typeof handleSubmit>[0])}
    >
      {event.requireApproval && <ApprovalBanner />}
      <label>Coupon or access code<Input value={code} onChange={event => setCode(event.target.value)} placeholder="Enter a code" maxLength={64} /></label>
      {availability && <p>{availability.remaining === null ? "Unlimited capacity" : availability.remaining + " spots available"}. A spot is held for 12 minutes after you review your order.</p>}
      {activeTicketTypes.length === 0 && <p>No tickets are on sale. Enter an access code if you have one.</p>}
      {checkout.error && <p role="alert">{checkout.error}</p>}

      {needsTicketSelection && (
        <TicketSelector
          ticketTypes={activeTicketTypes}
          selectedId={selectedTicketTypeId ?? activeTicketTypes[0]?.id ?? null}
          onSelect={setSelectedTicketTypeId}
          hasError={submitStep === "error"}
        />
      )}

      {!needsTicketSelection && selectedTicket && (
        <AutoSelectedBadge ticket={selectedTicket} />
      )}

      {hasForm && (
        <FormFieldsSection
          fields={normalizedFormFields}
          currentPage={currentPage}
          maxPage={maxPage}
          pages={pages}
          control={control}
          errors={errors}
          timezone={event.timezone}
          onNext={handleNextPage}
          onBack={handleBackPage}
        />
      )}

      <AttendeePreview user={user} />

      {submitStep === "error" && errorMessage && (
        <div className={styles.errorBanner}>
          <FiAlertCircle size={15} />
          {errorMessage}
        </div>
      )}

      {showSubmit && (
        <Button
          id="submit-registration"
          type="submit"
          size="lg"
          disabled={checkout.busy || activeTicketTypes.length === 0}
          className={`${styles.primaryBtn} ${styles.submitBtn} ${checkout.busy ? styles.submitting : ""}`}
        >
          {checkout.busy ? (
            <>
              <FiLoader size={16} className={styles.spinIcon} />
              Submitting…
            </>
          ) : event.requireApproval ? (
            "Request to Join"
          ) : (
            "Review registration"
          )}
        </Button>
      )}
    </form>
  );
}
