import { describe, expect, test } from "bun:test";
import {
  validateIfscCode,
  validateAccountNumber,
  maskAccountNumber,
  calculateFinanceSummary,
} from "../src/controllers/commerce.controller";
import type { Database } from "../src/db/types";
import { orders, orderItems, refunds, payoutRequests } from "../src/db/schema";

describe("Finance & Payouts Backend Logic", () => {
  describe("1. IFSC & Account Number Validation", () => {
    test("validates standard Indian IFSC codes (4 letters, 0, 6 alphanumeric)", () => {
      expect(validateIfscCode("HDFC0001234")).toBe(true);
      expect(validateIfscCode("SBIN0000456")).toBe(true);
      expect(validateIfscCode("ICIC0000001")).toBe(true);
      expect(validateIfscCode("KKBK0008080")).toBe(true);
      expect(validateIfscCode("hdfc0001234")).toBe(true); // Case-insensitive normalization
      expect(validateIfscCode("  SBIN0000456  ")).toBe(true); // Trimming
    });

    test("rejects malformed IFSC codes", () => {
      expect(validateIfscCode("")).toBe(false);
      expect(validateIfscCode("123")).toBe(false);
      expect(validateIfscCode("HDFC1234567")).toBe(false); // 5th character must be 0
      expect(validateIfscCode("HDF00001234")).toBe(false); // Only 3 bank letters
      expect(validateIfscCode("HDFCC0001234")).toBe(false); // 5 bank letters
      expect(validateIfscCode("HDFC00012345")).toBe(false); // 12 characters (too long)
      expect(validateIfscCode("HDFC000123")).toBe(false); // 10 characters (too short)
      expect(validateIfscCode("HDFC@001234")).toBe(false); // Special character
    });

    test("validates numeric bank account numbers between 6 and 20 digits", () => {
      expect(validateAccountNumber("123456")).toBe(true); // 6 digits (min)
      expect(validateAccountNumber("12345678901234")).toBe(true); // Typical 14 digits
      expect(validateAccountNumber("12345678901234567890")).toBe(true); // 20 digits (max)
      expect(validateAccountNumber("  50100234567890  ")).toBe(true); // Trimming
    });

    test("rejects invalid bank account numbers", () => {
      expect(validateAccountNumber("")).toBe(false);
      expect(validateAccountNumber("12345")).toBe(false); // 5 digits (too short)
      expect(validateAccountNumber("123456789012345678901")).toBe(false); // 21 digits (too long)
      expect(validateAccountNumber("12345A67890")).toBe(false); // Alphanumeric
      expect(validateAccountNumber("1234-5678-90")).toBe(false); // Dashes
      expect(validateAccountNumber("123 456 789")).toBe(false); // Spaces inside
    });

    test("masks account number correctly preserving last 4 digits", () => {
      expect(maskAccountNumber("1234567890")).toBe("••••••7890");
      expect(maskAccountNumber("50100234567890")).toBe("••••••••••7890");
      expect(maskAccountNumber("1234")).toBe("1234");
      expect(maskAccountNumber("123")).toBe("123");
    });
  });

  describe("2. calculateFinanceSummary ledger calculations", () => {
    interface MockData {
      orders: { id: string; eventId: string; paymentStatus: string; totalPaise: number }[];
      orderItems: {
        orderId: string;
        unitPricePaise: number;
        discountPaise: number;
        platformFeePaise: number;
        ticketTaxPaise: number;
        feeTaxPaise: number;
      }[];
      refunds: { orderId: string; amountPaise: number; status: string }[];
      payoutRequests: { eventId: string; amountPaise: number; status: string }[];
    }

    function createMockExecutor(data: MockData): Database {
      return {
        select: (_fields?: unknown) => ({
          from: (table: unknown) => ({
            where: (_cond: unknown) => {
              if (table === orders) {
                return data.orders.filter(
                  (o) =>
                    ["success", "partially_refunded", "refunded"].includes(
                      o.paymentStatus,
                    ),
                );
              }
              if (table === orderItems) {
                const paidIds = data.orders
                  .filter((o) =>
                    ["success", "partially_refunded", "refunded"].includes(
                      o.paymentStatus,
                    ),
                  )
                  .map((o) => o.id);
                return data.orderItems.filter((item) =>
                  paidIds.includes(item.orderId),
                );
              }
              if (table === refunds) {
                return data.refunds.filter((r) =>
                  ["requested", "processing", "uncertain", "processed"].includes(
                    r.status,
                  ),
                );
              }
              if (table === payoutRequests) {
                return data.payoutRequests.filter((p) =>
                  ["requested", "processing", "paid"].includes(p.status),
                );
              }
              return [];
            },
          }),
        }),
      } as unknown as Database;
    }

    test("calculates full balance when there are sales and zero deductions", async () => {
      const mockData: MockData = {
        orders: [
          { id: "ord-1", eventId: "evt-1", paymentStatus: "success", totalPaise: 50000 },
          { id: "ord-2", eventId: "evt-1", paymentStatus: "success", totalPaise: 150000 },
        ],
        orderItems: [
          {
            orderId: "ord-1",
            unitPricePaise: 50000,
            discountPaise: 0,
            platformFeePaise: 0,
            ticketTaxPaise: 0,
            feeTaxPaise: 0,
          },
          {
            orderId: "ord-2",
            unitPricePaise: 150000,
            discountPaise: 0,
            platformFeePaise: 0,
            ticketTaxPaise: 0,
            feeTaxPaise: 0,
          },
        ],
        refunds: [],
        payoutRequests: [],
      };

      const summary = await calculateFinanceSummary(createMockExecutor(mockData), "evt-1");

      expect(summary.grossSalesPaise).toBe(200000);
      expect(summary.totalDiscountsPaise).toBe(0);
      expect(summary.platformFeesPaise).toBe(0);
      expect(summary.taxesPaise).toBe(0);
      expect(summary.totalRefundedPaise).toBe(0);
      expect(summary.netEarningsPaise).toBe(200000);
      expect(summary.withdrawnOrPendingPaise).toBe(0);
      expect(summary.availableToWithdrawPaise).toBe(200000);
    });

    test("accurately calculates availableToWithdrawPaise after ticket sales and partial refunds", async () => {
      const mockData: MockData = {
        orders: [
          { id: "ord-1", eventId: "evt-1", paymentStatus: "partially_refunded", totalPaise: 100000 },
        ],
        orderItems: [
          {
            orderId: "ord-1",
            unitPricePaise: 100000, // ₹1,000.00
            discountPaise: 0,
            platformFeePaise: 2500, // ₹25.00
            ticketTaxPaise: 1800,  // ₹18.00
            feeTaxPaise: 450,      // ₹4.50
          },
        ],
        refunds: [
          { orderId: "ord-1", amountPaise: 35000, status: "processed" }, // ₹350.00 partial refund
        ],
        payoutRequests: [],
      };

      const summary = await calculateFinanceSummary(createMockExecutor(mockData), "evt-1");

      expect(summary.grossSalesPaise).toBe(100000);
      expect(summary.platformFeesPaise).toBe(2500);
      expect(summary.taxesPaise).toBe(2250);
      expect(summary.totalRefundedPaise).toBe(35000);
      // Net earnings = grossSales (100000) - discounts (0) - refunds (35000) = 65000
      expect(summary.netEarningsPaise).toBe(65000);
      expect(summary.withdrawnOrPendingPaise).toBe(0);
      expect(summary.availableToWithdrawPaise).toBe(65000);
    });

    test("deducts active payouts (requested/processing/paid) from available balance", async () => {
      const mockData: MockData = {
        orders: [
          { id: "ord-1", eventId: "evt-1", paymentStatus: "success", totalPaise: 100000 },
        ],
        orderItems: [
          {
            orderId: "ord-1",
            unitPricePaise: 100000,
            discountPaise: 0,
            platformFeePaise: 0,
            ticketTaxPaise: 0,
            feeTaxPaise: 0,
          },
        ],
        refunds: [],
        payoutRequests: [
          { eventId: "evt-1", amountPaise: 40000, status: "paid" },
          { eventId: "evt-1", amountPaise: 20000, status: "processing" },
          { eventId: "evt-1", amountPaise: 10000, status: "requested" },
          { eventId: "evt-1", amountPaise: 15000, status: "rejected" }, // Should be ignored
        ],
      };

      const summary = await calculateFinanceSummary(createMockExecutor(mockData), "evt-1");

      expect(summary.grossSalesPaise).toBe(100000);
      expect(summary.netEarningsPaise).toBe(100000);
      // 40000 + 20000 + 10000 = 70000 (rejected 15000 is excluded)
      expect(summary.withdrawnOrPendingPaise).toBe(70000);
      // Available to withdraw: 100000 - 70000 = 30000
      expect(summary.availableToWithdrawPaise).toBe(30000);
    });

    test("prevents over-withdrawal when requested amount exceeds available balance", async () => {
      const mockData: MockData = {
        orders: [
          { id: "ord-1", eventId: "evt-1", paymentStatus: "success", totalPaise: 50000 },
        ],
        orderItems: [
          {
            orderId: "ord-1",
            unitPricePaise: 50000,
            discountPaise: 0,
            platformFeePaise: 0,
            ticketTaxPaise: 0,
            feeTaxPaise: 0,
          },
        ],
        refunds: [
          { orderId: "ord-1", amountPaise: 20000, status: "processed" },
        ],
        payoutRequests: [
          { eventId: "evt-1", amountPaise: 25000, status: "requested" },
        ],
      };

      const summary = await calculateFinanceSummary(createMockExecutor(mockData), "evt-1");

      // Net earnings = 50000 - 20000 = 30000
      // Withdrawn = 25000
      // Available = 5000
      expect(summary.availableToWithdrawPaise).toBe(5000);

      const requestedWithdrawal = 5001; // 1 paise over available balance
      const isAllowed = requestedWithdrawal <= summary.availableToWithdrawPaise;
      expect(isAllowed).toBe(false);
    });

    test("handles discounts correctly in gross and net calculations", async () => {
      const mockData: MockData = {
        orders: [
          { id: "ord-1", eventId: "evt-1", paymentStatus: "success", totalPaise: 80000 },
        ],
        orderItems: [
          {
            orderId: "ord-1",
            unitPricePaise: 100000, // ₹1,000.00
            discountPaise: 20000,  // ₹200.00 discount
            platformFeePaise: 0,
            ticketTaxPaise: 0,
            feeTaxPaise: 0,
          },
        ],
        refunds: [],
        payoutRequests: [],
      };

      const summary = await calculateFinanceSummary(createMockExecutor(mockData), "evt-1");

      expect(summary.grossSalesPaise).toBe(100000);
      expect(summary.totalDiscountsPaise).toBe(20000);
      expect(summary.netEarningsPaise).toBe(80000);
      expect(summary.availableToWithdrawPaise).toBe(80000);
    });
  });
});

