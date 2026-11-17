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
import type { OperationsAttendee } from "@/types/operations";
import ApprovalsPanel from "../index";

const mockAttendees: OperationsAttendee[] = [
  {
    id: "tkt-1",
    qrCode: "EXO-APP-1",
    status: "pending_approval",
    checkInCount: 0,
    checkedInToday: false,
    checkedInAt: null,
    ticketName: "VIP Backstage",
    createdAt: "2026-03-01T12:00:00.000Z",
    user: {
      id: "usr-1",
      name: "Devon Vance",
      email: "devon@example.com",
    },
    order: {
      id: "ord-approval-101",
      totalAmount: "1200.00",
      paymentStatus: "success",
      createdAt: "2026-03-01T12:00:00.000Z",
    },
    formResponses: [
      {
        fieldId: "q-company",
        label: "Company / Affiliation",
        fieldType: "text",
        value: "Acme Robotics",
      },
      {
        fieldId: "q-diet",
        label: "Dietary Preferences",
        fieldType: "text",
        value: "Vegan",
      },
    ],
  },
  {
    id: "tkt-2",
    qrCode: "EXO-APP-2",
    status: "pending_approval",
    checkInCount: 0,
    checkedInToday: false,
    checkedInAt: null,
    ticketName: "General Admission",
    createdAt: "2026-03-01T13:00:00.000Z",
    user: {
      id: "usr-2",
      name: "Sasha Grey",
      email: "sasha@example.com",
    },
    order: {
      id: "ord-approval-102",
      totalAmount: "400.00",
      paymentStatus: "success",
      createdAt: "2026-03-01T13:00:00.000Z",
    },
    formResponses: [],
  },
];

const mockFetchOperationsAttendees = mock(async () => ({
  attendees: mockAttendees,
  total: 2,
  page: 1,
  limit: 100,
  totalPages: 1,
}));

const mockDecideApproval = mock(
  async (_eventId: string, _orderId: string, decision: "approve" | "reject") => ({
    message:
      decision === "approve"
        ? "Registration approved successfully."
        : "Registration rejected and refunded.",
  }),
);

const mockGetAttendeeFormResponses = mock(async () => ({
  responses: [
    {
      fieldId: "q-1",
      label: "Portfolio URL",
      fieldType: "text",
      value: "https://example.com",
    },
  ],
}));

mock.module("@/api/operations", () => ({
  fetchOperationsAttendees: mockFetchOperationsAttendees,
  decideApproval: mockDecideApproval,
}));

mock.module("@/api/attendees", () => ({
  getAttendeeFormResponses: mockGetAttendeeFormResponses,
}));

const mockToast = {
  success: mock(),
  error: mock(),
};

mock.module("sonner", () => ({
  toast: mockToast,
}));

describe("ApprovalsPanel Component", () => {
  beforeEach(() => {
    mockFetchOperationsAttendees.mockClear();
    mockDecideApproval.mockClear();
    mockGetAttendeeFormResponses.mockClear();
    mockToast.success.mockClear();
    mockToast.error.mockClear();
  });

  test("1. Renders pending approvals table inside card with attendee data", async () => {
    render(
      <ApprovalsPanel
        eventId="evt-test-101"
        refreshKey={0}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Pending Approvals")).toBeInTheDocument();
      expect(screen.getByText("Devon Vance")).toBeInTheDocument();
      expect(screen.getByText("devon@example.com")).toBeInTheDocument();
      expect(screen.getByText("VIP Backstage")).toBeInTheDocument();
      expect(screen.getByText("Sasha Grey")).toBeInTheDocument();
      expect(screen.getByText("2 Pending")).toBeInTheDocument();
    });
  });

  test("2. Opens Sheet drawer to inspect custom form responses", async () => {
    render(
      <ApprovalsPanel
        eventId="evt-test-101"
        refreshKey={0}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Devon Vance")).toBeInTheDocument();
    });

    const viewAnswersButtons = screen.getAllByRole("button", {
      name: /View Answers/i,
    });
    fireEvent.click(viewAnswersButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Registration Details")).toBeInTheDocument();
      expect(screen.getByText("Company / Affiliation")).toBeInTheDocument();
      expect(screen.getByText("Acme Robotics")).toBeInTheDocument();
      expect(screen.getByText("Dietary Preferences")).toBeInTheDocument();
      expect(screen.getByText("Vegan")).toBeInTheDocument();
    });
  });

  test("3. Approves registration from table button", async () => {
    const onComplete = mock();
    render(
      <ApprovalsPanel
        eventId="evt-test-101"
        refreshKey={0}
        onDecisionComplete={onComplete}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Devon Vance")).toBeInTheDocument();
    });

    const approveButtons = screen.getAllByRole("button", {
      name: /^Approve$/i,
    });
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(mockDecideApproval).toHaveBeenCalledWith(
        "evt-test-101",
        "ord-approval-101",
        "approve",
      );
      expect(mockToast.success).toHaveBeenCalledWith(
        "Registration approved successfully.",
      );
      expect(onComplete).toHaveBeenCalled();
    });
  });

  test("4. Rejects registration from table button", async () => {
    const onComplete = mock();
    render(
      <ApprovalsPanel
        eventId="evt-test-101"
        refreshKey={0}
        onDecisionComplete={onComplete}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Devon Vance")).toBeInTheDocument();
    });

    const rejectButtons = screen.getAllByRole("button", {
      name: /^Reject$/i,
    });
    fireEvent.click(rejectButtons[0]);

    await waitFor(() => {
      expect(mockDecideApproval).toHaveBeenCalledWith(
        "evt-test-101",
        "ord-approval-101",
        "reject",
      );
      expect(mockToast.success).toHaveBeenCalledWith(
        "Registration rejected and refunded.",
      );
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
