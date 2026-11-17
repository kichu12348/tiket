import { describe, test, expect } from "bun:test";
import {
  compileEmailJsonToHtml,
  normalizeEmailDocument,
  flattenInterpolationData,
  styleObjectToCss,
} from "../src/utils/emailJsonCompiler";
import { sanitizeEmailHtml } from "../src/utils/html";
import type { EmailDocumentJSON } from "@db/schema";

describe("Email JSON Compiler (Backend)", () => {
  test("compiles empty document gracefully", () => {
    // @ts-expect-error testing undefined input
    expect(compileEmailJsonToHtml(null)).toBe("");
  });

  test("compiles paragraph and wraps in outer/inner canvas", () => {
    const doc: EmailDocumentJSON = {
      version: 1,
      canvasStyle: {
        backgroundColor: "#f4f4f5",
        contentBackgroundColor: "#ffffff",
        maxWidth: "600px",
        padding: "24px",
      },
      doc: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: {
              alignment: "center",
              style: { color: "#1e293b", fontSize: "16px" },
            },
            content: [{ type: "text", text: "Hello World" }],
          },
        ],
      },
    };

    const html = compileEmailJsonToHtml(doc);

    expect(html).toContain('class="email-canvas-outer"');
    expect(html).toContain('class="email-canvas-inner"');
    expect(html).toContain("background-color: #f4f4f5;");
    expect(html).toContain("background-color: #ffffff;");
    expect(html).toContain("max-width: 600px;");
    expect(html).toContain("padding: 24px;");
    expect(html).toContain("<p style=\"text-align: center; margin: 0 0 16px 0; color: #1e293b; font-size: 16px;\">Hello World</p>");
    // Tiket platform footer is appended
    expect(html).toContain('data-tiket-footer="true"');
    expect(html).toContain("support@tiket.com");
  });

  test("properly normalizes legacy flat attributes from TipTap", () => {
    const doc: EmailDocumentJSON = {
      version: 1,
      doc: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: {
              textAlign: "right",
              color: "#dc2626",
              fontSize: "18px",
            },
            content: [{ type: "text", text: "Styled with flat attrs" }],
          },
          {
            type: "ctaButton" as unknown as "buttonBlock",
            attrs: {
              url: "https://example.com",
              buttonColor: "#2563eb",
              textColor: "#ffffff",
              padding: "10px 20px",
            },
            content: [{ type: "text", text: "Register Now" }],
          },
        ],
      },
    };

    const html = compileEmailJsonToHtml(doc);
    expect(html).toContain("text-align: right;");
    expect(html).toContain("color: #dc2626;");
    expect(html).toContain("font-size: 18px;");
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("background-color: #2563eb;");
    expect(html).toContain("color: #ffffff;");
  });

  test("interpolates nested InterpolationData and flat variables map", () => {
    const doc: EmailDocumentJSON = {
      version: 1,
      doc: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Hi {{attendee.name}}, welcome to {{event.title}}! Pass: {{event.passUrl}}",
              },
            ],
          },
        ],
      },
    };

    // 1. Nested InterpolationData
    const nestedHtml = compileEmailJsonToHtml(doc, {
      event: { title: "Tech Conf 2026", passUrl: "https://tiket.com/pass/123" },
      attendee: { name: "Alice" },
    });
    expect(nestedHtml).toContain("Hi Alice, welcome to Tech Conf 2026! Pass: https://tiket.com/pass/123");

    // 2. Flat Record<string, string>
    const flatHtml = compileEmailJsonToHtml(doc, {
      "attendee.name": "Bob",
      "event.title": "Music Fest",
      "event.passUrl": "https://tiket.com/pass/456",
    });
    expect(flatHtml).toContain("Hi Bob, welcome to Music Fest! Pass: https://tiket.com/pass/456");
  });

  test("renders ticket.qrCodeUrl as an unescaped <img> element", () => {
    const doc: EmailDocumentJSON = {
      version: 1,
      doc: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "{{ticket.qrCodeUrl}}",
              },
            ],
          },
        ],
      },
    };

    const html = compileEmailJsonToHtml(doc, {
      ticket: {
        qrCodeUrl: "https://quickchart.io/qr?text=TKT-ALICE-999&size=300",
      },
    });

    expect(html).toContain('<img src="https://quickchart.io/qr?text=TKT-ALICE-999&size=300" alt="Ticket QR Code"');
    // Ensure it is NOT escaped to &lt;img
    expect(html).not.toContain("&lt;img");
  });

  test("renders semantic marks: bold, italic, underline, strike, code, link", () => {
    const doc: EmailDocumentJSON = {
      version: 1,
      doc: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "bold", marks: [{ type: "bold" }] },
              { type: "text", text: "italic", marks: [{ type: "italic" }] },
              { type: "text", text: "underline", marks: [{ type: "underline" }] },
              { type: "text", text: "strike", marks: [{ type: "strike" }] },
              { type: "text", text: "code", marks: [{ type: "code" }] },
              {
                type: "text",
                text: "link",
                marks: [{ type: "link", attrs: { href: "https://tiket.com" } }],
              },
            ],
          },
        ],
      },
    };

    const html = compileEmailJsonToHtml(doc);
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<u>underline</u>");
    expect(html).toContain("<s>strike</s>");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain('<a href="https://tiket.com" target="_blank"');
  });

  test("sanitizer preserves compiled rich text elements", () => {
    const rawHtml = `
      <div class="email-canvas-outer" style="background-color: #ffffff;">
        <div class="email-canvas-inner" style="max-width: 600px;">
          <p>Paragraph with <strong>bold</strong>, <em>italic</em>, <u>underline</u>, <s>strike</s>, <code>code</code></p>
          <blockquote style="border-left: 4px solid #d4d4d8;">A quote here</blockquote>
          <mark style="background-color: #fef08a;">Highlighted</mark>
          <img src="https://quickchart.io/qr?text=123" alt="QR" width="160" height="160" />
        </div>
      </div>
    `;

    const sanitized = sanitizeEmailHtml(rawHtml);
    expect(sanitized).toContain("<u>underline</u>");
    expect(sanitized).toContain("<s>strike</s>");
    expect(sanitized).toContain("<code>code</code>");
    expect(sanitized).toContain("A quote here");
    expect(sanitized).toContain("<blockquote");
    expect(sanitized).toContain("<mark");
    expect(sanitized).toContain("<img src=");
  });
});
