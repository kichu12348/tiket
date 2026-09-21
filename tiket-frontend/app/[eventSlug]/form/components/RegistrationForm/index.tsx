"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FiAlertCircle, FiLoader } from "react-icons/fi";
import { Button } from "@/components/ui/button";

import { submitRegistrationOrder } from "../../services/registrationService";
import { RegistrationFormProps, SubmitStep } from "./types";
import { isTicketActive, buildZodSchema, buildFormResponses } from "./utils";
import Skeleton from "./Skeleton";
import ApprovalBanner from "./ApprovalBanner";
import { TicketSelector, AutoSelectedBadge } from "./TicketSelector";
import FormFieldsSection from "./FormFieldsSection";
import AttendeePreview from "./AttendeePreview";
import SuccessCard from "./SuccessCard";
import EmptyState from "./EmptyState";
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
  const [mounted, setMounted] = useState(false);
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [submitStep, setSubmitStep] = useState<SubmitStep>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);

  // ── Ticket filtering ───────────────────────────────────────────────────────
  const activeTicketTypes = useMemo(
    () => ticketTypes.filter(isTicketActive),
    [ticketTypes],
  );
  const needsTicketSelection = activeTicketTypes.length > 1;

  useEffect(() => {
    setMounted(true);
    // Auto-select when only one ticket type is currently on sale
    if (activeTicketTypes.length === 1 && activeTicketTypes[0]) {
      setSelectedTicketTypeId(activeTicketTypes[0].id);
    }
  }, [activeTicketTypes]);

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
    if (!selectedTicketTypeId) {
      setErrorMessage("Please select a ticket type.");
      setSubmitStep("error");
      return;
    }

    setSubmitStep("submitting");
    setErrorMessage("");

    try {
      const formResponses = buildFormResponses(normalizedFormFields, data);
      const { createdTicketId } = await submitRegistrationOrder({
        eventId: event.id,
        ticketTypeId: selectedTicketTypeId,
        formResponses,
        userEmail: user?.email,
        userName: user?.name,
      });

      setCreatedTicketId(createdTicketId);
      setSubmitStep("success");
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.error
        || (err as Error)?.message
        || "Something went wrong. Please try again.";
      setErrorMessage(msg);
      setSubmitStep("error");
    }
  };

  // ── Early returns ──────────────────────────────────────────────────────────
  if (!mounted) return <Skeleton />;
  if (activeTicketTypes.length === 0) return <EmptyState slug={event.slug} />;
  if (submitStep === "success") {
    return <SuccessCard event={event} createdTicketId={createdTicketId} />;
  }

  const selectedTicket = activeTicketTypes.find(
    (t) => t.id === selectedTicketTypeId,
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

      {needsTicketSelection && (
        <TicketSelector
          ticketTypes={activeTicketTypes}
          selectedId={selectedTicketTypeId}
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
          disabled={submitStep === "submitting"}
          className={`${styles.primaryBtn} ${styles.submitBtn} ${submitStep === "submitting" ? styles.submitting : ""}`}
        >
          {submitStep === "submitting" ? (
            <>
              <FiLoader size={16} className={styles.spinIcon} />
              Submitting…
            </>
          ) : event.requireApproval ? (
            "Request to Join"
          ) : (
            "Complete Registration"
          )}
        </Button>
      )}
    </form>
  );
}
