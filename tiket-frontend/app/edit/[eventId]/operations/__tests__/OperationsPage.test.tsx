import "@/happydom";
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
import OperationsPage from "../page";

// --- Mock Navigation ---
mock.module("next/navigation", () => ({
  useParams: () => ({ eventId: "evt-test-101" }),
  useRouter: () => ({ push: mock() }),
}));

// --- Mock Live Event Hook ---
mock.module("@/hooks/useLiveEvent", () => ({
  useLiveEvent: mock(),
  useEventRevision: () => 0,
}));

// --- Mock Live Store ---
mock.module("@/store/useLiveStore", () => ({
  useLiveStore: (selector: (state: { connected: boolean; status: string }) => unknown) =>
    selector({ connected: true, status: "live" }),
}));

// --- Mock Availability Hook ---
mock.module("@/hooks/useAvailability", () => ({
  useAvailability: () => ({
    remaining: 45,
    serverTime: new Date().toISOString(),
    tiers: [
      {
        id: "tt-1",
        eventId: "evt-test-101",
        name: "VIP Pass",
        description: "VIP access",
        price: "1500.00",
        multiDayCheckIn: true,
        maxCheckInsPerDay: 2,
        remaining: 20,
      },
    ],
  }),
}));

// --- Mock API Layer ---
const mockGetAttendeeStats = mock(async (_eventId: string) => ({
  totalAttendees: 100,
  checkedInCount: 55,
  pendingCount: 4,
  breakdownByTicketType: [
    {
      ticketTypeId: "tt-1",
      ticketTypeName: "VIP Pass",
      count: 50,
      checkedInCount: 30,
    },
  ],
}));

const mockFetchOperationsAttendees = mock(
  async (_eventId: string, params?: { status?: string; limit?: number }) => {
    if (params?.status === "pending_approval") {
      return {
        attendees: [
          {
            id: "att-pending-1",
            qrCode: "EXO-PENDING-1",
            status: "pending_approval",
            checkInCount: 0,
            checkedInToday: false,
            checkedInAt: null,
            ticketName: "VIP Pass",
            ticketTypeId: "tt-1",
            user: {
              name: "Pending Guest",
              email: "pending@example.com",
            },
            order: {
              id: "ord-pending-1",
            },
            formResponses: [
              {
                fieldLabel: "Company Name",
                value: "Acme Corp",
              },
            ],
          },
        ],
        total: 1,
      };
    }

    return {
      attendees: [
        {
          id: "att-1",
          qrCode: "EXO-482910",
          status: "confirmed",
          checkInCount: 1,
          checkedInToday: true,
          checkedInAt: "2026-03-15T10:00:00.000Z",
          ticketName: "VIP Pass",
          ticketTypeId: "tt-1",
          user: {
            name: "Alice Johnson",
            email: "alice@example.com",
          },
          order: {
            id: "ord-1",
          },
          formResponses: [],
        },
      ],
      total: 1,
    };
  },
);

const mockScanTicketCode = mock(async (_eventId: string, code: string) => {
  if (code === "INVALID") {
    throw new Error("Invalid or expired pass.");
  }
  return {
    ticket: { id: "tkt-1", eventId: _eventId, status: "used" },
    checkIn: { id: "ci-1", checkInDate: "2026-03-15" },
    status: "success" as const,
    checkInDate: "2026-03-15",
    todayCheckInCount: 1,
    totalCheckIns: 1,
    checkedInAt: new Date().toISOString(),
    message: "Attendee checked in successfully.",
  };
});

const mockToggleManualCheckIn = mock(
  async (_eventId: string, _ticketId: string, _undo?: boolean) => ({
    message: _undo ? "Check-in undone." : "Checked in successfully.",
    status: _undo ? "active" : "used",
    checkedInAt: _undo ? null : new Date().toISOString(),
  }),
);

const mockDecideApproval = mock(
  async (_eventId: string, _orderId: string, decision: "approve" | "reject") => ({
    orderId: _orderId,
    decision,
    status: decision === "approve" ? "confirmed" : "declined",
  }),
);

mock.module("@/api/attendees", () => ({
  getAttendeeStats: mockGetAttendeeStats,
}));

mock.module("@/api/operations", () => ({
  fetchOperationsAttendees: mockFetchOperationsAttendees,
  scanTicketCode: mockScanTicketCode,
  toggleManualCheckIn: mockToggleManualCheckIn,
  decideApproval: mockDecideApproval,
}));

// Mock Sonner Toast
const mockToast = {
  success: mock(),
  error: mock(),
  info: mock(),
};
mock.module("sonner", () => ({
  toast: mockToast,
}));

describe("OperationsPage Integration", () => {
  beforeEach(() => {
    mockGetAttendeeStats.mockClear();
    mockFetchOperationsAttendees.mockClear();
    mockScanTicketCode.mockClear();
    mockToggleManualCheckIn.mockClear();
    mockDecideApproval.mockClear();
    mockToast.success.mockClear();
    mockToast.error.mockClear();
  });

  test("1. Renders operations header, live sync badge, and stats cards", async () => {
    render(<OperationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Event Operations")).toBeInTheDocument();
      expect(screen.getByText("Live Sync Connected")).toBeInTheDocument();
      expect(screen.getByText("Total Checked In")).toBeInTheDocument();
      expect(screen.getByText("Remaining Arrivals")).toBeInTheDocument();
      expect(screen.getByText("Pending Approvals")).toBeInTheDocument();
    });
  });

  test("2. Renders Tabs for Gate & Check-Ins and Approvals", async () => {
    render(<OperationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Gate & Check-Ins")).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Approvals/i })).toBeInTheDocument();
    });
  });

  test("3. DoorScanner & CheckInFeed render in Gate & Check-Ins Tab", async () => {
    render(<OperationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Door Check-in")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Scan pass or paste ticket QR code/i)).toBeInTheDocument();
      expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
      expect(screen.getByText("EXO-482910")).toBeInTheDocument();
    });
  });

  test("4. Switches to Approvals tab and renders pending registrations", async () => {
    render(<OperationsPage />);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Approvals/i })).toBeInTheDocument();
    });

    const approvalsTab = screen.getByRole("tab", { name: /Approvals/i });
    fireEvent.pointerDown(approvalsTab);
    fireEvent.click(approvalsTab);

    await waitFor(() => {
      expect(screen.getAllByText("Pending Approvals").length).toBeGreaterThan(0);
      expect(screen.getByText("Pending Guest")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Approve$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Reject$/i })).toBeInTheDocument();
    });
  });

  test("5. Approves a pending registration from Approvals Tab", async () => {
    render(<OperationsPage />);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Approvals/i })).toBeInTheDocument();
    });

    const approvalsTab = screen.getByRole("tab", { name: /Approvals/i });
    fireEvent.pointerDown(approvalsTab);
    fireEvent.click(approvalsTab);

    await waitFor(() => {
      expect(screen.getByText("Pending Guest")).toBeInTheDocument();
    });

    const approveBtn = screen.getByRole("button", { name: /^Approve$/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(mockDecideApproval).toHaveBeenCalledWith(
        "evt-test-101",
        "ord-pending-1",
        "approve",
      );
    });
  });

  test("6. Manual refresh button triggers fresh data fetch", async () => {
    render(<OperationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });

    const refreshBtn = screen.getByText("Refresh");
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(mockGetAttendeeStats).toHaveBeenCalled();
    });
  });
});
