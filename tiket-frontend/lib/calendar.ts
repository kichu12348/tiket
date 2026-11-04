import type { LocationDetails } from "@/types/ticket";

export interface CalendarEventInput {
  title?: string | null;
  startDate: string | Date;
  endDate?: string | Date | null;
  description?: string | null;
  locationDetails?: LocationDetails | string | null;
  locationType?: "online" | "offline" | "hybrid" | string | null;
  slug?: string | null;
}

function cleanDescription(desc?: string | null): string {
  if (!desc) return "";
  return desc.replace(/<[^>]*>/g, "").trim();
}

function formatLocation(event: CalendarEventInput): string {
  if (event.locationType === "online") {
    if (typeof event.locationDetails === "string" && event.locationDetails.startsWith("http")) {
      return event.locationDetails;
    }
    if (typeof event.locationDetails === "object" && event.locationDetails?.link) {
      return event.locationDetails.link;
    }
    return "Online Event";
  }

  if (typeof event.locationDetails === "string") {
    try {
      const parsed = JSON.parse(event.locationDetails);
      if (parsed && typeof parsed === "object") {
        return [parsed.name, parsed.address, parsed.city, parsed.state, parsed.country]
          .filter(Boolean)
          .join(", ");
      }
    } catch {
      return event.locationDetails.trim();
    }
    return event.locationDetails.trim();
  }

  if (event.locationDetails && typeof event.locationDetails === "object") {
    const parts = [
      event.locationDetails.name,
      event.locationDetails.address,
      event.locationDetails.city,
      event.locationDetails.state,
      event.locationDetails.country,
    ].filter(Boolean);
    return parts.join(", ");
  }

  return "";
}

function formatIcsUtcDate(dateInput: string | Date): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function getEffectiveDates(event: CalendarEventInput): { start: Date; end: Date } {
  const start = typeof event.startDate === "string" ? new Date(event.startDate) : event.startDate;
  const isValidStart = !isNaN(start.getTime());
  const effectiveStart = isValidStart ? start : new Date();

  let end = event.endDate
    ? typeof event.endDate === "string"
      ? new Date(event.endDate)
      : event.endDate
    : null;

  if (!end || isNaN(end.getTime()) || end.getTime() <= effectiveStart.getTime()) {
    end = new Date(effectiveStart.getTime() + 60 * 60 * 1000);
  }

  return { start: effectiveStart, end };
}

export function buildGoogleCalendarUrl(event: CalendarEventInput): string {
  const title = event.title || "Event";
  const { start, end } = getEffectiveDates(event);
  const dates = `${formatIcsUtcDate(start)}/${formatIcsUtcDate(end)}`;
  const description = cleanDescription(event.description);
  const location = formatLocation(event);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates,
    details: description,
    location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcsContent(event: CalendarEventInput): string {
  const title = (event.title || "Event").replace(/\r?\n/g, " ");
  const { start, end } = getEffectiveDates(event);
  const dtStart = formatIcsUtcDate(start);
  const dtEnd = formatIcsUtcDate(end);
  const dtStamp = formatIcsUtcDate(new Date());
  const uid = `${start.getTime()}-${Math.random().toString(36).substring(2, 9)}@tiket.events`;

  const description = cleanDescription(event.description)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

  const location = formatLocation(event)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tiket//Tiket Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcsFile(event: CalendarEventInput): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  const ics = buildIcsContent(event);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeName = (event.slug || event.title || "event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  link.setAttribute("download", `${safeName || "event"}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

