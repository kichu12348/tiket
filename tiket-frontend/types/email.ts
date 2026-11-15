export type EmailTemplateType =
  | "invitation"
  | "confirmation"
  | "checkin"
  | "thank_you"
  | "sorry"
  | "custom";

export type StyleObject = Record<string, string | number | null | undefined>;

export interface EmailDocumentMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface EmailDocumentNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: EmailDocumentNode[];
  text?: string;
  marks?: EmailDocumentMark[];
}

export interface EmailNodeJSON {
  type:
    | "doc"
    | "paragraph"
    | "heading"
    | "blockquote"
    | "bulletList"
    | "orderedList"
    | "listItem"
    | "containerBlock"
    | "buttonBlock"
    | "imageBlock"
    | "variable"
    | "text"
    | "hardBreak"
    | string;
  attrs?: {
    style?: StyleObject | string;
    level?: number;
    href?: string;
    src?: string;
    alt?: string;
    alignment?: "left" | "center" | "right" | "justify" | string;
    key?: string;
    label?: string;
    [key: string]: unknown;
  };
  marks?: EmailDocumentMark[];
  content?: EmailNodeJSON[];
  text?: string;
}

export interface EmailDocumentJSON {
  version: 1;
  canvasStyle?: StyleObject;
  doc: EmailNodeJSON;
}

export interface EmailTemplateRecord {
  id: string;
  eventId: string;
  name: string;
  type: EmailTemplateType;
  subject: string;
  body: EmailDocumentJSON;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EmailTemplate = EmailTemplateRecord;

export interface EmailVariableItem {
  key: string;
  label: string;
  sample: string;
}

export type VariableItem = EmailVariableItem;

export interface AvailableVariables {
  eventVariables: EmailVariableItem[];
  attendeeVariables: EmailVariableItem[];
  ticketVariables: EmailVariableItem[];
  formVariables: EmailVariableItem[];
}

export interface SendTestEmailPayload {
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: EmailDocumentJSON;
  templateId?: string;
}

export interface SendBatchEmailPayload {
  targetGroup: "all" | "checked_in" | "not_checked_in" | "custom";
  customEmails?: string[];
  subject: string;
  body: EmailDocumentJSON;
  templateId?: string;
}

export interface EmailLogItem {
  id: string;
  eventId: string;
  templateId: string | null;
  templateType?: EmailTemplateType | string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  renderedBody?: string | null;
  status: "sent" | "failed" | "queued";
  errorMessage: string | null;
  openedAt?: string | null;
  openCount?: number;
  resentCount?: number;
  lastResentAt?: string | null;
  sentAt: string;
}

export type EmailLog = EmailLogItem;

export interface EmailTypeAnalytics {
  templateType: string;
  sent: number;
  opened: number;
  unopened: number;
  failed: number;
  openRatePercent: number;
}

export interface EmailTimelinePoint {
  bucket: string;
  sent: number;
  opened: number;
}

export interface SmtpConfigSummary {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromEmail: string;
  fromName?: string;
  hasPassword?: boolean;
}

export interface EmailAnalytics {
  totalSent: number;
  totalFailed: number;
  totalOpened: number;
  totalUnopened: number;
  queuedCount?: number;
  openRatePercent: number;
  byType: EmailTypeAnalytics[];
  timeline: EmailTimelinePoint[];
}

export interface EmailLogsResponse {
  logs: EmailLogItem[];
  analytics: EmailAnalytics;
}
