import { describe, expect, test } from "bun:test";
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

import { render, screen } from "@testing-library/react";
import type { OperationsSummary } from "@/types/operations";
import OperationsStats from "../index";

const mockSummary: OperationsSummary = {
  totalTickets: 100,
  checkedInTotal: 40,
  checkedInToday: 25,
  pendingApprovals: 5,
  tiers: [
    {
      ticketTypeId: "tier-1",
      name: "General Admission",
      total: 60,
      checkedIn: 30,
      checkedInToday: 20,
      multiDayCheckIn: false,
    },
    {
      ticketTypeId: "tier-2",
      name: "VIP Weekend Pass",
      total: 30,
      checkedIn: 10,
      checkedInToday: 5,
      multiDayCheckIn: true,
      maxCheckInsPerDay: 2,
    },
    {
      ticketTypeId: "tier-3",
      name: "All-Access Pass",
      total: 10,
      checkedIn: 0,
      checkedInToday: 0,
      multiDayCheckIn: true,
    },
  ],
};

describe("OperationsStats Component", () => {
  test("renders 4-card KPI grid with accurate calculations", () => {
    render(<OperationsStats summary={mockSummary} />);

    // KPI 1: Total Checked In
    expect(screen.getByText("Total Checked In")).toBeDefined();
    expect(screen.getByText("40")).toBeDefined();
    expect(screen.getByText("/ 100 total")).toBeDefined();
    expect(screen.getByText("40%")).toBeDefined();

    // KPI 2: Checked In Today
    expect(screen.getByText("Checked In Today")).toBeDefined();
    expect(screen.getByText("25")).toBeDefined();

    // KPI 3: Remaining Arrivals (100 - 40 = 60)
    expect(screen.getByText("Remaining Arrivals")).toBeDefined();
    expect(screen.getByText("60")).toBeDefined();

    // KPI 4: Pending Approvals
    expect(screen.getByText("Pending Approvals")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
  });

  test("renders Check-In Progress by Ticket Tier with correct badges", () => {
    render(<OperationsStats summary={mockSummary} />);

    expect(screen.getByText("Check-In Progress by Ticket Tier")).toBeDefined();

    // Tier 1: General Admission, Single-Use, 30 / 60 (50%)
    expect(screen.getByText("General Admission")).toBeDefined();
    expect(screen.getByText("Single-Use")).toBeDefined();
    expect(screen.getByText("50%")).toBeDefined();

    // Tier 2: VIP Weekend Pass, Multi-Day · 2/day, 10 / 30 (33%)
    expect(screen.getByText("VIP Weekend Pass")).toBeDefined();
    expect(screen.getByText("Multi-Day · 2/day")).toBeDefined();
    expect(screen.getByText("33%")).toBeDefined();

    // Tier 3: All-Access Pass, Multi-Day · Unlimited, 0 / 10 (0%)
    expect(screen.getByText("All-Access Pass")).toBeDefined();
    expect(screen.getByText("Multi-Day · Unlimited")).toBeDefined();
    expect(screen.getByText("0%")).toBeDefined();
  });

  test("renders loading state gracefully", () => {
    const { container } = render(<OperationsStats loading={true} />);
    expect(container).toBeDefined();
  });

  test("handles empty/null summary safely", () => {
    render(<OperationsStats summary={null} />);
    expect(screen.getByText("Total Checked In")).toBeDefined();
    expect(screen.getByText("No ticket tier data available")).toBeDefined();
  });
});
