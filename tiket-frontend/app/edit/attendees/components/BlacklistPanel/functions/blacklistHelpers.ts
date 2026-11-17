import { format, parseISO, isValid } from "date-fns";

export function validatePattern(rawPattern: string): {
  isValid: boolean;
  error?: string;
  normalized: string;
} {
  const trimmed = rawPattern.trim().toLowerCase();
  if (!trimmed) {
    return {
      isValid: false,
      error: "Please enter an email address or domain pattern.",
      normalized: "",
    };
  }

  // Domain pattern: e.g. @example.com or example.com
  if (trimmed.startsWith("@")) {
    const domain = trimmed.slice(1);
    if (!domain.includes(".") || domain.length < 3) {
      return {
        isValid: false,
        error: "Domain pattern must include a valid extension (e.g. @spam.com).",
        normalized: trimmed,
      };
    }
    return { isValid: true, normalized: trimmed };
  }

  // Email pattern: e.g. spammer@gmail.com
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return {
      isValid: false,
      error: "Enter a valid email (user@example.com) or domain starting with @ (@example.com).",
      normalized: trimmed,
    };
  }

  return { isValid: true, normalized: trimmed };
}

export function formatBlockedDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const parsed = parseISO(dateStr);
    if (!isValid(parsed)) return dateStr;
    return format(parsed, "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}
