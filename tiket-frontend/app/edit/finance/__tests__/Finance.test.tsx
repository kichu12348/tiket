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

import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import "@/testing-library";
import { testRouterState } from "@/testing-library";
import type { Finance } from "@/types/commerce";
import BankAccountCard from "../components/BankAccountCard";
import BankAccountModal from "../components/BankAccountModal";
import FinanceCharts from "../components/FinanceCharts";
import SettlementsTable from "../components/SettlementsTable";
import FinancePage from "@/app/edit/finance/page";

// --- Mock Realtime Hook ---
mock.module("@/hooks/useLiveEvent", () => ({
  useLiveEvent: () => {},
  useEventVersion: () => 1,
  useEventRevision: () => 1,
}));

// --- Mock Sonner ---
mock.module("sonner", () => ({
  toast: {
    success: mock(),
    error: mock(),
    info: mock(),
  },
}));

// --- Mock API calls ---
const mockSaveBankAccount = mock(() =>
  Promise.resolve({
    success: true,
    bankAccount: {
      userId: "usr-1",
      accountHolderName: "Jane Doe",
      accountType: "current",
      phone: "9876543210",
      accountNumber: "123456789012",
      ifscCode: "HDFC0001234",
      bankName: "HDFC Bank",
      gatewayAccountId: "acc_rzp_123",
      onboardingStatus: "active",
      configured: true,
      updatedAt: "2026-11-14T10:00:00.000Z",
    },
  }),
);

const mockGetFinance = mock(() =>
  Promise.resolve(mockFinanceData),
);

mock.module("@/api/commerce", () => ({
  upsertBankAccount: mockSaveBankAccount,
  saveBankAccount: mockSaveBankAccount,
  getEventFinance: mockGetFinance,
  getFinance: mockGetFinance,
}));

const mockFinanceData: Finance = {
  capturedPaise: 250000,
  grossRevenuePaise: 250000,
  netOrganizerRevenuePaise: 235000,
  totalDiscountsPaise: 0,
  platformFeesPaise: 15000,
  unsettledBalancePaise: 75000,
  settledBalancePaise: 100000,
  totalRefundedPaise: 0,
  refundedOrdersCount: 0,
  paidOrdersCount: 2,
  dailyRevenueSeries: [
    {
      date: "2026-11-10",
      grossPaise: 150000,
      netPaise: 140000,
      refundsPaise: 0,
      ordersCount: 1,
    },
    {
      date: "2026-11-11",
      grossPaise: 100000,
      netPaise: 95000,
      refundsPaise: 0,
      ordersCount: 1,
    },
  ],
  revenueByTier: [
    {
      ticketTypeId: "tt-1",
      ticketTypeName: "VIP Pass",
      ticketsSold: 1,
      grossPaise: 150000,
      netPaise: 140000,
    },
    {
      ticketTypeId: "tt-2",
      ticketTypeName: "General Pass",
      ticketsSold: 1,
      grossPaise: 100000,
      netPaise: 95000,
    },
  ],
  transfers: [
    {
      orderId: "ord-test-101",
      buyerName: "Jane Smith",
      buyerEmail: "jane@example.com",
      ticketTypeName: "VIP Pass",
      couponCode: null,
      grossPaise: 150000,
      discountPaise: 0,
      feePaise: 10000,
      netPaise: 140000,
      transferId: "trf_123",
      status: "settled",
      createdAt: "2026-11-10T10:00:00.000Z",
    },
    {
      orderId: "ord-test-102",
      buyerName: "Bob Wilson",
      buyerEmail: "bob@example.com",
      ticketTypeName: "General Pass",
      couponCode: null,
      grossPaise: 100000,
      discountPaise: 0,
      feePaise: 5000,
      netPaise: 95000,
      transferId: "trf_124",
      status: "in_cycle",
      createdAt: "2026-11-11T12:00:00.000Z",
    },
  ],
  settlements: [
    {
      id: "payout-101",
      settlementId: "setl_rzp_999",
      utr: "UTR123456789",
      referenceNumber: "UTR123456789",
      amountPaise: 100000,
      status: "settled",
      settledAt: "2026-11-12T15:00:00.000Z",
    },
  ],
  orders: [],
  refunds: [],
  items: [],
  summary: {
    grossSalesPaise: 250000,
    grossRevenuePaise: 250000,
    totalDiscountsPaise: 0,
    platformFeesPaise: 15000,
    taxesPaise: 0,
    totalRefundedPaise: 0,
    netEarningsPaise: 235000,
    netOrganizerRevenuePaise: 235000,
    withdrawnOrPendingPaise: 100000,
    availableToWithdrawPaise: 135000,
    unsettledBalancePaise: 75000,
    settledBalancePaise: 100000,
    paidOrdersCount: 2,
    refundedOrdersCount: 0,
  },
  bankAccount: {
    userId: "usr-1",
    accountHolderName: "Jane Doe",
    accountType: "current",
    phone: "9876543210",
    accountNumber: "123456789012",
    maskedAccountNumber: "•••• •••• 9012",
    ifscCode: "HDFC0001234",
    bankName: "HDFC Bank",
    gatewayAccountId: "acc_rzp_123",
    onboardingStatus: "active",
    configured: true,
    status: "active",
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

describe("Finance Module Components & Integration", () => {
  beforeEach(() => {
    testRouterState.params = {
      ...testRouterState.params,
      eventId: "evt-test-101",
    };
    mockSaveBankAccount.mockClear();
    mockGetFinance.mockClear();
  });

  describe("BankAccountCard", () => {
    test("renders connected state with status badge and masked account number", () => {
      const onOpenModal = mock();
      const { getByText, queryByText } = render(
        <BankAccountCard
          bankAccount={mockFinanceData.bankAccount}
          onOpenModal={onOpenModal}
        />,
      );

      expect(
        getByText("Connected · Automatic Razorpay Settlement"),
      ).toBeDefined();
      expect(getByText("Jane Doe")).toBeDefined();
      expect(getByText("Current")).toBeDefined();
      expect(getByText("HDFC Bank")).toBeDefined();
      expect(getByText("•••• •••• 9012")).toBeDefined();
      expect(getByText("HDFC0001234")).toBeDefined();
      expect(getByText("acc_rzp_123")).toBeDefined();

      // No manual Withdraw button
      expect(queryByText(/withdraw/i)).toBeNull();

      // Trigger update modal
      const updateBtn = getByText("Update Bank Details");
      fireEvent.click(updateBtn);
      expect(onOpenModal).toHaveBeenCalled();
    });

    test("renders attention state when bank account is not connected", () => {
      const onOpenModal = mock();
      const { getByText, queryByText } = render(
        <BankAccountCard bankAccount={null} onOpenModal={onOpenModal} />,
      );

      expect(getByText("Bank Account Required")).toBeDefined();
      expect(queryByText("Connected · Automatic Razorpay Settlement")).toBeNull();

      const addBtn = getByText("Add Bank Account");
      fireEvent.click(addBtn);
      expect(onOpenModal).toHaveBeenCalled();
    });
  });

  describe("BankAccountModal", () => {
    test("validates IFSC code and account number mismatch inline", async () => {
      const onSave = mock(async () => {});
      const onClose = mock();

      render(
        <BankAccountModal
          isOpen={true}
          initialAccount={null}
          isSubmitting={false}
          onClose={onClose}
          onSave={onSave}
        />,
      );

      expect(screen.getByText("Connect Bank Account")).toBeDefined();

      const nameInput = screen.getByTestId("bank-holder-input");
      const phoneInput = screen.getByTestId("bank-phone-input");
      const bankInput = screen.getByTestId("bank-name-input");
      const ifscInput = screen.getByTestId("bank-ifsc-input");
      const accInput = screen.getByTestId("bank-account-number-input");
      const confirmAccInput = screen.getByTestId("confirm-bank-account-number-input");
      const saveBtn = screen.getByTestId("bank-modal-save-btn");

      // Enter mismatched account numbers and invalid IFSC
      fireEvent.change(nameInput, { target: { value: "Test Holder" } });
      fireEvent.change(phoneInput, { target: { value: "9876543210" } });
      fireEvent.change(bankInput, { target: { value: "HDFC Bank" } });
      fireEvent.change(ifscInput, { target: { value: "INVALIDIFSC" } });
      fireEvent.change(accInput, { target: { value: "1234567890" } });
      fireEvent.change(confirmAccInput, { target: { value: "9876543210" } });

      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(
          screen.getByText("Enter a valid 11-character IFSC code (e.g. HDFC0001234)"),
        ).toBeDefined();
        expect(screen.getByText("Account numbers do not match")).toBeDefined();
        expect(onSave).not.toHaveBeenCalled();
      });
    });

    test("submits successfully when bank account form is valid and toggles account type", async () => {
      const onSave = mock(async () => {});
      const onClose = mock();

      render(
        <BankAccountModal
          isOpen={true}
          initialAccount={null}
          isSubmitting={false}
          onClose={onClose}
          onSave={onSave}
        />,
      );

      const nameInput = screen.getByTestId("bank-holder-input");
      const phoneInput = screen.getByTestId("bank-phone-input");
      const bankInput = screen.getByTestId("bank-name-input");
      const ifscInput = screen.getByTestId("bank-ifsc-input");
      const accInput = screen.getByTestId("bank-account-number-input") as HTMLInputElement;
      const confirmAccInput = screen.getByTestId("confirm-bank-account-number-input") as HTMLInputElement;
      const savingOption = screen.getByTestId("account-type-saving");
      const saveBtn = screen.getByTestId("bank-modal-save-btn");

      // Verify inputs are plain text, not password type
      expect(accInput.type).toBe("text");
      expect(confirmAccInput.type).toBe("text");

      // Switch account type to savings
      fireEvent.click(savingOption);

      fireEvent.change(nameInput, { target: { value: "Jane Doe" } });
      fireEvent.change(phoneInput, { target: { value: "9876543210" } });
      fireEvent.change(bankInput, { target: { value: "HDFC Bank" } });
      fireEvent.change(ifscInput, { target: { value: "HDFC0001234" } });
      fireEvent.change(accInput, { target: { value: "123456789012" } });
      fireEvent.change(confirmAccInput, { target: { value: "123456789012" } });

      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({
          accountHolderName: "Jane Doe",
          accountType: "saving",
          phone: "9876543210",
          bankName: "HDFC Bank",
          accountNumber: "123456789012",
          confirmAccountNumber: "123456789012",
          ifscCode: "HDFC0001234",
        });
      });
    });
  });

  describe("FinanceCharts", () => {
    test("renders Revenue & Net Payout Trend and Tier Breakdown without crash", () => {
      const { getByText } = render(
        <FinanceCharts
          dailyRevenueSeries={mockFinanceData.dailyRevenueSeries}
          revenueByTier={mockFinanceData.revenueByTier}
          grossRevenuePaise={250000}
          netOrganizerRevenuePaise={235000}
          platformFeesPaise={15000}
          totalDiscountsPaise={0}
        />,
      );

      expect(getByText("Revenue & Net Payout Trend")).toBeDefined();
      expect(getByText("Revenue by Tier & Fees")).toBeDefined();
      expect(getByText("Retention Breakdown")).toBeDefined();
      expect(getByText("VIP Pass")).toBeDefined();
      expect(getByText("General Pass")).toBeDefined();
    });
  });

  describe("SettlementsTable", () => {
    test("renders Order Transfers and Bank Settlements tabs and switches tabs", async () => {
      const { getByText, queryByText, getAllByText } = render(
        <SettlementsTable
          transfers={mockFinanceData.transfers}
          settlements={mockFinanceData.settlements}
        />,
      );

      // Default active tab is Order Transfers
      expect(getByText(/Order Transfers \(2\)/)).toBeDefined();
      expect(getByText(/Bank Settlements \(1\)/)).toBeDefined();
      expect(getByText("Jane Smith")).toBeDefined();
      expect(getByText("Bob Wilson")).toBeDefined();
      expect(queryByText("UTR123456789")).toBeNull();

      // Switch to Bank Settlements tab
      const settlementsTab = getByText(/Bank Settlements \(1\)/);
      fireEvent.click(settlementsTab);

      await waitFor(() => {
        expect(getByText("UTR123456789")).toBeDefined();
        expect(getByText("setl_rzp_999")).toBeDefined();
        expect(getAllByText("Settled").length).toBeGreaterThanOrEqual(1);
      });
    });

    test("filters rows via search input", async () => {
      const { getByText, queryByText, getByTestId } = render(
        <SettlementsTable
          transfers={mockFinanceData.transfers}
          settlements={mockFinanceData.settlements}
        />,
      );

      const searchInput = getByTestId("finance-table-search-input");
      fireEvent.change(searchInput, { target: { value: "Bob" } });

      await waitFor(() => {
        expect(getByText("Bob Wilson")).toBeDefined();
        expect(queryByText("Jane Smith")).toBeNull();
      });
    });
  });

  describe("FinancePage", () => {
    test("renders 4-card KPI summary grid and loads financial data", async () => {
      const { getByText, getAllByText } = render(<FinancePage />);

      await waitFor(() => {
        expect(mockGetFinance).toHaveBeenCalledWith("evt-test-101");
      });

      // 4 KPI Cards:
      expect(getByText("Net Organizer Revenue")).toBeDefined();
      expect(
        getByText("Unsettled Balance (Refund Pool)"),
      ).toBeDefined();
      expect(getAllByText("Settled to Bank").length).toBeGreaterThanOrEqual(1);
      expect(getByText("Paid Orders & Refunds")).toBeDefined();

      // Check header actions
      expect(getByText("Finance & Payouts")).toBeDefined();
      expect(getByText("Export CSV")).toBeDefined();
      expect(getByText("Bank Settings")).toBeDefined();
    });

    test("opens BankAccountModal when clicking Bank Settings button", async () => {
      const { getByRole, getByTestId } = render(<FinancePage />);

      await waitFor(() => {
        expect(mockGetFinance).toHaveBeenCalledWith("evt-test-101");
      });

      const bankSettingsBtn = getByTestId("bank-settings-btn");
      fireEvent.click(bankSettingsBtn);

      await waitFor(() => {
        expect(getByRole("dialog")).toBeDefined();
        expect(getByTestId("bank-holder-input")).toBeDefined();
      });
    });

    test("triggers export CSV without error", async () => {
      const { getByTestId } = render(<FinancePage />);

      await waitFor(() => {
        expect(mockGetFinance).toHaveBeenCalledWith("evt-test-101");
      });

      const exportBtn = getByTestId("export-csv-btn");
      fireEvent.click(exportBtn);
    });
  });
});
