import { z } from "zod";
import type { FormField } from "@/types/form";

export interface RegistrationValidationResult {
  success: boolean;
  errors: Record<string, string>;
}

export function validateRegistrationResponses(
  fields: FormField[],
  responses: Record<string, unknown>,
): RegistrationValidationResult {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const rawVal = responses[field.id] ?? responses[field.name];
    const strVal = typeof rawVal === "string" ? rawVal.trim() : "";
    const isPresent =
      rawVal !== undefined &&
      rawVal !== null &&
      (Array.isArray(rawVal) ? rawVal.length > 0 : strVal.length > 0);

    // 1. Required Check
    if (field.isRequired && !isPresent) {
      errors[field.id] = `${field.label || "This field"} is required.`;
      continue;
    }

    if (!isPresent) {
      continue; // Optional and empty
    }

    // 2. Type-specific validations
    const fieldType = (field.fieldType as string) || "text";

    if (fieldType === "email" || field.name.toLowerCase() === "email") {
      const emailResult = z
        .string()
        .email("Invalid email address")
        .safeParse(strVal);
      if (!emailResult.success) {
        errors[field.id] =
          emailResult.error.issues[0]?.message || "Invalid email address";
      }
    } else if (
      fieldType === "phone" ||
      field.name.toLowerCase() === "phone"
    ) {
      const cleaned = strVal.replace(/[\s-]/g, "");
      const phoneValid = /^\+?[0-9]{7,15}$/.test(cleaned);
      if (!phoneValid) {
        errors[field.id] =
          "Enter a valid phone number (at least 7 digits).";
      }
    } else if (fieldType === "url") {
      const urlResult = z
        .string()
        .url("Invalid URL format (e.g. https://example.com)")
        .safeParse(strVal);
      if (!urlResult.success) {
        errors[field.id] =
          urlResult.error.issues[0]?.message || "Invalid URL";
      }
    } else if (fieldType === "number") {
      const num = Number(strVal);
      if (Number.isNaN(num)) {
        errors[field.id] = "Please enter a valid number.";
      }
    } else if (fieldType === "date" || fieldType === "datetime") {
      const dateParsed = Date.parse(strVal);
      if (Number.isNaN(dateParsed)) {
        errors[field.id] = "Enter a valid date.";
      }
    } else if (fieldType === "rating") {
      const rating = Number(strVal);
      if (Number.isNaN(rating) || rating < 1 || rating > 5) {
        errors[field.id] = "Rating must be between 1 and 5.";
      }
    } else if (
      fieldType === "multi_select" ||
      fieldType === "checkbox" ||
      fieldType === "select"
    ) {
      if (
        field.isRequired &&
        Array.isArray(rawVal) &&
        rawVal.length === 0
      ) {
        errors[field.id] = `Please select at least one option for ${field.label}.`;
      }
    } else if (fieldType === "file") {
      if (field.isRequired && !strVal && typeof rawVal !== "object") {
        errors[field.id] = `Please upload a file for ${field.label}.`;
      }
    }
  }

  // Also check buyer email if supplied under standard keys
  if (responses.email && typeof responses.email === "string") {
    const emailRes = z
      .string()
      .email("Invalid email address")
      .safeParse(responses.email.trim());
    if (!emailRes.success) {
      errors.email =
        emailRes.error.issues[0]?.message || "Invalid email address";
    }
  }

  if (responses.phone && typeof responses.phone === "string") {
    const cleaned = responses.phone.trim().replace(/[\s-]/g, "");
    if (cleaned && !/^\+?[0-9]{7,15}$/.test(cleaned)) {
      errors.phone = "Enter a valid phone number.";
    }
  }

  return {
    success: Object.keys(errors).length === 0,
    errors,
  };
}
