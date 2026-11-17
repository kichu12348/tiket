import { deliverMail } from "../services/mail.service";
import { sanitizeEmailHtml } from "./html";
import db from "@db";
import {
  emailLogs,
  emailTemplates,
  type EmailDocumentJSON,
} from "@db/schema";
import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import {
  compileEmailJsonToHtml,
  styleObjectToCss,
  normalizeEmailDocument,
  normalizeEmailDocumentDoc,
  flattenInterpolationData,
  interpolateString,
  type InterpolationData,
} from "./emailJsonCompiler";

export {
  compileEmailJsonToHtml,
  styleObjectToCss,
  normalizeEmailDocument,
  normalizeEmailDocumentDoc,
  flattenInterpolationData,
  type InterpolationData,
};

export function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function escapeAttribute(value: string): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Replaces placeholders like {{event.title}}, {{attendee.name}}, {{form.Company Name}} in template text
 */
export function interpolateTemplate(
  templateStr: string,
  data: InterpolationData | Record<string, string> = {},
): string {
  if (!templateStr) return "";

  const variablesMap = flattenInterpolationData(data);
  const qrUrl =
    variablesMap["ticket.qrCodeUrl"] ||
    variablesMap["{{ticket.qrCodeUrl}}"] ||
    "https://quickchart.io/qr?text=TKT-SAMPLE-12345&size=300&margin=1";
  const qrImgTag = `<img src="${qrUrl}" alt="Ticket QR Code" width="160" height="160" style="display:block;margin:12px auto;border-radius:8px;" />`;

  const isHtml = /<[a-z][\s\S]*>/i.test(templateStr);

  let result = templateStr;
  result = result.replace(
    /(src\s*=\s*["']?)\{\{\s*ticket\.qrCodeUrl\s*\}\}(["']?)/gi,
    `$1${qrUrl}$2`,
  );

  if (isHtml) {
    result = result.replace(/\{\{\s*ticket\.qrCodeUrl\s*\}\}/gi, qrImgTag);
  } else {
    result = result.replace(/\{\{\s*ticket\.qrCodeUrl\s*\}\}/gi, qrUrl);
  }

  return interpolateString(result, variablesMap);
}

export interface SendEmailOptions {
  eventId: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string | EmailDocumentJSON;
  templateId?: string;
  templateType?: string;
  data?: InterpolationData;
}

/**
 * Sends an email, recording the dispatched message and tracking pixel to email_logs.
 */
export async function sendEmail(options: SendEmailOptions) {
  const logId = uuidv7();
  const interpolatedSubject = interpolateTemplate(
    options.subject,
    options.data,
  );

  let rawBodyHtml = "";
  if (
    typeof options.body === "object" &&
    options.body !== null &&
    "doc" in (options.body as object)
  ) {
    rawBodyHtml = compileEmailJsonToHtml(
      options.body as EmailDocumentJSON,
      options.data,
    );
  } else {
    rawBodyHtml = interpolateTemplate(String(options.body), options.data);
  }
  const sanitizedBody = sanitizeEmailHtml(rawBodyHtml);

  let templateType = options.templateType;
  if (!templateType && options.templateId) {
    try {
      const [tpl] = await db
        .select({ type: emailTemplates.type })
        .from(emailTemplates)
        .where(eq(emailTemplates.id, options.templateId));
      if (tpl) {
        templateType = tpl.type;
      }
    } catch {
      // Fallback to custom
    }
  }
  templateType = templateType || "custom";

  const trackingPixel = `<img src="${process.env.CDN_URL || "http://localhost:3001"}/api/emails/track/${logId}.gif" width="1" height="1" alt="" style="display:none;width:1px;height:1px;" />`;
  const bodyWithPixel = `${sanitizedBody}${trackingPixel}`;

  try {
    await deliverMail(
      {
        ...options,
        subject: interpolatedSubject,
        body: bodyWithPixel,
      },
      options.eventId,
    );
    // Save record to email_logs
    const [log] = await db
      .insert(emailLogs)
      .values({
        id: logId,
        eventId: options.eventId,
        templateId: options.templateId || null,
        templateType,
        recipientEmail: options.recipientEmail,
        recipientName: options.recipientName || null,
        subject: interpolatedSubject,
        renderedBody: sanitizedBody,
        status: "sent",
        errorMessage: null,
      })
      .returning();

    return { success: true, log };
  } catch (error) {
    console.error("[EMAIL DISPATCH ERROR]", error);
    try {
      await db.insert(emailLogs).values({
        id: logId,
        eventId: options.eventId,
        templateId: options.templateId || null,
        templateType,
        recipientEmail: options.recipientEmail,
        recipientName: options.recipientName || null,
        subject: interpolatedSubject,
        renderedBody: sanitizedBody,
        status: "failed",
        errorMessage:
          (error instanceof Error ? error.message : "Email delivery failed") ||
          "Failed to log email",
      });
    } catch {
      // Ignore fallback log error
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Email delivery failed",
    };
  }
}

/**
 * System default email templates for newly created or requested event templates
 */
export const DEFAULT_TEMPLATES: Array<{
  type: "confirmation" | "checkin" | "invitation" | "thank_you" | "sorry";
  name: string;
  subject: string;
  body: EmailDocumentJSON;
}> = [
  {
    type: "confirmation",
    name: "Ticket Booking Confirmation",
    subject: "Your Ticket Confirmation for {{event.title}}",
    body: {
      version: 1,
      canvasStyle: {
        backgroundColor: "#ffffff",
        color: "#111827",
        maxWidth: "600px",
        padding: "32px",
        borderRadius: "12px",
      },
      doc: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: {
              level: 2,
              style: {
                color: "#111827",
                marginTop: "0",
                fontSize: "22px",
                fontWeight: "700",
              },
            },
            content: [
              { type: "text", text: "You're confirmed for {{event.title}}! 🎉" },
            ],
          },
          {
            type: "paragraph",
            attrs: {
              style: { color: "#4b5563", fontSize: "15px", lineHeight: "1.5" },
            },
            content: [
              { type: "text", text: "Hi {{attendee.name}}," },
            ],
          },
          {
            type: "paragraph",
            attrs: {
              style: { color: "#4b5563", fontSize: "15px", lineHeight: "1.6" },
            },
            content: [
              { type: "text", text: "Thank you for registering for " },
              {
                type: "text",
                text: "{{event.title}}",
                marks: [{ type: "bold" }],
              },
              { type: "text", text: ". Your registration has been confirmed." },
            ],
          },
          {
            type: "containerBlock",
            attrs: {
              style: {
                backgroundColor: "#f9fafb",
                borderColor: "#e5e7eb",
                borderWidth: "1px",
                borderStyle: "solid",
                padding: "20px",
                borderRadius: "8px",
                marginTop: "24px",
                marginBottom: "24px",
              },
            },
            content: [
              {
                type: "paragraph",
                attrs: {
                  style: {
                    marginTop: "6px",
                    marginBottom: "6px",
                    color: "#374151",
                  },
                },
                content: [
                  { type: "text", text: "Date: ", marks: [{ type: "bold" }] },
                  { type: "text", text: "{{event.startDate}}" },
                ],
              },
              {
                type: "paragraph",
                attrs: {
                  style: {
                    marginTop: "6px",
                    marginBottom: "6px",
                    color: "#374151",
                  },
                },
                content: [
                  {
                    type: "text",
                    text: "Location: ",
                    marks: [{ type: "bold" }],
                  },
                  { type: "text", text: "{{event.location}}" },
                ],
              },
              {
                type: "paragraph",
                attrs: {
                  style: {
                    marginTop: "6px",
                    marginBottom: "6px",
                    color: "#374151",
                  },
                },
                content: [
                  {
                    type: "text",
                    text: "Ticket Type: ",
                    marks: [{ type: "bold" }],
                  },
                  { type: "text", text: "{{ticket.type}}" },
                ],
              },
            ],
          },
          {
            type: "buttonBlock",
            attrs: {
              href: "{{event.passUrl}}",
              alignment: "center",
              label: "View Your Digital Pass & QR Code",
              style: {
                backgroundColor: "#000000",
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "15px",
              },
            },
            content: [
              { type: "text", text: "View Your Digital Pass & QR Code" },
            ],
          },
          {
            type: "paragraph",
            attrs: {
              alignment: "center",
              style: {
                color: "#9ca3af",
                fontSize: "13px",
                textAlign: "center",
              },
            },
            content: [
              {
                type: "text",
                text: "Please present your digital pass QR code at entry.",
              },
            ],
          },
        ],
      },
    },
  },
  {
    type: "checkin",
    name: "Event Check-in Welcome",
    subject: "Welcome to {{event.title}}!",
    body: {
      version: 1,
      canvasStyle: {
        backgroundColor: "#ffffff",
        color: "#111827",
        maxWidth: "600px",
        padding: "32px",
        borderRadius: "12px",
      },
      doc: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: {
              level: 2,
              style: {
                color: "#16a34a",
                marginTop: "0",
                fontSize: "22px",
                fontWeight: "700",
              },
            },
            content: [
              { type: "text", text: "Welcome to {{event.title}}! 🎟️" },
            ],
          },
          {
            type: "paragraph",
            attrs: {
              style: { color: "#4b5563", fontSize: "15px", lineHeight: "1.5" },
            },
            content: [
              { type: "text", text: "Hi {{attendee.name}}," },
            ],
          },
          {
            type: "paragraph",
            attrs: {
              style: { color: "#4b5563", fontSize: "15px", lineHeight: "1.6" },
            },
            content: [
              {
                type: "text",
                text: "You have successfully checked in. We're excited to have you join us!",
              },
            ],
          },
          {
            type: "containerBlock",
            attrs: {
              style: {
                backgroundColor: "#f9fafb",
                borderColor: "#e5e7eb",
                borderWidth: "1px",
                borderStyle: "solid",
                padding: "20px",
                borderRadius: "8px",
                marginTop: "24px",
                marginBottom: "24px",
              },
            },
            content: [
              {
                type: "paragraph",
                attrs: {
                  style: {
                    marginTop: "6px",
                    marginBottom: "6px",
                    color: "#374151",
                  },
                },
                content: [
                  { type: "text", text: "Event: ", marks: [{ type: "bold" }] },
                  { type: "text", text: "{{event.title}}" },
                ],
              },
              {
                type: "paragraph",
                attrs: {
                  style: {
                    marginTop: "6px",
                    marginBottom: "6px",
                    color: "#374151",
                  },
                },
                content: [
                  {
                    type: "text",
                    text: "Location: ",
                    marks: [{ type: "bold" }],
                  },
                  { type: "text", text: "{{event.location}}" },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            attrs: {
              style: { color: "#6b7280", fontSize: "14px" },
            },
            content: [
              {
                type: "text",
                text: "If you need any assistance during the event, reach out to our event staff or team.",
              },
            ],
          },
        ],
      },
    },
  },
  {
    type: "invitation",
    name: "Event Invitation",
    subject: "You're Invited to {{event.title}}",
    body: {
      version: 1,
      canvasStyle: {
        backgroundColor: "#ffffff",
        color: "#111827",
        maxWidth: "600px",
        padding: "32px",
        borderRadius: "12px",
      },
      doc: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: {
              level: 2,
              style: {
                color: "#111827",
                marginTop: "0",
                fontSize: "22px",
                fontWeight: "700",
              },
            },
            content: [{ type: "text", text: "You're Invited! ✨" }],
          },
          {
            type: "paragraph",
            attrs: {
              style: { color: "#4b5563", fontSize: "15px", lineHeight: "1.5" },
            },
            content: [
              { type: "text", text: "Hi {{attendee.name}}," },
            ],
          },
          {
            type: "paragraph",
            attrs: {
              style: { color: "#4b5563", fontSize: "15px", lineHeight: "1.6" },
            },
            content: [
              { type: "text", text: "You are cordially invited to join us for " },
              {
                type: "text",
                text: "{{event.title}}",
                marks: [{ type: "bold" }],
              },
              { type: "text", text: "." },
            ],
          },
          {
            type: "containerBlock",
            attrs: {
              style: {
                backgroundColor: "#f9fafb",
                borderColor: "#e5e7eb",
                borderWidth: "1px",
                borderStyle: "solid",
                padding: "20px",
                borderRadius: "8px",
                marginTop: "24px",
                marginBottom: "24px",
              },
            },
            content: [
              {
                type: "paragraph",
                attrs: {
                  style: {
                    marginTop: "6px",
                    marginBottom: "6px",
                    color: "#374151",
                  },
                },
                content: [
                  { type: "text", text: "Date: ", marks: [{ type: "bold" }] },
                  { type: "text", text: "{{event.startDate}}" },
                ],
              },
              {
                type: "paragraph",
                attrs: {
                  style: {
                    marginTop: "6px",
                    marginBottom: "6px",
                    color: "#374151",
                  },
                },
                content: [
                  {
                    type: "text",
                    text: "Location: ",
                    marks: [{ type: "bold" }],
                  },
                  { type: "text", text: "{{event.location}}" },
                ],
              },
            ],
          },
          {
            type: "buttonBlock",
            attrs: {
              href: "{{event.url}}",
              alignment: "center",
              label: "Register / Claim Ticket",
              style: {
                backgroundColor: "#000000",
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "15px",
              },
            },
            content: [{ type: "text", text: "Register / Claim Ticket" }],
          },
        ],
      },
    },
  },
  {
    type: "thank_you",
    name: "Post-Event Thank You",
    subject: "Thank you for attending {{event.title}}!",
    body: {
      version: 1,
      canvasStyle: {
        backgroundColor: "#ffffff",
        color: "#111827",
        maxWidth: "600px",
        padding: "32px",
        borderRadius: "12px",
      },
      doc: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: {
              level: 2,
              style: {
                color: "#111827",
                marginTop: "0",
                fontSize: "22px",
                fontWeight: "700",
              },
            },
            content: [{ type: "text", text: "Thank You for Coming! 🙌" }],
          },
          {
            type: "paragraph",
            attrs: {
              style: { color: "#4b5563", fontSize: "15px", lineHeight: "1.5" },
            },
            content: [
              { type: "text", text: "Hi {{attendee.name}}," },
            ],
          },
          {
            type: "paragraph",
            attrs: {
              style: { color: "#4b5563", fontSize: "15px", lineHeight: "1.6" },
            },
            content: [
              {
                type: "text",
                text: "We want to thank you for participating in ",
              },
              {
                type: "text",
                text: "{{event.title}}",
                marks: [{ type: "bold" }],
              },
              {
                type: "text",
                text: ". We hope you had a great experience!",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: {
              style: { color: "#6b7280", fontSize: "14px", marginTop: "24px" },
            },
            content: [
              {
                type: "text",
                text: "Stay tuned for updates on future events.",
              },
            ],
          },
        ],
      },
    },
  },
  {
    type: "sorry",
    name: "We Missed You (After Event)",
    subject: "We missed you at {{event.title}}",
    body: {
      version: 1,
      canvasStyle: {
        backgroundColor: "#ffffff",
        color: "#111827",
        maxWidth: "600px",
        padding: "32px",
        borderRadius: "12px",
      },
      doc: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: {
              level: 2,
              style: {
                color: "#111827",
                marginTop: "0",
                fontSize: "22px",
                fontWeight: "700",
              },
            },
            content: [{ type: "text", text: "We Missed You! 💔" }],
          },
          {
            type: "paragraph",
            attrs: {
              style: { color: "#4b5563", fontSize: "15px", lineHeight: "1.5" },
            },
            content: [
              { type: "text", text: "Hi {{attendee.name}}," },
            ],
          },
          {
            type: "paragraph",
            attrs: {
              style: { color: "#4b5563", fontSize: "15px", lineHeight: "1.6" },
            },
            content: [
              {
                type: "text",
                text: "We noticed you weren't able to make it to ",
              },
              {
                type: "text",
                text: "{{event.title}}",
                marks: [{ type: "bold" }],
              },
              {
                type: "text",
                text: ". We missed having you with us!",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: {
              style: { color: "#6b7280", fontSize: "14px", marginTop: "24px" },
            },
            content: [
              {
                type: "text",
                text: "We hope to see you at our next event!",
              },
            ],
          },
        ],
      },
    },
  },
];

/**
 * Ensures default email templates exist for an event.
 */
export async function seedDefaultTemplatesForEvent(
  eventId: string,
  force: boolean = false,
) {
  const existing = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.eventId, eventId));

  const existingTypes = new Set(existing.map((t) => t.type));

  const toInsert = DEFAULT_TEMPLATES.filter(
    (tpl) => !existingTypes.has(tpl.type),
  ).map((tpl) => ({
    eventId,
    name: tpl.name,
    type: tpl.type,
    subject: tpl.subject,
    body: tpl.body,
    isActive: true,
  }));

  if (toInsert.length > 0) {
    await db.insert(emailTemplates).values(toInsert);
  }

  // Reseed or repair any existing default templates if forced or if their body is invalid
  for (const existingTpl of existing) {
    const isInvalidBody =
      !existingTpl.body ||
      typeof existingTpl.body !== "object" ||
      !("doc" in (existingTpl.body as object));

    if (force || isInvalidBody) {
      const defaultMatch = DEFAULT_TEMPLATES.find(
        (t) => t.type === existingTpl.type,
      );
      if (defaultMatch) {
        await db
          .update(emailTemplates)
          .set({
            name: defaultMatch.name,
            subject: defaultMatch.subject,
            body: defaultMatch.body,
            updatedAt: new Date(),
          })
          .where(eq(emailTemplates.id, existingTpl.id));
      }
    }
  }
}
