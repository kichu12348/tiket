import { format } from "date-fns";

import type { Coupon } from "@/types/commerce";

/**
 * Formats a coupon discount label for display in the table.
 * Percent value in basis points (e.g. 2000 -> 20%) or direct (20 -> 20%).
 * Fixed value in paise (e.g. 10000 -> ₹100) or direct.
 */
export function formatDiscountLabel(
  kind: Coupon["kind"],
  value: number,
): string {
  if (kind === "percent") {
    const displayVal = value > 100 ? Math.round(value / 100) : value;
    return `${displayVal}% OFF`;
  }

  if (kind === "fixed") {
    const displayVal =
      value >= 100 ? (value / 100).toFixed(0) : value.toString();
    return `₹${displayVal} OFF`;
  }

  return "Access Pass";
}

export interface UsageDisplayInfo {
  used: number;
  hasLimit: boolean;
  limit: number | null;
  isFull: boolean;
  percent: number;
}

/**
 * Calculates usage information for table rendering.
 */
export function calculateUsageDisplay(
  usedCount: number = 0,
  maxUses?: number | null,
): UsageDisplayInfo {
  const used = Math.max(0, usedCount);
  const hasLimit = typeof maxUses === "number" && maxUses > 0;
  const limit = hasLimit ? maxUses : null;
  const isFull = hasLimit && used >= maxUses;
  const percent = hasLimit
    ? Math.min(100, Math.max(0, Math.round((used / maxUses) * 100)))
    : 0;

  return {
    used,
    hasLimit,
    limit,
    isFull,
    percent,
  };
}

/**
 * Backwards-compatible calculation for usage progress.
 */
export function calculateUsageProgress(
  usedCount: number = 0,
  maxUses?: number | null,
): { used: number; maxLabel: string; percent: number } {
  const { used, limit, percent } = calculateUsageDisplay(usedCount, maxUses);
  return {
    used,
    maxLabel: limit !== null ? `/ ${limit}` : "/ ∞",
    percent,
  };
}

export interface ExpiryDisplayInfo {
  kind: "no_expiry" | "future_start" | "expired" | "active";
  dateText: string;
  subtext?: string;
  isDimmed: boolean;
  urgency: "normal" | "amber" | "danger";
}

/**
 * Computes date display and relative status in the user's local timezone.
 */
export function getExpiryDisplayInfo(
  endsAt?: string | null,
  startsAt?: string | null,
  now: Date = new Date(),
): ExpiryDisplayInfo {
  // 1. If start date is in the future, show "Starts {date}" in muted text
  if (startsAt) {
    const startDate = new Date(startsAt);
    if (!isNaN(startDate.getTime()) && startDate.getTime() > now.getTime()) {
      return {
        kind: "future_start",
        dateText: `Starts ${format(startDate, "MMM d, yyyy")}`,
        isDimmed: true,
        urgency: "normal",
      };
    }
  }

  // 2. If there's no expiry date, show "No expiry" in muted text
  if (!endsAt) {
    return {
      kind: "no_expiry",
      dateText: "No expiry",
      isDimmed: true,
      urgency: "normal",
    };
  }

  const endDate = new Date(endsAt);
  if (isNaN(endDate.getTime())) {
    return {
      kind: "no_expiry",
      dateText: "No expiry",
      isDimmed: true,
      urgency: "normal",
    };
  }

  const dateFormatted = format(endDate, "MMM d, yyyy");
  const isPast = endDate.getTime() < now.getTime();

  // 3. If already past, show "Expired" in red and dim the date
  if (isPast) {
    return {
      kind: "expired",
      dateText: dateFormatted,
      subtext: "Expired",
      isDimmed: true,
      urgency: "danger",
    };
  }

  // 4. Compute relative time in user's local timezone
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
  );
  const diffDays = Math.round(
    (targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  let relativeDay = "";
  if (diffDays === 0) {
    relativeDay = "Today";
  } else if (diffDays === 1) {
    relativeDay = "Tomorrow";
  } else if (diffDays >= 2 && diffDays <= 14) {
    relativeDay = `in ${diffDays} days`;
  }

  const timeStr = format(endDate, "h:mm a");
  const subtext = relativeDay ? `${relativeDay}, ${timeStr}` : timeStr;
  const urgency = diffDays <= 3 ? "amber" : "normal";

  return {
    kind: "active",
    dateText: dateFormatted,
    subtext,
    isDimmed: false,
    urgency,
  };
}

/**
 * Formats coupon expiration date or returns fallback text.
 */
export function formatExpiryDate(endsAt?: string | null): string {
  if (!endsAt) return "No expiry";
  try {
    return format(new Date(endsAt), "MMM d, yyyy");
  } catch {
    return "Invalid Date";
  }
}
