import { deliverMail } from "../services/mail.service";
import { sanitizeEmailHtml } from "./html";
import db from "@db";
import {
  emailLogs,
  emailTemplates,
  type EmailDocumentJSON,
  type EmailNodeJSON,
  type StyleObject,
} from "@db/schema";
import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

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
    qrCodeUrl?: string;
    type?: string;
    id?: string;
  };
  form?: Record<string, string>;
  custom?: Record<string, string>;
}

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
 * Converts camelCase CSS keys into valid kebab-case CSS declarations safely with character escaping.
 */
export function styleObjectToCss(style?: StyleObject): string {
  if (!style || typeof style !== "object") return "";
  const declarations: string[] = [];
  const unitlessProps = new Set([
    "fontWeight",
    "font-weight",
    "lineHeight",
    "line-height",
    "opacity",
    "zIndex",
    "z-index",
    "flex",
    "flexGrow",
    "flex-grow",
    "flexShrink",
    "flex-shrink",
    "order",
  ]);

  for (const [rawKey, rawVal] of Object.entries(style)) {
    if (rawVal === undefined || rawVal === null || rawVal === "") continue;
    const kebabKey = rawKey.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
    if (!/^[a-z0-9-]+$/i.test(kebabKey)) continue;

    let valStr: string;
    if (typeof rawVal === "number") {
      valStr =
        unitlessProps.has(rawKey) || unitlessProps.has(kebabKey)
          ? String(rawVal)
          : `${rawVal}px`;
    } else {
      valStr = String(rawVal);
    }

    valStr = valStr.replace(/["';<>]/g, "").trim();
    if (!valStr) continue;

    declarations.push(`${kebabKey}: ${valStr}`);
  }

  return declarations.length > 0 ? declarations.join("; ") + ";" : "";
}

/**
 * Replaces placeholders like {{event.title}}, {{attendee.name}}, {{form.Company Name}} in template text
 */
export function interpolateTemplate(
  templateStr: string,
  data: InterpolationData = {},
): string {
  if (!templateStr) return "";

  const qrData = data.ticket?.qrCode || "TKT-SAMPLE-12345";
  const qrUrl =
    data.ticket?.qrCodeUrl ||
    `https://quickchart.io/qr?text=${encodeURIComponent(qrData)}&size=300&margin=1`;
  const qrImgTag = `<img src="${qrUrl}" alt="Ticket QR Code" width="160" height="160" style="display:block;margin:12px auto;border-radius:8px;" />`;

  const isHtml = /<[a-z][\s\S]*>/i.test(templateStr);

  let result = templateStr;
  // Handle {{ticket.qrCodeUrl}} in src attributes first
  result = result.replace(
    /(src\s*=\s*["']?)\{\{\s*ticket\.qrCodeUrl\s*\}\}(["']?)/gi,
    `$1${qrUrl}$2`,
  );

  // If in HTML text, replace standalone {{ticket.qrCodeUrl}} with an img tag; otherwise with qrUrl
  if (isHtml) {
    result = result.replace(/\{\{\s*ticket\.qrCodeUrl\s*\}\}/gi, qrImgTag);
  } else {
    result = result.replace(/\{\{\s*ticket\.qrCodeUrl\s*\}\}/gi, qrUrl);
  }

  // Replace placeholders including form fields with spaces, hyphens, slashes
  return result.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, rawPath) => {
    const path = rawPath.trim();
    if (path.startsWith("form.")) {
      const fieldKey = path.slice(5).trim();
      return data.form?.[fieldKey] ?? match;
    }

    const parts = path.split(".");
    if (parts.length === 1) {
      // Direct root match or custom
      return data.custom?.[parts[0]] ?? match;
    }

    const [domain, ...rest] = parts;
    const key = rest.join(".");

    if (domain === "event" && data.event) {
      return Reflect.get(data.event, key) ?? match;
    }
    if (domain === "attendee" && data.attendee) {
      return Reflect.get(data.attendee, key) ?? match;
    }
    if (domain === "ticket" && data.ticket) {
      if (key === "qrCodeUrl") {
        return qrUrl;
      }
      return Reflect.get(data.ticket, key) ?? match;
    }
    if (domain === "form" && data.form) {
      return data.form[key] ?? match;
    }

    return match;
  });
}

function compileEmailNode(
  node: EmailNodeJSON,
  data: InterpolationData,
  parentType?: string,
): string {
  if (!node) return "";

  if (node.type === "hardBreak") {
    return "<br />";
  }

  if (node.type === "text") {
    const rawText = node.text || "";
    const interpolated = interpolateTemplate(rawText, data);
    let text = escapeHtml(interpolated);

    if (node.marks && node.marks.length > 0) {
      for (const mark of node.marks) {
        if (mark.type === "bold") {
          text = `<strong style="font-weight: 700;">${text}</strong>`;
        } else if (mark.type === "italic") {
          text = `<em style="font-style: italic;">${text}</em>`;
        } else if (mark.type === "underline") {
          text = `<span style="text-decoration: underline;">${text}</span>`;
        } else if (mark.type === "strike") {
          text = `<span style="text-decoration: line-through;">${text}</span>`;
        } else if (mark.type === "code") {
          text = `<code style="background-color: #f3f4f6; padding: 2px 4px; border-radius: 4px; font-size: 85%; font-family: monospace;">${text}</code>`;
        } else if (mark.type === "textStyle") {
          const css = styleObjectToCss(mark.attrs?.style);
          if (css) {
            text = `<span style="${escapeAttribute(css)}">${text}</span>`;
          }
        } else if (mark.type === "highlight") {
          const rawAttrs = (mark.attrs && typeof mark.attrs === "object" ? mark.attrs : {}) as Record<string, unknown>;
          const markStyle = (rawAttrs.style && typeof rawAttrs.style === "object" ? rawAttrs.style : {}) as Record<string, string>;
          const bg = markStyle.backgroundColor || rawAttrs.color || "#fef08a";
          const css = styleObjectToCss({
            backgroundColor: String(bg),
            padding: "2px 4px",
            borderRadius: "3px",
            ...markStyle,
          });
          text = `<mark style="${escapeAttribute(css)}">${text}</mark>`;
        } else if (mark.type === "link") {
          const rawHref = (mark.attrs?.href as string) || "#";
          const href = interpolateTemplate(rawHref, data);
          const customStyle =
            styleObjectToCss(mark.attrs?.style) ||
            "color: #2563eb; text-decoration: underline;";
          const targetAttr = mark.attrs?.target
            ? ` target="${escapeAttribute(String(mark.attrs.target))}"`
            : "";
          text = `<a href="${escapeAttribute(href)}" style="${escapeAttribute(customStyle)}"${targetAttr}>${text}</a>`;
        }
      }
    }
    return text;
  }

  if (node.type === "variable") {
    const rawKey =
      (node.attrs?.key as string) || (node.attrs?.label as string) || "";
    const token = rawKey.startsWith("{{") ? rawKey : `{{${rawKey}}}`;
    const value = interpolateTemplate(token, data);
    if (value !== token) {
      return escapeHtml(value);
    }
    const fallback =
      (node.attrs?.label as string) ||
      (node.attrs?.sample as string) ||
      token;
    return escapeHtml(fallback);
  }

  if (node.type === "buttonBlock" || (node.type as string) === "ctaButton") {
    const rawHref =
      (node.attrs?.href as string) || (node.attrs?.url as string) || "#";
    const href = interpolateTemplate(rawHref, data);
    const alignment = (node.attrs?.alignment as string) || "center";
    const label =
      node.content && node.content.length > 0
        ? node.content
            .map((c) => compileEmailNode(c, data, "buttonBlock"))
            .join("")
        : escapeHtml(
            interpolateTemplate(
              (node.attrs?.label as string) || "Click Here",
              data,
            ),
          );

    const defaultBtnStyle: StyleObject = {
      backgroundColor: "#000000",
      color: "#ffffff",
      padding: "12px 24px",
      textDecoration: "none",
      borderRadius: "8px",
      fontWeight: "600",
      fontSize: "15px",
      display: "inline-block",
    };
    const nodeStyle = { ...((node.attrs?.style || {}) as StyleObject) };
    const mt = nodeStyle.marginTop || "16px";
    const mb = nodeStyle.marginBottom || "16px";
    delete nodeStyle.marginTop;
    delete nodeStyle.marginBottom;
    delete nodeStyle.textAlign;

    const mergedStyle: StyleObject = {
      ...defaultBtnStyle,
      ...nodeStyle,
    };
    const btnCss = styleObjectToCss(mergedStyle);

    return `
<div style="text-align: ${escapeAttribute(alignment)}; margin-top: ${escapeAttribute(String(mt))}; margin-bottom: ${escapeAttribute(String(mb))};">
  <a href="${escapeAttribute(href)}" style="${escapeAttribute(btnCss)}">
    ${label}
  </a>
</div>`.trim();
  }

  if (node.type === "imageBlock" || (node.type as string) === "image") {
    const rawSrc = (node.attrs?.src as string) || "";
    const src = interpolateTemplate(rawSrc, data);
    const rawAlt = (node.attrs?.alt as string) || "";
    const alt = interpolateTemplate(rawAlt, data);
    const alignment = (node.attrs?.alignment as string) || "center";
    const rawHref = (node.attrs?.href as string) || "";
    const href = rawHref ? interpolateTemplate(rawHref, data) : undefined;

    const imgStyles = styleObjectToCss(node.attrs?.style);
    let marginCss = "margin: 0 auto; display: block;";
    if (alignment === "left") {
      marginCss = "margin-right: auto; margin-left: 0; display: block;";
    } else if (alignment === "right") {
      marginCss = "margin-left: auto; margin-right: 0; display: block;";
    }

    let imgHtml = `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" style="${imgStyles}max-width: 100%; height: auto; ${marginCss}" />`;
    if (href) {
      imgHtml = `<a href="${escapeAttribute(href)}" style="display: block; text-decoration: none;">${imgHtml}</a>`;
    }
    return `
<div style="text-align: ${escapeAttribute(alignment)}; margin: 16px 0;">
  ${imgHtml}
</div>`.trim();
  }

  const childrenHtml = node.content
    ? node.content.map((c) => compileEmailNode(c, data, node.type)).join("")
    : "";

  const nodeCss = styleObjectToCss(node.attrs?.style);
  const alignCss = node.attrs?.alignment
    ? `text-align: ${escapeAttribute(node.attrs.alignment)}; `
    : "";

  switch (node.type) {
    case "paragraph": {
      const margin =
        parentType === "listItem" ? "margin: 0;" : "margin: 12px 0;";
      return `<p style="color: #374151; font-size: 15px; line-height: 1.6; ${margin} ${alignCss}${nodeCss}">${childrenHtml || "<br>"}</p>`;
    }
    case "heading": {
      const level = node.attrs?.level || 1;
      const validLevel = level === 2 ? 2 : level === 3 ? 3 : 1;
      const fontSize =
        validLevel === 1 ? "24px" : validLevel === 2 ? "20px" : "18px";
      return `<h${validLevel} style="color: #111827; font-size: ${fontSize}; font-weight: 700; margin-top: 20px; margin-bottom: 10px; ${alignCss}${nodeCss}">${childrenHtml}</h${validLevel}>`;
    }
    case "containerBlock":
    case "container" as string: {
      return `<div style="${nodeCss}">${childrenHtml}</div>`;
    }
    case "bulletList": {
      return `<ul style="color: #374151; padding-left: 20px; margin: 12px 0; ${nodeCss}">${childrenHtml}</ul>`;
    }
    case "orderedList": {
      return `<ol style="color: #374151; padding-left: 20px; margin: 12px 0; ${nodeCss}">${childrenHtml}</ol>`;
    }
    case "listItem": {
      return `<li style="margin: 4px 0; line-height: 1.5; ${nodeCss}">${childrenHtml}</li>`;
    }
    case "blockquote": {
      return `<blockquote style="border-left: 3px solid #e5e7eb; padding-left: 14px; color: #6b7280; font-style: italic; margin: 16px 0; ${nodeCss}">${childrenHtml}</blockquote>`;
    }
    default:
      return childrenHtml;
  }
}

/**
 * Compiles a canonical EmailDocumentJSON tree into production email-safe HTML with outer canvas wrapper.
 */
export function compileEmailJsonToHtml(
  document: EmailDocumentJSON,
  data: InterpolationData = {},
): string {
  if (!document || !document.doc) return "";

  const defaultCanvasStyle: StyleObject = {
    fontFamily: "Arial, Helvetica, sans-serif",
    backgroundColor: "#ffffff",
    color: "#111827",
    maxWidth: "600px",
    margin: "0 auto",
    padding: "32px",
    borderRadius: "12px",
    borderColor: "#e5e7eb",
    borderWidth: "1px",
    borderStyle: "solid",
    boxSizing: "border-box",
  };
  const canvasStyle = { ...defaultCanvasStyle, ...(document.canvasStyle || {}) };
  const canvasCss = styleObjectToCss(canvasStyle);

  const innerHtml = document.doc.content
    ? document.doc.content
        .map((child) => compileEmailNode(child, data))
        .join("")
    : compileEmailNode(document.doc, data);

  const supportEmail = "support@tiket.com";

  return `
<div data-tiket-wrapper="true" style="${escapeAttribute(canvasCss)}">
  ${innerHtml}
  <hr data-tiket-footer="true" style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 20px 0;" />
  <div data-tiket-footer="true" style="text-align: center; color: #6b7280; font-size: 13px; line-height: 1.5;">
    <p style="margin: 0 0 8px 0;">If you have any questions or queries regarding this event, feel free to reply directly to this email or reach out to us at <a href="mailto:${escapeAttribute(supportEmail)}" style="color: #2563eb; text-decoration: underline;">${escapeHtml(supportEmail)}</a>.</p>
    <p style="margin: 0; font-size: 12px; color: #9ca3af;">Sent via <strong>Tiket Event Platform</strong></p>
  </div>
</div>`.trim();
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
