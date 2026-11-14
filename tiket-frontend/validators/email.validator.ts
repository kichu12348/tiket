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
  body: string;
  isActive?: boolean;
}

export interface SendTestEmailInput {
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  templateId?: string;
}

export interface SendBatchEmailInput {
  targetGroup: "all" | "checked_in" | "not_checked_in" | "custom";
  customEmails?: string[];
  subject: string;
  body: string;
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
    typeof input.port === "number" ? input.port : parseInt(input.port, 10);
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
): ValidationResult<EmailTemplateSaveInput> {
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

  const body = (input.body || "").trim();
  if (!body) {
    return { success: false, error: "Email template content cannot be empty." };
  }

  return {
    success: true,
    data: {
      name,
      subject,
      body,
      isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
    },
  };
}

export function validateSendTestEmail(
  input: SendTestEmailInput,
): ValidationResult<SendTestEmailInput> {
  const recipientEmail = (input.recipientEmail || "").trim();
  if (!recipientEmail) {
    return { success: false, error: "Recipient email is required." };
  }
  if (!EMAIL_REGEX.test(recipientEmail)) {
    return { success: false, error: "Please enter a valid recipient email address." };
  }

  const subject = (input.subject || "").trim();
  if (!subject) {
    return { success: false, error: "Subject line is required." };
  }

  const body = (input.body || "").trim();
  if (!body) {
    return { success: false, error: "Email body content is required." };
  }

  return {
    success: true,
    data: {
      recipientEmail,
      recipientName: input.recipientName?.trim() || undefined,
      subject,
      body,
      templateId: input.templateId,
    },
  };
}

export function validateSendBatchEmail(
  input: SendBatchEmailInput,
): ValidationResult<SendBatchEmailInput> {
  const validGroups = ["all", "checked_in", "not_checked_in", "custom"] as const;
  if (!validGroups.includes(input.targetGroup)) {
    return { success: false, error: "Invalid target audience group selected." };
  }

  let cleanedCustomEmails: string[] | undefined = undefined;
  if (input.targetGroup === "custom") {
    cleanedCustomEmails = (input.customEmails || [])
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (cleanedCustomEmails.length === 0) {
      return {
        success: false,
        error: "At least one custom recipient email address is required.",
      };
    }

    for (const email of cleanedCustomEmails) {
      if (!EMAIL_REGEX.test(email)) {
        return {
          success: false,
          error: `Invalid custom recipient email address: "${email}"`,
        };
      }
    }
  }

  const subject = (input.subject || "").trim();
  if (!subject) {
    return { success: false, error: "Subject line is required." };
  }

  const body = (input.body || "").trim();
  if (!body) {
    return { success: false, error: "Email body content is required." };
  }

  return {
    success: true,
    data: {
      targetGroup: input.targetGroup,
      customEmails:
        input.targetGroup === "custom"
          ? cleanedCustomEmails
          : input.customEmails !== undefined
            ? input.customEmails
            : undefined,
      subject,
      body,
      templateId: input.templateId,
    },
  };
}

/**
 * Standard Schema adapters for interoperability
 */
export const smtpConfigSchema = {
  safeParse: (input: SmtpConfigInput) => validateSmtpConfig(input),
};

export const emailTemplateSaveSchema = {
  safeParse: (input: EmailTemplateSaveInput) =>
    validateEmailTemplateSave(input),
};

export const sendTestEmailSchema = {
  safeParse: (input: SendTestEmailInput) => validateSendTestEmail(input),
};

export const sendBatchEmailSchema = {
  safeParse: (input: SendBatchEmailInput) => validateSendBatchEmail(input),
};
