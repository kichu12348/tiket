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
  // Ignore
}

import { render, screen, fireEvent } from "@testing-library/react";
import { DateTimePicker } from "../date-time-picker";

describe("DateTimePicker Component", () => {
  test("renders placeholder and label when no date value is provided", () => {
    const handleChange = mock();
    render(
      <DateTimePicker
        label="Event Start"
        placeholder="Select starting date and time"
        onChange={handleChange}
      />,
    );

    expect(screen.getByText("Event Start")).toBeInTheDocument();
    expect(screen.getByText("Select starting date and time")).toBeInTheDocument();
  });

  test("renders formatted date and timezone when valid date value is provided", () => {
    const handleChange = mock();
    const testDate = new Date(2026, 4, 15, 14, 30); // May 15, 2026 2:30 PM
    render(
      <DateTimePicker
        value={testDate.toISOString()}
        timezone="IST"
        onChange={handleChange}
      />,
    );

    expect(screen.getByText(/May 15th, 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/IST/i)).toBeInTheDocument();
  });

  test("clears date when clear icon button is clicked", () => {
    const handleChange = mock();
    const testDate = new Date(2026, 4, 15, 14, 30);
    render(
      <DateTimePicker
        value={testDate.toISOString()}
        onChange={handleChange}
      />,
    );

    const clearBtn = screen.getByLabelText("Clear date");
    fireEvent.click(clearBtn);

    expect(handleChange).toHaveBeenCalledWith("");
  });
});
