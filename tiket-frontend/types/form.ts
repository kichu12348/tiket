export const FIELD_TYPES = [
  { label: "Text", value: "text" as const },
  { label: "LongText", value: "long_text" as const },
  { label: "Email", value: "email" as const },
  { label: "Phone", value: "phone" as const },
  { label: "SingleSelect", value: "single_select" as const },
  { label: "MultiSelect", value: "multi_select" as const },
  { label: "Radio", value: "radio" as const },
  { label: "Checkbox", value: "checkbox" as const },
  { label: "Number", value: "number" as const },
  { label: "DateTime", value: "datetime" as const },
  { label: "Date", value: "date" as const },
  { label: "Time", value: "time" as const },
  { label: "Rating", value: "rating" as const },
  { label: "Url", value: "url" as const },
];

export type FieldType =
  | (typeof FIELD_TYPES)[number]["value"]
  | "select"
  | "file";

export type FormFieldOptions =
  | string[]
  | { choices: string[]; min: number | null; max: number | null }
  | null;

export interface FormField {
  id: string;
  eventId: string;
  name: string;
  label: string;
  fieldType: FieldType;
  isRequired: boolean;
  options: FormFieldOptions;
  sortOrder: number;
  page: number;
  createdAt: string;
}

export interface CreateFormFieldPayload {
  name: string;
  label: string;
  fieldType: FieldType;
  isRequired?: boolean;
  options?: FormFieldOptions;
  sortOrder?: number;
  page?: number;
}

export interface UpdateFormFieldPayload extends Partial<CreateFormFieldPayload> {}
