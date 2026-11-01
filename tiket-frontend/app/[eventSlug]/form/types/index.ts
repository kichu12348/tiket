import type { Control, FieldValues, FieldErrors, FieldError } from "react-hook-form";
import type { TicketType } from "@/types/ticketType";
import type { FormField } from "@/types/form";
import type { Event } from "@/types/event";

// ─── Registration Form Type Contracts ──────────────────────────────────────────

export interface RegistrationUser {
  id: string;
  name: string;
  email: string;
}

export interface RegistrationFormProps {
  event: Event;
  user: RegistrationUser;
  ticketTypes: TicketType[];
  formFields: FormField[];
}

export interface FieldRendererProps {
  field: FormField;
  control: Control<FieldValues>;
  error?: FieldError | { message?: string };
  timezone?: string;
}

export interface TicketSelectorProps {
  ticketTypes: TicketType[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  hasError: boolean;
}

export interface AutoSelectedBadgeProps {
  ticket: TicketType;
}

export interface FormFieldsSectionProps {
  fields: FormField[];
  currentPage: number;
  maxPage: number;
  pages: Record<number, FormField[]>;
  control: Control<FieldValues>;
  errors: FieldErrors<FieldValues>;
  timezone?: string;
  onNext: () => void;
  onBack: () => void;
}

export interface AttendeePreviewProps {
  user: RegistrationUser;
}

export interface SuccessCardProps {
  event: Event;
  createdTicketId: string | null;
}

export interface EmptyStateProps {
  slug: string;
}

export type SubmitStep = "idle" | "submitting" | "success" | "error";
