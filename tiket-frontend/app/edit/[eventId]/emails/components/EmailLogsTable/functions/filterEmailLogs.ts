import type { EmailLog } from "@/types/email";

export type EmailLogStatusFilter = "all" | "opened" | "unopened" | "failed";

export function filterEmailLogs(
  logs: EmailLog[],
  statusFilter: EmailLogStatusFilter,
  typeFilter: string,
  searchQuery: string,
): EmailLog[] {
  const query = searchQuery.trim().toLowerCase();

  return logs.filter((log) => {
    // 1. Status filter
    if (statusFilter === "opened") {
      const isOpened =
        (log.openCount !== undefined && log.openCount > 0) ||
        Boolean(log.openedAt);
      if (!isOpened) return false;
    } else if (statusFilter === "unopened") {
      const isOpened =
        (log.openCount !== undefined && log.openCount > 0) ||
        Boolean(log.openedAt);
      if (isOpened || log.status !== "sent") return false;
    } else if (statusFilter === "failed") {
      if (log.status !== "failed") return false;
    }

    // 2. Type filter
    if (typeFilter !== "all") {
      const currentType = log.templateType || "custom";
      if (currentType !== typeFilter) return false;
    }

    // 3. Search query
    if (query) {
      const matchesEmail = log.recipientEmail.toLowerCase().includes(query);
      const matchesName = (log.recipientName || "").toLowerCase().includes(query);
      const matchesSubject = log.subject.toLowerCase().includes(query);
      if (!matchesEmail && !matchesName && !matchesSubject) return false;
    }

    return true;
  });
}
