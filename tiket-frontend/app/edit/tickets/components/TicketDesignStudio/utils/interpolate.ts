export function interpolateSamplePreview(
  text: string,
  ticketName: string,
  eventTitle: string,
): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim().toLowerCase();
    switch (key) {
      case "name":
      case "attendee.name":
      case "attendee_name":
        return "Alex Morgan";
      case "email":
      case "attendee.email":
      case "attendee_email":
        return "alex.morgan@example.com";
      case "ticket_code":
      case "code":
      case "ticket.code":
        return "TIK-9842-X7";
      case "ticket_type":
      case "ticket.type":
      case "tickettype":
        return ticketName || "General Admission";
      case "event_title":
      case "event.title":
      case "title":
        return eventTitle || "Tech Summit 2026";
      default:
        if (key.startsWith("form.")) {
          const field = key.replace("form.", "").toLowerCase();
          if (field.includes("college") || field.includes("university")) {
            return "Stanford University";
          }
          if (field.includes("t-shirt") || field.includes("tshirt")) {
            return "Size L";
          }
          if (field.includes("designation") || field.includes("role")) {
            return "Staff Engineer";
          }
          return "VIP Delegate";
        }
        return "Sample Value";
    }
  });
}

