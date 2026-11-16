import { describe, expect, test } from "bun:test";
import {
  styleObjectToCss,
  createDefaultEmailDocument,
  compileEmailJsonToHtml,
  normalizeEmailDocumentDoc,
  normalizeEmailDocument,
} from "../emailJsonCompiler";
import type { EmailDocumentJSON, StyleObject } from "@/types/email";

describe("emailJsonCompiler", () => {
  describe("styleObjectToCss", () => {
    test("converts camelCase properties to kebab-case CSS declarations", () => {
      const style = {
        backgroundColor: "#09090b",
        borderRadius: "8px",
        textAlign: "center",
      };
      const css = styleObjectToCss(style);
      expect(css).toContain("background-color: #09090b;");
      expect(css).toContain("border-radius: 8px;");
      expect(css).toContain("text-align: center;");
    });

    test("automatically appends px to numeric dimension values", () => {
      const style = {
        fontSize: 14,
        padding: 24,
        width: 600,
        borderRadius: 12,
      };
      const css = styleObjectToCss(style);
      expect(css).toContain("font-size: 14px;");
      expect(css).toContain("padding: 24px;");
      expect(css).toContain("width: 600px;");
      expect(css).toContain("border-radius: 12px;");
    });

    test("leaves unitless properties untouched", () => {
      const style = {
        fontWeight: 700,
        lineHeight: 1.6,
        opacity: 0.9,
        zIndex: 10,
      };
      const css = styleObjectToCss(style);
      expect(css).toContain("font-weight: 700;");
      expect(css).toContain("line-height: 1.6;");
      expect(css).toContain("opacity: 0.9;");
      expect(css).toContain("z-index: 10;");
    });

    test("filters out null, undefined and empty strings", () => {
      const style = {
        color: "#ffffff",
        backgroundColor: null,
        borderColor: undefined,
        borderWidth: "",
      };
      const css = styleObjectToCss(style);
      expect(css).toBe("color: #ffffff;");
    });
  });

  describe("createDefaultEmailDocument", () => {
    test("returns valid version 1 document with canvas style and starter paragraph", () => {
      const doc = createDefaultEmailDocument();
      expect(doc.version).toBe(1);
      expect(doc.canvasStyle?.backgroundColor).toBe("#ffffff");
      expect(doc.canvasStyle?.contentWidth).toBe("600px");
      expect(doc.doc.type).toBe("doc");
      expect(doc.doc.content?.length).toBeGreaterThanOrEqual(1);
      expect(doc.doc.content?.[0]?.type).toBe("paragraph");
    });
  });

  describe("compileEmailJsonToHtml", () => {
    test("compiles full document with canvas wrapper", () => {
      const doc: EmailDocumentJSON = {
        version: 1,
        canvasStyle: {
          backgroundColor: "#18181b",
          contentBackgroundColor: "#27272a",
          contentWidth: "580px",
          padding: "24px",
        },
        doc: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              attrs: { style: { color: "#ffffff" } },
              content: [{ type: "text", text: "Hello Tiket!" }],
            },
          ],
        },
      };

      const html = compileEmailJsonToHtml(doc);
      expect(html).toContain("background-color: #18181b");
      expect(html).toContain("max-width: 580px");
      expect(html).toContain("<p style=\"text-align: left; margin: 0 0 16px 0; color: #ffffff;\">Hello Tiket!</p>");
    });

    test("interpolates variable tokens and handles standalone ticket.qrCodeUrl", () => {
      const doc: EmailDocumentJSON = {
        version: 1,
        doc: {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 2, alignment: "center" },
              content: [
                { type: "text", text: "Welcome to " },
                { type: "variable", attrs: { key: "event.title" } },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Hi {{attendee.name}}, your pass is ready." },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "variable", attrs: { key: "ticket.qrCodeUrl" } },
              ],
            },
          ],
        },
      };

      const vars = {
        "event.title": "Global Tech Summit",
        "attendee.name": "Alice Cooper",
        "ticket.qrCodeUrl": "https://tiket.app/qr/TKT-12345",
      };

      const html = compileEmailJsonToHtml(doc, vars);
      expect(html).toContain("Welcome to Global Tech Summit");
      expect(html).toContain("<h2");
      expect(html).toContain("Hi Alice Cooper, your pass is ready.");
      expect(html).toContain('<img src="https://tiket.app/qr/TKT-12345" alt="Ticket QR Code" width="160" height="160"');
    });

    test("compiles containerBlock, buttonBlock and imageBlock with links", () => {
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
                  borderRadius: "12px",
                },
              },
              content: [
                {
                  type: "buttonBlock",
                  attrs: {
                    href: "https://tiket.app/pass/{{ticket.id}}",
                    alignment: "center",
                    style: {
                      backgroundColor: "#000000",
                      color: "#ffffff",
                    },
                  },
                  content: [{ type: "text", text: "Download Pass" }],
                },
                {
                  type: "imageBlock",
                  attrs: {
                    src: "https://tiket.app/banner.png",
                    alt: "Event Banner",
                    href: "https://tiket.app",
                    style: { width: "400px" },
                  },
                },
              ],
            },
          ],
        },
      };

      const vars = { "ticket.id": "TKT-999" };
      const html = compileEmailJsonToHtml(doc, vars);

      expect(html).toContain('data-node-type="containerBlock"');
      expect(html).toContain('data-node-type="buttonBlock"');
      expect(html).toContain('href="https://tiket.app/pass/TKT-999"');
      expect(html).toContain("Download Pass");
      expect(html).toContain('data-node-type="imageBlock"');
      expect(html).toContain('<img src="https://tiket.app/banner.png" alt="Event Banner"');
    });
  });

  describe("normalizeEmailDocumentDoc", () => {
    test("strips null attributes and nests styles inside attrs.style", () => {
      const pollutedDoc = {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: {
              level: 2,
              textAlign: null,
              backgroundColor: null,
              borderColor: null,
              borderWidth: null,
              borderStyle: null,
              borderRadius: null,
              padding: null,
              marginTop: null,
              marginBottom: null,
              style: {
                color: "#111827",
                fontSize: "22px",
                fontWeight: "700",
              },
            },
            content: [{ type: "text", text: "Confirmed" }],
          },
          {
            type: "paragraph",
            attrs: {
              textAlign: null,
              backgroundColor: null,
              borderColor: null,
              borderWidth: null,
              borderStyle: null,
              borderRadius: null,
              padding: null,
              marginTop: null,
              marginBottom: null,
              style: {
                color: "#4b5563",
                fontSize: "15px",
              },
            },
            content: [{ type: "text", text: "Hello" }],
          },
          {
            type: "ctaButton",
            attrs: {
              url: "https://tiket.com/pass",
              label: "View Pass",
              buttonColor: "#000000",
              textColor: "#ffffff",
              borderRadius: "8px",
              alignment: "center",
            },
          },
        ],
      };

      const normalized = normalizeEmailDocumentDoc(pollutedDoc);
      expect(normalized.type).toBe("doc");

      const headingNode = normalized.content?.[0];
      const headingStyle = headingNode?.attrs?.style as StyleObject;
      expect(headingNode?.attrs?.level).toBe(2);
      expect(headingStyle?.color).toBe("#111827");
      expect(headingStyle?.fontSize).toBe("22px");
      // Must not contain any null attributes
      expect("textAlign" in (headingNode?.attrs || {})).toBe(false);
      expect("backgroundColor" in (headingNode?.attrs || {})).toBe(false);
      expect("borderWidth" in (headingNode?.attrs || {})).toBe(false);

      const btnNode = normalized.content?.[2];
      const btnStyle = btnNode?.attrs?.style as StyleObject;
      expect(btnNode?.type).toBe("buttonBlock");
      expect(btnNode?.attrs?.href).toBe("https://tiket.com/pass");
      expect(btnNode?.attrs?.label).toBe("View Pass");
      expect(btnStyle?.backgroundColor).toBe("#000000");
      expect(btnStyle?.color).toBe("#ffffff");

      const fullDoc = normalizeEmailDocument({
        version: 1,
        doc: pollutedDoc,
      });
      expect(fullDoc.version).toBe(1);
      expect(fullDoc.canvasStyle?.backgroundColor).toBe("#ffffff");
      expect(fullDoc.doc.content?.length).toBe(3);
    });

    test("normalizes highlight mark attributes into style: { backgroundColor }", () => {
      const docWithHighlight: EmailDocumentJSON["doc"] = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Highlighted Note",
                marks: [
                  {
                    type: "highlight",
                    attrs: {
                      color: "#fef08a",
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const normalized = normalizeEmailDocumentDoc(docWithHighlight);
      const textNode = normalized.content?.[0]?.content?.[0];
      const highlightMark = textNode?.marks?.find((m) => m.type === "highlight");
      expect(highlightMark).toBeDefined();
      expect((highlightMark?.attrs?.style as StyleObject)?.backgroundColor).toBe("#fef08a");

      const compiledHtml = compileEmailJsonToHtml({
        version: 1,
        doc: normalized,
      });
      expect(compiledHtml).toContain('<mark style="background-color: #fef08a;">Highlighted Note</mark>');
    });
  });
});
