/**
 * Pure domain serializer service following Single Responsibility Principle (SRP).
 * Converts structured JSON Document Trees into email-safe inline HTML with explicit
 * inline style attributes (colors, text-align, text-decoration, font sizes, font families, borders, background, padding).
 */

export interface EmailDocumentMark {
  type: string;
  attrs?: Record<string, string | number | boolean>;
}

export interface EmailDocumentNode {
  type: string;
  attrs?: Record<string, string | number | boolean>;
  content?: EmailDocumentNode[];
  text?: string;
  marks?: EmailDocumentMark[];
}

export class EmailModelSerializer {
  /**
   * Compiles a structured JSON Document Tree into email-ready inline HTML with permanent footer.
   */
  public static serializeJsonToHtml(node: EmailDocumentNode): string {
    if (!node) return "";

    if (node.type === "doc" && node.content) {
      const innerHtml = node.content
        .map((child) => this.serializeJsonToHtml(child))
        .join("");

      return `
<div style="font-family: Arial, Helvetica, sans-serif; background-color: #ffffff; color: #111827; max-width: 600px; margin: 0 auto; padding: 32px; border-radius: 12px; border: 1px solid #e5e7eb; box-sizing: border-box;">
  ${innerHtml}
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 20px 0;" />
  <div style="text-align: center; color: #6b7280; font-size: 13px; line-height: 1.5;">
    <p style="margin: 0 0 8px 0;">If you have any questions or queries regarding this event, feel free to reply directly to this email or reach out to us at <a href="mailto:support@tiket.com" style="color: #2563eb; text-decoration: underline;">support@tiket.com</a>.</p>
    <p style="margin: 0; font-size: 12px; color: #9ca3af;">Sent via <strong>Tiket Event Platform</strong></p>
  </div>
</div>
`.trim();
    }

    return this.renderNode(node);
  }

  private static renderNode(node: EmailDocumentNode): string {
    if (node.type === "text" && node.text) {
      let text = this.escapeHtml(node.text);
      if (node.marks) {
        node.marks.forEach((mark) => {
          if (mark.type === "bold") {
            text = `<strong style="font-weight: 700;">${text}</strong>`;
          } else if (mark.type === "italic") {
            text = `<em style="font-style: italic;">${text}</em>`;
          } else if (mark.type === "underline") {
            text = `<span style="text-decoration: underline;">${text}</span>`;
          } else if (mark.type === "strike") {
            text = `<span style="text-decoration: line-through;">${text}</span>`;
          } else if (mark.type === "textStyle") {
            const styles: string[] = [];
            if (mark.attrs?.color) styles.push(`color: ${mark.attrs.color}`);
            if (mark.attrs?.fontFamily) styles.push(`font-family: ${mark.attrs.fontFamily}`);
            if (mark.attrs?.fontWeight) styles.push(`font-weight: ${mark.attrs.fontWeight}`);
            if (mark.attrs?.fontSize) styles.push(`font-size: ${mark.attrs.fontSize}`);
            if (styles.length > 0) {
              text = `<span style="${styles.join("; ")}">${text}</span>`;
            }
          } else if (mark.type === "highlight") {
            const bg = mark.attrs?.color || "#fef08a";
            text = `<span style="background-color: ${bg}; padding: 2px 4px; border-radius: 3px;">${text}</span>`;
          } else if (mark.type === "link" && mark.attrs?.href) {
            text = `<a href="${mark.attrs.href}" style="color: #2563eb; text-decoration: underline;">${text}</a>`;
          }
        });
      }
      return text;
    }

    const childrenHtml = node.content
      ? node.content.map((c) => this.renderNode(c)).join("")
      : "";

    // Node-level inline style attributes
    const nodeStyles: string[] = [];
    if (node.attrs?.textAlign) nodeStyles.push(`text-align: ${node.attrs.textAlign}`);
    if (node.attrs?.fontFamily) nodeStyles.push(`font-family: ${node.attrs.fontFamily}`);
    if (node.attrs?.fontWeight) nodeStyles.push(`font-weight: ${node.attrs.fontWeight}`);
    if (node.attrs?.color) nodeStyles.push(`color: ${node.attrs.color}`);
    if (node.attrs?.backgroundColor) nodeStyles.push(`background-color: ${node.attrs.backgroundColor}`);
    if (node.attrs?.borderColor) nodeStyles.push(`border-color: ${node.attrs.borderColor}`);
    if (node.attrs?.borderWidth) nodeStyles.push(`border-width: ${node.attrs.borderWidth}`);
    if (node.attrs?.borderStyle) nodeStyles.push(`border-style: ${node.attrs.borderStyle}`);
    if (node.attrs?.borderRadius) nodeStyles.push(`border-radius: ${node.attrs.borderRadius}`);
    if (node.attrs?.padding) nodeStyles.push(`padding: ${node.attrs.padding}`);
    if (node.attrs?.marginTop) nodeStyles.push(`margin-top: ${node.attrs.marginTop}`);
    if (node.attrs?.marginBottom) nodeStyles.push(`margin-bottom: ${node.attrs.marginBottom}`);

    const inlineStyleStr = nodeStyles.length > 0 ? nodeStyles.join("; ") + ";" : "";

    switch (node.type) {
      case "paragraph":
        return `<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 12px 0; ${inlineStyleStr}">${childrenHtml || "<br>"}</p>`;
      case "heading": {
        const level = node.attrs?.level || 1;
        const fontSize = level === 1 ? "24px" : level === 2 ? "20px" : "16px";
        return `<h${level} style="color: #111827; font-size: ${fontSize}; font-weight: 700; margin-top: 20px; margin-bottom: 10px; ${inlineStyleStr}">${childrenHtml}</h${level}>`;
      }
      case "bulletList":
        return `<ul style="color: #374151; padding-left: 20px; margin: 12px 0; ${inlineStyleStr}">${childrenHtml}</ul>`;
      case "orderedList":
        return `<ol style="color: #374151; padding-left: 20px; margin: 12px 0; ${inlineStyleStr}">${childrenHtml}</ol>`;
      case "listItem":
        return `<li style="margin: 4px 0; line-height: 1.5; ${inlineStyleStr}">${childrenHtml}</li>`;
      case "blockquote":
        return `<blockquote style="border-left: 3px solid #e5e7eb; padding-left: 14px; color: #6b7280; font-style: italic; margin: 16px 0; ${inlineStyleStr}">${childrenHtml}</blockquote>`;
      case "horizontalRule":
        return `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; ${inlineStyleStr}" />`;
      default:
        return childrenHtml;
    }
  }

  private static escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}
