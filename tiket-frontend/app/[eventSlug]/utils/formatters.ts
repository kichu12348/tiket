export function formatEventDates(startDateStr: string, endDateStr: string) {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  const formattedDate = startDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const formattedTime = `${startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })} - ${endDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;

  const monthShort = startDate
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase();
  const dayNumber = startDate.getDate().toString();

  return { formattedDate, formattedTime, monthShort, dayNumber };
}
