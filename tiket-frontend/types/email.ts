export type EmailTemplateType =
  "invitation" | "confirmation" | "checkin" | "thank_you" | "sorry" | "custom";

export interface EmailDocumentMark {
  type: string;
  attrs?: Record<string, string | number | boolean | null>;
}

export interface EmailDocumentNode {
  type: string;
  attrs?: Record<string, string | number | boolean | null>;
  content?: EmailDocumentNode[];
  text?: string;
  marks?: EmailDocumentMark[];
}

export interface EmailTemplate {
  id: string;
  eventId: string;
  name: string;
  type: EmailTemplateType;
  subject?: string;
  body?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VariableItem {
  key: string;
  label: string;
  sample: string;
}

export interface AvailableVariables {
  eventVariables: VariableItem[];
  attendeeVariables: VariableItem[];
  ticketVariables: VariableItem[];
  formVariables: VariableItem[];
}

export interface SendTestEmailPayload {
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  templateId?: string;
}

export interface SendBatchEmailPayload {
  targetGroup: "all" | "checked_in" | "not_checked_in" | "custom";
  customEmails?: string[];
  subject: string;
  body: string;
  templateId?: string;
}

export interface EmailLog {
  id: string;
  eventId: string;
  templateId: string | null;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  status: "sent" | "failed" | "queued";
  errorMessage: string | null;
  sentAt: string;
}
