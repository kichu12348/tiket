import { describe, expect, test } from "bun:test";
import { EmailModelSerializer } from "../emailModelSerializer";
import type { EmailDocumentNode } from "@/types/email";

describe("EmailModelSerializer", () => {
  describe("serializeJsonToHtml & deserializeHtmlToJson round-trip", () => {
    test("serializes and deserializes rich content with headings, paragraphs, and inline marks", () => {
      const originalNode: EmailDocumentNode = {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1, textAlign: "center" },
            content: [{ type: "text", text: "Welcome to {{event.title}}" }],
          },
          {
            type: "paragraph",
            attrs: { textAlign: "left" },
            content: [
              { type: "text", text: "Hello " },
              {
                type: "text",
                text: "{{attendee.name}}",
                marks: [{ type: "bold" }],
              },
              { type: "text", text: ", this is an " },
              {
                type: "text",
                text: "important announcement",
                marks: [{ type: "italic" }, { type: "underline" }],
              },
              { type: "text", text: "." },
            ],
          },
          {
            type: "paragraph",
            attrs: {
              backgroundColor: "#f3f4f6",
              borderRadius: "8px",
              padding: "16px",
            },
            content: [
              {
                type: "text",
                text: "Highlighted info box with colored text",
                marks: [
                  {
                    type: "textStyle",
                    attrs: { color: "#1e40af", fontWeight: "600" },
                  },
                ],
              },
            ],
          },
        ],
      };

      const serializedHtml = EmailModelSerializer.serializeJsonToHtml(originalNode);

      // Must be wrapped in outer email container with permanent footer
      expect(serializedHtml).toContain("max-width: 600px");
      expect(serializedHtml).toContain("Welcome to {{event.title}}");
      expect(serializedHtml).toContain("{{attendee.name}}");
      expect(serializedHtml).toContain("Tiket Event Platform");

      // Deserializing must recreate the document tree without throwing or losing content
      const deserializedNode = EmailModelSerializer.deserializeHtmlToJson(serializedHtml);
      expect(deserializedNode.type).toBe("doc");
      expect(deserializedNode.content).toBeDefined();
      expect(deserializedNode.content!.length).toBeGreaterThanOrEqual(3);

      const headingNode = deserializedNode.content![0];
      expect(headingNode.type).toBe("heading");
      expect(headingNode.attrs?.level).toBe(1);
      expect(headingNode.content?.[0].text).toContain("Welcome to {{event.title}}");

      const pNode = deserializedNode.content![1];
      expect(pNode.type).toBe("paragraph");
      const fullPText = pNode.content?.map((c) => c.text).join("") || "";
      expect(fullPText).toContain("Hello {{attendee.name}}");
      expect(fullPText).toContain("important announcement");
    });

    test("losslessly serializes and deserializes Call-to-Action (CTA) buttons", () => {
      const ctaNode: EmailDocumentNode = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { textAlign: "center" },
            content: [
              {
                type: "text",
                text: "Claim Your Digital Pass",
                marks: [
                  {
                    type: "link",
                    attrs: {
                      href: "{{event.passUrl}}",
                      style:
                        "background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;",
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const html = EmailModelSerializer.serializeJsonToHtml(ctaNode);

      // Verify button inline styles and variable link destination
      expect(html).toContain('href="{{event.passUrl}}"');
      expect(html).toContain("background-color: #000000");
      expect(html).toContain("color: #ffffff");
      expect(html).toContain("padding: 12px 24px");
      expect(html).toContain("display: inline-block");
      expect(html).toContain("Claim Your Digital Pass");

      // Deserialize back and verify CTA styling attributes remain intact
      const deserialized = EmailModelSerializer.deserializeHtmlToJson(html);
      const buttonParagraph = deserialized.content![0];
      expect(buttonParagraph.type).toBe("paragraph");

      const linkTextNode = buttonParagraph.content![0];
      expect(linkTextNode.text).toBe("Claim Your Digital Pass");
      const linkMark = linkTextNode.marks?.find((m) => m.type === "link");
      expect(linkMark).toBeDefined();
      expect(linkMark?.attrs?.href).toBe("{{event.passUrl}}");
      expect(linkMark?.attrs?.style).toContain("background-color: #000000");
      expect(linkMark?.attrs?.style).toContain("padding: 12px 24px");
    });

    test("losslessly handles images with variable src like {{ticket.qrCodeUrl}}", () => {
      const imageNode: EmailDocumentNode = {
        type: "doc",
        content: [
          {
            type: "image",
            attrs: {
              src: "{{ticket.qrCodeUrl}}",
              alt: "Ticket Entry QR Code",
              width: "250px",
              alignment: "center",
              href: "{{event.passUrl}}",
            },
          },
        ],
      };

      const html = EmailModelSerializer.serializeJsonToHtml(imageNode);

      expect(html).toContain('src="{{ticket.qrCodeUrl}}"');
      expect(html).toContain('alt="Ticket Entry QR Code"');
      expect(html).toContain("width: 250px");
      expect(html).toContain('href="{{event.passUrl}}"');

      const deserialized = EmailModelSerializer.deserializeHtmlToJson(html);
      expect(deserialized.content).toBeDefined();

      const imgNode = deserialized.content![0];
      expect(imgNode.type).toBe("image");
      expect(imgNode.attrs?.src).toBe("{{ticket.qrCodeUrl}}");
      expect(imgNode.attrs?.alt).toBe("Ticket Entry QR Code");
      expect(imgNode.attrs?.width).toBe("250px");
    });

    test("losslessly serializes and deserializes container card boxes", () => {
      const cardNode: EmailDocumentNode = {
        type: "doc",
        content: [
          {
            type: "container",
            attrs: {
              backgroundColor: "#f9fafb",
              borderColor: "#e5e7eb",
              borderWidth: "1px",
              borderStyle: "solid",
              borderRadius: "8px",
              padding: "20px",
            },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Date: {{event.startDate}}" }],
              },
              {
                type: "paragraph",
                content: [{ type: "text", text: "Venue: {{event.location}}" }],
              },
            ],
          },
        ],
      };

      const html = EmailModelSerializer.serializeJsonToHtml(cardNode);
      expect(html).toContain("background-color: #f9fafb");
      expect(html).toContain("border-color: #e5e7eb");
      expect(html).toContain("padding: 20px");
      expect(html).toContain("Date: {{event.startDate}}");
      expect(html).toContain("Venue: {{event.location}}");

      const deserialized = EmailModelSerializer.deserializeHtmlToJson(html);
      const containerNode = deserialized.content![0];
      expect(containerNode.type).toBe("container");
      expect(containerNode.attrs?.backgroundColor).toBe("#f9fafb");
      expect(containerNode.attrs?.borderColor).toBe("#e5e7eb");
      expect(containerNode.content?.length).toBe(2);
    });

    test("losslessly handles lists, blockquotes, and horizontal rules", () => {
      const docNode: EmailDocumentNode = {
        type: "doc",
        content: [
          {
            type: "blockquote",
            attrs: { color: "#4b5563" },
            content: [{ type: "text", text: "A quote from the speaker" }],
          },
          {
            type: "horizontalRule",
          },
          {
            type: "bulletList",
            content: [
              {
                type: "listItem",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Point A" }] }],
              },
              {
                type: "listItem",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Point B" }] }],
              },
            ],
          },
        ],
      };

      const html = EmailModelSerializer.serializeJsonToHtml(docNode);
      expect(html).toContain("<blockquote");
      expect(html).toContain("A quote from the speaker");
      expect(html).toContain("<hr");
      expect(html).toContain("<ul");
      expect(html).toContain("<li");
      expect(html).toContain("Point A");
      expect(html).toContain("Point B");

      const deserialized = EmailModelSerializer.deserializeHtmlToJson(html);
      expect(deserialized.content).toBeDefined();
      expect(deserialized.content!.some((n) => n.type === "blockquote")).toBe(true);
      expect(deserialized.content!.some((n) => n.type === "horizontalRule")).toBe(true);
      expect(deserialized.content!.some((n) => n.type === "bulletList")).toBe(true);
    });
  });

  describe("Backend DEFAULT_TEMPLATES deserialization", () => {
    const confirmationTemplate = `
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
`.trim();

    const checkinTemplate = `
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
`.trim();

    const invitationTemplate = `
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
`.trim();

    const thankYouTemplate = `
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
`.trim();

    const sorryTemplate = `
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
`.trim();

    test("deserializes confirmation template preserving inner card box and CTA button", () => {
      const doc = EmailModelSerializer.deserializeHtmlToJson(confirmationTemplate);
      expect(doc.type).toBe("doc");
      expect(doc.content).toBeDefined();

      // Heading
      const heading = doc.content![0];
      expect(heading.type).toBe("heading");
      expect(heading.attrs?.level).toBe(2);
      expect(heading.content?.[0].text).toContain("You're confirmed for {{event.title}}!");

      // Find the card container
      const container = doc.content!.find((n) => n.type === "container");
      expect(container).toBeDefined();
      expect(container?.attrs?.backgroundColor).toBe("#f9fafb");
      expect(container?.attrs?.borderColor).toBe("#e5e7eb");

      // Find CTA button
      const ctaP = doc.content!.find(
        (n) =>
          n.type === "paragraph" &&
          n.content?.some((c) => c.marks?.some((m) => m.type === "link")),
      );
      expect(ctaP).toBeDefined();
      const linkMark = ctaP!.content![0].marks!.find((m) => m.type === "link")!;
      expect(linkMark.attrs?.href).toBe("{{event.passUrl}}");
      expect(linkMark.attrs?.style).toContain("background-color: #000000");

      // Verify re-serializing produces intact HTML
      const reserialized = EmailModelSerializer.serializeJsonToHtml(doc);
      expect(reserialized).toContain("You're confirmed for {{event.title}}!");
      expect(reserialized).toContain("{{event.startDate}}");
      expect(reserialized).toContain("{{event.passUrl}}");
      expect(reserialized).toContain("background-color: #f9fafb");
    });

    test("deserializes checkin, invitation, thank_you, and sorry templates cleanly", () => {
      const templates = [
        { name: "checkin", html: checkinTemplate, expected: "Welcome to {{event.title}}!" },
        { name: "invitation", html: invitationTemplate, expected: "You're Invited! ✨" },
        { name: "thank_you", html: thankYouTemplate, expected: "Thank You for Coming! 🙌" },
        { name: "sorry", html: sorryTemplate, expected: "We Missed You! 💔" },
      ];

      for (const t of templates) {
        const doc = EmailModelSerializer.deserializeHtmlToJson(t.html);
        expect(doc.type).toBe("doc");
        expect(doc.content!.length).toBeGreaterThan(0);

        const heading = doc.content![0];
        expect(heading.type).toBe("heading");
        expect(heading.content?.[0].text).toContain(t.expected);

        const reserialized = EmailModelSerializer.serializeJsonToHtml(doc);
        expect(reserialized).toContain(t.expected);
        expect(reserialized).toContain("{{attendee.name}}");
      }
    });

    test("handles empty and malformed HTML gracefully", () => {
      expect(EmailModelSerializer.deserializeHtmlToJson("")).toEqual({
        type: "doc",
        content: [{ type: "paragraph", content: [] }],
      });

      expect(EmailModelSerializer.deserializeHtmlToJson("   ")).toEqual({
        type: "doc",
        content: [{ type: "paragraph", content: [] }],
      });

      const plainText = EmailModelSerializer.deserializeHtmlToJson("Just raw unformatted text");
      expect(plainText.type).toBe("doc");
      expect(plainText.content![0].content![0].text).toBe("Just raw unformatted text");
    });
  });
});
