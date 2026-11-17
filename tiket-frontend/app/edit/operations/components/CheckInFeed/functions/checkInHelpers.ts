import type { OperationsAttendee } from "@/types/operations";

export type StatusFilterType =
  | "all"
  | "checked_in"
  | "checked_in_today"
  | "not_checked_in";

export function isCheckedInToday(attendee: OperationsAttendee): boolean {
  if (typeof attendee.checkedInToday === "boolean") {
    return attendee.checkedInToday;
  }
  if (attendee.checkedInAt) {
    const today = new Date().toISOString().slice(0, 10);
    return attendee.checkedInAt.slice(0, 10) === today;
  }
  return attendee.status === "used";
}

export function getCheckInCount(attendee: OperationsAttendee): number {
  if (typeof attendee.checkInCount === "number") {
    return attendee.checkInCount;
  }
  return attendee.checkedInAt || attendee.status === "used" ? 1 : 0;
}

export function getTierName(attendee: OperationsAttendee): string {
  if (attendee.ticketName) {
    return attendee.ticketName;
  }
  const raw = attendee as { ticketType?: { name?: string } };
  return raw.ticketType?.name || "Standard";
}

export function filterAttendees(
  attendees: OperationsAttendee[],
  searchQuery: string,
  filter: StatusFilterType,
): OperationsAttendee[] {
  const query = searchQuery.trim().toLowerCase();

  return attendees.filter((attendee) => {
    // 1. Filter by Status
    const todayChecked = isCheckedInToday(attendee);
    const count = getCheckInCount(attendee);
    const hasAnyCheckIn = count > 0 || todayChecked || attendee.status === "used";

    if (filter === "checked_in" && !hasAnyCheckIn) {
      return false;
    }
    if (filter === "checked_in_today" && !todayChecked) {
      return false;
    }
    if (filter === "not_checked_in" && hasAnyCheckIn) {
      return false;
    }

    // 2. Filter by Search Query (name, email, or qr code)
    if (query) {
      const name = attendee.user?.name?.toLowerCase() || "";
      const email = attendee.user?.email?.toLowerCase() || "";
      const code = (attendee.qrCode || attendee.id).toLowerCase();

      return (
        name.includes(query) || email.includes(query) || code.includes(query)
      );
    }

    return true;
  });
}
