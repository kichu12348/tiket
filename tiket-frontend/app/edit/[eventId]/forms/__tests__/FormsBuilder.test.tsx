import { describe, expect, test, mock, beforeEach } from "bun:test";
import React from "react";

// Bridge duplicate React instances between root @testing-library/react and frontend node_modules/react
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rFrontend = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rTesting = require(
    require.resolve("react", {
      paths: [require.resolve("@testing-library/react")],
    }),
  );
  const i1 =
    rFrontend.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const i2 =
    rTesting.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  if (i1 && i2 && i1 !== i2) {
    Object.defineProperty(i1, "H", {
      get() {
        return i2.H;
      },
      set(v) {
        i2.H = v;
      },
    });
    Object.defineProperty(i1, "A", {
      get() {
        return i2.A;
      },
      set(v) {
        i2.A = v;
      },
    });
  }
} catch {
  // Ignore if unified
}

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { FormField } from "@/types/form";
import {
  serverToLocal,
  localToFormFields,
  getPagesFromFields,
  getActivePageFields,
  isChoiceField,
  isMultiChoiceField,
  buildOptionsPayload,
  CHOICE_BASED_FIELD_TYPES,
  MULTI_CHOICE_FIELD_TYPES,
} from "../functions/formHelpers";

/* ─────────────────────────────────────────────────────────────
 * PART 1: Unit Tests for formHelpers.ts
 * ───────────────────────────────────────────────────────────── */

describe("formHelpers unit tests", () => {
  test("serverToLocal correctly converts string[] options", () => {
    const raw: FormField = {
      id: "f1",
      eventId: "evt-123",
      name: "dietary",
      label: "Dietary Preferences",
      fieldType: "single_select",
      isRequired: true,
      options: ["Vegan", "Vegetarian", "None"],
      sortOrder: 0,
      page: 1,
      createdAt: "2026-01-01T00:00:00Z",
    };

    const local = serverToLocal(raw);
    expect(local.localId).toBe("f1");
    expect(local.serverId).toBe("f1");
    expect(local.label).toBe("Dietary Preferences");
    expect(local.fieldType).toBe("single_select");
    expect(local.isRequired).toBe(true);
    expect(local.options).toEqual(["Vegan", "Vegetarian", "None"]);
    expect(local.minOptions).toBeNull();
    expect(local.maxOptions).toBeNull();
    expect(local.page).toBe(1);
    expect(local.sortOrder).toBe(0);
  });

  test("serverToLocal correctly converts { choices, min, max } options", () => {
    const raw: FormField = {
      id: "f2",
      eventId: "evt-123",
      name: "interests",
      label: "Select Interests",
      fieldType: "multi_select",
      isRequired: false,
      options: {
        choices: ["AI", "Design", "DevOps"],
        min: 1,
        max: 2,
        allowCustom: true,
      },
      sortOrder: 2,
      page: 2,
      createdAt: "2026-01-01T00:00:00Z",
    };

    const local = serverToLocal(raw);
    expect(local.options).toEqual(["AI", "Design", "DevOps"]);
    expect(local.allowCustom).toBe(true);
    expect(local.minOptions).toBe(1);
    expect(local.maxOptions).toBe(2);
    expect(local.page).toBe(2);
    expect(local.sortOrder).toBe(2);
  });

  test("serverToLocal handles null options and default fallbacks", () => {
    const raw: FormField = {
      id: "f3",
      eventId: "evt-123",
      name: "bio",
      label: "Bio",
      fieldType: "long_text",
      isRequired: false,
      options: null,
      sortOrder: 0,
      page: 1,
      createdAt: "2026-01-01T00:00:00Z",
    };

    const local = serverToLocal(raw);
    expect(local.options).toBeNull();
    expect(local.minOptions).toBeNull();
    expect(local.maxOptions).toBeNull();
  });

  test("serverToLocal preserves conditions configuration", () => {
    const raw: FormField = {
      id: "f4",
      eventId: "evt-123",
      name: "veganDetails",
      label: "Vegan Details",
      fieldType: "text",
      isRequired: true,
      options: null,
      conditions: {
        match: "all",
        rules: [
          {
            fieldId: "f1",
            operator: "equals",
            allowedValues: ["Vegan"],
          },
        ],
      },
      sortOrder: 1,
      page: 1,
      createdAt: "2026-01-01T00:00:00Z",
    };

    const local = serverToLocal(raw);
    expect(local.conditions).toEqual({
      match: "all",
      rules: [
        {
          fieldId: "f1",
          operator: "equals",
          allowedValues: ["Vegan"],
        },
      ],
    });
  });

  test("localToFormFields correctly constructs FormField array with standard and custom fields", () => {
    const custom = [
      {
        localId: "c1",
        serverId: "c1-server",
        name: "custom_q",
        label: "Custom Q",
        fieldType: "text" as const,
        isRequired: true,
        options: null,
        conditions: {
          match: "all" as const,
          rules: [{ fieldId: "f1", allowedValues: ["Yes"] }],
        },
        sortOrder: 0,
        page: 1,
      },
    ];

    const standard = [
      { name: "name", label: "Full Name", icon: null, status: "Required" as const, serverId: "std-name" },
      { name: "email", label: "Email", icon: null, status: "Required" as const, serverId: "std-email" },
      { name: "phone", label: "Phone", icon: null, status: "Off" as const },
    ];

    const fields = localToFormFields(custom, standard, "evt-123");
    expect(fields).toHaveLength(3); // name, email, and custom_q (phone is Off)
    expect(fields[0].name).toBe("name");
    expect(fields[0].isLocked).toBe(true);
    expect(fields[1].name).toBe("email");
    expect(fields[1].isLocked).toBe(true);
    expect(fields[2].name).toBe("custom_q");
    expect(fields[2].conditions).toEqual({
      match: "all",
      rules: [{ fieldId: "f1", allowedValues: ["Yes"] }],
    });
  });

  test("getPagesFromFields returns [1] by default and sorted distinct pages", () => {
    expect(getPagesFromFields([])).toEqual([1]);

    const fields = [
      { localId: "1", name: "a", label: "A", fieldType: "text" as const, isRequired: false, options: null, sortOrder: 0, page: 3 },
      { localId: "2", name: "b", label: "B", fieldType: "text" as const, isRequired: false, options: null, sortOrder: 0, page: 1 },
      { localId: "3", name: "c", label: "C", fieldType: "text" as const, isRequired: false, options: null, sortOrder: 1, page: 3 },
      { localId: "4", name: "d", label: "D", fieldType: "text" as const, isRequired: false, options: null, sortOrder: 0, page: 2 },
    ];

    expect(getPagesFromFields(fields)).toEqual([1, 2, 3]);
  });

  test("getActivePageFields filters by activePage and orders by sortOrder", () => {
    const fields = [
      { localId: "1", name: "a", label: "A", fieldType: "text" as const, isRequired: false, options: null, sortOrder: 2, page: 1 },
      { localId: "2", name: "b", label: "B", fieldType: "text" as const, isRequired: false, options: null, sortOrder: 0, page: 1 },
      { localId: "3", name: "c", label: "C", fieldType: "text" as const, isRequired: false, options: null, sortOrder: 1, page: 2 },
    ];

    const page1Fields = getActivePageFields(fields, 1);
    expect(page1Fields.map((f) => f.label)).toEqual(["B", "A"]);

    const page2Fields = getActivePageFields(fields, 2);
    expect(page2Fields.map((f) => f.label)).toEqual(["C"]);
  });

  test("isChoiceField and isMultiChoiceField classify field types correctly", () => {
    expect(CHOICE_BASED_FIELD_TYPES).toEqual([
      "single_select",
      "multi_select",
    ]);

    expect(MULTI_CHOICE_FIELD_TYPES).toEqual(["multi_select"]);

    expect(isChoiceField("single_select")).toBe(true);
    expect(isChoiceField("multi_select")).toBe(true);

    expect(isChoiceField("text")).toBe(false);
    expect(isChoiceField("email")).toBe(false);
    expect(isChoiceField("number")).toBe(false);

    expect(isMultiChoiceField("multi_select")).toBe(true);
    expect(isMultiChoiceField("single_select")).toBe(false);
  });

  test("buildOptionsPayload constructs proper choices or { choices, min, max, allowCustom }", () => {
    // Non-choice field returns null
    expect(buildOptionsPayload("text", ["A", "B"])).toBeNull();

    // Empty options return null
    expect(buildOptionsPayload("single_select", [])).toBeNull();
    expect(buildOptionsPayload("single_select", ["  ", ""])).toBeNull();

    // Single choice returns string array when allowCustom is not set
    expect(buildOptionsPayload("single_select", ["Small", "Large"])).toEqual(["Small", "Large"]);

    // Single choice with allowCustom returns object
    expect(buildOptionsPayload("single_select", ["Small", "Large"], null, null, true)).toEqual({
      choices: ["Small", "Large"],
      min: null,
      max: null,
      allowCustom: true,
    });

    // Multi-select without constraints returns array
    expect(buildOptionsPayload("multi_select", ["A", "B"], null, null)).toEqual(["A", "B"]);

    // Multi-select with min, max or allowCustom returns object
    expect(buildOptionsPayload("multi_select", ["A", "B", "C"], 1, 2, true)).toEqual({
      choices: ["A", "B", "C"],
      min: 1,
      max: 2,
      allowCustom: true,
    });

    // Multi-select with isMulti specified returns object with isMulti
    expect(buildOptionsPayload("multi_select", ["A", "B"], null, null, false, false)).toEqual({
      choices: ["A", "B"],
      min: null,
      max: null,
      allowCustom: false,
      isMulti: false,
    });
  });
});

/* ─────────────────────────────────────────────────────────────
 * PART 2: UI Integration Tests for Registration Form Builder
 * ───────────────────────────────────────────────────────────── */

const mockEvent = {
  id: "evt-test-123",
  title: "DevFest 2026",
};

let mockDbFields: FormField[] = [];

const fnGetFormFields = mock(async () => [...mockDbFields]);
const fnCreateFormField = mock(async (_eventId: string, payload: unknown) => {
  const p = payload as {
    name: string;
    label: string;
    fieldType: string;
    isRequired?: boolean;
    options?: unknown;
    sortOrder?: number;
    page?: number;
  };
  const created: FormField = {
    id: `server-${Date.now()}-${Math.random()}`,
    eventId: "evt-test-123",
    name: p.name,
    label: p.label,
    fieldType: p.fieldType as FormField["fieldType"],
    isRequired: !!p.isRequired,
    options: (p.options as FormField["options"]) ?? null,
    sortOrder: p.sortOrder ?? 0,
    page: p.page ?? 1,
    createdAt: new Date().toISOString(),
  };
  mockDbFields.push(created);
  return created;
});

const fnUpdateFormField = mock(
  async (_eventId: string, fieldId: string, payload: unknown) => {
    const p = payload as Partial<FormField>;
    const idx = mockDbFields.findIndex((f) => f.id === fieldId);
    if (idx !== -1) {
      mockDbFields[idx] = { ...mockDbFields[idx], ...p };
      return mockDbFields[idx];
    }
    return { id: fieldId, ...p } as FormField;
  },
);

const fnDeleteFormField = mock(async (_eventId: string, fieldId: string) => {
  mockDbFields = mockDbFields.filter((f) => f.id !== fieldId);
  return { message: "Question deleted successfully." };
});

const fnDeleteFormPage = mock(async (_eventId: string, pageNum: number) => {
  mockDbFields = mockDbFields
    .filter((f) => f.page !== pageNum)
    .map((f) => (f.page > pageNum ? { ...f, page: f.page - 1 } : f));
  return { message: `Page ${pageNum} deleted.` };
});

const fnReplaceFormFields = mock(
  async (_eventId: string, fields: FormField[]) => {
    mockDbFields = [...fields];
    return fields;
  },
);

// Mock api modules
mock.module("@/api/forms", () => ({
  getFormFields: fnGetFormFields,
  replaceFormFields: fnReplaceFormFields,
  createFormField: fnCreateFormField,
  updateFormField: fnUpdateFormField,
  deleteFormField: fnDeleteFormField,
  deleteFormPage: fnDeleteFormPage,
}));

mock.module("@/store/useEventStore", () => ({
  useEventStore: () => ({
    event: mockEvent,
  }),
}));

mock.module("@/components/ConfirmModal", () => ({
  confirm: async (
    _msg: string,
    options?: { onConfirm?: () => Promise<void> | void },
  ) => {
    if (options?.onConfirm) {
      await options.onConfirm();
    }
  },
}));

mock.module("sonner", () => ({
  toast: {
    success: mock(),
    error: mock(),
  },
}));

// Import EditFormsPage after mocks are set up
import EditFormsPage from "../page";

describe("EditFormsPage Component Integration", () => {
  beforeEach(() => {
    mockDbFields = [
      {
        id: "std-name",
        eventId: "evt-test-123",
        name: "name",
        label: "Name",
        fieldType: "text",
        isRequired: true,
        options: null,
        sortOrder: 0,
        page: 1,
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "std-email",
        eventId: "evt-test-123",
        name: "email",
        label: "Email",
        fieldType: "email",
        isRequired: true,
        options: null,
        sortOrder: 1,
        page: 1,
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "custom-1",
        eventId: "evt-test-123",
        name: "dietary",
        label: "Dietary Requirements",
        fieldType: "single_select",
        isRequired: false,
        options: ["None", "Vegan", "Vegetarian"],
        sortOrder: 0,
        page: 1,
        createdAt: "2026-01-01T00:00:00Z",
      },
    ];

    fnGetFormFields.mockClear();
    fnReplaceFormFields.mockClear();
    fnCreateFormField.mockClear();
    fnUpdateFormField.mockClear();
    fnDeleteFormField.mockClear();
    fnDeleteFormPage.mockClear();
  });

  test("1. Renders the Form Builder with headers and locked standard fields", async () => {
    render(<EditFormsPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText("Registration Questions")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Personal Information"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Custom Questions"),
    ).toBeInTheDocument();

    // Standard fields: Full Name & Email display locked Page 1 status
    expect(screen.getByText("Full Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Phone")).toBeInTheDocument();

    const lockedLabels = screen.getAllByText("Page 1 Standard Field (Locked)");
    expect(lockedLabels.length).toBe(2);

    // Existing custom field rendered
    expect(screen.getByText("Dietary Requirements")).toBeInTheDocument();
    expect(screen.getByText(/3 options/)).toBeInTheDocument();
  });

  test("2. Adds a new custom field (Dropdown with options) via modal", async () => {
    render(<EditFormsPage />);

    await waitFor(() => {
      expect(screen.getByText("Dietary Requirements")).toBeInTheDocument();
    });

    // Click "Add Question"
    const addBtn = screen.getByRole("button", { name: /Add Question/i });
    fireEvent.click(addBtn);

    // Type selection step: Click "Dropdown"
    await waitFor(() => {
      expect(
        screen.getByText("Ask guests custom questions when they register."),
      ).toBeInTheDocument();
    });
    const dropdownBtn = screen.getByRole("button", { name: /Dropdown/i });
    fireEvent.click(dropdownBtn);

    // Details step: Enter label and options
    await waitFor(() => {
      expect(
        screen.getByText("Let the guest choose one option from a dropdown"),
      ).toBeInTheDocument();
      expect(screen.getByText("Question")).toBeInTheDocument();
    });

    const questionInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(questionInput, { target: { value: "T-Shirt Size" } });

    // Find the tag input for options
    const tagInput = screen.getByPlaceholderText("Add options");
    fireEvent.change(tagInput, { target: { value: "Small" } });
    fireEvent.keyDown(tagInput, { key: "Enter" });

    fireEvent.change(tagInput, { target: { value: "Medium" } });
    fireEvent.keyDown(tagInput, { key: "Enter" });

    // Submit the modal form (the submit button inside the modal dialog)
    const submitBtns = screen.getAllByRole("button", { name: "Add Question" });
    fireEvent.click(submitBtns[submitBtns.length - 1]);

    await waitFor(() => {
      expect(fnCreateFormField).toHaveBeenCalledTimes(1);
    });

    const calls = fnCreateFormField.mock.calls;
    expect(calls[0][0]).toBe("evt-test-123");
    expect(calls[0][1]).toMatchObject({
      name: "t-shirt_size",
      label: "T-Shirt Size",
      fieldType: "single_select",
      options: ["Small", "Medium"],
      page: 1,
    });
  });

  test("3. Adding, switching and deleting pages in the Form Builder", async () => {
    render(<EditFormsPage />);

    await waitFor(() => {
      expect(screen.getByText("Page 1")).toBeInTheDocument();
    });

    // Click "+" button to add a page
    const addPageBtn = screen.getByTitle("Add Page");
    fireEvent.click(addPageBtn);

    // Page 2 tab should now appear
    await waitFor(() => {
      expect(screen.getByText("Page 2")).toBeInTheDocument();
    });

    // Page 2 should be active with empty state
    expect(
      screen.getByText("No custom questions added to this page yet."),
    ).toBeInTheDocument();

    // Switch back to Page 1
    const page1Tab = screen.getByText("Page 1");
    fireEvent.click(page1Tab);

    // Page 1 fields are visible
    expect(screen.getByText("Dietary Requirements")).toBeInTheDocument();

    // Delete Page 2
    const page2Tab = screen.getByText("Page 2");
    fireEvent.click(page2Tab);

    const deletePage2Btn = screen.getByTitle("Delete Page 2");
    fireEvent.click(deletePage2Btn);

    await waitFor(() => {
      expect(fnDeleteFormPage).toHaveBeenCalledWith("evt-test-123", 2);
    });
  });

  test("4. Inline editing of custom questions", async () => {
    render(<EditFormsPage />);

    await waitFor(() => {
      expect(screen.getByText("Dietary Requirements")).toBeInTheDocument();
    });

    // Click inline edit button
    const inlineEditBtn = screen.getByTitle("Quick Inline Edit");
    fireEvent.click(inlineEditBtn);

    // Inline edit form is rendered
    await waitFor(() => {
      expect(screen.getByText("Response Type")).toBeInTheDocument();
    });

    // Edit the question text
    const textInputs = screen.getAllByRole("textbox");
    const questionInput = textInputs.find((i) =>
      (i as HTMLInputElement).value === "Dietary Requirements",
    );
    expect(questionInput).toBeTruthy();
    if (questionInput) {
      fireEvent.change(questionInput, {
        target: { value: "Dietary Restrictions" },
      });
    }

    // Save inline edit
    const saveBtn = screen.getByRole("button", { name: "Save" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(fnUpdateFormField).toHaveBeenCalledTimes(1);
    });

    const updateCalls = fnUpdateFormField.mock.calls;
    expect(updateCalls[0][1]).toBe("custom-1");
    expect(updateCalls[0][2]).toMatchObject({
      label: "Dietary Restrictions",
    });
  });
});
