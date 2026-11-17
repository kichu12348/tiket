import type { Coupon } from "@/types/commerce";

export interface CouponFormValues {
  code: string;
  kind: "percent" | "fixed";
  discountValue: string;
  maxUses: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  ticketTypeIds: string[];
}

export const DEFAULT_FORM_VALUES: CouponFormValues = {
  code: "",
  kind: "percent",
  discountValue: "",
  maxUses: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
  ticketTypeIds: [],
};

/**
 * Initializes form values for creating or editing a coupon.
 */
export function getInitialFormValues(
  coupon?: Coupon | null,
): CouponFormValues {
  if (!coupon) {
    return { ...DEFAULT_FORM_VALUES };
  }

  const resolvedKind = coupon.kind === "fixed" ? "fixed" : "percent";
  let displayVal = "";
  if (resolvedKind === "percent") {
    displayVal =
      coupon.value > 100
        ? (coupon.value / 100).toString()
        : coupon.value.toString();
  } else {
    displayVal =
      coupon.value >= 100
        ? (coupon.value / 100).toString()
        : coupon.value.toString();
  }

  return {
    code: coupon.code,
    kind: resolvedKind,
    discountValue: displayVal,
    maxUses: coupon.maxUses ? coupon.maxUses.toString() : "",
    startsAt: coupon.startsAt || "",
    endsAt: coupon.endsAt || "",
    isActive: coupon.isActive,
    ticketTypeIds: Array.isArray(coupon.ticketTypeIds)
      ? [...coupon.ticketTypeIds]
      : [],
  };
}

/**
 * Validates form values and builds a Coupon payload.
 * Converts percentage to basis points (e.g. 20 -> 2000) and fixed currency to paise (e.g. 100 -> 10000).
 */
export function validateAndBuildCouponPayload(
  values: CouponFormValues,
  editingCoupon?: Coupon | null,
): { error?: string; payload?: Coupon } {
  const trimmedCode = values.code.trim().toUpperCase();
  if (!trimmedCode) {
    return { error: "Coupon code is required." };
  }

  const numValue = Number(values.discountValue);
  if (isNaN(numValue) || numValue <= 0) {
    return { error: "Please enter a valid discount value." };
  }

  let calculatedValue = 0;
  if (values.kind === "percent") {
    if (numValue > 100) {
      return { error: "Percentage discount cannot exceed 100%." };
    }
    calculatedValue = Math.round(numValue * 100); // Basis points
  } else {
    calculatedValue = Math.round(numValue * 100); // Paise
  }

  if (
    values.startsAt &&
    values.endsAt &&
    new Date(values.startsAt) >= new Date(values.endsAt)
  ) {
    return { error: "Valid from date must be before valid until date." };
  }

  const parsedMaxUses = values.maxUses.trim()
    ? parseInt(values.maxUses, 10)
    : null;
  if (
    parsedMaxUses !== null &&
    (isNaN(parsedMaxUses) || parsedMaxUses <= 0)
  ) {
    return { error: "Usage limit must be a positive number." };
  }

  const payload: Coupon = {
    code: trimmedCode,
    kind: values.kind,
    value: calculatedValue,
    ticketTypeIds: Array.isArray(values.ticketTypeIds)
      ? values.ticketTypeIds
      : editingCoupon?.ticketTypeIds || [],
    maxUses: parsedMaxUses,
    startsAt: values.startsAt || null,
    endsAt: values.endsAt || null,
    isActive: values.isActive,
  };

  return { payload };
}
