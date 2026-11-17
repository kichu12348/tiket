import type { OperationsAttendee } from "@/types/operations";

/**
 * Extract 2-letter initials from a user's name.
 */
export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Format ISO date string into readable short date & time.
 */
export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/**
 * Resolve ticket tier display name from attendee payload.
 */
export function getAttendeeTierName(attendee: OperationsAttendee): string {
  if (attendee.ticketName && attendee.ticketName.trim()) {
    return attendee.ticketName;
  }
  const extended = attendee as {
    ticketType?: { name?: string };
  };
  if (extended.ticketType?.name && extended.ticketType.name.trim()) {
    return extended.ticketType.name;
  }
  return "Standard Tier";
}
