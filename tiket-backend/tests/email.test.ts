import { describe, expect, test, spyOn } from "bun:test";
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

import {
  calculateEmailAnalytics,
  trackEmailOpen,
  resendEmailLog,
} from "../src/controllers/email.controller";
import db from "../src/db";
import { emailLogs } from "../src/db/schema";
import * as permissions from "../src/utils/permissions";
import * as mailService from "../src/services/mail.service";

describe("Email Analytics Calculation", () => {
  test("aggregates totalSent, totalFailed, totalOpened, totalUnopened and openRatePercent correctly", () => {
    const fixtureLogs = [
      {
        templateType: "confirmation",
        status: "sent",
        openedAt: new Date("2026-11-01T10:00:00Z"),
        openCount: 2,
        sentAt: new Date("2026-11-01T09:00:00Z"),
      },
      {
        templateType: "confirmation",
        status: "sent",
        openedAt: null,
        openCount: 0,
        sentAt: new Date("2026-11-01T09:30:00Z"),
      },
      {
        templateType: "checkin",
        status: "sent",
        openedAt: new Date("2026-11-02T12:00:00Z"),
        openCount: 1,
        sentAt: new Date("2026-11-02T11:00:00Z"),
      },
      {
        templateType: "invitation",
        status: "failed",
        openedAt: null,
        openCount: 0,
        sentAt: new Date("2026-11-02T11:30:00Z"),
      },
    ];

    const analytics = calculateEmailAnalytics(fixtureLogs);

    expect(analytics.totalSent).toBe(3);
    expect(analytics.totalFailed).toBe(1);
    expect(analytics.totalOpened).toBe(2);
    expect(analytics.totalUnopened).toBe(1);
    expect(analytics.openRatePercent).toBe(67); // 2 / 3 * 100 = 66.66% -> 67%
  });

  test("calculates breakdown by template type across standard and custom types", () => {
    const fixtureLogs = [
      {
        templateType: "confirmation",
        status: "sent",
        openedAt: new Date("2026-11-01T10:00:00Z"),
        openCount: 1,
        sentAt: new Date("2026-11-01T09:00:00Z"),
      },
      {
        templateType: "confirmation",
        status: "sent",
        openedAt: null,
        openCount: 0,
        sentAt: new Date("2026-11-01T09:30:00Z"),
      },
      {
        templateType: "custom",
        status: "sent",
        openedAt: new Date("2026-11-03T10:00:00Z"),
        openCount: 3,
        sentAt: new Date("2026-11-03T09:00:00Z"),
      },
    ];

    const analytics = calculateEmailAnalytics(fixtureLogs);

    const confirmationStat = analytics.byType.find(
      (t) => t.templateType === "confirmation",
    );
    expect(confirmationStat).toBeDefined();
    expect(confirmationStat?.sent).toBe(2);
    expect(confirmationStat?.opened).toBe(1);
    expect(confirmationStat?.unopened).toBe(1);
    expect(confirmationStat?.openRatePercent).toBe(50);

    const customStat = analytics.byType.find((t) => t.templateType === "custom");
    expect(customStat).toBeDefined();
    expect(customStat?.sent).toBe(1);
    expect(customStat?.opened).toBe(1);
    expect(customStat?.unopened).toBe(0);
    expect(customStat?.openRatePercent).toBe(100);

    const checkinStat = analytics.byType.find((t) => t.templateType === "checkin");
    expect(checkinStat).toBeDefined();
    expect(checkinStat?.sent).toBe(0);
    expect(checkinStat?.opened).toBe(0);
  });

  test("groups timeline velocity by date bucket", () => {
    const fixtureLogs = [
      {
        templateType: "confirmation",
        status: "sent",
        openedAt: new Date("2026-11-01T12:00:00Z"),
        openCount: 1,
        sentAt: new Date("2026-11-01T08:00:00Z"),
      },
      {
        templateType: "checkin",
        status: "sent",
        openedAt: new Date("2026-11-02T15:00:00Z"),
        openCount: 1,
        sentAt: new Date("2026-11-02T10:00:00Z"),
      },
    ];

    const analytics = calculateEmailAnalytics(fixtureLogs);
    expect(analytics.timeline.length).toBe(2);
    expect(analytics.timeline[0]!.bucket).toBe("2026-11-01");
    expect(analytics.timeline[0]!.sent).toBe(1);
    expect(analytics.timeline[0]!.opened).toBe(1);
    expect(analytics.timeline[1]!.bucket).toBe("2026-11-02");
  });
});

describe("Tracking Pixel & Resend Endpoints", () => {
  function createMockReply() {
    const headers: Record<string, string> = {};
    let statusCode = 200;
    let sentData: any = null;

    const reply: any = {
      header: (name: string, value: string) => {
        headers[name.toLowerCase()] = value;
        return reply;
      },
      status: (code: number) => {
        statusCode = code;
        return reply;
      },
      send: (data: any) => {
        sentData = data;
        return reply;
      },
      getHeaders: () => headers,
      getStatusCode: () => statusCode,
      getSentData: () => sentData,
    };
    return reply;
  }

  test("GET /api/emails/track/:logId.gif strips .gif, increments openCount, and returns transparent GIF", async () => {
    const mockReply = createMockReply();
    const testLogId = "0192e123-4567-789a-bcde-f0123456789a";

    let updateCalledWithId = "";
    const origUpdate = db.update;
    (db as any).update = (table: any) => {
      return {
        set: (_values: any) => ({
          where: (clause: any) => {
            updateCalledWithId = testLogId;
            return Promise.resolve();
          },
        }),
      };
    };

    try {
      const mockRequest: any = {
        params: { logId: `${testLogId}.gif` },
      };

      await trackEmailOpen(mockRequest, mockReply);

      // Verify header and 1x1 gif payload
      expect(mockReply.getHeaders()["content-type"]).toBe("image/gif");
      expect(mockReply.getHeaders()["cache-control"]).toBe(
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );
      expect(Buffer.isBuffer(mockReply.getSentData())).toBe(true);
      expect(mockReply.getSentData().length).toBe(42);
      expect(updateCalledWithId).toBe(testLogId);
    } finally {
      db.update = origUpdate;
    }
  });

  test("resendEmailLog redelivers message, increments resentCount and returns updated log", async () => {
    const mockReply = createMockReply();
    const eventId = "0192e123-4567-789a-bcde-f0123456789a";
    const logId = "0192e999-4567-789a-bcde-f0123456789a";

    const mockRequest: any = {
      jwtVerify: async () => {},
      user: { id: "user-organizer-1" },
      params: { eventId, logId },
    };

    const spyVerify = spyOn(permissions, "verifyEventPermission").mockResolvedValue(
      true as any,
    );

    let deliverMailCalled = false;
    let deliveredBody = "";
    const spyDeliverMail = spyOn(mailService, "deliverMail").mockImplementation(
      async (msg: any) => {
        deliverMailCalled = true;
        deliveredBody = msg.body;
      },
    );

    const origSelect = db.select;
    (db as any).select = () => ({
      from: () => ({
        where: () => [
          {
            id: logId,
            eventId,
            recipientEmail: "attendee@test.com",
            recipientName: "Test Attendee",
            subject: "Your Confirmation",
            renderedBody: "<p>Original Body</p>",
            status: "sent",
            resentCount: 0,
          },
        ],
      }),
    });

    const origUpdate = db.update;
    (db as any).update = () => ({
      set: () => ({
        where: () => ({
          returning: () => [
            {
              id: logId,
              eventId,
              recipientEmail: "attendee@test.com",
              recipientName: "Test Attendee",
              subject: "Your Confirmation",
              renderedBody: "<p>Original Body</p>",
              status: "sent",
              resentCount: 1,
              lastResentAt: new Date().toISOString(),
            },
          ],
        }),
      }),
    });

    try {
      await resendEmailLog(mockRequest, mockReply);

      expect(deliverMailCalled).toBe(true);
      expect(deliveredBody).toContain("<p>Original Body</p>");
      expect(deliveredBody).toContain(`/api/emails/track/${logId}.gif`);

      const sentLog = mockReply.getSentData();
      expect(sentLog.id).toBe(logId);
      expect(sentLog.resentCount).toBe(1);
    } finally {
      spyVerify.mockRestore();
      spyDeliverMail.mockRestore();
      db.select = origSelect;
      db.update = origUpdate;
    }
  });
});

