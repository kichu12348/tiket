import { describe, expect, it } from "bun:test";
import {
  compileEmailJsonToHtml,
  styleObjectToCss,
  interpolateTemplate,
  DEFAULT_TEMPLATES,
  type InterpolationData,
} from "../src/utils/emailService";
import type { EmailDocumentJSON } from "../src/db/schema/emails.schema";

describe("Email JSON Compiler & Variable Interpolation", () => {
  describe("styleObjectToCss", () => {
    it("converts camelCase properties to kebab-case declarations", () => {
      const css = styleObjectToCss({
        backgroundColor: "#f3f4f6",
        borderRadius: "8px",
        paddingTop: "16px",
      });
      expect(css).toContain("background-color: #f3f4f6;");
      expect(css).toContain("border-radius: 8px;");
      expect(css).toContain("padding-top: 16px;");
    });

    it("appends px to numeric dimension values", () => {
      const css = styleObjectToCss({
        fontSize: 16,
        padding: 24,
        minHeight: 100,
      });
      expect(css).toContain("font-size: 16px;");
      expect(css).toContain("padding: 24px;");
      expect(css).toContain("min-height: 100px;");
    });

    it("keeps unitless properties as bare numbers", () => {
      const css = styleObjectToCss({
        fontWeight: 700,
        lineHeight: 1.5,
        opacity: 0.8,
        zIndex: 10,
      });
      expect(css).toContain("font-weight: 700;");
      expect(css).toContain("line-height: 1.5;");
      expect(css).toContain("opacity: 0.8;");
      expect(css).toContain("z-index: 10;");
    });

    it("sanitizes quotes, semicolons, and angle brackets to avoid CSS injection", () => {
      const css = styleObjectToCss({
        color: 'red; background: url("evil.jpg"); <script>',
      });
      expect(css).not.toContain("<");
      expect(css).not.toContain(">");
      expect(css).not.toContain('"');
      expect(css).not.toContain("; background");
    });

    it("ignores undefined, null, or empty string values", () => {
      const css = styleObjectToCss({
        color: undefined,
        backgroundColor: null,
        borderWidth: "",
        margin: "0 auto",
      });
      expect(css).toBe("margin: 0 auto;");
    });
  });

  describe("interpolateTemplate", () => {
    const sampleData: InterpolationData = {
      event: {
        title: "Global Tech Summit 2026",
        startDate: "Nov 20, 2026",
        location: "Convention Hall A",
        url: "https://tiket.com/events/tech-summit",
        passUrl: "https://tiket.com/passes/pass-123",
        organizerName: "Acme Events Inc.",
      },
      attendee: {
        name: "Jane Doe",
        email: "jane@example.com",
        type: "VIP Delegate",
      },
      ticket: {
        id: "tkt-999",
        type: "VIP Delegate",
        qrCode: "QR-TECH-999",
        qrCodeUrl: "https://quickchart.io/qr?text=QR-TECH-999",
      },
      form: {
        "Company Name": "Stark Industries",
        "T-Shirt Size": "XL",
        dietary_req: "Vegetarian",
      },
    };

    it("interpolates event and attendee placeholders including organizerName and attendee.type", () => {
      const text =
        "Welcome {{attendee.name}} ({{attendee.type}}) to {{event.title}} organized by {{event.organizerName}}!";
      const result = interpolateTemplate(text, sampleData);
      expect(result).toBe(
        "Welcome Jane Doe (VIP Delegate) to Global Tech Summit 2026 organized by Acme Events Inc.!",
      );
    });

    it("interpolates form field keys containing spaces, hyphens, and underscores", () => {
      const text =
        "Company: {{form.Company Name}}, Size: {{form.T-Shirt Size}}, Diet: {{form.dietary_req}}";
      const result = interpolateTemplate(text, sampleData);
      expect(result).toBe(
        "Company: Stark Industries, Size: XL, Diet: Vegetarian",
      );
    });

    it("replaces {{ticket.qrCodeUrl}} with raw URL when inside an HTML src attribute", () => {
      const template = '<img src="{{ticket.qrCodeUrl}}" alt="QR" />';
      const result = interpolateTemplate(template, sampleData);
      expect(result).toBe(
        '<img src="https://quickchart.io/qr?text=QR-TECH-999" alt="QR" />',
      );
    });

    it("replaces standalone {{ticket.qrCodeUrl}} in HTML with an img element", () => {
      const template = "<div><p>Your ticket QR:</p>{{ticket.qrCodeUrl}}</div>";
      const result = interpolateTemplate(template, sampleData);
      expect(result).toContain("<img src=\"https://quickchart.io/qr?text=QR-TECH-999\"");
      expect(result).toContain('alt="Ticket QR Code"');
      expect(result).toContain('width="160"');
    });

    it("replaces standalone {{ticket.qrCodeUrl}} in plain text with raw URL", () => {
      const template = "Your ticket QR code URL is {{ticket.qrCodeUrl}}";
      const result = interpolateTemplate(template, sampleData);
      expect(result).toBe(
        "Your ticket QR code URL is https://quickchart.io/qr?text=QR-TECH-999",
      );
    });
  });

  describe("compileEmailJsonToHtml", () => {
    it("renders containerBlock with inline styles and children", () => {
      const doc: EmailDocumentJSON = {
        version: 1,
        doc: {
          type: "doc",
          content: [
            {
              type: "containerBlock",
              attrs: {
                style: {
                  backgroundColor: "#f9fafb",
                  padding: "16px",
                  borderRadius: "8px",
                },
              },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Inside container" }],
                },
              ],
            },
          ],
        },
      };

      const html = compileEmailJsonToHtml(doc);
      expect(html).toContain("background-color: #f9fafb;");
      expect(html).toContain("padding: 16px;");
      expect(html).toContain("border-radius: 8px;");
      expect(html).toContain("Inside container");
    });

    it("renders buttonBlock with CTA styling and alignment", () => {
      const doc: EmailDocumentJSON = {
        version: 1,
        doc: {
          type: "doc",
          content: [
            {
              type: "buttonBlock",
              attrs: {
                href: "https://tiket.com/view-ticket",
                alignment: "center",
                label: "Get Ticket",
                style: {
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  borderRadius: "6px",
                },
              },
              content: [{ type: "text", text: "Get Ticket" }],
            },
          ],
        },
      };

      const html = compileEmailJsonToHtml(doc);
      expect(html).toContain('text-align: center;');
      expect(html).toContain('href="https://tiket.com/view-ticket"');
      expect(html).toContain("background-color: #2563eb;");
      expect(html).toContain("color: #ffffff;");
      expect(html).toContain("Get Ticket");
    });

    it("renders imageBlock with responsive sizing, alt text, and link wrapper", () => {
      const doc: EmailDocumentJSON = {
        version: 1,
        doc: {
          type: "doc",
          content: [
            {
              type: "imageBlock",
              attrs: {
                src: "https://example.com/banner.png",
                alt: "Event Banner",
                href: "https://tiket.com",
                alignment: "center",
                style: { width: "500px", borderRadius: "10px" },
              },
            },
          ],
        },
      };

      const html = compileEmailJsonToHtml(doc);
      expect(html).toContain('src="https://example.com/banner.png"');
      expect(html).toContain('alt="Event Banner"');
      expect(html).toContain('href="https://tiket.com"');
      expect(html).toContain("width: 500px;");
      expect(html).toContain("border-radius: 10px;");
    });

    it("renders headings with appropriate level and marks (bold, italic, underline, link)", () => {
      const doc: EmailDocumentJSON = {
        version: 1,
        doc: {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 2 },
              content: [
                { type: "text", text: "Headline Title " },
                {
                  type: "text",
                  text: "Important Link",
                  marks: [
                    { type: "bold" },
                    { type: "link", attrs: { href: "https://tiket.com/info" } },
                  ],
                },
              ],
            },
          ],
        },
      };

      const html = compileEmailJsonToHtml(doc);
      expect(html).toContain("<h2");
      expect(html).toContain("Headline Title");
      expect(html).toContain("<strong");
      expect(html).toContain('href="https://tiket.com/info"');
    });

    it("renders highlight marks using style.backgroundColor", () => {
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
                  text: "Highlighted Info",
                  marks: [
                    {
                      type: "highlight",
                      attrs: {
                        style: { backgroundColor: "#fef08a" },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      const html = compileEmailJsonToHtml(doc);
      expect(html).toContain('<mark style="background-color: #fef08a;');
      expect(html).toContain("Highlighted Info</mark>");
    });

    it("interpolates variable nodes against InterpolationData", () => {
      const doc: EmailDocumentJSON = {
        version: 1,
        doc: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Hello " },
                {
                  type: "variable",
                  attrs: { key: "{{attendee.name}}", label: "Attendee Name" },
                },
                { type: "text", text: " from " },
                {
                  type: "variable",
                  attrs: { key: "{{form.Organization}}", label: "Organization" },
                },
              ],
            },
          ],
        },
      };

      const data: InterpolationData = {
        attendee: { name: "Alice Wonderland" },
        form: { Organization: "Wonder Corp" },
      };

      const html = compileEmailJsonToHtml(doc, data);
      expect(html).toContain("Hello Alice Wonderland from Wonder Corp");
    });

    it("appends permanent Tiket support footer", () => {
      const doc: EmailDocumentJSON = {
        version: 1,
        doc: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Simple email." }],
            },
          ],
        },
      };

      const html = compileEmailJsonToHtml(doc);
      expect(html).toContain('class="email-canvas-outer"');
      expect(html).toContain('class="email-canvas-inner"');
      expect(html).toContain('data-tiket-footer="true"');
      expect(html).toContain("support@tiket.com");
      expect(html).toContain("Sent via <strong>Tiket Event Platform</strong>");
    });
  });

  describe("DEFAULT_TEMPLATES", () => {
    it("has 5 canonical templates with valid EmailDocumentJSON bodies", () => {
      expect(DEFAULT_TEMPLATES.length).toBe(5);
      const types = DEFAULT_TEMPLATES.map((t) => t.type);
      expect(types).toEqual([
        "confirmation",
        "checkin",
        "invitation",
        "thank_you",
        "sorry",
      ]);

      for (const tpl of DEFAULT_TEMPLATES) {
        expect(tpl.body.version).toBe(1);
        expect(tpl.body.doc.type).toBe("doc");
        expect(Array.isArray(tpl.body.doc.content)).toBe(true);

        const html = compileEmailJsonToHtml(tpl.body, {
          event: { title: "Test Event" },
          attendee: { name: "Bob Smith" },
        });
        expect(html).toContain('data-tiket-wrapper="true"');
        expect(html).toContain('class="email-canvas-outer"');
        expect(html).toContain('class="email-canvas-inner"');
        expect(html).toContain('data-tiket-footer="true"');
        expect(html).toContain("Bob Smith");
        expect(html).toContain("Test Event");
      }
    });
  });
});
