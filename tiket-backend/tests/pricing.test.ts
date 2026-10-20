import { describe, expect, test } from "bun:test";
import { priceCart, type PricingPolicy } from "../src/services/pricing.service";
const zero: PricingPolicy = { version: "test", ticketTaxBps: 0, platformFeeBps: 0, platformFeePaise: 0, feeTaxBps: 0 };
describe("integer pricing", () => {
  test("large proportional discounts preserve exact per-line paise", () => {
    const result = priceCart([1000000001, 1000000003, 1000000005].map(unitPricePaise => ({ ticketTypeId: "a", unitPricePaise })), zero, { kind: "fixed", value: 2000000000, ticketTypeIds: [] });
    expect(result.lines.map(line => line.discountPaise)).toEqual([666666666, 666666667, 666666667]);
    expect(result.totalPaise).toBe(1000000009);
  });
  test("fixed discounts distribute exact paise across eligible tickets", () => {
    const result = priceCart([{ ticketTypeId: "a", unitPricePaise: 101 }, { ticketTypeId: "a", unitPricePaise: 101 }, { ticketTypeId: "b", unitPricePaise: 200 }], zero, { kind: "fixed", value: 51, ticketTypeIds: ["a"] });
    expect(result.totalPaise).toBe(351); expect(result.lines.map(line => line.discountPaise)).toEqual([26, 25, 0]);
  });
  test("taxes and platform fee snapshots round once per line", () => {
    const result = priceCart([{ ticketTypeId: "a", unitPricePaise: 10000 }], { ...zero, ticketTaxBps: 1800, platformFeeBps: 200, platformFeePaise: 100, feeTaxBps: 1800 }, { kind: "percent", value: 1000, ticketTypeIds: [] });
    expect(result.lines[0]).toMatchObject({ discountPaise: 1000, ticketTaxPaise: 1620, platformFeePaise: 280, feeTaxPaise: 50, totalPaise: 10950 });
  });
  test("a fully discounted ticket stays free under the fee policy", () => {
    expect(priceCart([{ ticketTypeId: "a", unitPricePaise: 100 }], { ...zero, platformFeePaise: 100 }, { kind: "fixed", value: 200, ticketTypeIds: [] }).totalPaise).toBe(0);
  });
});
