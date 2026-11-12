export type FieldType =
  | "text"
  | "long_text"
  | "email"
  | "phone"
  | "number"
  | "single_select"
  | "multi_select"
  | "date"
  | "datetime"
  | "time"
  | "rating"
  | "url";

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
  { label: "Dropdown", value: "single_select" },
  { label: "Select", value: "multi_select" },
  { label: "Date", value: "date" },
  { label: "Date & Time", value: "datetime" },
  { label: "Time", value: "time" },
  { label: "Rating", value: "rating" },
  { label: "URL", value: "url" },
];

export type FormFieldOptions =
  | string[]
  | {
      choices: string[];
      min?: number | null;
      max?: number | null;
      allowCustom?: boolean | null;
      isMulti?: boolean | null;
    }
  | null;

export type VisibilityConditionOperator = "equals" | "not_equals" | "in";

export interface VisibilityConditionRule {
  fieldId: string; // Selected via Radix UI Select dropdown (single form question)
  operator?: VisibilityConditionOperator;
  allowedValues: string[]; // Values matched by the operator
}

export interface VisibilityConditionsConfig {
  match: "all" | "any"; // AND vs OR
  rules: VisibilityConditionRule[];
}

export type VisibilityConditions =
  | VisibilityConditionRule[]
  | VisibilityConditionsConfig;

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
  conditions?: VisibilityConditions | FieldConditionConfig | null;
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
  conditions?: VisibilityConditions | FieldConditionConfig | null;
  sortOrder?: number;
  page?: number;
}

export type UpdateFormFieldPayload = Partial<CreateFormFieldPayload>;
