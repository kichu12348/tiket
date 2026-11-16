import { z } from "zod";
import type {
  EmailDocumentJSON,
  EmailNodeJSON,
  StyleObject,
} from "@/types/email";
import { createDefaultEmailDocument } from "@/utils/emailJsonCompiler";

// -------------------------------------------------------------
// 1. Zod Schemas
// -------------------------------------------------------------

export const emailStyleSchema: z.ZodType<StyleObject> = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.null(), z.undefined()]),
);

export const emailMarkSchema = z.object({
  type: z.string(),
  attrs: z
    .object({
      style: emailStyleSchema.optional(),
      href: z.string().optional(),
      target: z.string().optional(),
      color: z.string().optional(),
    })
    .catchall(z.unknown())
    .optional(),
});

export const emailNodeJsonSchema: z.ZodType<EmailNodeJSON> = z.lazy(() =>
  z.object({
    type: z.string(),
    attrs: z
      .object({
        style: emailStyleSchema.optional(),
        level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
        href: z.string().optional(),
        src: z.string().optional(),
        alt: z.string().optional(),
        alignment: z
          .enum(["left", "center", "right", "justify"])
          .or(z.string())
          .optional(),
        key: z.string().optional(),
        label: z.string().optional(),
      })
      .catchall(z.unknown())
      .optional(),
    marks: z.array(emailMarkSchema).optional(),
    content: z.array(emailNodeJsonSchema).optional(),
    text: z.string().optional(),
  }),
);

export const emailDocumentJsonSchema = z.object({
  version: z.literal(1),
  canvasStyle: emailStyleSchema.optional(),
  doc: emailNodeJsonSchema,
});

export function validateEmailDocument(document: unknown): ValidationResult<EmailDocumentJSON> {
  const result = emailDocumentJsonSchema.safeParse(document);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const pathStr = firstIssue.path.join(".");
    return {
      success: false,
      error: pathStr ? `${pathStr}: ${firstIssue.message}` : firstIssue.message,
    };
  }
  return { success: true, data: result.data as EmailDocumentJSON };
}

export const emailTemplateSaveSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Template name is required.")
    .max(255, "Template name cannot exceed 255 characters."),
  subject: z.string().trim().min(1, "Subject line is required."),
  body: z.union([emailDocumentJsonSchema, z.string().min(1)]),
  isActive: z.boolean().optional(),
});

export const smtpConfigSchema = z
  .object({
    host: z.string().trim().min(1, "SMTP Host is required."),
    port: z.coerce.number().refine((p) => [465, 587, 2525].includes(p), {
      message: "SMTP Port must be 465, 587, or 2525.",
    }),
    secure: z.boolean(),
    username: z.string().trim().min(1, "SMTP Username is required."),
    password: z.string().optional(),
    hasPassword: z.boolean().optional(),
    fromEmail: z
      .string()
      .trim()
      .min(1, "From Email address is required.")
      .email("Please enter a valid From Email address."),
    fromName: z
      .string()
      .trim()
      .max(120, "From Name cannot exceed 120 characters.")
      .optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.hasPassword && (!val.password || !val.password.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password or API Key is required.",
      });
    }
  });

export const sendTestEmailSchema = z.object({
  recipientEmail: z
    .string()
    .trim()
    .min(1, "Recipient email is required.")
    .email("Please enter a valid recipient email address."),
  recipientName: z.string().trim().optional(),
  subject: z.string().trim().min(1, "Subject line is required."),
  body: z.union([emailDocumentJsonSchema, z.string().min(1)]),
  templateId: z.string().optional(),
});

export const sendBatchEmailSchema = z
  .object({
    targetGroup: z.enum(["all", "checked_in", "not_checked_in", "custom"], {
      errorMap: () => ({ message: "Invalid target audience group selected." }),
    }),
    customEmails: z.array(z.string().trim().email()).optional(),
    subject: z.string().trim().min(1, "Subject line is required."),
    body: z.union([emailDocumentJsonSchema, z.string().min(1)]),
    templateId: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.targetGroup === "custom") {
      if (!val.customEmails || val.customEmails.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customEmails"],
          message: "Please enter at least one valid recipient email address.",
        });
      }
    }
  });

// -------------------------------------------------------------
// 2. Pure Validation Functions
// -------------------------------------------------------------

export interface SmtpConfigInput {
  host: string;
  port: number | string;
  secure: boolean;
  username: string;
  password?: string;
  hasPassword?: boolean;
  fromEmail: string;
  fromName?: string;
}

export interface EmailTemplateSaveInput {
  name: string;
  subject: string;
  body: EmailDocumentJSON | string;
  isActive?: boolean;
}

export interface SendTestEmailInput {
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: EmailDocumentJSON | string;
  templateId?: string;
}

export interface SendBatchEmailInput {
  targetGroup: "all" | "checked_in" | "not_checked_in" | "custom";
  customEmails?: string[];
  subject: string;
  body: EmailDocumentJSON | string;
  templateId?: string;
}

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  error: string;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOSTNAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function validateSmtpConfig(
  input: SmtpConfigInput,
): ValidationResult<{
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string;
  fromEmail: string;
  fromName?: string;
}> {
  const host = (input.host || "").trim();
  if (!host) {
    return { success: false, error: "SMTP Host is required." };
  }
  if (!HOSTNAME_REGEX.test(host) && host !== "localhost") {
    return { success: false, error: "Please enter a valid SMTP hostname." };
  }

  const port =
    typeof input.port === "number" ? input.port : parseInt(String(input.port), 10);
  if (![465, 587, 2525].includes(port)) {
    return {
      success: false,
      error: "SMTP Port must be 465, 587, or 2525.",
    };
  }

  const username = (input.username || "").trim();
  if (!username) {
    return { success: false, error: "SMTP Username is required." };
  }

  const password = input.password?.trim();
  if (!input.hasPassword && !password) {
    return {
      success: false,
      error: "Password or API Key is required.",
    };
  }

  const fromEmail = (input.fromEmail || "").trim();
  if (!fromEmail) {
    return { success: false, error: "From Email address is required." };
  }
  if (!EMAIL_REGEX.test(fromEmail)) {
    return { success: false, error: "Please enter a valid From Email address." };
  }

  const fromName = input.fromName?.trim();
  if (fromName && fromName.length > 120) {
    return {
      success: false,
      error: "From Name cannot exceed 120 characters.",
    };
  }

  return {
    success: true,
    data: {
      host,
      port,
      secure: Boolean(input.secure),
      username,
      ...(password ? { password } : {}),
      fromEmail,
      ...(fromName ? { fromName } : {}),
    },
  };
}

export function validateEmailTemplateSave(
  input: EmailTemplateSaveInput,
): ValidationResult<{
  name: string;
  subject: string;
  body: EmailDocumentJSON;
  isActive: boolean;
}> {
  const name = (input.name || "").trim();
  if (!name) {
    return { success: false, error: "Template name is required." };
  }
  if (name.length > 255) {
    return {
      success: false,
      error: "Template name cannot exceed 255 characters.",
    };
  }

  const subject = (input.subject || "").trim();
  if (!subject) {
    return { success: false, error: "Subject line is required." };
  }

  if (!input.body) {
    return { success: false, error: "Email template content cannot be empty." };
  }

  let finalBody: EmailDocumentJSON;
  if (typeof input.body === "string") {
    if (!input.body.trim()) {
      return { success: false, error: "Email template content cannot be empty." };
    }
    const defaultDoc = createDefaultEmailDocument();
    defaultDoc.doc.content = [
      {
        type: "paragraph",
        content: [{ type: "text", text: input.body.trim() }],
      },
    ];
    finalBody = defaultDoc;
  } else {
    finalBody = input.body;
  }

  return {
    success: true,
    data: {
      name,
      subject,
      body: finalBody,
      isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
    },
  };
}

export function validateSendTestEmail(
  input: SendTestEmailInput,
): ValidationResult<{
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: EmailDocumentJSON;
  templateId?: string;
}> {
  const recipientEmail = (input.recipientEmail || "").trim();
  if (!recipientEmail) {
    return { success: false, error: "Recipient email is required." };
  }
  if (!EMAIL_REGEX.test(recipientEmail)) {
    return {
      success: false,
      error: "Please enter a valid recipient email address.",
    };
  }

  const subject = (input.subject || "").trim();
  if (!subject) {
    return { success: false, error: "Subject line is required." };
  }

  if (!input.body) {
    return { success: false, error: "Email body content is required." };
  }

  let finalBody: EmailDocumentJSON;
  if (typeof input.body === "string") {
    if (!input.body.trim()) {
      return { success: false, error: "Email body content is required." };
    }
    const defaultDoc = createDefaultEmailDocument();
    defaultDoc.doc.content = [
      {
        type: "paragraph",
        content: [{ type: "text", text: input.body.trim() }],
      },
    ];
    finalBody = defaultDoc;
  } else {
    finalBody = input.body;
  }

  return {
    success: true,
    data: {
      recipientEmail,
      recipientName: input.recipientName?.trim() || undefined,
      subject,
      body: finalBody,
      templateId: input.templateId,
    },
  };
}

export function validateSendBatchEmail(
  input: SendBatchEmailInput,
): ValidationResult<{
  targetGroup: "all" | "checked_in" | "not_checked_in" | "custom";
  customEmails?: string[];
  subject: string;
  body: EmailDocumentJSON;
  templateId?: string;
}> {
  const validGroups = [
    "all",
    "checked_in",
    "not_checked_in",
    "custom",
  ] as const;
  if (!validGroups.includes(input.targetGroup)) {
    return { success: false, error: "Invalid target audience group selected." };
  }

  let cleanedCustomEmails: string[] | undefined = undefined;
  if (input.targetGroup === "custom") {
    cleanedCustomEmails = (input.customEmails || [])
      .map((e) => e.trim())
      .filter((e) => Boolean(e) && EMAIL_REGEX.test(e));

    if (!cleanedCustomEmails || cleanedCustomEmails.length === 0) {
      return {
        success: false,
        error: "Please enter at least one valid recipient email address.",
      };
    }
  }

  const subject = (input.subject || "").trim();
  if (!subject) {
    return { success: false, error: "Subject line is required." };
  }

  if (!input.body) {
    return { success: false, error: "Email body content is required." };
  }

  let finalBody: EmailDocumentJSON;
  if (typeof input.body === "string") {
    if (!input.body.trim()) {
      return { success: false, error: "Email body content is required." };
    }
    const defaultDoc = createDefaultEmailDocument();
    defaultDoc.doc.content = [
      {
        type: "paragraph",
        content: [{ type: "text", text: input.body.trim() }],
      },
    ];
    finalBody = defaultDoc;
  } else {
    finalBody = input.body;
  }

  return {
    success: true,
    data: {
      targetGroup: input.targetGroup,
      customEmails:
        input.targetGroup === "custom"
          ? cleanedCustomEmails
          : input.customEmails || [],
      subject,
      body: finalBody,
      templateId: input.templateId,
    },
  };
}
