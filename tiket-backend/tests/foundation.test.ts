import { describe, expect, test } from "bun:test";
import { toPaise, fromPaise } from "../src/utils/money";
import { sanitizeRichText } from "../src/utils/html";
import { validateFormResponses } from "../src/utils/registration-validation";
import type { formFields } from "../src/db/schema";

describe("trusted input boundaries", () => {
  test("money conversion rejects malformed and imprecise prices", () => {
    expect(toPaise("100.01")).toBe(10001);
    expect(fromPaise(10001)).toBe("100.01");
    for (const value of ["-1", "NaN", "1e3", "1.001", "Infinity"])
      expect(() => toPaise(value)).toThrow();
  });
  test("public rich text cannot execute script or unsafe links", () => {
    const html = sanitizeRichText(
      '<p>Hello</p><img src="https://example.org/a" onerror="alert(1)"><script>alert(1)</script><a href="javascript:alert(1)">Go</a>',
    );
    expect(html).toContain("Hello");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("javascript:");
  });
  test("registration answers must match required event fields", () => {
    const field: typeof formFields.$inferSelect = {
      id: "field",
      eventId: "event",
      name: "company",
      label: "Company",
      fieldType: "text",
      isRequired: true,
      options: null,
      sortOrder: 0,
      page: 1,
      createdAt: new Date(),
    };
    expect(() => validateFormResponses([field], [])).toThrow(
      "Company is required",
    );
    expect(() =>
      validateFormResponses(
        [field],
        [{ fieldId: "other", responseValue: "x" }],
      ),
    ).toThrow("does not belong");
    expect(() =>
      validateFormResponses(
        [field],
        [{ fieldId: "field", responseValue: "Acme" }],
      ),
    ).not.toThrow();
  });
});
