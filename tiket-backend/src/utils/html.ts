import sanitizeHtml from "sanitize-html";

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img"],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      "*": ["class"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform(
        "a",
        { rel: "noopener noreferrer" },
        true,
      ),
    },
  });
}

const EMAIL_SAFE_STYLE_PATTERN = [
  /^(?!.*(?:javascript|expression|url\s*\(\s*["']?\s*javascript))[^;<>&]*$/i,
];

const EMAIL_ALLOWED_CSS_PROPERTIES = [
  "color",
  "background-color",
  "background",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "text-align",
  "text-decoration",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "border",
  "border-top",
  "border-right",
  "border-bottom",
  "border-left",
  "border-radius",
  "border-collapse",
  "width",
  "max-width",
  "min-width",
  "height",
  "display",
  "vertical-align",
  "box-sizing",
];

const EMAIL_ALLOWED_STYLES: Record<string, Record<string, RegExp[]>> = {
  "*": Object.fromEntries(
    EMAIL_ALLOWED_CSS_PROPERTIES.map((prop) => [prop, EMAIL_SAFE_STYLE_PATTERN]),
  ),
};

export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "div",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
      "section",
      "header",
      "footer",
      "hr",
      "span",
      "img",
      "a",
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "br",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel", "style", "class"],
      img: ["src", "alt", "width", "height", "style", "class"],
      table: [
        "width",
        "align",
        "valign",
        "cellpadding",
        "cellspacing",
        "border",
        "style",
        "class",
      ],
      tr: [
        "width",
        "align",
        "valign",
        "cellpadding",
        "cellspacing",
        "border",
        "style",
        "class",
      ],
      td: [
        "width",
        "align",
        "valign",
        "cellpadding",
        "cellspacing",
        "border",
        "style",
        "class",
      ],
      th: [
        "width",
        "align",
        "valign",
        "cellpadding",
        "cellspacing",
        "border",
        "style",
        "class",
      ],
      "*": ["class", "style", "align"],
    },
    allowedStyles: EMAIL_ALLOWED_STYLES,
    allowedSchemes: ["https", "http", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform(
        "a",
        { rel: "noopener noreferrer" },
        true,
      ),
    },
  });
}
