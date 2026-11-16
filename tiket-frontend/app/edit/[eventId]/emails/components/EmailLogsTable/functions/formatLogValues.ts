export const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  confirmation: "Confirmation",
  checkin: "Check-in",
  invitation: "Invitation",
  thank_you: "Thank You",
  sorry: "Sorry",
  custom: "Custom",
};

export function getTemplateTypeLabel(type?: string | null): string {
  if (!type) return "Custom";
  return TEMPLATE_TYPE_LABELS[type] || type;
}

export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTimeOnly(isoString?: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
