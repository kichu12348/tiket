import { describe, expect, test } from "bun:test";
import { formatMoney, parseMinorUnits } from "../money";
import {
  type EventValidationData,
  validateEventPayload,
} from "../validators/event";
import {
  type ValidationResult,
  validateManualRegisterPayload,
} from "../validators/attendee";
import type { ManualRegisterPayload } from "@/types/attendee";

describe("lib/money", () => {
  describe("parseMinorUnits", () => {
    test("correctly parses whole integer currency amounts", () => {
      expect(parseMinorUnits("0")).toBe(0);
      expect(parseMinorUnits("1")).toBe(100);
      expect(parseMinorUnits("100")).toBe(10000);
      expect(parseMinorUnits("  50  ")).toBe(5000);
    });

    test("correctly parses amounts with one or two decimal digits", () => {
      expect(parseMinorUnits("0.5")).toBe(50);
      expect(parseMinorUnits("0.05")).toBe(5);
      expect(parseMinorUnits("10.50")).toBe(1050);
      expect(parseMinorUnits("99.99")).toBe(9999);
      expect(parseMinorUnits("  123.45  ")).toBe(12345);
    });

    test("throws an error for non-numeric, negative, or malformed strings", () => {
      expect(() => parseMinorUnits("")).toThrow(
        "Enter a positive amount with up to two decimal places.",
      );
      expect(() => parseMinorUnits("-5")).toThrow(
        "Enter a positive amount with up to two decimal places.",
      );
      expect(() => parseMinorUnits("abc")).toThrow(
        "Enter a positive amount with up to two decimal places.",
      );
      expect(() => parseMinorUnits("10.999")).toThrow(
        "Enter a positive amount with up to two decimal places.",
      );
      expect(() => parseMinorUnits("1e3")).toThrow(
        "Enter a positive amount with up to two decimal places.",
      );
      expect(() => parseMinorUnits("10.0.0")).toThrow(
        "Enter a positive amount with up to two decimal places.",
      );
    });

    test("throws an error when amount exceeds the supported limit", () => {
      expect(() => parseMinorUnits("20000001")).toThrow(
        "Amount exceeds the supported limit.",
      );
    });
  });

  describe("formatMoney", () => {
    test("formats paise into an INR currency string", () => {
      const formattedZero = formatMoney(0);
      expect(formattedZero).toContain("0");

      const formattedHundred = formatMoney(10000);
      expect(formattedHundred).toContain("100");

      const formattedFraction = formatMoney(123456);
      expect(formattedFraction).toContain("1,234.56");
    });
  });
});

describe("lib/validators/event", () => {
  const validBasePayload: EventValidationData = {
    title: "Global Tech Summit 2026",
    startDate: "2026-12-01T10:00:00Z",
    endDate: "2026-12-01T18:00:00Z",
    regStartDate: "2026-11-01T09:00:00Z",
    regEndDate: "2026-11-30T23:59:59Z",
    capacity: 250,
  };

  test("returns null for a valid event payload", () => {
    const error = validateEventPayload(validBasePayload);
    expect(error).toBeNull();
  });

  test("returns null when capacity is string, null, or undefined", () => {
    expect(
      validateEventPayload({
        ...validBasePayload,
        capacity: "500",
      }),
    ).toBeNull();

    expect(
      validateEventPayload({
        ...validBasePayload,
        capacity: null,
      }),
    ).toBeNull();

    expect(
      validateEventPayload({
        ...validBasePayload,
        capacity: undefined,
      }),
    ).toBeNull();
  });

  test("validates required title", () => {
    expect(
      validateEventPayload({
        ...validBasePayload,
        title: "",
      }),
    ).toBe("Event title is required.");

    expect(
      validateEventPayload({
        ...validBasePayload,
        title: "   ",
      }),
    ).toBe("Event title is required.");
  });

  test("validates end date is after start date", () => {
    expect(
      validateEventPayload({
        ...validBasePayload,
        startDate: "2026-12-02T10:00:00Z",
        endDate: "2026-12-01T10:00:00Z",
      }),
    ).toBe("Event end date must be after the start date.");

    expect(
      validateEventPayload({
        ...validBasePayload,
        startDate: "2026-12-01T10:00:00Z",
        endDate: "2026-12-01T10:00:00Z",
      }),
    ).toBe("Event end date must be after the start date.");
  });

  test("validates registration end date is after registration start date", () => {
    expect(
      validateEventPayload({
        ...validBasePayload,
        regStartDate: "2026-11-20T10:00:00Z",
        regEndDate: "2026-11-10T10:00:00Z",
      }),
    ).toBe(
      "Registration end date must be after the registration start date.",
    );

    expect(
      validateEventPayload({
        ...validBasePayload,
        regStartDate: "2026-11-10T10:00:00Z",
        regEndDate: "2026-11-10T10:00:00Z",
      }),
    ).toBe(
      "Registration end date must be after the registration start date.",
    );
  });

  test("validates registration does not end after the event ends", () => {
    expect(
      validateEventPayload({
        ...validBasePayload,
        endDate: "2026-12-01T18:00:00Z",
        regEndDate: "2026-12-02T10:00:00Z",
      }),
    ).toBe("Registration cannot end after the event has ended.");
  });

  test("validates capacity is a positive number", () => {
    expect(
      validateEventPayload({
        ...validBasePayload,
        capacity: 0,
      }),
    ).toBe("Capacity must be a valid number greater than 0.");

    expect(
      validateEventPayload({
        ...validBasePayload,
        capacity: -10,
      }),
    ).toBe("Capacity must be a valid number greater than 0.");

    expect(
      validateEventPayload({
        ...validBasePayload,
        capacity: "not-a-number",
      }),
    ).toBe("Capacity must be a valid number greater than 0.");
  });
});

describe("lib/validators/attendee", () => {
  const validPayload: ManualRegisterPayload = {
    name: "Mahadevan Reji",
    email: "mahadevan@example.com",
    ticketTypeId: "tier_vip_001",
    notes: "Speaker guest",
  };

  test("returns isValid: true for a valid attendee payload", () => {
    const result: ValidationResult = validateManualRegisterPayload(validPayload);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test("requires attendee name", () => {
    expect(
      validateManualRegisterPayload({ ...validPayload, name: "" }),
    ).toEqual({
      isValid: false,
      error: "Attendee name is required.",
    });

    expect(
      validateManualRegisterPayload({ ...validPayload, name: "   " }),
    ).toEqual({
      isValid: false,
      error: "Attendee name is required.",
    });
  });

  test("requires attendee email", () => {
    expect(
      validateManualRegisterPayload({ ...validPayload, email: "" }),
    ).toEqual({
      isValid: false,
      error: "Attendee email is required.",
    });

    expect(
      validateManualRegisterPayload({ ...validPayload, email: "   " }),
    ).toEqual({
      isValid: false,
      error: "Attendee email is required.",
    });
  });

  test("validates attendee email format", () => {
    for (const invalidEmail of ["not-an-email", "foo@", "@domain.com", "foo @bar.com"]) {
      const res = validateManualRegisterPayload({
        ...validPayload,
        email: invalidEmail,
      });
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Please enter a valid email address.");
    }
  });

  test("requires ticketTypeId", () => {
    expect(
      validateManualRegisterPayload({ ...validPayload, ticketTypeId: "" }),
    ).toEqual({
      isValid: false,
      error: "Please select a ticket type.",
    });

    expect(
      validateManualRegisterPayload({ ...validPayload, ticketTypeId: "   " }),
    ).toEqual({
      isValid: false,
      error: "Please select a ticket type.",
    });
  });
});

describe("DOM and Jest DOM matchers environment", () => {
  test("happy-dom provides global document and window", () => {
    expect(window).toBeDefined();
    expect(document).toBeDefined();
    const element = document.createElement("div");
    element.textContent = "Tiket testing";
    document.body.appendChild(element);
    expect(element).toBeInTheDocument();
  });
});
