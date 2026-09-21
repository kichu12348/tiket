import { z } from "zod";
import { TicketType } from "@/types/ticketType";
import { FormField } from "@/types/form";

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
 * Derives a Zod schema from an array of FormField definitions.
 * Each field id becomes a key; field type and isRequired drive the validators.
 */
export function buildZodSchema(fields: FormField[]): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {};

  for (const field of fields) {
    let validator: z.ZodTypeAny;

    switch (field.fieldType) {
      case "email":
        validator = z.string().email("Enter a valid email");
        break;
      case "phone":
        validator = z
          .string()
          .regex(/^\+?[\d\s\-()]{7,15}$/, "Enter a valid phone number");
        break;
      case "number":
        validator = z.string().regex(/^\d+$/, "Must be a number");
        break;
      case "url":
        validator = z.string().url("Enter a valid URL");
        break;
      case "rating":
        validator = z.string().min(1, "Please select a rating");
        break;
      case "multi_select":
      case "checkbox": {
        let arr = z.array(z.string());
        const opts = (field.options && typeof field.options === "object" && !Array.isArray(field.options)
          ? field.options
          : null) as { choices?: string[]; min?: number | null; max?: number | null } | null;

        const choicesCount = Array.isArray(field.options)
          ? field.options.length
          : opts?.choices?.length ?? 0;

        const rawMin = opts?.min ?? null;
        const rawMax = opts?.max ?? null;

        const effectiveMin = rawMin != null && rawMin > 0
          ? (choicesCount > 0 ? Math.min(rawMin, choicesCount) : rawMin)
          : null;
        const effectiveMax = rawMax != null && rawMax > 0
          ? (choicesCount > 0 ? Math.min(rawMax, choicesCount) : rawMax)
          : null;

        if (effectiveMin != null && effectiveMin > 0) {
          arr = arr.min(effectiveMin, `Select at least ${effectiveMin} option${effectiveMin > 1 ? "s" : ""}`);
        } else if (field.isRequired) {
          arr = arr.min(1, `${field.label} is required`);
        }

        if (effectiveMax != null && effectiveMax > 0) {
          arr = arr.max(effectiveMax, `Select at most ${effectiveMax} option${effectiveMax > 1 ? "s" : ""}`);
        }

        shape[field.id] = arr;
        continue;
      }
      default:
        validator = z.string();
    }

    if (field.isRequired) {
      validator = (validator as z.ZodString).min(
        1,
        `${field.label} is required`,
      );
    } else {
      validator = validator.optional();
    }

    shape[field.id] = validator;
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
      const responseValue = Array.isArray(val) ? val.join(",") : String(val);
      return { fieldId: field.id, responseValue };
    })
    .filter(Boolean) as { fieldId: string; responseValue: string }[];
}
