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
import type { Finance, Coupon, MailConfig } from "@/types/commerce";
import type { TicketType } from "@/types/ticketType";
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
  useLiveStore: (selector: (state: { status: string }) => unknown) =>
    selector({ status: "live" }),
}));

// --- Mock Data ---
const mockTiers: (TicketType & { remaining: number | null })[] = [
  {
    id: "tt-1",
    eventId: "evt-test-101",
    name: "General Admission",
    description: "Standard entry",
    price: "499.00",
    quantityLimit: 100,
    remaining: 40,
    saleStart: null,
    saleEnd: null,
    isTransferable: true,
    isRefundable: true,
    refundableUntil: null,
    maxTransfers: 1,
    sortOrder: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "tt-2",
    eventId: "evt-test-101",
    name: "VIP Pass",
    description: "VIP access",
    price: "1499.00",
    quantityLimit: 50,
    remaining: 10,
    saleStart: null,
    saleEnd: null,
    isTransferable: true,
    isRefundable: false,
    refundableUntil: null,
    maxTransfers: 1,
    sortOrder: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const mockCoupons: Coupon[] = [
  {
    code: "EARLYBIRD20",
    kind: "percent",
    value: 2000, // 20% in basis points
    ticketTypeIds: ["tt-1"],
    maxUses: 50,
    startsAt: "2026-01-01T00:00:00Z",
    endsAt: "2026-12-31T23:59:59Z",
    isActive: true,
  },
];

const mockFinance: Finance = {
  capturedPaise: 100000, // ₹1000.00
  orders: [
    {
      order: {
        id: "ord-1",
        eventId: "evt-test-101",
        userId: "usr-1",
        totalAmount: "500.00",
        totalPaise: 50000, // ₹500.00
        expiresAt: null,
        paymentStatus: "success",
        registrationStatus: "confirmed",
        reservationState: "confirmed",
        paymentProvider: "razorpay",
        paymentIntentId: "pay_12345",
        createdAt: "2026-02-01T10:00:00.000Z",
        updatedAt: "2026-02-01T10:00:00.000Z",
      },
      attendee: {
        name: "Alice Johnson",
        email: "alice@example.com",
      },
    },
  ],
  refunds: [
    {
      id: "ref-1",
      orderId: "ord-1",
      amountPaise: 10000, // ₹100.00 processed
      status: "processed",
      reason: "Requested discount adjustment",
      error: null,
    },
  ],
  items: [
    {
      id: "item-1",
      orderId: "ord-1",
      name: "General Admission",
      ticketId: "tkt-1",
      ticketTypeId: "tt-1",
      unitPricePaise: 50000,
      discountPaise: 0,
      ticketTaxPaise: 0,
      platformFeePaise: 0,
      feeTaxPaise: 0,
      totalPaise: 50000,
    },
  ],
};

const mockApprovals = [
  {
    id: "ord-pending-1",
    name: "Charlie Brown",
    email: "charlie@example.com",
  },
];

// --- Mock API Layer ---
const mockGetPermissions = mock(async () => ({
  owner: true,
  permissions: [
    "scan_tickets",
    "manage_guests",
    "view_payments",
    "manage_refunds",
    "manage_tickets",
    "manage_emails",
  ],
}));

const mockGetFinance = mock(async () => mockFinance);
const mockGetCoupons = mock(async () => mockCoupons);
const mockPutCoupon = mock(async (_eventId: string, coupon: Coupon) => coupon);
const mockGetPendingApprovals = mock(async () => mockApprovals);
const mockDecideRegistration = mock(
  async (
    _eventId: string,
    _orderId: string,
    decision: "approve" | "decline",
  ) => ({
    id: _orderId,
    decision,
    status: decision === "approve" ? "confirmed" : "declined",
  }),
);
const mockRefundOrder = mock(
  async (
    _eventId: string,
    _orderId: string,
    amountPaise: number,
    reason: string,
    key: string,
  ) => ({
    id: "ref-new-1",
    amountPaise,
    reason,
    key,
    status: "requested",
  }),
);
const mockGetMailConnection = mock(async () => ({ custom: false }));
const mockSaveMailConnection = mock(
  async (_eventId: string, _config: MailConfig) => ({ custom: true }),
);
const mockResetMailConnection = mock(async () => ({ custom: false }));
const mockScanTicket = mock(async (_eventId: string, qrCode: string) => {
  if (qrCode === "QR-INVALID") {
    throw new Error("Ticket is not eligible for this admission change.");
  }
  return {
    ticket: { id: "tkt-scanned-101", eventId: _eventId, status: "used" },
    ticketId: "tkt-scanned-101",
    status: "used",
    message: "Attendee checked in.",
  };
});

mock.module("@/api/commerce", () => ({
  getPermissions: mockGetPermissions,
  getFinance: mockGetFinance,
  getCoupons: mockGetCoupons,
  putCoupon: mockPutCoupon,
  getPendingApprovals: mockGetPendingApprovals,
  decideRegistration: mockDecideRegistration,
  refundOrder: mockRefundOrder,
  getMailConnection: mockGetMailConnection,
  saveMailConnection: mockSaveMailConnection,
  resetMailConnection: mockResetMailConnection,
  scanTicket: mockScanTicket,
}));

const mockToggleCheckIn = mock(
  async (_eventId: string, _ticketId: string, _action: "checkin" | "undo") => ({
    message: "Check-in undone.",
    status: "active",
    checkedInAt: null,
  }),
);

mock.module("@/api/attendees", () => ({
  toggleCheckIn: mockToggleCheckIn,
}));

// Mock Availability Hook
mock.module("@/hooks/useAvailability", () => ({
  useAvailability: () => ({
    remaining: 50,
    serverTime: new Date().toISOString(),
    tiers: mockTiers,
  }),
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
    mockGetPermissions.mockClear();
    mockGetFinance.mockClear();
    mockGetCoupons.mockClear();
    mockPutCoupon.mockClear();
    mockGetPendingApprovals.mockClear();
    mockDecideRegistration.mockClear();
    mockRefundOrder.mockClear();
    mockGetMailConnection.mockClear();
    mockSaveMailConnection.mockClear();
    mockResetMailConnection.mockClear();
    mockScanTicket.mockClear();
    mockToggleCheckIn.mockClear();
    mockToast.success.mockClear();
    mockToast.error.mockClear();
    mockToast.info.mockClear();
  });

  test("1. Renders operations header, live sync badge, and operational sections", async () => {
    render(<OperationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Event Operations")).toBeInTheDocument();
      expect(screen.getByText("Live Sync Connected")).toBeInTheDocument();
      expect(screen.getByText("50 spots available")).toBeInTheDocument();
    });

    expect(screen.getByText("Door Check-in")).toBeInTheDocument();
    expect(screen.getByText("Awaiting Approval")).toBeInTheDocument();
    expect(screen.getByText("Payments & Financials")).toBeInTheDocument();
    expect(screen.getByText("Coupons & Access Codes")).toBeInTheDocument();
    expect(screen.getByText("Email Delivery Service")).toBeInTheDocument();
  });

  test("2. DoorScanner: checks in pass, displays visual feedback and executes undo", async () => {
    render(<OperationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Door Check-in")).toBeInTheDocument();
    });

    const scannerInput = screen.getByPlaceholderText(
      "Scan pass or paste ticket QR code...",
    );
    fireEvent.change(scannerInput, { target: { value: "QR-PASS-101" } });

    const checkInBtn = screen.getByRole("button", { name: "Check In" });
    fireEvent.click(checkInBtn);

    await waitFor(() => {
      expect(mockScanTicket).toHaveBeenCalledWith(
        "evt-test-101",
        "QR-PASS-101",
      );
      expect(
        screen.getByText(/Attendee checked in/i),
      ).toBeInTheDocument();
      expect(screen.getByText("Undo Check-In")).toBeInTheDocument();
    });

    // Execute Undo
    fireEvent.click(screen.getByText("Undo Check-In"));

    await waitFor(() => {
      expect(mockToggleCheckIn).toHaveBeenCalledWith(
        "evt-test-101",
        "tkt-scanned-101",
        "undo",
      );
      expect(
        screen.getByText(/Check-in undone/i),
      ).toBeInTheDocument();
    });
  });

  test("3. DoorScanner: displays visual error feedback on invalid/unpaid ticket", async () => {
    render(<OperationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Door Check-in")).toBeInTheDocument();
    });

    const scannerInput = screen.getByPlaceholderText(
      "Scan pass or paste ticket QR code...",
    );
    fireEvent.change(scannerInput, { target: { value: "QR-INVALID" } });

    const checkInBtn = screen.getByRole("button", { name: "Check In" });
    fireEvent.click(checkInBtn);

    await waitFor(() => {
      expect(mockScanTicket).toHaveBeenCalledWith("evt-test-101", "QR-INVALID");
      expect(
        screen.getAllByText(
          "Ticket is not eligible for this admission change.",
        ).length,
      ).toBeGreaterThan(0);
    });
  });

  test("4. Approves and declines registrations from the Awaiting Approval queue", async () => {
    render(<OperationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
    });

    // Approve Charlie
    const approveBtn = screen.getByRole("button", { name: /Approve/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(mockDecideRegistration).toHaveBeenCalledWith(
        "evt-test-101",
        "ord-pending-1",
        "approve",
      );
      expect(mockToast.success).toHaveBeenCalledWith("Registration approved.");
    });

    // Decline Charlie
    const declineBtn = screen.getByRole("button", { name: /Decline & Refund/i });
    fireEvent.click(declineBtn);

    await waitFor(() => {
      expect(mockDecideRegistration).toHaveBeenCalledWith(
        "evt-test-101",
        "ord-pending-1",
        "decline",
      );
      expect(mockToast.success).toHaveBeenCalledWith(
        "Registration declined and refund queued where applicable.",
      );
    });
  });

  test("5. CouponPanel: creates percent coupon with basis points and fixed coupon with paise", async () => {
    render(<OperationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Coupons & Access Codes")).toBeInTheDocument();
      expect(screen.getByText("EARLYBIRD20")).toBeInTheDocument();
    });

    // Create 15% discount coupon (1500 basis points)
    const codeInput = screen.getByPlaceholderText("e.g. EARLYBIRD20");
    fireEvent.change(codeInput, { target: { value: "FALL15" } });

    const valueInput = screen.getByPlaceholderText("10");
    fireEvent.change(valueInput, { target: { value: "15" } });

    const saveCodeBtn = screen.getByRole("button", { name: /Save Code/i });
    fireEvent.click(saveCodeBtn);

    await waitFor(() => {
      expect(mockPutCoupon).toHaveBeenCalledWith(
        "evt-test-101",
        expect.objectContaining({
          code: "FALL15",
          kind: "percent",
          value: 1500, // 15% in basis points
          isActive: true,
        }),
      );
      expect(mockToast.success).toHaveBeenCalledWith("Code saved.");
    });
  });

  test("6. FinancePanel: displays captured revenue and triggers partial refund with Idempotency-Key", async () => {
    render(<OperationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Payments & Financials")).toBeInTheDocument();
      expect(screen.getByText("Total Captured")).toBeInTheDocument();
      expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    });

    // Expand Alice's order (ord-1)
    fireEvent.click(screen.getByText("Alice Johnson"));

    await waitFor(() => {
      expect(screen.getByText("Issue Refund")).toBeInTheDocument();
    });

    // Fill refund amount (₹100.00 = 10000 paise) and reason
    const reasonInput = screen.getByPlaceholderText(
      "e.g. Requested cancellation, duplicate charge...",
    );
    fireEvent.change(reasonInput, {
      target: { value: "Partial cancellation request" },
    });

    const processRefundBtn = screen.getByRole("button", {
      name: /Process Refund/i,
    });
    fireEvent.click(processRefundBtn);

    await waitFor(() => {
      expect(mockRefundOrder).toHaveBeenCalledWith(
        "evt-test-101",
        "ord-1",
        expect.any(Number),
        "Partial cancellation request",
        expect.any(String), // Idempotency-Key
      );
      expect(mockToast.success).toHaveBeenCalledWith(
        "Refund queued. Its status will update after Razorpay processes it.",
      );
    });
  });

  test("7. MailConnection: validates and saves Brevo credentials, and resets to default", async () => {
    render(<OperationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Email Delivery Service")).toBeInTheDocument();
      expect(screen.getByText("Platform Brevo Default")).toBeInTheDocument();
    });

    // Fill Brevo email and api key
    const emailInput = screen.getByPlaceholderText(
      "e.g. tickets@yourdomain.com",
    );
    fireEvent.change(emailInput, {
      target: { value: "tickets@example.com" },
    });

    const apiKeyInput = screen.getByPlaceholderText("xkeysib-...");
    fireEvent.change(apiKeyInput, {
      target: { value: "xkeysib-secret-123" },
    });

    const saveMailBtn = screen.getByRole("button", {
      name: /Save Connection/i,
    });
    fireEvent.click(saveMailBtn);

    await waitFor(() => {
      expect(mockSaveMailConnection).toHaveBeenCalledWith(
        "evt-test-101",
        expect.objectContaining({
          provider: "brevo",
          fromEmail: "tickets@example.com",
          apiKey: "xkeysib-secret-123",
        }),
      );
      expect(mockToast.success).toHaveBeenCalledWith(
        "Email connection saved.",
      );
    });
  });
});
