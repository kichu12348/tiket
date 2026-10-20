import type { formFields } from "@db/schema";
import { HttpError } from "./errors";

export interface FormResponse {
  fieldId: string;
  responseValue: string;
}
type Field = typeof formFields.$inferSelect;

export function validateFormResponses(
  fields: Field[],
  responses: FormResponse[] = [],
): void {
  const known = new Map(fields.map((field) => [field.id, field]));
  const answers = new Map<string, string>();
  for (const response of responses) {
    if (!known.has(response.fieldId))
      throw new HttpError(400, "A form field does not belong to this event.");
    if (answers.has(response.fieldId))
      throw new HttpError(400, "Duplicate form answers are not allowed.");
    answers.set(response.fieldId, response.responseValue.trim());
  }
  for (const field of fields) {
    const value = answers.get(field.id) ?? "";
    let selected: string[] = [];
    const multiple =
      field.fieldType === "multi_select" || field.fieldType === "checkbox";
    if (multiple && value) {
      try {
        const parsed: unknown = JSON.parse(value);
        if (
          !Array.isArray(parsed) ||
          !parsed.every((item) => typeof item === "string")
        )
          throw new Error("Invalid selection");
        selected = parsed;
      } catch {
        // Older clients encode selections as comma-separated values.
        selected = value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }
    if (field.isRequired && (!value || (multiple && selected.length === 0))) {
      throw new HttpError(400, `${field.label} is required.`);
    }
    if (!value || (multiple && selected.length === 0)) continue;
    const invalid = () => {
      throw new HttpError(400, `Invalid answer for ${field.label}.`);
    };
    if (
      field.fieldType === "email" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    )
      invalid();
    if (field.fieldType === "phone" && !/^\+?[\d\s\-()]{7,20}$/.test(value))
      invalid();
    if (
      field.fieldType === "number" &&
      (!value.trim() || !Number.isFinite(Number(value)))
    )
      invalid();
    if (
      field.fieldType === "rating" &&
      (!Number.isInteger(Number(value)) ||
        Number(value) < 1 ||
        Number(value) > 5)
    )
      invalid();
    if (field.fieldType === "url") {
      try {
        if (!["http:", "https:"].includes(new URL(value).protocol)) invalid();
      } catch {
        invalid();
      }
    }
    if (field.fieldType === "file" && !/^file:[0-9a-f-]{36}$/i.test(value))
      invalid();
    if (
      ["date", "datetime"].includes(field.fieldType) &&
      Number.isNaN(Date.parse(value))
    )
      invalid();
    if (
      field.fieldType === "time" &&
      !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)
    )
      invalid();
    const options = field.options;
    const choices: string[] = Array.isArray(options)
      ? options.filter((item): item is string => typeof item === "string")
      : options &&
          typeof options === "object" &&
          "choices" in options &&
          Array.isArray(options.choices)
        ? options.choices.filter(
            (item): item is string => typeof item === "string",
          )
        : [];
    if (multiple) {
      if (
        new Set(selected).size !== selected.length ||
        selected.some((item) => !choices.includes(item))
      )
        invalid();
      if (options && !Array.isArray(options) && typeof options === "object") {
        if (
          "min" in options &&
          typeof options.min === "number" &&
          selected.length < options.min
        )
          invalid();
        if (
          "max" in options &&
          typeof options.max === "number" &&
          selected.length > options.max
        )
          invalid();
      }
    } else if (
      ["select", "single_select", "radio"].includes(field.fieldType) &&
      !choices.includes(value)
    )
      invalid();
  }
}
