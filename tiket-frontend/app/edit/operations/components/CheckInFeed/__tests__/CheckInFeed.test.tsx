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
import type { OperationsAttendee } from "@/types/operations";
import CheckInFeed from "../index";

const mockAttendees: OperationsAttendee[] = [
  {
    id: "att-1",
    qrCode: "EXO-1001",
    status: "used",
    checkInCount: 1,
    checkedInToday: true,
    checkedInAt: new Date().toISOString(),
    ticketName: "VIP",
    user: {
      id: "u-1",
      name: "Alice Johnson",
      email: "alice@example.com",
    },
  },
  {
    id: "att-2",
    qrCode: "EXO-1002",
    status: "active",
    checkInCount: 0,
    checkedInToday: false,
    checkedInAt: null,
    ticketName: "General",
    user: {
      id: "u-2",
      name: "Bob Smith",
      email: "bob@example.com",
    },
  },
  {
    id: "att-3",
    qrCode: "EXO-1003",
    status: "used",
    checkInCount: 2,
    checkedInToday: false,
    checkedInAt: "2026-11-01T10:00:00Z",
    ticketName: "Multi-Day",
    user: {
      id: "u-3",
      name: "Charlie Brown",
      email: "charlie@example.com",
    },
  },
];

const mockFetchOperationsAttendees = mock(async () => ({
  attendees: mockAttendees,
  total: 3,
  page: 1,
  limit: 100,
  totalPages: 1,
}));

const mockToggleManualCheckIn = mock(
  async (_eventId: string, _ticketId: string, undo: boolean) => ({
    message: undo ? "Check-in undone" : "Checked in",
    status: undo ? "active" : "used",
    checkedInAt: undo ? null : new Date().toISOString(),
  }),
);

mock.module("@/api/operations", () => ({
  fetchOperationsAttendees: mockFetchOperationsAttendees,
  toggleManualCheckIn: mockToggleManualCheckIn,
}));

mock.module("sonner", () => ({
  toast: {
    success: mock(),
    error: mock(),
  },
}));

describe("CheckInFeed Component", () => {
  beforeEach(() => {
    mockFetchOperationsAttendees.mockClear();
    mockToggleManualCheckIn.mockClear();
  });

  test("renders attendee rows with name, email, ticket code, tier, and status", async () => {
    render(<CheckInFeed eventId="evt-101" refreshKey={1} />);

    await waitFor(() => {
      expect(screen.getByText("Alice Johnson")).toBeDefined();
    });

    expect(screen.getByText("alice@example.com")).toBeDefined();
    expect(screen.getByText("EXO-1001")).toBeDefined();
    expect(screen.getByText("VIP")).toBeDefined();
    expect(screen.getByText("Checked In Today")).toBeDefined();

    expect(screen.getByText("Bob Smith")).toBeDefined();
    expect(screen.getByText("EXO-1002")).toBeDefined();
    expect(screen.getByText("General")).toBeDefined();
    expect(screen.getByText("Not Checked In")).toBeDefined();

    expect(screen.getByText("Charlie Brown")).toBeDefined();
    expect(screen.getByText("EXO-1003")).toBeDefined();
    expect(screen.getByText("Multi-Day")).toBeDefined();
    expect(screen.getByText("Prior Check-In (2)")).toBeDefined();
  });

  test("filters attendees via search input", async () => {
    render(<CheckInFeed eventId="evt-101" refreshKey={1} />);

    await waitFor(() => {
      expect(screen.getByText("Alice Johnson")).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(
      "Search by name, email, or EXO-... code",
    );
    fireEvent.change(searchInput, { target: { value: "EXO-1002" } });

    expect(screen.queryByText("Alice Johnson")).toBeNull();
    expect(screen.getByText("Bob Smith")).toBeDefined();
  });

  test("executes toggleManualCheckIn when Check In is clicked", async () => {
    const onUpdated = mock();
    render(
      <CheckInFeed
        eventId="evt-101"
        refreshKey={1}
        onCheckInUpdated={onUpdated}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Bob Smith")).toBeDefined();
    });

    // Bob Smith is not checked in, button says "Check In"
    const checkInBtns = screen.getAllByRole("button", { name: /check in/i });
    fireEvent.click(checkInBtns[0]);

    await waitFor(() => {
      expect(mockToggleManualCheckIn).toHaveBeenCalledWith(
        "evt-101",
        "att-2",
        false,
      );
    });

    expect(onUpdated).toHaveBeenCalled();
  });

  test("executes toggleManualCheckIn with undo=true when Undo is clicked", async () => {
    const onUpdated = mock();
    render(
      <CheckInFeed
        eventId="evt-101"
        refreshKey={1}
        onCheckInUpdated={onUpdated}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Alice Johnson")).toBeDefined();
    });

    // Alice Johnson is checked in today, button says "Undo"
    const undoBtn = screen.getByText("Undo");
    fireEvent.click(undoBtn);

    await waitFor(() => {
      expect(mockToggleManualCheckIn).toHaveBeenCalledWith(
        "evt-101",
        "att-1",
        true,
      );
    });

    expect(onUpdated).toHaveBeenCalled();
  });
});
