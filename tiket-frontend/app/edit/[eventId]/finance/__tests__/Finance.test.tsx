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

import { render, fireEvent, waitFor, act } from "@testing-library/react";
import type { Finance } from "@/types/commerce";
import BankAccountCard from "../components/BankAccountCard";
import SettlementsTable, { type SettlementOrder } from "../components/SettlementsTable";
import FinancePage from "../page";

// --- Mock Navigation ---
mock.module("next/navigation", () => ({
  useParams: () => ({ eventId: "evt-test-101" }),
  useRouter: () => ({ push: mock() }),
}));

// --- Mock Sonner ---
mock.module("sonner", () => ({
  toast: {
    success: mock(),
    error: mock(),
  },
}));

// --- Mock API calls ---
const mockUpsertBankAccount = mock(() =>
  Promise.resolve({
    success: true,
    bankAccount: {
      userId: "usr-1",
      accountHolderName: "Jane Doe",
      phone: "9876543210",
      accountNumber: "123456789012",
      ifscCode: "HDFC0001234",
      bankName: "HDFC Bank",
      gatewayAccountId: "acc_rzp_123",
      onboardingStatus: "active",
      updatedAt: "2026-11-14T10:00:00.000Z",
    },
  }),
);

const mockGetEventFinance = mock(() =>
  Promise.resolve(mockFinanceData as unknown as Finance),
);

mock.module("@/api/commerce", () => ({
  upsertBankAccount: mockUpsertBankAccount,
  saveBankAccount: mockUpsertBankAccount,
  getEventFinance: mockGetEventFinance,
  getFinance: mockGetEventFinance,
}));

interface MockFinanceData extends Omit<Finance, "orders"> {
  orders: SettlementOrder[];
}

const mockFinanceData: MockFinanceData = {
  capturedPaise: 250000,
  unsettledBalancePaise: 75000,
  orders: [
    {
      order: {
        id: "ord-test-101",
        eventId: "evt-test-101",
        userId: "usr-guest-1",
        totalAmount: "1500.00",
        totalPaise: 150000,
        paymentStatus: "success",
        registrationStatus: "confirmed",
        reservationState: "confirmed",
        paymentProvider: "razorpay",
        paymentIntentId: "pay_123",
        createdAt: "2026-11-10T10:00:00.000Z",
        updatedAt: "2026-11-10T10:00:00.000Z",
        expiresAt: null,
        organizerNetPaise: 140000,
        transferStatus: "settled",
      },
      attendee: {
        name: "Jane Smith",
        email: "jane@example.com",
      },
    },
    {
      order: {
        id: "ord-test-102",
        eventId: "evt-test-101",
        userId: "usr-guest-2",
        totalAmount: "1000.00",
        totalPaise: 100000,
        paymentStatus: "success",
        registrationStatus: "confirmed",
        reservationState: "confirmed",
        paymentProvider: "razorpay",
        paymentIntentId: "pay_124",
        createdAt: "2026-11-11T12:00:00.000Z",
        updatedAt: "2026-11-11T12:00:00.000Z",
        expiresAt: null,
        organizerNetPaise: 95000,
        transferStatus: "pending",
      },
      attendee: {
        name: "Bob Wilson",
        email: "bob@example.com",
      },
    },
  ],
  refunds: [],
  items: [
    {
      id: "item-1",
      orderId: "ord-test-101",
      ticketId: "tick-1",
      ticketTypeId: "tt-1",
      name: "VIP Pass",
      unitPricePaise: 150000,
      discountPaise: 0,
      ticketTaxPaise: 0,
      platformFeePaise: 10000,
      feeTaxPaise: 0,
      totalPaise: 150000,
    },
  ],
  summary: {
    grossSalesPaise: 250000,
    totalDiscountsPaise: 0,
    platformFeesPaise: 15000,
    taxesPaise: 0,
    totalRefundedPaise: 0,
    netEarningsPaise: 235000,
    withdrawnOrPendingPaise: 100000,
    availableToWithdrawPaise: 135000,
    unsettledBalancePaise: 75000,
  },
  bankAccount: {
    userId: "usr-1",
    accountHolderName: "Jane Doe",
    phone: "9876543210",
    accountNumber: "123456789012",
    ifscCode: "HDFC0001234",
    bankName: "HDFC Bank",
    gatewayAccountId: "acc_rzp_123",
    onboardingStatus: "active",
    updatedAt: "2026-11-14T10:00:00.000Z",
  },
  payouts: [
    {
      id: "payout-101",
      eventId: "evt-test-101",
      requestedBy: "usr-1",
      amountPaise: 100000,
      status: "paid",
      bankSnapshot: {
        accountHolderName: "Jane Doe",
        maskedAccountNumber: "••••••••9012",
        ifscCode: "HDFC0001234",
        bankName: "HDFC Bank",
      },
      referenceNumber: "UTR123456789",
      gatewaySettlementId: "setl_rzp_999",
      processedAt: "2026-11-12T15:00:00.000Z",
      createdAt: "2026-11-12T14:00:00.000Z",
      updatedAt: "2026-11-12T15:00:00.000Z",
    },
  ],
};

describe("Finance Components & Page", () => {
  beforeEach(() => {
    mockUpsertBankAccount.mockClear();
    mockGetEventFinance.mockClear();
  });

  describe("BankAccountCard", () => {
    test("renders active badge when gatewayAccountId is active", () => {
      const { getByText, queryByText } = render(
        <BankAccountCard
          eventId="evt-test-101"
          initialAccount={mockFinanceData.bankAccount}
        />,
      );

      expect(
        getByText("Connected · Automatic Razorpay Settlement"),
      ).toBeDefined();
      expect(queryByText("Bank Account Required")).toBeNull();
      // No manual Withdraw button
      expect(queryByText(/withdraw/i)).toBeNull();
    });

    test("renders warning alert when gatewayAccountId is missing", () => {
      const { getByText, queryByText } = render(
        <BankAccountCard
          eventId="evt-test-101"
          initialAccount={null}
        />,
      );

      expect(getByText("Bank Account Required")).toBeDefined();
      expect(
        queryByText("Connected · Automatic Razorpay Settlement"),
      ).toBeNull();
    });

    test("renders all 5 inputs and updates on submit", async () => {
      const onUpdated = mock();
      const { getByPlaceholderText, getByRole } = render(
        <BankAccountCard
          eventId="evt-test-101"
          initialAccount={null}
          onUpdated={onUpdated}
        />,
      );

      const changeInput = (input: HTMLInputElement, value: string) => {
        const lastValue = input.value;
        input.value = value;
        const tracker = (
          input as unknown as {
            _valueTracker?: { setValue: (v: string) => void };
          }
        )._valueTracker;
        if (tracker) {
          tracker.setValue(lastValue);
        }
        input.dispatchEvent(new Event("input", { bubbles: true }));
      };

      await act(async () => {
        const nameInput = getByPlaceholderText("As registered with your bank") as HTMLInputElement;
        changeInput(nameInput, "Test Holder");

        const phoneInput = getByPlaceholderText("10-digit mobile number") as HTMLInputElement;
        changeInput(phoneInput, "9876543210");

        const bankInput = getByPlaceholderText(/e\.g\. HDFC Bank/i) as HTMLInputElement;
        changeInput(bankInput, "State Bank of India");

        const accInput = getByPlaceholderText("Enter bank account number") as HTMLInputElement;
        changeInput(accInput, "987654321098");

        const ifscInput = getByPlaceholderText("e.g. HDFC0001234") as HTMLInputElement;
        changeInput(ifscInput, "SBIN0001234");
      });

      await act(async () => {
        const submitBtn = getByRole("button", { name: /save bank account/i });
        fireEvent.submit(submitBtn.closest("form")!);
      });

      await waitFor(() => {
        expect(mockUpsertBankAccount).toHaveBeenCalledWith("evt-test-101", {
          accountHolderName: "Test Holder",
          phone: "9876543210",
          accountNumber: "987654321098",
          ifscCode: "SBIN0001234",
          bankName: "State Bank of India",
        });
        expect(onUpdated).toHaveBeenCalled();
      });
    });
  });

  describe("SettlementsTable", () => {
    test("renders Order Transfers and Bank Settlements tabs", () => {
      const { getByText } = render(
        <SettlementsTable
          orders={mockFinanceData.orders}
          payouts={mockFinanceData.payouts}
          items={mockFinanceData.items}
        />,
      );

      expect(getByText(/Order Transfers \(2\)/)).toBeDefined();
      expect(getByText(/Bank Settlements \(1\)/)).toBeDefined();

      // Check order transfer content
      expect(getByText("Jane Smith")).toBeDefined();
      expect(getByText("Bob Wilson")).toBeDefined();
    });

    test("switches tabs and displays settlement info", async () => {
      const { getByText } = render(
        <SettlementsTable
          orders={mockFinanceData.orders}
          payouts={mockFinanceData.payouts}
          items={mockFinanceData.items}
        />,
      );

      const settlementsTab = getByText(/Bank Settlements \(1\)/);
      fireEvent.click(settlementsTab);

      await waitFor(() => {
        expect(getByText("UTR123456789")).toBeDefined();
        expect(getByText("Settled")).toBeDefined();
      });
    });
  });

  describe("FinancePage", () => {
    test("renders 4-card KPI summary grid and loads finance data", async () => {
      const { getByText } = render(<FinancePage />);

      await waitFor(() => {
        expect(mockGetEventFinance).toHaveBeenCalledWith("evt-test-101");
      });

      // 4 KPIs:
      // a) Net Organizer Revenue
      expect(getByText("Net Organizer Revenue")).toBeDefined();
      // b) Unsettled Balance (Available for Refunds)
      expect(
        getByText("Unsettled Balance (Available for Refunds)"),
      ).toBeDefined();
      // c) Settled to Bank
      expect(getByText("Settled to Bank")).toBeDefined();
      // d) Paid Orders
      expect(getByText("Paid Orders")).toBeDefined();

      // Both BankAccountCard and SettlementsTable rendered
      expect(getByText("Payout Bank Account")).toBeDefined();
      expect(getByText("Transfers & Settlements")).toBeDefined();
    });
  });
});
