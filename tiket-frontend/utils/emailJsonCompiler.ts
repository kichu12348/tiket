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
      backgroundColor: "#ffffff",
      color: "#111827",
      maxWidth: "600px",
      contentWidth: "600px",
      padding: "32px",
      borderRadius: "12px",
    },
    doc: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: {
            style: {
              fontSize: "16px",
              color: "#111827",
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
 * Recursively normalizes an EmailNodeJSON tree so styling lives strictly in attrs.style,
 * removing null/undefined attributes, legacy flat style properties, and aligning with backend schema.
 */
export function normalizeEmailDocumentDoc(node: EmailNodeJSON): EmailNodeJSON {
  if (!node || typeof node !== "object") {
    return { type: "paragraph", content: [] };
  }

  // Normalize variable nodes into plain text tokens so variables are part of the text itself
  if (node.type === "variable") {
    const rawKey = ((node.attrs?.key as string) || (node.attrs?.label as string) || "").trim();
    const cleanKey = rawKey.startsWith("{{") ? rawKey : `{{${rawKey}}}`;
    return {
      type: "text",
      text: cleanKey,
    };
  }

  let normalizedType = node.type;
  if (normalizedType === "container") normalizedType = "containerBlock";
  if (normalizedType === "ctaButton") normalizedType = "buttonBlock";
  if (normalizedType === "image") normalizedType = "imageBlock";

  const rawAttrs = (node.attrs && typeof node.attrs === "object" ? node.attrs : {}) as Record<string, unknown>;
  const cleanAttrs: Record<string, unknown> = {};

  const rawStyle = (rawAttrs.style && typeof rawAttrs.style === "object" ? rawAttrs.style : {}) as Record<string, unknown>;
  const cleanStyle: Record<string, string | number> = {};

  for (const [sKey, sVal] of Object.entries(rawStyle)) {
    if (sVal !== null && sVal !== undefined && sVal !== "") {
      cleanStyle[sKey] = sVal as string | number;
    }
  }

  const legacyStyleProps = [
    "backgroundColor",
    "borderColor",
    "borderWidth",
    "borderStyle",
    "borderRadius",
    "padding",
    "marginTop",
    "marginBottom",
    "fontSize",
    "fontWeight",
    "color",
    "lineHeight",
  ];
  for (const prop of legacyStyleProps) {
    if (rawAttrs[prop] !== undefined && rawAttrs[prop] !== null && rawAttrs[prop] !== "") {
      if (cleanStyle[prop] === undefined) {
        cleanStyle[prop] = rawAttrs[prop] as string | number;
      }
    }
  }

  if (rawAttrs.buttonColor && !cleanStyle.backgroundColor) {
    cleanStyle.backgroundColor = String(rawAttrs.buttonColor);
  }
  if (rawAttrs.textColor && !cleanStyle.color) {
    cleanStyle.color = String(rawAttrs.textColor);
  }

  const rawAlignment = rawAttrs.alignment || rawAttrs.textAlign || cleanStyle.textAlign;
  if (rawAlignment && typeof rawAlignment === "string") {
    cleanAttrs.alignment = rawAlignment;
    cleanStyle.textAlign = rawAlignment;
  }

  if (Object.keys(cleanStyle).length > 0) {
    cleanAttrs.style = cleanStyle;
  }

  if (rawAttrs.level !== undefined && rawAttrs.level !== null) {
    cleanAttrs.level = rawAttrs.level as 1 | 2 | 3;
  }
  if (rawAttrs.href || rawAttrs.url) {
    cleanAttrs.href = String(rawAttrs.href || rawAttrs.url);
  }
  if (rawAttrs.src) {
    cleanAttrs.src = String(rawAttrs.src);
  }
  if (rawAttrs.alt !== undefined && rawAttrs.alt !== null && rawAttrs.alt !== "") {
    cleanAttrs.alt = String(rawAttrs.alt);
  }
  if (rawAttrs.label) {
    cleanAttrs.label = String(rawAttrs.label);
  }
  if (rawAttrs.key) {
    cleanAttrs.key = String(rawAttrs.key);
  }

  const result: EmailNodeJSON = {
    type: normalizedType,
  };

  if (Object.keys(cleanAttrs).length > 0) {
    result.attrs = cleanAttrs;
  }

  if (node.marks && Array.isArray(node.marks) && node.marks.length > 0) {
    result.marks = node.marks
      .filter((m) => m && m.type)
      .map((mark) => {
        const rawMarkAttrs = (mark.attrs && typeof mark.attrs === "object" ? mark.attrs : {}) as Record<string, unknown>;
        const cleanMarkAttrs: Record<string, unknown> = {};
        const markStyle = (rawMarkAttrs.style && typeof rawMarkAttrs.style === "object" ? { ...rawMarkAttrs.style } : {}) as Record<string, unknown>;

        if (mark.type === "highlight") {
          const bg = markStyle.backgroundColor || rawMarkAttrs.color || rawMarkAttrs.backgroundColor;
          if (bg) {
            markStyle.backgroundColor = String(bg);
          }
          if (Object.keys(markStyle).length > 0) {
            cleanMarkAttrs.style = markStyle;
          }
        } else if (mark.type === "textStyle") {
          for (const [key, val] of Object.entries(rawMarkAttrs)) {
            if (val !== null && val !== undefined && val !== "" && key !== "style") {
              if (["color", "backgroundColor", "fontSize", "fontWeight", "fontFamily"].includes(key)) {
                if (!markStyle[key]) {
                  markStyle[key] = val;
                }
              } else {
                cleanMarkAttrs[key] = val;
              }
            }
          }
          if (Object.keys(markStyle).length > 0) {
            cleanMarkAttrs.style = markStyle;
          }
        } else if (mark.type === "link") {
          if (rawMarkAttrs.href) cleanMarkAttrs.href = rawMarkAttrs.href;
          if (rawMarkAttrs.target) cleanMarkAttrs.target = rawMarkAttrs.target;
          if (rawMarkAttrs.rel) cleanMarkAttrs.rel = rawMarkAttrs.rel;
          if (Object.keys(markStyle).length > 0) {
            cleanMarkAttrs.style = markStyle;
          }
        } else {
          for (const [k, v] of Object.entries(rawMarkAttrs)) {
            if (v !== null && v !== undefined && v !== "") {
              cleanMarkAttrs[k] = v;
            }
          }
          if (Object.keys(markStyle).length > 0) {
            cleanMarkAttrs.style = markStyle;
          }
        }

        return {
          type: mark.type,
          ...(Object.keys(cleanMarkAttrs).length > 0 ? { attrs: cleanMarkAttrs } : {}),
        };
      });
  }

  if (node.text !== undefined && node.text !== null) {
    result.text = node.text;
  }

  if (node.content && Array.isArray(node.content)) {
    result.content = node.content.map(normalizeEmailDocumentDoc);
  }

  return result;
}

export function normalizeEmailDocument(document: EmailDocumentJSON): EmailDocumentJSON {
  const defaultCanvasStyle: StyleObject = {
    backgroundColor: "#ffffff",
    color: "#111827",
    maxWidth: "600px",
    padding: "32px",
    borderRadius: "12px",
  };

  const rawCanvas = document.canvasStyle || {};
  const cleanCanvas: StyleObject = { ...defaultCanvasStyle };

  for (const [k, v] of Object.entries(rawCanvas)) {
    if (v !== null && v !== undefined && v !== "") {
      cleanCanvas[k] = v;
    }
  }

  return {
    version: 1,
    canvasStyle: cleanCanvas,
    doc: normalizeEmailDocumentDoc(document.doc),
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
    const withBraces = `{{${trimmed}}}`;
    if (variablesMap[withBraces] !== undefined) {
      return variablesMap[withBraces];
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
      if (text.includes("ticket.qrCodeUrl")) {
        const qrUrl =
          variablesMap?.["ticket.qrCodeUrl"] ||
          variablesMap?.["{{ticket.qrCodeUrl}}"] ||
          "https://quickchart.io/qr?text=TKT-884920-XYZ";
        text = text.replace(
          /\{\{\s*ticket\.qrCodeUrl\s*\}\}/g,
          `<img src="${qrUrl}" alt="Ticket QR Code" width="160" height="160" style="display:block;margin:12px auto;border-radius:8px;border:1px solid #e5e7eb;" />`,
        );
      }
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
              const markStyle = extractStyleObject(mark.attrs?.style);
              const rawColor = typeof mark.attrs?.color === "string" ? mark.attrs.color : undefined;
              const bg = (markStyle.backgroundColor as string) || rawColor || "#fef08a";
              const css = styleObjectToCss({
                backgroundColor: bg,
                ...markStyle,
              });
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
      const nodeStyle = { ...extractStyleObject(node.attrs?.style) };
      const mt = (nodeStyle.marginTop as string) || "16px";
      const mb = (nodeStyle.marginBottom as string) || "16px";
      delete nodeStyle.marginTop;
      delete nodeStyle.marginBottom;
      delete nodeStyle.textAlign;

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

      return `<div data-node-type="buttonBlock" style="text-align: ${align}; margin-top: ${mt}; margin-bottom: ${mb};"><a data-button-anchor="true" href="${resolvedHref}" style="${btnStyle}">${children}</a></div>`;
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
      const strippedKey = key.replace(/^\{\{\s*/, "").replace(/\s*\}\}$/, "");
      const withBraces = `{{${strippedKey}}}`;
      const resolved =
        variablesMap && (variablesMap[strippedKey] !== undefined || variablesMap[withBraces] !== undefined || variablesMap[key] !== undefined)
          ? (variablesMap[strippedKey] ?? variablesMap[withBraces] ?? variablesMap[key])
          : `{{${strippedKey}}}`;

      if (key === "ticket.qrCodeUrl" || strippedKey === "ticket.qrCodeUrl") {
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
  const bg = (canvasStyle.backgroundColor as string) || "#ffffff";
  const contentBg = (canvasStyle.contentBackgroundColor as string) || bg;
  const contentWidth =
    (canvasStyle.maxWidth as string) ||
    (canvasStyle.contentWidth as string) ||
    "600px";
  const padding = (canvasStyle.padding as string) || "32px";

  const bodyHtml = compileNodeToHtml(document.doc, variablesMap);

  const outerStyle = `background-color: ${bg}; width: 100%; min-height: 100%; margin: 0; padding: 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;`;
  const innerStyle = `background-color: ${contentBg}; max-width: ${contentWidth}; width: 100%; margin: 0 auto; padding: ${padding}; border-radius: 12px; box-sizing: border-box; overflow: hidden;`;

  return `<div class="email-canvas-outer" style="${outerStyle}"><div class="email-canvas-inner" style="${innerStyle}">${bodyHtml}</div></div>`;
}
