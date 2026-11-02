export function formatEventDates(startDateStr: string, endDateStr: string) {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  const isValidStart = !isNaN(startDate.getTime());
  const isValidEnd = !isNaN(endDate.getTime());

  if (!isValidStart) {
    return {
      formattedDate: "Date TBA",
      formattedTime: "Time TBA",
      monthShort: "TBA",
      dayNumber: "--",
    };
  }

  const formattedDate = startDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const formattedTime = isValidEnd
    ? `${startDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })} - ${endDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })}`
    : startDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });

  const monthShort = startDate
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase();
  const dayNumber = startDate.getDate().toString();

  return { formattedDate, formattedTime, monthShort, dayNumber };
}

export function formatFriendlyDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
