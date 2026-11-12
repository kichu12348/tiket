import "@/happydom";
import { describe, expect, test, mock } from "bun:test";
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
  // Ignore if already unified
}

import { render, screen, fireEvent } from "@testing-library/react";
import ConditionBuilder from "../index";
import { evaluateVisibilityConditions } from "@/app/[eventSlug]/form/components/RegistrationForm/utils";
import type { FormField, VisibilityConditionsConfig } from "@/types/form";

const mockFields: FormField[] = [
  {
    id: "f-role",
    eventId: "evt-1",
    name: "role",
    label: "Current Role",
    fieldType: "single_select",
    isRequired: true,
    options: ["Student", "Professional", "Speaker"],
    sortOrder: 1,
    page: 1,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "f-city",
    eventId: "evt-1",
    name: "city",
    label: "City",
    fieldType: "text",
    isRequired: false,
    options: null,
    sortOrder: 2,
    page: 1,
    createdAt: "2026-01-01T00:00:00Z",
  },
];

describe("ConditionBuilder & Frontend Visibility Logic", () => {
  describe("evaluateVisibilityConditions (frontend)", () => {
    test("equals operator: case-insensitive match, false if mismatch, false if unanswered (Option A)", () => {
      const config: VisibilityConditionsConfig = {
        match: "all",
        rules: [
          {
            fieldId: "f-role",
            operator: "equals",
            allowedValues: ["Student"],
          },
        ],
      };

      // Match
      expect(
        evaluateVisibilityConditions(config, new Map([["f-role", "student"]])),
      ).toBe(true);

      // Mismatch
      expect(
        evaluateVisibilityConditions(
          config,
          new Map([["f-role", "Professional"]]),
        ),
      ).toBe(false);

      // Unanswered (Option A)
      expect(evaluateVisibilityConditions(config, new Map())).toBe(false);
    });

    test("not_equals operator (Option A): true if answered with different value, false if matching, false if unanswered", () => {
      const config: VisibilityConditionsConfig = {
        match: "all",
        rules: [
          {
            fieldId: "f-role",
            operator: "not_equals",
            allowedValues: ["Student"],
          },
        ],
      };

      // Different answer -> true
      expect(
        evaluateVisibilityConditions(
          config,
          new Map([["f-role", "Professional"]]),
        ),
      ).toBe(true);

      // Same answer -> false
      expect(
        evaluateVisibilityConditions(config, new Map([["f-role", "Student"]])),
      ).toBe(false);

      // Unanswered -> false (Option A: hidden until answered!)
      expect(evaluateVisibilityConditions(config, new Map())).toBe(false);
    });

    test("in operator: matches any in list, supports multi-select arrays, false if unanswered", () => {
      const config: VisibilityConditionsConfig = {
        match: "all",
        rules: [
          {
            fieldId: "f-role",
            operator: "in",
            allowedValues: ["Student", "Speaker"],
          },
        ],
      };

      expect(
        evaluateVisibilityConditions(config, new Map([["f-role", "Speaker"]])),
      ).toBe(true);

      expect(
        evaluateVisibilityConditions(
          config,
          new Map([["f-role", "Professional"]]),
        ),
      ).toBe(false);

      expect(
        evaluateVisibilityConditions(
          config,
          new Map([["f-role", JSON.stringify(["Professional", "Student"])]]),
        ),
      ).toBe(true);

      expect(evaluateVisibilityConditions(config, new Map())).toBe(false);
    });

    test("AND (all) vs OR (any) matching logic", () => {
      const configAll: VisibilityConditionsConfig = {
        match: "all",
        rules: [
          { fieldId: "f-role", operator: "equals", allowedValues: ["Student"] },
          { fieldId: "f-city", operator: "equals", allowedValues: ["Mumbai"] },
        ],
      };

      const configAny: VisibilityConditionsConfig = {
        match: "any",
        rules: [
          { fieldId: "f-role", operator: "equals", allowedValues: ["Student"] },
          { fieldId: "f-city", operator: "equals", allowedValues: ["Mumbai"] },
        ],
      };

      const answersOne = new Map([
        ["f-role", "Student"],
        ["f-city", "Delhi"],
      ]);

      expect(evaluateVisibilityConditions(configAll, answersOne)).toBe(false);
      expect(evaluateVisibilityConditions(configAny, answersOne)).toBe(true);

      const answersBoth = new Map([
        ["f-role", "Student"],
        ["f-city", "Mumbai"],
      ]);

      expect(evaluateVisibilityConditions(configAll, answersBoth)).toBe(true);
      expect(evaluateVisibilityConditions(configAny, answersBoth)).toBe(true);
    });
  });

  describe("ConditionBuilder UI Component", () => {
    test("renders empty state and allows adding the first condition", () => {
      const handleChange = mock((_c: VisibilityConditionsConfig) => {});
      render(
        <ConditionBuilder
          conditions={null}
          onChange={handleChange}
          availableFields={mockFields}
        />,
      );

      const addBtn = screen.getByText("Add Condition Rule");
      expect(addBtn).toBeDefined();

      fireEvent.click(addBtn);
      expect(handleChange).toHaveBeenCalledTimes(1);
      const callArg = handleChange.mock.calls[0][0];
      expect(callArg.rules.length).toBe(1);
      expect(callArg.rules[0].fieldId).toBe("f-role");
      expect(callArg.rules[0].operator).toBe("equals");
    });

    test("renders AND/OR match toggle when 2 or more rules exist", () => {
      const handleChange = mock((_c: VisibilityConditionsConfig) => {});
      const initialConditions: VisibilityConditionsConfig = {
        match: "all",
        rules: [
          { fieldId: "f-role", operator: "equals", allowedValues: ["Student"] },
          { fieldId: "f-city", operator: "equals", allowedValues: ["Delhi"] },
        ],
      };

      render(
        <ConditionBuilder
          conditions={initialConditions}
          onChange={handleChange}
          availableFields={mockFields}
        />,
      );

      // Segmented toggle should be rendered
      expect(screen.getByText("Match:")).toBeDefined();
      const orBtn = screen.getByRole("button", { name: /OR \(Any rule\)/i });
      expect(orBtn).toBeDefined();

      // Click OR toggle
      fireEvent.click(orBtn);
      expect(handleChange).toHaveBeenCalledWith({
        match: "any",
        rules: initialConditions.rules,
      });
    });

    test("allows removing a rule", () => {
      const handleChange = mock((_c: VisibilityConditionsConfig) => {});
      const initialConditions: VisibilityConditionsConfig = {
        match: "all",
        rules: [
          { fieldId: "f-role", operator: "equals", allowedValues: ["Student"] },
        ],
      };

      render(
        <ConditionBuilder
          conditions={initialConditions}
          onChange={handleChange}
          availableFields={mockFields}
        />,
      );

      const removeBtns = screen.getAllByLabelText("Remove condition");
      fireEvent.click(removeBtns[0]);
      expect(handleChange).toHaveBeenCalledWith({
        match: "all",
        rules: [],
      });
    });

    test("preserves whitespace while typing in SingleValuePicker", () => {
      const handleChange = mock((_c: VisibilityConditionsConfig) => {});
      const initialConditions: VisibilityConditionsConfig = {
        match: "all",
        rules: [
          { fieldId: "f-city", operator: "equals", allowedValues: [""] },
        ],
      };

      render(
        <ConditionBuilder
          conditions={initialConditions}
          onChange={handleChange}
          availableFields={mockFields}
        />,
      );

      const input = screen.getByPlaceholderText("Expected value...");
      fireEvent.change(input, { target: { value: "New " } });

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange.mock.calls[0][0].rules[0].allowedValues).toEqual(["New "]);
    });

    test("displays choices dropdown when typing for single_select question", () => {
      const handleChange = mock((_c: VisibilityConditionsConfig) => {});
      const initialConditions: VisibilityConditionsConfig = {
        match: "all",
        rules: [
          { fieldId: "f-role", operator: "equals", allowedValues: [""] },
        ],
      };

      render(
        <ConditionBuilder
          conditions={initialConditions}
          onChange={handleChange}
          availableFields={mockFields}
        />,
      );

      const input = screen.getByPlaceholderText("Type or select a choice...");
      fireEvent.change(input, { target: { value: "Stud" } });

      // Popover with matching choice "Student" should appear
      const choiceBtn = screen.getByRole("button", { name: "Student" });
      expect(choiceBtn).toBeDefined();

      fireEvent.mouseDown(choiceBtn);
      expect(handleChange).toHaveBeenCalledWith({
        match: "all",
        rules: [
          { fieldId: "f-role", operator: "equals", allowedValues: ["Student"] },
        ],
      });
    });

    test("does not show choices dropdown for text fields", () => {
      const handleChange = mock((_c: VisibilityConditionsConfig) => {});
      const initialConditions: VisibilityConditionsConfig = {
        match: "all",
        rules: [
          { fieldId: "f-city", operator: "equals", allowedValues: [""] },
        ],
      };

      render(
        <ConditionBuilder
          conditions={initialConditions}
          onChange={handleChange}
          availableFields={mockFields}
        />,
      );

      const input = screen.getByPlaceholderText("Expected value...");
      expect(input).toBeDefined();
      expect(screen.queryByPlaceholderText("Type or select a choice...")).toBeNull();
    });
  });
});
