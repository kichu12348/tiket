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
import type { Finance } from "@/types/commerce";
import FinancePanel from "../components/FinancePanel";

// Mock next/navigation
mock.module("next/navigation", () => ({
  useParams: () => ({ eventId: "evt-test-101" }),
  useRouter: () => ({ push: mock() }),
}));

// Mock sonner
mock.module("sonner", () => ({
  toast: {
    success: mock(),
    error: mock(),
  },
}));

// Mock API commerce calls
const mockSaveBankAccount = mock(() =>
  Promise.resolve({
    success: true,
    bankAccount: {
      userId: "user-101",
      accountHolderName: "Kichu Developer",
      accountNumber: "50100987654321",
      ifscCode: "HDFC0001234",
      bankName: "HDFC Bank",
      upiId: "kichu@okhdfc",
      updatedAt: "2026-11-04T12:00:00.000Z",
    },
  }),
);

const mockRequestPayout = mock(() =>
  Promise.resolve({
    id: "payout-999",
    eventId: "evt-test-101",
    requestedBy: "user-101",
    amountPaise: 40000,
    status: "requested",
    bankSnapshot: {
      accountHolderName: "Kichu Developer",
      maskedAccountNumber: "••••••••4321",
      ifscCode: "HDFC0001234",
      bankName: "HDFC Bank",
      upiId: "kichu@okhdfc",
    },
    referenceNumber: null,
    notes: "Venue deposit payout",
    createdAt: "2026-11-04T13:00:00.000Z",
    updatedAt: "2026-11-04T13:00:00.000Z",
  }),
);

const mockGetFinance = mock(() =>
  Promise.resolve(mockFinanceData),
);

mock.module("@/api/commerce", () => ({
  saveBankAccount: mockSaveBankAccount,
  requestPayout: mockRequestPayout,
  getFinance: mockGetFinance,
}));

const mockFinanceData: Finance = {
  capturedPaise: 100000,
  orders: [
    {
      order: {
        id: "ord-test-1",
        eventId: "evt-test-101",
        userId: "user-guest-1",
        totalAmount: "500.00",
        totalPaise: 50000,
        paymentStatus: "success",
        registrationStatus: "confirmed",
        reservationState: "confirmed",
        paymentProvider: "razorpay",
        paymentIntentId: "order_12345",
        createdAt: "2026-11-01T10:00:00.000Z",
        updatedAt: "2026-11-01T10:00:00.000Z",
        expiresAt: null,
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
      orderId: "ord-test-1",
      amountPaise: 10000,
      status: "processed",
      reason: "Requested 1 ticket cancellation",
      error: null,
      createdAt: "2026-11-02T11:00:00.000Z",
    },
  ],
  items: [
    {
      id: "item-1",
      orderId: "ord-test-1",
      ticketId: "tick-1",
      ticketTypeId: "tt-1",
      name: "General Admission",
      unitPricePaise: 50000,
      discountPaise: 0,
      ticketTaxPaise: 0,
      platformFeePaise: 0,
      feeTaxPaise: 0,
      totalPaise: 50000,
    },
  ],
  summary: {
    grossSalesPaise: 100000, // ₹1,000.00
    totalDiscountsPaise: 0,
    platformFeesPaise: 2500, // ₹25.00
    taxesPaise: 2250,        // ₹22.50
    totalRefundedPaise: 10000, // ₹100.00
    netEarningsPaise: 90000,  // ₹900.00
    withdrawnOrPendingPaise: 20000, // ₹200.00
    availableToWithdrawPaise: 70000, // ₹700.00
  },
  bankAccount: {
    userId: "user-101",
    accountHolderName: "Kichu Developer",
    accountNumber: "••••••••4321",
    ifscCode: "HDFC0001234",
    bankName: "HDFC Bank",
    upiId: "kichu@okhdfc",
    updatedAt: "2026-11-03T10:00:00.000Z",
  },
  payouts: [
    {
      id: "payout-1",
      eventId: "evt-test-101",
      requestedBy: "user-101",
      amountPaise: 20000,
      status: "paid",
      bankSnapshot: {
        accountHolderName: "Kichu Developer",
        maskedAccountNumber: "••••••••4321",
        ifscCode: "HDFC0001234",
        bankName: "HDFC Bank",
        upiId: "kichu@okhdfc",
      },
      referenceNumber: "UTR9876543210",
      notes: "Advance withdrawal",
      createdAt: "2026-11-03T12:00:00.000Z",
      updatedAt: "2026-11-03T14:00:00.000Z",
    },
  ],
};

describe("FinancePanel Component", () => {
  const mockRefundHandler = mock(() => Promise.resolve(true));

  beforeEach(() => {
    mockSaveBankAccount.mockClear();
    mockRequestPayout.mockClear();
    mockGetFinance.mockClear();
    mockRefundHandler.mockClear();
  });

  test("1. Renders all 5 financial KPI cards with exact formatted values", () => {
    render(
      <FinancePanel
        data={mockFinanceData}
        canRefund={true}
        disabled={false}
        onRefund={mockRefundHandler}
      />,
    );

    // 1. Gross Revenue
    expect(screen.getByText("Gross Revenue")).toBeDefined();
    expect(screen.getByText("₹1,000.00")).toBeDefined();

    // 2. Platform Fees & Taxes: 2500 + 2250 = 4750 paise = ₹47.50
    expect(screen.getByText("Platform Fees & Taxes")).toBeDefined();
    expect(screen.getByText("₹47.50")).toBeDefined();

    // 3. Refunded: 10000 paise = ₹100.00
    expect(screen.getByText("Refunded")).toBeDefined();
    expect(screen.getByText("₹100.00")).toBeDefined();

    // 4. Withdrawn / Processing: 20000 paise = ₹200.00
    expect(screen.getByText("Withdrawn / Processing")).toBeDefined();
    expect(screen.getByText("₹200.00")).toBeDefined();

    // 5. Available Balance: 70000 paise = ₹700.00
    expect(screen.getByText("Available Balance")).toBeDefined();
    expect(screen.getByText("₹700.00")).toBeDefined();
  });

  test("2. Displays connected bank account banner and info", () => {
    render(
      <FinancePanel
        data={mockFinanceData}
        canRefund={true}
        disabled={false}
        onRefund={mockRefundHandler}
      />,
    );

    expect(screen.getByText("Payout Account: HDFC Bank")).toBeDefined();
    expect(screen.getByText("Kichu Developer")).toBeDefined();
    expect(screen.getByText("••••••••4321")).toBeDefined();
    expect(screen.getByText("HDFC0001234")).toBeDefined();
    expect(screen.getByText("kichu@okhdfc")).toBeDefined();
  });

  test("3. Switches between all 3 ledger tabs", async () => {
    render(
      <FinancePanel
        data={mockFinanceData}
        canRefund={true}
        disabled={false}
        onRefund={mockRefundHandler}
      />,
    );

    // Tab 1 by default: Order & Payment Logs
    expect(screen.getByText("Alice Johnson")).toBeDefined();
    expect(screen.getByText("alice@example.com")).toBeDefined();

    // Switch to Tab 2: Withdrawal / Payout Logs
    const payoutsTab = screen.getByRole("tab", {
      name: /Withdrawal \/ Payout Logs/i,
    });
    fireEvent.click(payoutsTab);

    await waitFor(() => {
      expect(screen.getByText("UTR9876543210")).toBeDefined();
      expect(screen.getByText("Advance withdrawal")).toBeDefined();
    });

    // Switch to Tab 3: Refund Logs
    const refundsTab = screen.getByRole("tab", {
      name: /Refund Logs/i,
    });
    fireEvent.click(refundsTab);

    await waitFor(() => {
      expect(screen.getByText("Requested 1 ticket cancellation")).toBeDefined();
    });
  });

  test("4. Opens Bank Account modal and submits updated details", async () => {
    render(
      <FinancePanel
        data={mockFinanceData}
        canRefund={true}
        disabled={false}
        onRefund={mockRefundHandler}
      />,
    );

    // Open modal via Bank Account button
    const bankBtn = screen.getByRole("button", { name: /Manage Bank Account/i });
    fireEvent.click(bankBtn);

    expect(screen.getByRole("heading", { name: /Edit Bank Account Details/i })).toBeDefined();

    // Fill in Account Number
    const accountInput = screen.getByPlaceholderText("e.g. 50100234567890");
    fireEvent.change(accountInput, { target: { value: "50100987654321" } });

    // Submit form
    const saveBtn = screen.getByRole("button", { name: /Save Bank Details/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockSaveBankAccount).toHaveBeenCalledTimes(1);
      expect(mockSaveBankAccount).toHaveBeenCalledWith("evt-test-101", {
        accountHolderName: "Kichu Developer",
        bankName: "HDFC Bank",
        accountNumber: "50100987654321",
        ifscCode: "HDFC0001234",
        upiId: "kichu@okhdfc",
      });
    });
  });

  test("5. Opens Withdraw Funds modal and submits a valid payout request", async () => {
    render(
      <FinancePanel
        data={mockFinanceData}
        canRefund={true}
        disabled={false}
        onRefund={mockRefundHandler}
      />,
    );

    // Open withdraw modal
    const withdrawBtn = screen.getByRole("button", { name: /Withdraw Funds/i });
    fireEvent.click(withdrawBtn);

    expect(screen.getByRole("heading", { name: /Request Fund Withdrawal/i })).toBeDefined();

    // Enter partial amount: ₹400.00
    const amountInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(amountInput, { target: { value: "400.00" } });

    // Enter notes
    const notesInput = screen.getByPlaceholderText(/Venue settlement/i);
    fireEvent.change(notesInput, { target: { value: "Venue deposit payout" } });

    // Submit withdrawal
    const confirmBtn = screen.getByRole("button", { name: /Confirm Withdrawal/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockRequestPayout).toHaveBeenCalledTimes(1);
      expect(mockRequestPayout).toHaveBeenCalledWith("evt-test-101", {
        amountPaise: 40000,
        notes: "Venue deposit payout",
      });
    });
  });

  test("6. Enforces max withdrawal amount validation in UI", async () => {
    render(
      <FinancePanel
        data={mockFinanceData}
        canRefund={true}
        disabled={false}
        onRefund={mockRefundHandler}
      />,
    );

    const withdrawBtn = screen.getByRole("button", { name: /Withdraw Funds/i });
    fireEvent.click(withdrawBtn);

    // Enter amount greater than available balance (available is ₹700.00, entering ₹800.00)
    const amountInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(amountInput, { target: { value: "800.00" } });

    const confirmBtn = screen.getByRole("button", { name: /Confirm Withdrawal/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Withdrawal amount cannot exceed available balance/i),
      ).toBeDefined();
      expect(mockRequestPayout).toHaveBeenCalledTimes(0);
    });
  });
});
