import type { Event } from "@/types/event";

export interface StudioEventMetadata {
  eventTitle: string;
  timezone: string;
  eventCapacityDisplay: string | number;
  directTicketUrl: string;
}

/**
 * Computes display metadata, timezone fallback, and direct ticket URL.
 */
export function getStudioEventMetadata(
  event: Event | null,
  activeTicketId?: string | null,
): StudioEventMetadata {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const eventSlug = event?.slug || "event";
  const directTicketUrl = activeTicketId
    ? `${origin}/${eventSlug}?ticket_id=${activeTicketId}`
    : "";

  const eventTitle = event?.title || "Tech Summit 2026";
  const timezone =
    event?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const eventCapacityDisplay =
    typeof event?.capacity === "number" && event.capacity > 0
      ? event.capacity
      : "Unlimited";

  return {
    eventTitle,
    timezone,
    eventCapacityDisplay,
    directTicketUrl,
  };
}
