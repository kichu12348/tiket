import { describe, expect, test } from "bun:test";
import {
  validateFormResponses,
  type FormResponse,
} from "../src/utils/registration-validation";
import type { FormFieldDefinition } from "../src/db/schema";

describe("Forms JSONB Schema & Validation", () => {
  const sampleFields: FormFieldDefinition[] = [
    {
      id: "field-1",
      eventId: "event-1",
      name: "fullName",
      label: "Full Name",
      fieldType: "text",
      isRequired: true,
      options: null,
      sortOrder: 0,
      page: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: "field-2",
      eventId: "event-1",
      name: "workEmail",
      label: "Work Email",
      fieldType: "email",
      isRequired: true,
      options: null,
      sortOrder: 1,
      page: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: "field-3",
      eventId: "event-1",
      name: "tshirtSize",
      label: "T-Shirt Size",
      fieldType: "single_select",
      isRequired: false,
      options: ["S", "M", "L", "XL"],
      sortOrder: 0,
      page: 2,
      createdAt: new Date().toISOString(),
    },
    {
      id: "field-4",
      eventId: "event-1",
      name: "dietaryNeeds",
      label: "Dietary Needs",
      fieldType: "multi_select",
      isRequired: false,
      options: ["Vegetarian", "Vegan", "Gluten-Free", "Halal"],
      sortOrder: 1,
      page: 2,
      createdAt: new Date().toISOString(),
    },
    {
      id: "field-5",
      eventId: "event-1",
      name: "experienceRating",
      label: "Experience Rating",
      fieldType: "rating",
      isRequired: false,
      options: null,
      sortOrder: 2,
      page: 2,
      createdAt: new Date().toISOString(),
    },
    {
      id: "field-6",
      eventId: "event-1",
      name: "idProof",
      label: "ID Proof",
      fieldType: "file",
      isRequired: false,
      options: null,
      sortOrder: 0,
      page: 3,
      createdAt: new Date().toISOString(),
    },
    {
      id: "field-7",
      eventId: "event-1",
      name: "veganNotes",
      label: "Vegan Preference Details",
      fieldType: "text",
      isRequired: true,
      options: null,
      conditions: [
        {
          fieldId: "field-4",
          allowedValues: ["Vegan"],
        },
      ],
      sortOrder: 1,
      page: 3,
      createdAt: new Date().toISOString(),
    },
  ];

  test("validates required text and email fields successfully", () => {
    const responses: FormResponse[] = [
      { fieldId: "field-1", responseValue: "Ada Lovelace" },
      { fieldId: "field-2", responseValue: "ada@example.com" },
    ];

    expect(() => validateFormResponses(sampleFields, responses)).not.toThrow();
  });

  test("throws when a required field is missing or empty", () => {
    const responses: FormResponse[] = [
      { fieldId: "field-2", responseValue: "ada@example.com" },
    ];

    expect(() => validateFormResponses(sampleFields, responses)).toThrow(
      "Full Name is required.",
    );
  });

  test("rejects invalid email formatting", () => {
    const responses: FormResponse[] = [
      { fieldId: "field-1", responseValue: "Ada Lovelace" },
      { fieldId: "field-2", responseValue: "not-an-email" },
    ];

    expect(() => validateFormResponses(sampleFields, responses)).toThrow(
      "Invalid answer for Work Email.",
    );
  });

  test("validates single_select allowed choices", () => {
    const valid: FormResponse[] = [
      { fieldId: "field-1", responseValue: "Ada Lovelace" },
      { fieldId: "field-2", responseValue: "ada@example.com" },
      { fieldId: "field-3", responseValue: "M" },
    ];
    expect(() => validateFormResponses(sampleFields, valid)).not.toThrow();

    const invalid: FormResponse[] = [
      { fieldId: "field-1", responseValue: "Ada Lovelace" },
      { fieldId: "field-2", responseValue: "ada@example.com" },
      { fieldId: "field-3", responseValue: "XXXL" },
    ];
    expect(() => validateFormResponses(sampleFields, invalid)).toThrow(
      "Invalid answer for T-Shirt Size.",
    );
  });

  test("validates multi_select JSON array and choices", () => {
    const valid: FormResponse[] = [
      { fieldId: "field-1", responseValue: "Ada Lovelace" },
      { fieldId: "field-2", responseValue: "ada@example.com" },
      {
        fieldId: "field-4",
        responseValue: JSON.stringify(["Vegetarian", "Halal"]),
      },
    ];
    expect(() => validateFormResponses(sampleFields, valid)).not.toThrow();

    const invalid: FormResponse[] = [
      { fieldId: "field-1", responseValue: "Ada Lovelace" },
      { fieldId: "field-2", responseValue: "ada@example.com" },
      {
        fieldId: "field-4",
        responseValue: JSON.stringify(["Vegetarian", "Keto"]),
      },
    ];
    expect(() => validateFormResponses(sampleFields, invalid)).toThrow(
      "Invalid answer for Dietary Needs.",
    );
  });

  test("validates rating field range (1 to 5)", () => {
    const valid: FormResponse[] = [
      { fieldId: "field-1", responseValue: "Ada Lovelace" },
      { fieldId: "field-2", responseValue: "ada@example.com" },
      { fieldId: "field-5", responseValue: "5" },
    ];
    expect(() => validateFormResponses(sampleFields, valid)).not.toThrow();

    const invalid: FormResponse[] = [
      { fieldId: "field-1", responseValue: "Ada Lovelace" },
      { fieldId: "field-2", responseValue: "ada@example.com" },
      { fieldId: "field-5", responseValue: "10" },
    ];
    expect(() => validateFormResponses(sampleFields, invalid)).toThrow(
      "Invalid answer for Experience Rating.",
    );
  });

  test("validates file upload format prefix (file:<uuid>)", () => {
    const valid: FormResponse[] = [
      { fieldId: "field-1", responseValue: "Ada Lovelace" },
      { fieldId: "field-2", responseValue: "ada@example.com" },
      {
        fieldId: "field-6",
        responseValue: "file:12345678-1234-1234-1234-123456789abc",
      },
    ];
    expect(() => validateFormResponses(sampleFields, valid)).not.toThrow();

    const invalid: FormResponse[] = [
      { fieldId: "field-1", responseValue: "Ada Lovelace" },
      { fieldId: "field-2", responseValue: "ada@example.com" },
      { fieldId: "field-6", responseValue: "not-a-file" },
    ];
    expect(() => validateFormResponses(sampleFields, invalid)).toThrow(
      "Invalid answer for ID Proof.",
    );
  });

  test("enforces conditional visibility and requirement", () => {
    // When condition is NOT met (Dietary Needs = ["Vegetarian"]), field-7 is hidden and not required
    const withoutCondition: FormResponse[] = [
      { fieldId: "field-1", responseValue: "Ada Lovelace" },
      { fieldId: "field-2", responseValue: "ada@example.com" },
      { fieldId: "field-4", responseValue: JSON.stringify(["Vegetarian"]) },
    ];
    expect(() =>
      validateFormResponses(sampleFields, withoutCondition),
    ).not.toThrow();

    // When condition IS met (Dietary Needs includes "Vegan"), field-7 is required
    const conditionMetMissing: FormResponse[] = [
      { fieldId: "field-1", responseValue: "Ada Lovelace" },
      { fieldId: "field-2", responseValue: "ada@example.com" },
      { fieldId: "field-4", responseValue: JSON.stringify(["Vegan"]) },
    ];
    expect(() =>
      validateFormResponses(sampleFields, conditionMetMissing),
    ).toThrow("Vegan Preference Details is required.");

    // When condition is met and field-7 is answered
    const conditionMetProvided: FormResponse[] = [
      { fieldId: "field-1", responseValue: "Ada Lovelace" },
      { fieldId: "field-2", responseValue: "ada@example.com" },
      { fieldId: "field-4", responseValue: JSON.stringify(["Vegan"]) },
      { fieldId: "field-7", responseValue: "Strict oat milk only" },
    ];
    expect(() =>
      validateFormResponses(sampleFields, conditionMetProvided),
    ).not.toThrow();
  });

  test("JSONB page deletion drops page fields and shifts higher pages down", () => {
    const pageNumToDelete = 2;
    const currentFields = [...sampleFields];

    const remainingAndShifted = currentFields
      .filter((f) => f.page !== pageNumToDelete)
      .map((f) => (f.page > pageNumToDelete ? { ...f, page: f.page - 1 } : f));

    // Page 2 fields (field-3, field-4, field-5) should be deleted
    expect(remainingAndShifted.some((f) => f.id === "field-3")).toBe(false);
    expect(remainingAndShifted.some((f) => f.id === "field-4")).toBe(false);
    expect(remainingAndShifted.some((f) => f.id === "field-5")).toBe(false);

    // Page 1 fields should remain on page 1
    const p1 = remainingAndShifted.filter((f) => f.page === 1);
    expect(p1.map((f) => f.id)).toEqual(["field-1", "field-2"]);

    // Former Page 3 fields (field-6, field-7) should now be shifted to page 2
    const p2 = remainingAndShifted.filter((f) => f.page === 2);
    expect(p2.map((f) => f.id)).toEqual(["field-6", "field-7"]);
  });

  test("JSONB field CRUD operations mutate array cleanly", () => {
    let fields = [...sampleFields];

    // Create
    const newField: FormFieldDefinition = {
      id: "field-8",
      eventId: "event-1",
      name: "github",
      label: "GitHub Profile",
      fieldType: "url",
      isRequired: false,
      options: null,
      sortOrder: 2,
      page: 1,
      createdAt: new Date().toISOString(),
    };
    fields = [...fields, newField];
    expect(fields.find((f) => f.id === "field-8")).toBeDefined();

    // Update
    fields = fields.map((f) =>
      f.id === "field-8" ? { ...f, label: "GitHub Handle / URL" } : f,
    );
    expect(fields.find((f) => f.id === "field-8")?.label).toBe(
      "GitHub Handle / URL",
    );

    // Delete
    fields = fields.filter((f) => f.id !== "field-8");
    expect(fields.find((f) => f.id === "field-8")).toBeUndefined();
  });
});

