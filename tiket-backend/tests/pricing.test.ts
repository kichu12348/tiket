import { describe, expect, test } from "bun:test";
import { priceCart, type PricingPolicy } from "../src/services/pricing.service";
const zero: PricingPolicy = {
  version: "test",
  ticketTaxBps: 0,
  platformFeeBps: 0,
  platformFeePaise: 0,
  feeTaxBps: 0,
};
describe("integer pricing", () => {
  test("large proportional discounts preserve exact per-line paise", () => {
    const result = priceCart(
      [1000000001, 1000000003, 1000000005].map((unitPricePaise) => ({
        ticketTypeId: "a",
        unitPricePaise,
      })),
      zero,
      { kind: "fixed", value: 2000000000, ticketTypeIds: [] },
    );
    expect(result.lines.map((line) => line.discountPaise)).toEqual([
      666666666, 666666667, 666666667,
    ]);
    expect(result.totalPaise).toBe(1000000009);
  });
  test("fixed discounts distribute exact paise across eligible tickets", () => {
    const result = priceCart(
      [
        { ticketTypeId: "a", unitPricePaise: 101 },
        { ticketTypeId: "a", unitPricePaise: 101 },
        { ticketTypeId: "b", unitPricePaise: 200 },
      ],
      zero,
      { kind: "fixed", value: 51, ticketTypeIds: ["a"] },
    );
    expect(result.totalPaise).toBe(351);
    expect(result.lines.map((line) => line.discountPaise)).toEqual([26, 25, 0]);
  });
  test("taxes and platform fee snapshots round once per line", () => {
    const result = priceCart(
      [{ ticketTypeId: "a", unitPricePaise: 10000 }],
      {
        ...zero,
        ticketTaxBps: 1800,
        platformFeeBps: 200,
        platformFeePaise: 100,
        feeTaxBps: 1800,
      },
      { kind: "percent", value: 1000, ticketTypeIds: [] },
    );
    expect(result.lines[0]).toMatchObject({
      discountPaise: 1000,
      ticketTaxPaise: 1620,
      platformFeePaise: 280,
      feeTaxPaise: 50,
      totalPaise: 10950,
    });
  });
  test("a fully discounted ticket stays free under the fee policy", () => {
    expect(
      priceCart(
        [{ ticketTypeId: "a", unitPricePaise: 100 }],
        { ...zero, platformFeePaise: 100 },
        { kind: "fixed", value: 200, ticketTypeIds: [] },
      ).totalPaise,
    ).toBe(0);
  });
  test("single ticket with platformFeeBps = 400 and passFeeToCustomer = true", () => {
    const policy: PricingPolicy = { ...zero, platformFeeBps: 400 };
    const result = priceCart(
      [{ ticketTypeId: "a", unitPricePaise: 10000, passFeeToCustomer: true }],
      policy,
    );
    expect(result.totalPaise).toBe(10400);
    expect(result.customerFeePaise).toBe(400);
    expect(result.absorbedFeePaise).toBe(0);
    expect(result.lines[0]).toMatchObject({
      unitPricePaise: 10000,
      platformFeePaise: 400,
      totalPaise: 10400,
      organizerNetPaise: 10000,
      passFeeToCustomer: true,
    });
  });
  test("single ticket with platformFeeBps = 400 and passFeeToCustomer = false", () => {
    const policy: PricingPolicy = { ...zero, platformFeeBps: 400 };
    const result = priceCart(
      [{ ticketTypeId: "a", unitPricePaise: 10000, passFeeToCustomer: false }],
      policy,
    );
    expect(result.totalPaise).toBe(10000);
    expect(result.customerFeePaise).toBe(0);
    expect(result.absorbedFeePaise).toBe(400);
    expect(result.lines[0]).toMatchObject({
      unitPricePaise: 10000,
      platformFeePaise: 400,
      totalPaise: 10000,
      organizerNetPaise: 9600,
      passFeeToCustomer: false,
    });
  });
  test("mixed cart with 1 passed fee ticket and 1 absorbed fee ticket", () => {
    const policy: PricingPolicy = { ...zero, platformFeeBps: 400 };
    const result = priceCart(
      [
        { ticketTypeId: "a", unitPricePaise: 10000, passFeeToCustomer: true },
        { ticketTypeId: "b", unitPricePaise: 10000, passFeeToCustomer: false },
      ],
      policy,
    );
    expect(result.totalPaise).toBe(20400);
    expect(result.customerFeePaise).toBe(400);
    expect(result.absorbedFeePaise).toBe(400);
    const totalPlatformFeePaise =
      result.lines[0]!.platformFeePaise + result.lines[1]!.platformFeePaise;
    expect(totalPlatformFeePaise).toBe(800);
    const totalOrganizerNetPaise =
      result.lines[0]!.organizerNetPaise + result.lines[1]!.organizerNetPaise;
    expect(totalOrganizerNetPaise).toBe(19600);
  });
});
