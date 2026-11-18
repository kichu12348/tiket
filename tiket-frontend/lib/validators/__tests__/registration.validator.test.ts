import { describe, expect, test } from "bun:test";
import { validateRegistrationResponses } from "../registration.validator";
import type { FormField } from "@/types/form";

describe("Registration Validator (validateRegistrationResponses)", () => {
  const baseField = (overrides: Partial<FormField> = {}): FormField => ({
    id: "field-1",
    eventId: "event-1",
    name: "custom_field",
    label: "Custom Field",
    fieldType: "text",
    isRequired: true,
    options: null,
    sortOrder: 0,
    page: 1,
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  test("validates required text fields", () => {
    const fields = [baseField({ id: "f1", label: "Full Name", isRequired: true })];
    const invalid = validateRegistrationResponses(fields, { f1: "   " });
    expect(invalid.success).toBe(false);
    expect(invalid.errors.f1).toBe("Full Name is required.");

    const valid = validateRegistrationResponses(fields, { f1: "John Doe" });
    expect(valid.success).toBe(true);
    expect(Object.keys(valid.errors)).toHaveLength(0);
  });

  test("validates email fields strictly using zod email validator", () => {
    const fields = [
      baseField({ id: "f_email", name: "email", fieldType: "email", isRequired: true }),
    ];
    const invalid = validateRegistrationResponses(fields, { f_email: "not-an-email" });
    expect(invalid.success).toBe(false);
    expect(invalid.errors.f_email).toBe("Invalid email address");

    const valid = validateRegistrationResponses(fields, { f_email: "test@example.com" });
    expect(valid.success).toBe(true);
  });

  test("validates phone numbers", () => {
    const fields = [
      baseField({ id: "f_phone", name: "phone", fieldType: "phone", isRequired: true }),
    ];
    const invalid = validateRegistrationResponses(fields, { f_phone: "123" });
    expect(invalid.success).toBe(false);
    expect(invalid.errors.f_phone).toContain("Enter a valid phone number");

    const valid = validateRegistrationResponses(fields, { f_phone: "+91 9876543210" });
    expect(valid.success).toBe(true);
  });

  test("validates url fields", () => {
    const fields = [
      baseField({ id: "f_url", fieldType: "url", isRequired: true }),
    ];
    const invalid = validateRegistrationResponses(fields, { f_url: "ftp-broken" });
    expect(invalid.success).toBe(false);
    expect(invalid.errors.f_url).toContain("Invalid URL format");

    const valid = validateRegistrationResponses(fields, { f_url: "https://example.com" });
    expect(valid.success).toBe(true);
  });

  test("validates rating fields between 1 and 5", () => {
    const fields = [
      baseField({ id: "f_rate", fieldType: "rating", isRequired: true }),
    ];
    const invalid = validateRegistrationResponses(fields, { f_rate: "10" });
    expect(invalid.success).toBe(false);
    expect(invalid.errors.f_rate).toBe("Rating must be between 1 and 5.");

    const valid = validateRegistrationResponses(fields, { f_rate: "5" });
    expect(valid.success).toBe(true);
  });

  test("validates multi_select array choices", () => {
    const fields = [
      baseField({ id: "f_multi", fieldType: "multi_select", isRequired: true }),
    ];
    const invalid = validateRegistrationResponses(fields, { f_multi: [] });
    expect(invalid.success).toBe(false);

    const valid = validateRegistrationResponses(fields, { f_multi: ["Option A"] });
    expect(valid.success).toBe(true);
  });

  test("passes through optional fields when empty", () => {
    const fields = [
      baseField({ id: "f_opt", isRequired: false }),
    ];
    const res = validateRegistrationResponses(fields, {});
    expect(res.success).toBe(true);
  });
});
