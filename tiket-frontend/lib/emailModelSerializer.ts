import type { EmailDocumentNode, EmailDocumentMark } from "@/types/email";

export type { EmailDocumentNode, EmailDocumentMark };

export class EmailModelSerializer {
  /**
   * Compiles a structured JSON Document Tree into email-ready inline HTML with permanent footer.
   */
  public static serializeJsonToHtml(node: EmailDocumentNode): string {
    if (!node) return "";

    if (node.type === "doc" && node.content) {
      const innerHtml = node.content
        .map((child) => this.renderNode(child))
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

  /**
   * Deserializes arbitrary email HTML into an EmailDocumentNode tree.
   * Handles outer wrapper containers, inner card containers, CTA buttons,
   * images, headings, lists, formatting, and {{variable}} tokens losslessly.
   */
  public static deserializeHtmlToJson(html: string): EmailDocumentNode {
    if (!html || !html.trim()) {
      return {
        type: "doc",
        content: [{ type: "paragraph", content: [] }],
      };
    }

    if (typeof DOMParser === "undefined") {
      return {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: html }] }],
      };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html.trim(), "text/html");
    const body = doc.body;

    const blockNodes = this.extractBlockNodes(body);

    return {
      type: "doc",
      content: blockNodes.length > 0 ? blockNodes : [{ type: "paragraph", content: [] }],
    };
  }

  /**
   * Extracts block-level nodes from a root element, unpacking outer wrapper containers
   * and discarding permanent footers so the editable document remains clean.
   */
  private static extractBlockNodes(root: HTMLElement): EmailDocumentNode[] {
    let targetContainer: HTMLElement = root;

    // If root has a single wrapper div or table (email container), look inside
    const elementChildren = Array.from(root.children).filter(
      (c): c is HTMLElement => c instanceof HTMLElement,
    );

    if (elementChildren.length === 1) {
      const singleChild = elementChildren[0];
      if (
        singleChild &&
        (singleChild.tagName === "DIV" || singleChild.tagName === "TABLE") &&
        this.isOuterEmailWrapper(singleChild)
      ) {
        if (singleChild.tagName === "TABLE") {
          const cells = singleChild.querySelectorAll("td");
          if (cells.length > 0) {
            const innermost = cells[cells.length - 1];
            if (innermost) targetContainer = innermost;
          } else {
            targetContainer = singleChild;
          }
        } else {
          targetContainer = singleChild;
        }
      }
    }

    const nodes: EmailDocumentNode[] = [];
    const children = Array.from(targetContainer.childNodes);

    for (const child of children) {
      if (child.nodeType === 3) {
        const textVal = child.nodeValue?.trim();
        if (textVal) {
          nodes.push({
            type: "paragraph",
            content: [{ type: "text", text: textVal }],
          });
        }
        continue;
      }

      if (!(child instanceof HTMLElement)) continue;

      // Ignore permanent footer if detected
      if (this.isPermanentFooterElement(child)) {
        continue;
      }

      const parsedNode = this.parseElementToNode(child);
      if (parsedNode) {
        if (Array.isArray(parsedNode)) {
          nodes.push(...parsedNode);
        } else {
          nodes.push(parsedNode);
        }
      }
    }

    return nodes;
  }

  private static isOuterEmailWrapper(el: HTMLElement): boolean {
    const style = (el.getAttribute("style") || "").toLowerCase();
    const hasMaxWidth = style.includes("max-width") || style.includes("width: 600") || style.includes("width:600");
    const hasCenterMargin = style.includes("margin: 0 auto") || style.includes("margin:0 auto");
    return hasMaxWidth || hasCenterMargin;
  }

  private static isPermanentFooterElement(el: HTMLElement): boolean {
    const text = el.textContent || "";
    if (
      text.includes("Sent via Tiket Event Platform") ||
      (text.includes("support@tiket.com") && text.includes("feel free to reply directly"))
    ) {
      return true;
    }
    // Also ignore hr right before the footer
    if (el.tagName === "HR") {
      const next = el.nextElementSibling;
      if (next && this.isPermanentFooterElement(next as HTMLElement)) {
        return true;
      }
    }
    return false;
  }

  private static parseElementToNode(el: HTMLElement): EmailDocumentNode | EmailDocumentNode[] | null {
    const tagName = el.tagName.toUpperCase();
    const attrs = this.parseStyleAttributes(el);

    switch (tagName) {
      case "H1":
      case "H2":
      case "H3":
      case "H4":
      case "H5":
      case "H6": {
        const level = parseInt(tagName.charAt(1), 10);
        return {
          type: "heading",
          attrs: { level, ...attrs },
          content: this.parseInlineContent(el),
        };
      }

      case "P": {
        // Check if paragraph contains only an image (or linked image)
        const imgChild = el.querySelector("img");
        const textContent = el.textContent?.trim() || "";
        if (imgChild && (!textContent || textContent === (imgChild.alt || "").trim())) {
          return this.parseImageElement(imgChild, el);
        }
        return {
          type: "paragraph",
          attrs,
          content: this.parseInlineContent(el),
        };
      }

      case "A": {
        const imgChild = el.querySelector("img");
        const textContent = el.textContent?.trim() || "";
        if (imgChild && (!textContent || textContent === (imgChild.alt || "").trim())) {
          return this.parseImageElement(imgChild, el);
        }
        const content = this.parseInlineContent(el);
        if (content.length > 0) {
          return {
            type: "paragraph",
            attrs,
            content,
          };
        }
        return null;
      }

      case "DIV":
      case "SECTION": {
        const hasBlockChildren = Array.from(el.children).some((c) =>
          ["P", "H1", "H2", "H3", "H4", "H5", "H6", "DIV", "UL", "OL", "BLOCKQUOTE", "HR"].includes(
            c.tagName.toUpperCase(),
          ),
        );

        if (hasBlockChildren) {
          const childBlocks: EmailDocumentNode[] = [];
          for (const c of Array.from(el.childNodes)) {
            if (c.nodeType === 3) {
              const text = c.nodeValue?.trim();
              if (text) {
                childBlocks.push({
                  type: "paragraph",
                  content: [{ type: "text", text }],
                });
              }
            } else if (c instanceof HTMLElement) {
              const parsed = this.parseElementToNode(c);
              if (parsed) {
                if (Array.isArray(parsed)) childBlocks.push(...parsed);
                else childBlocks.push(parsed);
              }
            }
          }
          return {
            type: "container",
            attrs,
            content: childBlocks,
          };
        }

        // Inline div -> paragraph
        return {
          type: "paragraph",
          attrs,
          content: this.parseInlineContent(el),
        };
      }

      case "UL": {
        return {
          type: "bulletList",
          attrs,
          content: this.parseListItems(el),
        };
      }

      case "OL": {
        return {
          type: "orderedList",
          attrs,
          content: this.parseListItems(el),
        };
      }

      case "BLOCKQUOTE": {
        return {
          type: "blockquote",
          attrs,
          content: this.parseInlineContent(el),
        };
      }

      case "HR": {
        return {
          type: "horizontalRule",
          attrs,
        };
      }

      case "IMG": {
        return this.parseImageElement(el);
      }

      case "TABLE": {
        // Flatten table cells into block nodes
        const tds = Array.from(el.querySelectorAll("td"));
        const flattened: EmailDocumentNode[] = [];
        for (const td of tds) {
          const blocks = this.extractBlockNodes(td);
          flattened.push(...blocks);
        }
        return flattened.length > 0 ? flattened : null;
      }

      default: {
        const content = this.parseInlineContent(el);
        if (content.length > 0) {
          return {
            type: "paragraph",
            attrs,
            content,
          };
        }
        return null;
      }
    }
  }

  private static parseListItems(listEl: HTMLElement): EmailDocumentNode[] {
    const items: EmailDocumentNode[] = [];
    const children = Array.from(listEl.children);

    for (const child of children) {
      if (child.tagName.toUpperCase() === "LI") {
        const attrs = this.parseStyleAttributes(child as HTMLElement);
        items.push({
          type: "listItem",
          attrs,
          content: [
            {
              type: "paragraph",
              content: this.parseInlineContent(child as HTMLElement),
            },
          ],
        });
      }
    }

    return items;
  }

  private static parseImageElement(imgEl: HTMLElement, wrapperEl?: HTMLElement): EmailDocumentNode {
    const src = imgEl.getAttribute("src") || "";
    const alt = imgEl.getAttribute("alt") || "";
    const width = imgEl.getAttribute("width") || imgEl.style.width || "";

    let alignment: "left" | "center" | "right" = "center";
    const dataAlign = imgEl.getAttribute("data-align");
    if (dataAlign === "left" || dataAlign === "right" || dataAlign === "center") {
      alignment = dataAlign;
    } else {
      const ml = imgEl.style.marginLeft;
      const mr = imgEl.style.marginRight;
      const m = imgEl.style.margin;
      const parentAlign = wrapperEl?.style.textAlign;

      if (parentAlign === "left" || (mr === "auto" && (ml === "0" || ml === "0px" || !ml))) {
        alignment = "left";
      } else if (parentAlign === "right" || (ml === "auto" && (mr === "0" || mr === "0px" || !mr))) {
        alignment = "right";
      } else if (parentAlign === "center" || m === "0px auto" || m === "0 auto" || (ml === "auto" && mr === "auto")) {
        alignment = "center";
      }
    }

    // Check if wrapped in an anchor link
    let href: string | undefined = undefined;
    const anchor = imgEl.closest("a");
    if (anchor) {
      href = anchor.getAttribute("href") || undefined;
    }

    return {
      type: "image",
      attrs: {
        src,
        alt: alt || null,
        width: width || null,
        alignment,
        href: href || null,
      },
    };
  }

  private static parseInlineContent(parentEl: HTMLElement): EmailDocumentNode[] {
    const inlineNodes: EmailDocumentNode[] = [];

    const traverse = (node: Node, activeMarks: EmailDocumentMark[]) => {
      if (node.nodeType === 3) {
        const rawText = node.nodeValue || "";
        if (!rawText) return;

        // If it's pure whitespace and at block start/end, skip indentation whitespace
        if (!rawText.trim()) {
          const isAtStart = node === parentEl.firstChild;
          const isAtEnd = node === parentEl.lastChild;
          if (isAtStart || isAtEnd) return;
          inlineNodes.push({
            type: "text",
            text: " ",
            marks: activeMarks.length > 0 ? [...activeMarks] : undefined,
          });
          return;
        }

        // Clean up indentation newlines in text to spaces
        let cleaned = rawText.replace(/\r?\n\s*/g, " ");
        if (node === parentEl.firstChild) {
          cleaned = cleaned.replace(/^\s+/, "");
        }
        if (node === parentEl.lastChild) {
          cleaned = cleaned.replace(/\s+$/, "");
        }

        if (cleaned) {
          inlineNodes.push({
            type: "text",
            text: cleaned,
            marks: activeMarks.length > 0 ? [...activeMarks] : undefined,
          });
        }
        return;
      }

      if (!(node instanceof HTMLElement)) return;

      const tag = node.tagName.toUpperCase();
      const currentMarks = [...activeMarks];

      if (tag === "STRONG" || tag === "B") {
        currentMarks.push({ type: "bold" });
      } else if (tag === "EM" || tag === "I") {
        currentMarks.push({ type: "italic" });
      } else if (tag === "U") {
        currentMarks.push({ type: "underline" });
      } else if (tag === "S" || tag === "STRIKE" || tag === "DEL") {
        currentMarks.push({ type: "strike" });
      } else if (tag === "SPAN") {
        const styles = node.style;
        const markAttrs: Record<string, string> = {};
        if (styles.color) markAttrs.color = styles.color;
        if (styles.fontFamily) markAttrs.fontFamily = styles.fontFamily;
        if (styles.fontWeight) markAttrs.fontWeight = styles.fontWeight;
        if (styles.fontSize) markAttrs.fontSize = styles.fontSize;

        if (Object.keys(markAttrs).length > 0) {
          currentMarks.push({ type: "textStyle", attrs: markAttrs });
        }

        if (styles.backgroundColor) {
          currentMarks.push({
            type: "highlight",
            attrs: { color: styles.backgroundColor },
          });
        }

        if (styles.textDecoration?.includes("underline")) {
          currentMarks.push({ type: "underline" });
        }
        if (styles.textDecoration?.includes("line-through")) {
          currentMarks.push({ type: "strike" });
        }
      } else if (tag === "A") {
        const href = node.getAttribute("href") || "";
        const styleAttr = node.getAttribute("style") || "";
        const classAttr = node.getAttribute("class") || "";
        const target = node.getAttribute("target") || "";

        const linkAttrs: Record<string, string> = { href };
        if (styleAttr) linkAttrs.style = styleAttr;
        if (classAttr) linkAttrs.class = classAttr;
        if (target) linkAttrs.target = target;

        currentMarks.push({
          type: "link",
          attrs: linkAttrs,
        });
      }

      for (const child of Array.from(node.childNodes)) {
        traverse(child, currentMarks);
      }
    };

    for (const child of Array.from(parentEl.childNodes)) {
      traverse(child, []);
    }

    return inlineNodes;
  }

  private static parseStyleAttributes(el: HTMLElement): Record<string, string | number> {
    const attrs: Record<string, string | number> = {};
    const style = el.style;

    if (style.textAlign) attrs.textAlign = style.textAlign;
    if (style.fontFamily) attrs.fontFamily = style.fontFamily;
    if (style.fontWeight) attrs.fontWeight = style.fontWeight;
    if (style.color) attrs.color = style.color;
    if (style.backgroundColor) attrs.backgroundColor = style.backgroundColor;
    if (style.borderColor) attrs.borderColor = style.borderColor;
    if (style.borderWidth) attrs.borderWidth = style.borderWidth;
    if (style.borderStyle) attrs.borderStyle = style.borderStyle;
    if (style.borderRadius) attrs.borderRadius = style.borderRadius;
    if (style.padding) attrs.padding = style.padding;
    if (style.marginTop) attrs.marginTop = style.marginTop;
    if (style.marginBottom) attrs.marginBottom = style.marginBottom;

    return attrs;
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
            const bg = (mark.attrs?.color as string) || "#fef08a";
            text = `<span style="background-color: ${bg}; padding: 2px 4px; border-radius: 3px;">${text}</span>`;
          } else if (mark.type === "link" && mark.attrs?.href) {
            const customStyle = (mark.attrs.style as string) || "color: #2563eb; text-decoration: underline;";
            const targetAttr = mark.attrs.target ? ` target="${mark.attrs.target}"` : "";
            text = `<a href="${mark.attrs.href}" style="${customStyle}"${targetAttr}>${text}</a>`;
          }
        });
      }
      return text;
    }

    if (node.type === "image") {
      const src = (node.attrs?.src as string) || "";
      const alt = (node.attrs?.alt as string) || "";
      const width = (node.attrs?.width as string) || "";
      const align = (node.attrs?.alignment as string) || "center";
      const href = (node.attrs?.href as string) || "";

      const widthCss = width ? `width: ${width}; ` : "";
      let marginCss = "margin: 0 auto; display: block;";
      if (align === "left") {
        marginCss = "margin-right: auto; margin-left: 0; display: block;";
      } else if (align === "right") {
        marginCss = "margin-left: auto; margin-right: 0; display: block;";
      }

      let imgTag = `<img src="${src}" alt="${alt}" style="${widthCss}max-width: 100%; height: auto; ${marginCss}" />`;
      if (href) {
        imgTag = `<a href="${href}" style="display: block; text-decoration: none;">${imgTag}</a>`;
      }
      return imgTag;
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
        const level = (node.attrs?.level as number) || 1;
        const fontSize = level === 1 ? "24px" : level === 2 ? "20px" : "16px";
        return `<h${level} style="color: #111827; font-size: ${fontSize}; font-weight: 700; margin-top: 20px; margin-bottom: 10px; ${inlineStyleStr}">${childrenHtml}</h${level}>`;
      }
      case "container":
        return `<div style="${inlineStyleStr}">${childrenHtml}</div>`;
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
