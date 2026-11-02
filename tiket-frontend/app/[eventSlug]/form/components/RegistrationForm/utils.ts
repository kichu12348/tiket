import { z } from "zod";
import type { TicketType } from "@/types/ticketType";
import type { FormField } from "@/types/form";

/** Returns true when a ticket type is currently on sale. */
export function isTicketActive(tt: TicketType): boolean {
  const now = new Date();
  if (tt.saleStart && new Date(tt.saleStart) > now) return false;
  if (tt.saleEnd && new Date(tt.saleEnd) < now) return false;
  return true;
}

/** Formats a price string as a localised currency or "Free". */
export function formatPrice(price: string): string {
  const n = parseFloat(price);
  if (n === 0) return "Free";
  return `₹${n.toLocaleString("en-IN")}`;
}

/**
 * Extracts string choices from a FormField's options whether it is
 * string[] or { choices: string[] }.
 */
export function extractChoices(options: FormField["options"]): string[] {
  if (Array.isArray(options)) {
    return options.filter((item): item is string => typeof item === "string");
  }
  if (
    options &&
    typeof options === "object" &&
    "choices" in options &&
    Array.isArray(options.choices)
  ) {
    return options.choices.filter(
      (item): item is string => typeof item === "string",
    );
  }
  return [];
}

/**
 * Groups and sorts form fields by page (1-indexed) and sortOrder.
 */
export function groupFieldsByPage(fields: FormField[]): {
  pages: Record<number, FormField[]>;
  maxPage: number;
  sortedFields: FormField[];
} {
  if (!fields || fields.length === 0) {
    return { pages: {}, maxPage: 0, sortedFields: [] };
  }

  const minPage = Math.min(...fields.map((f) => f.page));
  const pageOffset = minPage === 0 ? 1 : 0;

  const sortedFields = [...fields]
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

  const maxPage = Math.max(...sortedFields.map((f) => f.page));
  const pages: Record<number, FormField[]> = {};

  for (const f of sortedFields) {
    if (!pages[f.page]) pages[f.page] = [];
    pages[f.page]!.push(f);
  }

  return { pages, maxPage, sortedFields };
}

/**
 * Derives a Zod schema from an array of FormField definitions.
 * Validates each field type in 100% compliance with tiket-backend validateFormResponses.
 */
export function buildZodSchema(
  fields: FormField[],
): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {};

  for (const field of fields) {
    const choices = extractChoices(field.options);
    const multiple =
      field.fieldType === "multi_select" || field.fieldType === "checkbox";

    if (multiple) {
      const opts =
        field.options &&
        typeof field.options === "object" &&
        !Array.isArray(field.options)
          ? field.options
          : null;
      const minChoices = typeof opts?.min === "number" ? opts.min : null;
      const maxChoices = typeof opts?.max === "number" ? opts.max : null;

      shape[field.id] = z.array(z.string()).superRefine((items, ctx) => {
        if (field.isRequired && items.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${field.label} is required`,
          });
          return;
        }

        if (items.length === 0) return;

        if (new Set(items).size !== items.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Duplicate selections are not allowed",
          });
        }

        if (
          choices.length > 0 &&
          items.some((item) => !choices.includes(item))
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid answer for ${field.label}`,
          });
        }

        if (minChoices !== null && items.length < minChoices) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Select at least ${minChoices} option${minChoices > 1 ? "s" : ""}`,
          });
        }

        if (maxChoices !== null && items.length > maxChoices) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Select at most ${maxChoices} option${maxChoices > 1 ? "s" : ""}`,
          });
        }
      });
      continue;
    }

    shape[field.id] = z.string().superRefine((val, ctx) => {
      const trimmed = val.trim();
      if (!trimmed) {
        if (field.isRequired) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${field.label} is required`,
          });
        }
        return;
      }

      if (
        field.fieldType === "email" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid email address",
        });
      }

      if (
        field.fieldType === "phone" &&
        !/^\+?[\d\s\-()]{7,20}$/.test(trimmed)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid phone number",
        });
      }

      if (
        field.fieldType === "number" &&
        (!trimmed || !Number.isFinite(Number(trimmed)))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must be a valid number",
        });
      }

      if (field.fieldType === "rating") {
        const n = Number(trimmed);
        if (!Number.isInteger(n) || n < 1 || n > 5) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Rating must be an integer from 1 to 5",
          });
        }
      }

      if (field.fieldType === "url") {
        try {
          const u = new URL(trimmed);
          if (!["http:", "https:"].includes(u.protocol)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "URL must begin with http:// or https://",
            });
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Enter a valid URL",
          });
        }
      }

      if (
        field.fieldType === "file" &&
        !/^file:[0-9a-f-]{36}$/i.test(trimmed)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please upload a valid file",
        });
      }

      if (
        ["date", "datetime"].includes(field.fieldType) &&
        Number.isNaN(Date.parse(trimmed))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid date",
        });
      }

      if (
        field.fieldType === "time" &&
        !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(trimmed)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid time (HH:mm)",
        });
      }

      if (
        ["select", "single_select", "radio"].includes(field.fieldType) &&
        choices.length > 0 &&
        !choices.includes(trimmed)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Please select a valid option for ${field.label}`,
        });
      }
    });
  }

  return z.object(shape);
}

/**
 * Converts raw react-hook-form data into the flat form-response array
 * expected by the POST /api/orders body.
 */
export function buildFormResponses(
  formFields: FormField[],
  data: Record<string, unknown>,
): { fieldId: string; responseValue: string }[] {
  return formFields
    .map((field) => {
      const val = data[field.id];
      if (val === undefined || val === null || val === "") return null;
      if (Array.isArray(val)) {
        if (val.length === 0) return null;
        return { fieldId: field.id, responseValue: JSON.stringify(val) };
      }
      const strVal = String(val).trim();
      if (!strVal) return null;
      return { fieldId: field.id, responseValue: strVal };
    })
    .filter(Boolean) as { fieldId: string; responseValue: string }[];
}
