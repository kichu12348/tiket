import type {
  EmailDocumentJSON,
  EmailNodeJSON,
  StyleObject,
} from "@/types/email";

const UNITLESS_PROPERTIES = new Set([
  "fontWeight",
  "lineHeight",
  "opacity",
  "zIndex",
  "flex",
  "flexGrow",
  "flexShrink",
  "order",
]);

/**
 * Safely extracts a StyleObject from unknown or union attribute values.
 */
function extractStyleObject(raw?: unknown): StyleObject {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as StyleObject;
  }
  return {};
}

/**
 * Converts a camelCase style object into inline kebab-case CSS declarations.
 * Numbers for dimensions automatically have "px" appended.
 */
export function styleObjectToCss(style?: StyleObject): string {
  if (!style || typeof style !== "object") return "";

  const declarations: string[] = [];
  for (const [key, value] of Object.entries(style)) {
    if (value === null || value === undefined || value === "") continue;

    const kebabKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
    let formattedValue = String(value);

    if (typeof value === "number" && !UNITLESS_PROPERTIES.has(key)) {
      formattedValue = `${value}px`;
    }

    declarations.push(`${kebabKey}: ${formattedValue};`);
  }

  return declarations.join(" ");
}

/**
 * Generates an empty, valid EmailDocumentJSON tree.
 */
export function createDefaultEmailDocument(): EmailDocumentJSON {
  return {
    version: 1,
    canvasStyle: {
      backgroundColor: "#f4f4f5",
      contentBackgroundColor: "#ffffff",
      contentWidth: "600px",
      padding: "32px",
    },
    doc: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: {
            style: {
              fontSize: "16px",
              color: "#18181b",
              lineHeight: "1.6",
            },
          },
          content: [
            {
              type: "text",
              text: "Welcome to our event! We are thrilled to have you join us.",
            },
          ],
        },
      ],
    },
  };
}

/**
 * Replaces token occurrences in text or attributes.
 */
function interpolateString(
  raw: string,
  variablesMap?: Record<string, string>,
): string {
  if (!raw || !variablesMap) return raw;
  return raw.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key: string) => {
    const trimmed = key.trim();
    if (variablesMap[trimmed] !== undefined) {
      return variablesMap[trimmed];
    }
    return match;
  });
}

/**
 * Compiles an EmailNodeJSON tree recursively into inline-styled HTML.
 */
function compileNodeToHtml(
  node: EmailNodeJSON,
  variablesMap?: Record<string, string>,
): string {
  if (!node) return "";

  switch (node.type) {
    case "text": {
      let text = node.text || "";
      text = interpolateString(text, variablesMap);

      if (node.marks && node.marks.length > 0) {
        for (const mark of node.marks) {
          switch (mark.type) {
            case "textStyle": {
              const css = styleObjectToCss(extractStyleObject(mark.attrs?.style));
              text = css ? `<span style="${css}">${text}</span>` : text;
              break;
            }
            case "link": {
              const rawHref = typeof mark.attrs?.href === "string" ? mark.attrs.href : "#";
              const href = interpolateString(rawHref, variablesMap);
              const target = typeof mark.attrs?.target === "string" ? mark.attrs.target : "_blank";
              const markStyle = extractStyleObject(mark.attrs?.style);
              const css = styleObjectToCss(
                Object.keys(markStyle).length > 0
                  ? markStyle
                  : { color: "#2563eb", textDecoration: "underline" },
              );
              text = `<a href="${href}" target="${target}" style="${css}">${text}</a>`;
              break;
            }
            case "bold":
              text = `<strong>${text}</strong>`;
              break;
            case "italic":
              text = `<em>${text}</em>`;
              break;
            case "underline":
              text = `<u>${text}</u>`;
              break;
            case "strike":
              text = `<s>${text}</s>`;
              break;
            case "code":
              text = `<code>${text}</code>`;
              break;
            case "highlight": {
              const css = styleObjectToCss(extractStyleObject(mark.attrs?.style));
              text = `<mark style="${css}">${text}</mark>`;
              break;
            }
          }
        }
      }
      return text;
    }

    case "hardBreak":
      return "<br />";

    case "paragraph": {
      const align = (node.attrs?.alignment as string) || "left";
      const nodeStyle = extractStyleObject(node.attrs?.style);
      const style = styleObjectToCss({
        textAlign: align,
        margin: "0 0 16px 0",
        ...nodeStyle,
      });
      const children = (node.content || [])
        .map((child) => compileNodeToHtml(child, variablesMap))
        .join("");
      return `<p style="${style}">${children}</p>`;
    }

    case "heading": {
      const level = Number(node.attrs?.level) || 1;
      const tag = `h${Math.min(Math.max(level, 1), 6)}`;
      const align = (node.attrs?.alignment as string) || "left";
      const nodeStyle = extractStyleObject(node.attrs?.style);
      const style = styleObjectToCss({
        textAlign: align,
        margin: "0 0 16px 0",
        ...nodeStyle,
      });
      const children = (node.content || [])
        .map((child) => compileNodeToHtml(child, variablesMap))
        .join("");
      return `<${tag} style="${style}">${children}</${tag}>`;
    }

    case "blockquote": {
      const nodeStyle = extractStyleObject(node.attrs?.style);
      const style = styleObjectToCss({
        borderLeft: "4px solid #d4d4d8",
        paddingLeft: "16px",
        margin: "16px 0",
        color: "#71717a",
        ...nodeStyle,
      });
      const children = (node.content || [])
        .map((child) => compileNodeToHtml(child, variablesMap))
        .join("");
      return `<blockquote style="${style}">${children}</blockquote>`;
    }

    case "bulletList": {
      const nodeStyle = extractStyleObject(node.attrs?.style);
      const style = styleObjectToCss({
        paddingLeft: "24px",
        margin: "0 0 16px 0",
        ...nodeStyle,
      });
      const children = (node.content || [])
        .map((child) => compileNodeToHtml(child, variablesMap))
        .join("");
      return `<ul style="${style}">${children}</ul>`;
    }

    case "orderedList": {
      const nodeStyle = extractStyleObject(node.attrs?.style);
      const style = styleObjectToCss({
        paddingLeft: "24px",
        margin: "0 0 16px 0",
        ...nodeStyle,
      });
      const children = (node.content || [])
        .map((child) => compileNodeToHtml(child, variablesMap))
        .join("");
      return `<ol style="${style}">${children}</ol>`;
    }

    case "listItem": {
      const nodeStyle = extractStyleObject(node.attrs?.style);
      const style = styleObjectToCss({
        margin: "4px 0",
        ...nodeStyle,
      });
      const children = (node.content || [])
        .map((child) => compileNodeToHtml(child, variablesMap))
        .join("");
      return `<li style="${style}">${children}</li>`;
    }

    case "containerBlock": {
      const nodeStyle = extractStyleObject(node.attrs?.style);
      const style = styleObjectToCss({
        boxSizing: "border-box",
        ...nodeStyle,
      });
      const children = (node.content || [])
        .map((child) => compileNodeToHtml(child, variablesMap))
        .join("");
      return `<div data-node-type="containerBlock" style="${style}">${children}</div>`;
    }

    case "buttonBlock": {
      const align = (node.attrs?.alignment as string) || "center";
      const rawHref = (node.attrs?.href as string) || "{{event.passUrl}}";
      const resolvedHref = interpolateString(rawHref, variablesMap);
      const nodeStyle = extractStyleObject(node.attrs?.style);
      const btnStyle = styleObjectToCss({
        display: "inline-block",
        textDecoration: "none",
        boxSizing: "border-box",
        cursor: "pointer",
        ...nodeStyle,
      });
      const children =
        (node.content || [])
          .map((child) => compileNodeToHtml(child, variablesMap))
          .join("") || "Click Here";

      return `<div data-node-type="buttonBlock" style="text-align: ${align}; margin: 16px 0;"><a data-button-anchor="true" href="${resolvedHref}" style="${btnStyle}">${children}</a></div>`;
    }

    case "imageBlock": {
      const align = (node.attrs?.alignment as string) || "center";
      const rawSrc = (node.attrs?.src as string) || "";
      const resolvedSrc = interpolateString(rawSrc, variablesMap);
      const alt = (node.attrs?.alt as string) || "";
      const rawHref = (node.attrs?.href as string) || "";
      const resolvedHref = rawHref
        ? interpolateString(rawHref, variablesMap)
        : "";
      const nodeStyle = extractStyleObject(node.attrs?.style);
      const imgStyle = styleObjectToCss({
        maxWidth: "100%",
        height: "auto",
        display: "inline-block",
        ...nodeStyle,
      });

      const imgTag = `<img src="${resolvedSrc}" alt="${alt}" style="${imgStyle}" />`;
      const content = resolvedHref
        ? `<a href="${resolvedHref}" target="_blank" style="display: inline-block;">${imgTag}</a>`
        : imgTag;

      return `<div data-node-type="imageBlock" style="text-align: ${align}; margin: 16px 0;">${content}</div>`;
    }

    case "variable": {
      const key = (node.attrs?.key as string || "").trim();
      const resolved =
        variablesMap && variablesMap[key] !== undefined
          ? variablesMap[key]
          : `{{${key}}}`;

      if (key === "ticket.qrCodeUrl") {
        return `<img src="${resolved}" alt="Ticket QR Code" width="160" height="160" style="display:block;margin:12px auto;border-radius:8px;" />`;
      }
      return resolved;
    }

    case "doc": {
      return (node.content || [])
        .map((child) => compileNodeToHtml(child, variablesMap))
        .join("");
    }

    default:
      return (node.content || [])
        .map((child) => compileNodeToHtml(child, variablesMap))
        .join("");
  }
}

/**
 * Compiles a full EmailDocumentJSON into an HTML document with canvas wrapper styling.
 */
export function compileEmailJsonToHtml(
  document: EmailDocumentJSON,
  variablesMap?: Record<string, string>,
): string {
  if (!document || !document.doc) return "";

  const canvasStyle = document.canvasStyle || {};
  const bg = (canvasStyle.backgroundColor as string) || "#f4f4f5";
  const contentBg = (canvasStyle.contentBackgroundColor as string) || "#ffffff";
  const contentWidth = (canvasStyle.contentWidth as string) || "600px";
  const padding = (canvasStyle.padding as string) || "32px";

  const bodyHtml = compileNodeToHtml(document.doc, variablesMap);

  const outerStyle = `background-color: ${bg}; width: 100%; min-height: 100%; margin: 0; padding: 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;`;
  const innerStyle = `background-color: ${contentBg}; max-width: ${contentWidth}; width: 100%; margin: 0 auto; padding: ${padding}; border-radius: 12px; box-sizing: border-box; overflow: hidden;`;

  return `<div class="email-canvas-outer" style="${outerStyle}"><div class="email-canvas-inner" style="${innerStyle}">${bodyHtml}</div></div>`;
}
