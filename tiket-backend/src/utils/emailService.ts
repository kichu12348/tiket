import { deliverMail } from "../services/mail.service";
import { sanitizeRichText } from "./html";
import db from "@db";
import { emailLogs, emailTemplates } from "@db/schema";
import { eq, and } from "drizzle-orm";

export interface InterpolationData {
  event?: {
    title?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    url?: string;
    passUrl?: string;
    organizerName?: string;
  };
  attendee?: {
    name?: string;
    email?: string;
    type?: string;
  };
  ticket?: {
    qrCode?: string;
    type?: string;
    id?: string;
  };
  form?: Record<string, string>;
  custom?: Record<string, string>;
}

/**
 * Replaces placeholders like {{event.title}}, {{attendee.name}}, {{form.Company}} in template text
 */
export function interpolateTemplate(
  templateStr: string,
  data: InterpolationData = {},
): string {
  if (!templateStr) return "";

  return templateStr.replace(
    /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g,
    (match, path) => {
      const parts = path.split(".");
      if (parts.length === 1) {
        // Direct root match or custom
        return data.custom?.[parts[0]] ?? match;
      }

      const [domain, key] = parts;
      if (domain === "event" && data.event) {
        return Reflect.get(data.event, key!) ?? match;
      }
      if (domain === "attendee" && data.attendee) {
        return Reflect.get(data.attendee, key!) ?? match;
      }
      if (domain === "ticket" && data.ticket) {
        if (key === "qrCodeUrl") {
          const qrData = data.ticket.qrCode || "TKT-SAMPLE-12345";
          return `https://quickchart.io/qr?text=${encodeURIComponent(qrData)}&size=300&margin=1`;
        }
        return Reflect.get(data.ticket, key!) ?? match;
      }
      if (domain === "form" && data.form) {
        return data.form[key] ?? match;
      }

      return match;
    },
  );
}

export interface SendEmailOptions {
  eventId: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  templateId?: string;
  data?: InterpolationData;
}

/**
 * Sends an email (Placeholder for now - logs preview to console and saves to email_logs db).
 * To be wired to real SMTP/provider later.
 */
export async function sendEmail(options: SendEmailOptions) {
  const interpolatedSubject = interpolateTemplate(
    options.subject,
    options.data,
  );
  const interpolatedBody = interpolateTemplate(options.body, options.data);

  let status: "sent" | "failed" = "sent";
  let errorMessage: string | undefined = undefined;

  try {
    await deliverMail(
      {
        ...options,
        subject: interpolatedSubject,
        body: sanitizeRichText(interpolatedBody),
      },
      options.eventId,
    );
    // Save record to email_logs
    const [log] = await db
      .insert(emailLogs)
      .values({
        eventId: options.eventId,
        templateId: options.templateId || null,
        recipientEmail: options.recipientEmail,
        recipientName: options.recipientName || null,
        subject: interpolatedSubject,
        status: status,
        errorMessage: errorMessage || null,
      })
      .returning();

    return { success: true, log };
  } catch (error) {
    console.error("[EMAIL DISPATCH ERROR]", error);
    try {
      await db.insert(emailLogs).values({
        eventId: options.eventId,
        templateId: options.templateId || null,
        recipientEmail: options.recipientEmail,
        recipientName: options.recipientName || null,
        subject: interpolatedSubject,
        status: "failed",
        errorMessage:
          (error instanceof Error ? error.message : "Email delivery failed") ||
          "Failed to log email",
      });
    } catch (e) {
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
export const DEFAULT_TEMPLATES = [
  {
    type: "confirmation" as const,
    name: "Ticket Booking Confirmation",
    subject: "Your Ticket Confirmation for {{event.title}}",
    body: `
<div style="font-family: 'Inter', Arial, sans-serif; background-color: #ffffff; color: #111827; max-width: 600px; margin: 0 auto; padding: 32px; border-radius: 12px; border: 1px solid #e5e7eb;">
  <h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">You're confirmed for {{event.title}}! 🎉</h2>
  <p style="color: #4b5563; font-size: 15px; line-height: 1.5;">Hi {{attendee.name}},</p>
  <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
    Thank you for registering for <strong>{{event.title}}</strong>. Your registration has been confirmed.
  </p>
  <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 24px 0;">
    <p style="margin: 6px 0; color: #374151;"><strong>Date:</strong> {{event.startDate}}</p>
    <p style="margin: 6px 0; color: #374151;"><strong>Location:</strong> {{event.location}}</p>
    <p style="margin: 6px 0; color: #374151;"><strong>Ticket Type:</strong> {{ticket.type}}</p>
  </div>
  <p style="text-align: center; margin: 32px 0;">
    <a href="{{event.passUrl}}" style="background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
      View Your Digital Pass & QR Code
    </a>
  </p>
  <p style="color: #9ca3af; font-size: 13px; text-align: center;">
    Please present your digital pass QR code at entry.
  </p>
</div>
`.trim(),
  },
  {
    type: "checkin" as const,
    name: "Event Check-in Welcome",
    subject: "Welcome to {{event.title}}!",
    body: `
<div style="font-family: 'Inter', Arial, sans-serif; background-color: #ffffff; color: #111827; max-width: 600px; margin: 0 auto; padding: 32px; border-radius: 12px; border: 1px solid #e5e7eb;">
  <h2 style="color: #16a34a; margin-top: 0; font-size: 22px; font-weight: 700;">Welcome to {{event.title}}! 🎟️</h2>
  <p style="color: #4b5563; font-size: 15px; line-height: 1.5;">Hi {{attendee.name}},</p>
  <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
    You have successfully checked in. We're excited to have you join us!
  </p>
  <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 24px 0;">
    <p style="margin: 6px 0; color: #374151;"><strong>Event:</strong> {{event.title}}</p>
    <p style="margin: 6px 0; color: #374151;"><strong>Location:</strong> {{event.location}}</p>
  </div>
  <p style="color: #6b7280; font-size: 14px;">
    If you need any assistance during the event, reach out to our event staff or team.
  </p>
</div>
`.trim(),
  },
  {
    type: "invitation" as const,
    name: "Event Invitation",
    subject: "You're Invited to {{event.title}}",
    body: `
<div style="font-family: 'Inter', Arial, sans-serif; background-color: #ffffff; color: #111827; max-width: 600px; margin: 0 auto; padding: 32px; border-radius: 12px; border: 1px solid #e5e7eb;">
  <h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">You're Invited! ✨</h2>
  <p style="color: #4b5563; font-size: 15px; line-height: 1.5;">Hi {{attendee.name}},</p>
  <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
    You are cordially invited to join us for <strong>{{event.title}}</strong>.
  </p>
  <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 24px 0;">
    <p style="margin: 6px 0; color: #374151;"><strong>Date:</strong> {{event.startDate}}</p>
    <p style="margin: 6px 0; color: #374151;"><strong>Location:</strong> {{event.location}}</p>
  </div>
  <p style="text-align: center; margin: 32px 0;">
    <a href="{{event.url}}" style="background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
      Register / Claim Ticket
    </a>
  </p>
</div>
`.trim(),
  },
  {
    type: "thank_you" as const,
    name: "Post-Event Thank You",
    subject: "Thank you for attending {{event.title}}!",
    body: `
<div style="font-family: 'Inter', Arial, sans-serif; background-color: #ffffff; color: #111827; max-width: 600px; margin: 0 auto; padding: 32px; border-radius: 12px; border: 1px solid #e5e7eb;">
  <h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Thank You for Coming! 🙌</h2>
  <p style="color: #4b5563; font-size: 15px; line-height: 1.5;">Hi {{attendee.name}},</p>
  <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
    We want to thank you for participating in <strong>{{event.title}}</strong>. We hope you had a great experience!
  </p>
  <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
    Stay tuned for updates on future events.
  </p>
</div>
`.trim(),
  },
  {
    type: "sorry" as const,
    name: "We Missed You (After Event)",
    subject: "We missed you at {{event.title}}",
    body: `
<div style="font-family: 'Inter', Arial, sans-serif; background-color: #ffffff; color: #111827; max-width: 600px; margin: 0 auto; padding: 32px; border-radius: 12px; border: 1px solid #e5e7eb;">
  <h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">We Missed You! 💔</h2>
  <p style="color: #4b5563; font-size: 15px; line-height: 1.5;">Hi {{attendee.name}},</p>
  <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
    We noticed you weren't able to make it to <strong>{{event.title}}</strong>. We missed having you with us!
  </p>
  <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
    We hope to see you at our next event!
  </p>
</div>
`.trim(),
  },
];

/**
 * Ensures default email templates exist for an event.
 */
export async function seedDefaultTemplatesForEvent(eventId: string) {
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
}
