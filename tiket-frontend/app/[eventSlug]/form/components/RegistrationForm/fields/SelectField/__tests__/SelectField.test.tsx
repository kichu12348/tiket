import "@/happydom";
import { describe, test, expect } from "bun:test";
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

import { render, screen, fireEvent } from "@testing-library/react";
import { useForm } from "react-hook-form";
import SelectField from "../index";
import type { FormField } from "@/types/form";

function Wrapper({ field, defaultValues = {} }: { field: FormField; defaultValues?: Record<string, unknown> }) {
  const { control } = useForm({ defaultValues });
  return <SelectField field={field} control={control} />;
}

describe("SelectField with allowCustom", () => {
  test("single_select renders choices and Other button when allowCustom is true", () => {
    const field: FormField = {
      id: "role_field",
      eventId: "evt-1",
      name: "role",
      label: "Role",
      fieldType: "single_select",
      isRequired: true,
      options: {
        choices: ["Developer", "Designer"],
        allowCustom: true,
      },
      sortOrder: 0,
      page: 1,
      createdAt: "2026-01-01T00:00:00Z",
    };

    render(<Wrapper field={field} />);

    expect(screen.getByRole("button", { name: "Developer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Designer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Other" })).toBeInTheDocument();

    // Clicking Other reveals the custom input
    fireEvent.click(screen.getByRole("button", { name: "Other" }));
    const customInput = screen.getByPlaceholderText("Please specify...");
    expect(customInput).toBeInTheDocument();

    fireEvent.change(customInput, { target: { value: "Data Scientist" } });
    expect(customInput).toHaveValue("Data Scientist");
  });

  test("multi_select renders Other checkbox and input when allowCustom is true", () => {
    const field: FormField = {
      id: "tools_field",
      eventId: "evt-1",
      name: "tools",
      label: "Tools",
      fieldType: "multi_select",
      isRequired: false,
      options: {
        choices: ["Figma", "VS Code"],
        allowCustom: true,
      },
      sortOrder: 1,
      page: 1,
      createdAt: "2026-01-01T00:00:00Z",
    };

    render(<Wrapper field={field} />);

    expect(screen.getByText("Figma")).toBeInTheDocument();
    expect(screen.getByText("VS Code")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();

    // Check Other checkbox
    const otherCheckbox = screen.getByLabelText("Other");
    fireEvent.click(otherCheckbox);

    const customInput = screen.getByPlaceholderText("Please specify...");
    expect(customInput).toBeInTheDocument();

    fireEvent.change(customInput, { target: { value: "Cursor" } });
    expect(customInput).toHaveValue("Cursor");
  });

  test("multi_select with isMulti: false renders as single select buttons", () => {
    const field: FormField = {
      id: "membership_field",
      eventId: "evt-1",
      name: "membership",
      label: "Membership Tier",
      fieldType: "multi_select",
      isRequired: true,
      options: {
        choices: ["Gold", "Silver"],
        isMulti: false,
      },
      sortOrder: 2,
      page: 1,
      createdAt: "2026-01-01T00:00:00Z",
    };

    render(<Wrapper field={field} />);

    // Should render buttons, not checkboxes
    expect(screen.getByRole("button", { name: "Gold" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Silver" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
