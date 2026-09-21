import { ManualRegisterPayload } from "@/types/attendee";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateManualRegisterPayload(
  payload: ManualRegisterPayload,
): ValidationResult {
  if (!payload.name || !payload.name.trim()) {
    return { isValid: false, error: "Attendee name is required." };
  }

  if (!payload.email || !payload.email.trim()) {
    return { isValid: false, error: "Attendee email is required." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(payload.email.trim())) {
    return { isValid: false, error: "Please enter a valid email address." };
  }

  if (!payload.ticketTypeId || !payload.ticketTypeId.trim()) {
    return { isValid: false, error: "Please select a ticket type." };
  }

  return { isValid: true };
}
