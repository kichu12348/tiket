import { describe, expect, test } from "bun:test";
import {
  interpolateTemplate,
  DEFAULT_TEMPLATES,
  type InterpolationData,
} from "../src/utils/emailService";
import { sanitizeEmailHtml } from "../src/utils/html";

describe("Email Template Interpolation", () => {
  test("interpolates {{event.title}}, {{attendee.name}}, {{ticket.qrCodeUrl}}, and {{form.Company}}", () => {
    const template = `Hello {{attendee.name}}, welcome to {{event.title}}!
Your ticket QR is available at {{ticket.qrCodeUrl}}.
Registered for company: {{form.Company}}.`;

    const data: InterpolationData = {
      event: {
        title: "Global Tech Summit 2026",
      },
      attendee: {
        name: "Jane Doe",
      },
      ticket: {
        qrCode: "TKT-QR-778899",
      },
      form: {
        Company: "Acme Corporation",
      },
    };

    const result = interpolateTemplate(template, data);

    expect(result).toContain("Hello Jane Doe, welcome to Global Tech Summit 2026!");
    expect(result).toContain(
      "https://quickchart.io/qr?text=TKT-QR-778899&size=300&margin=1",
    );
    expect(result).toContain("Registered for company: Acme Corporation.");
  });

  test("uses explicit qrCodeUrl if provided in ticket data", () => {
    const template = "QR: {{ticket.qrCodeUrl}}";
    const data: InterpolationData = {
      ticket: {
        qrCode: "TKT-123",
        qrCodeUrl: "https://custom-qr.example.com/qr/TKT-123.png",
      },
    };

    const result = interpolateTemplate(template, data);
    expect(result).toBe("QR: https://custom-qr.example.com/qr/TKT-123.png");
  });

  test("interpolates ticket.qrCode and ticket.type", () => {
    const template = "Pass {{ticket.type}} ({{ticket.qrCode}})";
    const data: InterpolationData = {
      ticket: {
        type: "VIP",
        qrCode: "TKT-VIP-001",
      },
    };

    const result = interpolateTemplate(template, data);
    expect(result).toBe("Pass VIP (TKT-VIP-001)");
  });

  test("leaves unmapped placeholders intact and handles empty strings", () => {
    expect(interpolateTemplate("")).toBe("");
    expect(interpolateTemplate("Missing {{unknown.key}}")).toBe(
      "Missing {{unknown.key}}",
    );
  });
});

describe("Email HTML Sanitization", () => {
  test("preserves inline styles on <a> and <div> tags while stripping dangerous elements", () => {
    const rawHtml = `
      <div style="background-color: #000000; color: #ffffff; padding: 12px 24px;" onerror="alert('xss')">
        <a href="https://example.com/pass" style="background-color: #000000; color: #ffffff; padding: 12px 24px;">View Pass</a>
        <a href="javascript:alert('malicious')">Unsafe Link</a>
        <script>alert('dangerous script');</script>
      </div>
    `.trim();

    const sanitized = sanitizeEmailHtml(rawHtml);

    // Style attributes should be preserved on both <div> and <a>
    expect(sanitized).toContain('style="background-color:#000000;color:#ffffff;padding:12px 24px"');
    expect(sanitized).toContain('href="https://example.com/pass"');

    // Dangerous elements and handlers must be stripped
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("alert('dangerous script')");
    expect(sanitized).not.toContain("onerror");
    expect(sanitized).not.toContain("javascript:");
  });

  test("strips javascript in CSS style values", () => {
    const maliciousStyleHtml = `
      <div style="background: url('javascript:alert(1)'); color: #ffffff;">
        Content
      </div>
    `.trim();

    const sanitized = sanitizeEmailHtml(maliciousStyleHtml);
    expect(sanitized).not.toContain("javascript:");
    expect(sanitized).toContain("color:#ffffff");
  });

  test("allows email layout tables, headers, and standard email tags", () => {
    const emailLayout = `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th align="center" style="font-size: 18px; font-weight: bold;">Order Summary</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td valign="top" style="padding: 16px; border: 1px solid #e5e7eb;">
              <h2>Confirmation</h2>
              <p style="font-family: Arial, sans-serif; line-height: 1.5; margin: 0 0 10px 0;">Thank you!</p>
              <hr />
              <img src="https://example.com/logo.png" alt="Logo" width="200" height="50" style="display: block;" />
            </td>
          </tr>
        </tbody>
      </table>
    `.trim();

    const sanitized = sanitizeEmailHtml(emailLayout);

    expect(sanitized).toContain("<table");
    expect(sanitized).toContain('width="100%"');
    expect(sanitized).toContain('cellpadding="0"');
    expect(sanitized).toContain('cellspacing="0"');
    expect(sanitized).toContain("<thead");
    expect(sanitized).toContain("<tbody");
    expect(sanitized).toContain("<tr");
    expect(sanitized).toContain("<td");
    expect(sanitized).toContain("<th");
    expect(sanitized).toContain("<h2");
    expect(sanitized).toContain("<p");
    expect(sanitized).toContain("<hr");
    expect(sanitized).toContain("<img");
    expect(sanitized).toContain('src="https://example.com/logo.png"');
    expect(sanitized).toContain('alt="Logo"');
  });

  test("preserves all system default email templates styles and markup", () => {
    for (const template of DEFAULT_TEMPLATES) {
      const sanitized = sanitizeEmailHtml(template.body);
      expect(sanitized.length).toBeGreaterThan(0);
      expect(sanitized).toContain("style=");
      expect(sanitized).not.toContain("<script");
      expect(sanitized).not.toContain("javascript:");
    }
  });
});

