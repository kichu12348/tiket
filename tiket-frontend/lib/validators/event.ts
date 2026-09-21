export interface EventValidationData {
  title: string;
  startDate: string;
  endDate: string;
  regStartDate: string;
  regEndDate: string;
  capacity?: string | number | null;
}

export const validateEventPayload = (data: EventValidationData): string | null => {
  if (!data.title.trim()) {
    return "Event title is required.";
  }

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  if (end <= start) {
    return "Event end date must be after the start date.";
  }

  const rStart = new Date(data.regStartDate);
  const rEnd = new Date(data.regEndDate);
  if (rEnd <= rStart) {
    return "Registration end date must be after the registration start date.";
  }

  if (rEnd > end) {
    return "Registration cannot end after the event has ended.";
  }

  if (data.capacity) {
    const parsedCapacity = typeof data.capacity === 'string' ? parseInt(data.capacity, 10) : data.capacity;
    if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
      return "Capacity must be a valid number greater than 0.";
    }
  }

  return null; // Valid
};
