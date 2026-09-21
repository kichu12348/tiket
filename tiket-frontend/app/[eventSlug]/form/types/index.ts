import { TicketType } from "@/types/ticketType";
import { FormField } from "@/types/form";
import { Event } from "@/types/event";

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
  // react-hook-form control object — intentionally loose typed here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error?: any;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any;
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
