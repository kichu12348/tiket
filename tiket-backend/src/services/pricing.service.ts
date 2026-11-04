import { HttpError } from "../utils/errors";

export interface PricingPolicy {
  version: string;
  ticketTaxBps: number;
  platformFeeBps: number;
  platformFeePaise: number;
  feeTaxBps: number;
}
export interface Discount {
  kind: "percent" | "fixed" | "access";
  value: number;
  ticketTypeIds: string[];
}
export function pricingPolicy(eventPlatformFeeBps?: number): PricingPolicy {
  const integer = (key: string, max: number) => {
    const value = Number(process.env[key] || 0);
    if (!Number.isInteger(value) || value < 0 || value > max)
      throw new Error(`Invalid ${key}`);
    return value;
  };
  const envFeeBps = integer("PLATFORM_FEE_BPS", 10000);
  const platformFeeBps =
    eventPlatformFeeBps !== undefined ? eventPlatformFeeBps : envFeeBps;

  return {
    version: process.env.PRICING_POLICY_VERSION || "zero-v1",
    ticketTaxBps: integer("TICKET_TAX_BPS", 10000),
    platformFeeBps,
    platformFeePaise: integer("PLATFORM_FEE_PAISE", 100000),
    feeTaxBps: integer("FEE_TAX_BPS", 10000),
  };
}
export function priceCart(
  items: {
    ticketTypeId: string;
    unitPricePaise: number;
    passFeeToCustomer?: boolean;
  }[],
  policy: PricingPolicy,
  coupon?: Discount,
) {
  const eligible = items.map(
    (item) =>
      !coupon?.ticketTypeIds.length ||
      coupon.ticketTypeIds.includes(item.ticketTypeId),
  );
  const base = items.reduce(
    (sum, item, i) => sum + (eligible[i] ? item.unitPricePaise : 0),
    0,
  );
  let remaining =
    coupon?.kind === "percent"
      ? Math.floor((base * coupon.value) / 10000)
      : coupon?.kind === "fixed"
        ? Math.min(base, coupon.value)
        : 0;
  if (remaining < 0 || remaining > base)
    throw new HttpError(400, "Invalid discount.");
  const discounts = items.map((item, i) =>
    eligible[i] && base
      ? Number((BigInt(remaining) * BigInt(item.unitPricePaise)) / BigInt(base))
      : 0,
  );
  remaining -= discounts.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length && remaining; i++)
    if (eligible[i] && items[i]!.unitPricePaise > discounts[i]!) {
      discounts[i]!++;
      remaining--;
    }
  const lines = items.map((item, i) => {
    const discountPaise = discounts[i]!;
    const passFeeToCustomer = item.passFeeToCustomer ?? true;
    const net = item.unitPricePaise - discountPaise;
    const ticketTaxPaise = Math.round((net * policy.ticketTaxBps) / 10000);
    const rawPlatformFee =
      net > 0
        ? Math.round((net * policy.platformFeeBps) / 10000) +
          policy.platformFeePaise
        : 0;
    const platformFeePaise = passFeeToCustomer
      ? rawPlatformFee
      : Math.min(net, rawPlatformFee);
    const feeTaxPaise = Math.round(
      (platformFeePaise * policy.feeTaxBps) / 10000,
    );
    const totalPaise = passFeeToCustomer
      ? net + ticketTaxPaise + platformFeePaise + feeTaxPaise
      : net + ticketTaxPaise;
    const organizerNetPaise = passFeeToCustomer
      ? net
      : Math.max(0, net - platformFeePaise - feeTaxPaise);

    return {
      ...item,
      passFeeToCustomer,
      discountPaise,
      ticketTaxPaise,
      platformFeePaise,
      feeTaxPaise,
      totalPaise,
      organizerNetPaise,
    };
  });
  const totalPaise = lines.reduce((sum, line) => sum + line.totalPaise, 0);
  if (!Number.isSafeInteger(totalPaise) || totalPaise > 2_000_000_000)
    throw new HttpError(400, "Order amount exceeds the supported limit.");
  const customerFeePaise = lines
    .filter((l) => l.passFeeToCustomer)
    .reduce((sum, l) => sum + l.platformFeePaise + l.feeTaxPaise, 0);
  const absorbedFeePaise = lines
    .filter((l) => !l.passFeeToCustomer)
    .reduce((sum, l) => sum + l.platformFeePaise + l.feeTaxPaise, 0);
  return { lines, totalPaise, customerFeePaise, absorbedFeePaise };
}
