export type FieldType =
  | "text"
  | "long_text"
  | "email"
  | "phone"
  | "number"
  | "single_select"
  | "multi_select"
  | "radio"
  | "checkbox"
  | "date"
  | "datetime"
  | "time"
  | "rating"
  | "url"
  | "file"
  | "select";

export interface FieldTypeOption {
  label: string;
  value: FieldType;
}

export const FIELD_TYPES: FieldTypeOption[] = [
  { label: "Text", value: "text" },
  { label: "Long Text", value: "long_text" },
  { label: "Email", value: "email" },
  { label: "Phone", value: "phone" },
  { label: "Number", value: "number" },
  { label: "Single Select", value: "single_select" },
  { label: "Multi Select", value: "multi_select" },
  { label: "Select", value: "select" },
  { label: "Radio", value: "radio" },
  { label: "Checkbox", value: "checkbox" },
  { label: "Date", value: "date" },
  { label: "Date & Time", value: "datetime" },
  { label: "Time", value: "time" },
  { label: "Rating", value: "rating" },
  { label: "URL", value: "url" },
  { label: "File", value: "file" },
];

export type FormFieldOptions =
  | string[]
  | { choices: string[]; min?: number | null; max?: number | null }
  | null;

export interface VisibilityConditionRule {
  fieldId: string; // Selected via Radix UI Select dropdown (single form question)
  allowedValues: string[]; // Checked via Radix UI Checkbox list (one or multiple values can be checked)
}

export interface ConditionRule {
  sourceType: "field" | "ticketType";
  sourceId: string; // fieldId or "ticketTypeId"
  operator: "equals" | "not_equals" | "contains" | "in";
  value: string | string[];
}

export interface ConditionGroup {
  match: "all" | "any"; // AND vs OR
  rules: ConditionRule[];
}

export interface FieldConditionConfig {
  match: "all" | "any"; // AND vs OR
  rules: ConditionRule[];
  thenAction: "show" | "require" | "hide";
  elseAction: "hide" | "optional" | "show";
}

export interface FormField {
  id: string;
  eventId: string;
  name: string;
  label: string;
  fieldType: FieldType;
  isRequired: boolean;
  isLocked?: boolean;
  options: FormFieldOptions;
  conditions?: VisibilityConditionRule[] | FieldConditionConfig | null;
  sortOrder: number;
  page: number;
  createdAt: string;
}

export interface CreateFormFieldPayload {
  name: string;
  label: string;
  fieldType: FieldType;
  isRequired?: boolean;
  isLocked?: boolean;
  options?: FormFieldOptions;
  conditions?: VisibilityConditionRule[] | FieldConditionConfig | null;
  sortOrder?: number;
  page?: number;
}

export type UpdateFormFieldPayload = Partial<CreateFormFieldPayload>;
