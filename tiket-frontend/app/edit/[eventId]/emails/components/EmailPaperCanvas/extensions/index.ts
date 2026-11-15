import { Extension, Node, InputRule, mergeAttributes } from "@tiptap/core";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { TextStyle } from "@tiptap/extension-text-style";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Heading } from "@tiptap/extension-heading";
import { Blockquote } from "@tiptap/extension-blockquote";
import { BulletList } from "@tiptap/extension-bullet-list";
import { OrderedList } from "@tiptap/extension-ordered-list";
import { ListItem } from "@tiptap/extension-list-item";
import { NodeSelection } from "@tiptap/pm/state";
import { styleObjectToCss } from "@/utils/emailJsonCompiler";
import type { StyleObject } from "@/types/email";

// -------------------------------------------------------------
// 1. Styled Block Nodes
// -------------------------------------------------------------

export const StyledParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: {},
        parseHTML: (element) => {
          return element.getAttribute("style") ? {} : {};
        },
        renderHTML: () => ({}),
      },
      alignment: {
        default: "left",
        parseHTML: (element) =>
          element.style.textAlign || element.getAttribute("data-align") || "left",
      },
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    const align = node.attrs.alignment || "left";
    const css = styleObjectToCss({
      textAlign: align,
      ...node.attrs.style,
    });
    return ["p", mergeAttributes(HTMLAttributes, css ? { style: css } : {}), 0];
  },
});

export const StyledHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: {},
      },
      alignment: {
        default: "left",
        parseHTML: (element) =>
          element.style.textAlign || element.getAttribute("data-align") || "left",
      },
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    const level = node.attrs.level || 1;
    const align = node.attrs.alignment || "left";
    const css = styleObjectToCss({
      textAlign: align,
      ...node.attrs.style,
    });
    return [
      `h${level}`,
      mergeAttributes(HTMLAttributes, css ? { style: css } : {}),
      0,
    ];
  },
});

export const StyledBlockquote = Blockquote.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: {},
      },
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    const css = styleObjectToCss(node.attrs.style);
    return [
      "blockquote",
      mergeAttributes(HTMLAttributes, css ? { style: css } : {}),
      0,
    ];
  },
});

export const StyledBulletList = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: {},
      },
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    const css = styleObjectToCss(node.attrs.style);
    return ["ul", mergeAttributes(HTMLAttributes, css ? { style: css } : {}), 0];
  },
});

export const StyledOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: {},
      },
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    const css = styleObjectToCss(node.attrs.style);
    return ["ol", mergeAttributes(HTMLAttributes, css ? { style: css } : {}), 0];
  },
});

export const StyledListItem = ListItem.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: {},
      },
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    const css = styleObjectToCss(node.attrs.style);
    return ["li", mergeAttributes(HTMLAttributes, css ? { style: css } : {}), 0];
  },
});

// -------------------------------------------------------------
// 2. UnifiedTextStyle Mark
// -------------------------------------------------------------

export const UnifiedTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: {},
        renderHTML: (attributes) => {
          const css = styleObjectToCss(attributes.style);
          return css ? { style: css } : {};
        },
      },
      fontWeight: {
        default: null,
        parseHTML: (element) => element.style.fontWeight || null,
        renderHTML: (attributes) =>
          attributes.fontWeight
            ? { style: `font-weight: ${attributes.fontWeight}` }
            : {},
      },
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) =>
          attributes.fontSize
            ? { style: `font-size: ${attributes.fontSize}` }
            : {},
      },
      fontFamily: {
        default: null,
        parseHTML: (element) => element.style.fontFamily || null,
        renderHTML: (attributes) =>
          attributes.fontFamily
            ? { style: `font-family: ${attributes.fontFamily}` }
            : {},
      },
      color: {
        default: null,
        parseHTML: (element) => element.style.color || null,
        renderHTML: (attributes) =>
          attributes.color ? { style: `color: ${attributes.color}` } : {},
      },
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.style.backgroundColor || null,
        renderHTML: (attributes) =>
          attributes.backgroundColor
            ? { style: `background-color: ${attributes.backgroundColor}` }
            : {},
      },
    };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-b": ({ editor }) => {
        const attrs = editor.getAttributes("textStyle");
        const currentStyle = (attrs?.style || {}) as StyleObject;
        const isBold =
          String(currentStyle.fontWeight || attrs.fontWeight) === "700" ||
          Number(currentStyle.fontWeight || attrs.fontWeight) >= 700;
        const newWeight = isBold ? "400" : "700";
        return editor
          .chain()
          .setMark("textStyle", {
            fontWeight: newWeight,
            style: {
              ...currentStyle,
              fontWeight: newWeight,
            },
          })
          .run();
      },
    };
  },
});

export const CustomTextStyleExtension = Extension.create({
  name: "customTextStyle",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontWeight: {
            default: null,
            parseHTML: (element) => element.style.fontWeight || null,
            renderHTML: (attributes) => {
              if (!attributes.fontWeight) return {};
              return { style: `font-weight: ${attributes.fontWeight}` };
            },
          },
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
});

// -------------------------------------------------------------
// 3. MarkdownLinkExtension
// -------------------------------------------------------------

export const MarkdownLinkExtension = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: { color: "#2563eb", textDecoration: "underline" },
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          if (attributes.style && typeof attributes.style === "object") {
            return { style: styleObjectToCss(attributes.style) };
          }
          return {
            style:
              attributes.style ||
              "color: #2563eb; text-decoration: underline;",
          };
        },
      },
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute("class"),
        renderHTML: (attributes) =>
          attributes.class ? { class: attributes.class } : {},
      },
    };
  },
  addInputRules() {
    return [
      new InputRule({
        find: /\[([^\]]+)\]\(([^)]+)\)$/,
        handler: ({ state, range, match }) => {
          const [, text, href] = match;
          const { tr } = state;
          if (text && href) {
            tr.replaceWith(range.from, range.to, state.schema.text(text));
            const linkType = state.schema.marks.link;
            if (linkType) {
              const linkMark = linkType.create({
                href,
                target: "_blank",
                style: { color: "#2563eb", textDecoration: "underline" },
              });
              tr.addMark(range.from, range.from + text.length, linkMark);
            }
          }
        },
      }),
    ];
  },
});

export const CustomLinkExtension = MarkdownLinkExtension;

// -------------------------------------------------------------
// 4. ContainerBlockExtension
// -------------------------------------------------------------

export const ContainerBlockExtension = Node.create({
  name: "containerBlock",
  group: "block",
  content: "block+",
  isolating: true,
  defining: true,
  addAttributes() {
    return {
      style: {
        default: {
          backgroundColor: "#fafafa",
          borderColor: "#e4e4e7",
          borderWidth: "1px",
          borderStyle: "solid",
          borderRadius: "12px",
          padding: "20px",
          width: "100%",
          minHeight: "64px",
        },
        parseHTML: (element) => element.getAttribute("style") || {},
        renderHTML: (attributes) => {
          const css =
            typeof attributes.style === "object"
              ? styleObjectToCss(attributes.style)
              : attributes.style;
          return {
            style: `box-sizing: border-box; ${css || ""}`,
          };
        },
      },
    };
  },
  parseHTML() {
    return [
      { tag: 'div[data-node-type="containerBlock"]' },
      { tag: "div[style]" },
      { tag: "section" },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-node-type": "containerBlock" }, HTMLAttributes),
      0,
    ];
  },
});

export const ContainerExtension = Node.create({
  name: "container",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.style.backgroundColor || null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) return {};
          return { style: `background-color: ${attributes.backgroundColor}` };
        },
      },
      borderColor: {
        default: null,
        parseHTML: (element) => element.style.borderColor || null,
        renderHTML: (attributes) => {
          if (!attributes.borderColor) return {};
          return { style: `border-color: ${attributes.borderColor}` };
        },
      },
      borderWidth: {
        default: null,
        parseHTML: (element) => element.style.borderWidth || null,
        renderHTML: (attributes) => {
          if (!attributes.borderWidth) return {};
          return { style: `border-width: ${attributes.borderWidth}` };
        },
      },
      borderStyle: {
        default: null,
        parseHTML: (element) => element.style.borderStyle || null,
        renderHTML: (attributes) => {
          if (!attributes.borderStyle) return {};
          return { style: `border-style: ${attributes.borderStyle}` };
        },
      },
      borderRadius: {
        default: null,
        parseHTML: (element) => element.style.borderRadius || null,
        renderHTML: (attributes) => {
          if (!attributes.borderRadius) return {};
          return { style: `border-radius: ${attributes.borderRadius}` };
        },
      },
      padding: {
        default: null,
        parseHTML: (element) => element.style.padding || null,
        renderHTML: (attributes) => {
          if (!attributes.padding) return {};
          return { style: `padding: ${attributes.padding}` };
        },
      },
      marginTop: {
        default: null,
        parseHTML: (element) => element.style.marginTop || null,
        renderHTML: (attributes) => {
          if (!attributes.marginTop) return {};
          return { style: `margin-top: ${attributes.marginTop}` };
        },
      },
      marginBottom: {
        default: null,
        parseHTML: (element) => element.style.marginBottom || null,
        renderHTML: (attributes) => {
          if (!attributes.marginBottom) return {};
          return { style: `margin-bottom: ${attributes.marginBottom}` };
        },
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "div[style]",
      },
      {
        tag: "section",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", HTMLAttributes, 0];
  },
});

// -------------------------------------------------------------
// 5. ButtonBlockExtension & CustomButtonExtension
// -------------------------------------------------------------

export const ButtonBlockExtension = Node.create({
  name: "buttonBlock",
  group: "block",
  content: "inline*",
  isolating: true,
  defining: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      href: {
        default: "{{event.passUrl}}",
        parseHTML: (element) => {
          const a =
            element.querySelector("a") ||
            (element.tagName === "A" ? element : null);
          return (
            a?.getAttribute("href") ||
            element.getAttribute("data-href") ||
            "{{event.passUrl}}"
          );
        },
      },
      alignment: {
        default: "center",
        parseHTML: (element) =>
          element.getAttribute("data-align") ||
          element.style.textAlign ||
          "center",
      },
      style: {
        default: {
          backgroundColor: "#09090b",
          color: "#ffffff",
          borderRadius: "8px",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "#09090b",
          padding: "12px 24px",
          width: "auto",
          fontFamily: "Inter",
          fontSize: "14px",
          fontWeight: "600",
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-node-type="buttonBlock"]' }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const align = node.attrs.alignment || "center";
    const href = node.attrs.href || "{{event.passUrl}}";
    const aStyle = styleObjectToCss({
      display: "inline-block",
      textDecoration: "none",
      boxSizing: "border-box",
      cursor: "text",
      ...node.attrs.style,
    });

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "buttonBlock",
        style: `text-align: ${align}; margin: 16px 0;`,
      }),
      [
        "a",
        {
          "data-button-anchor": "true",
          href,
          style: aStyle,
        },
        0,
      ],
    ];
  },
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { selection } = editor.state;
        const { $from } = selection;
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type.name === this.name) {
            const afterPos = $from.after(d);
            return editor
              .chain()
              .insertContentAt(afterPos, { type: "paragraph" })
              .setTextSelection(afterPos + 1)
              .run();
          }
        }
        return false;
      },
    };
  },
});

export const CustomButtonExtension = Node.create({
  name: "ctaButton",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      label: {
        default: "Click Here",
        parseHTML: (element) => {
          const anchor = element.querySelector("a");
          return anchor
            ? (anchor.textContent || "").trim()
            : (element.textContent || "").trim() || "Click Here";
        },
      },
      url: {
        default: "#",
        parseHTML: (element) => {
          const anchor = element.querySelector("a");
          return (
            (anchor
              ? anchor.getAttribute("href")
              : element.getAttribute("data-url")) || "#"
          );
        },
      },
      buttonColor: {
        default: "#000000",
        parseHTML: (element) => {
          const anchor = element.querySelector("a");
          return (
            element.getAttribute("data-button-color") ||
            anchor?.style.backgroundColor ||
            element.style.backgroundColor ||
            "#000000"
          );
        },
      },
      textColor: {
        default: "#ffffff",
        parseHTML: (element) => {
          const anchor = element.querySelector("a");
          return (
            element.getAttribute("data-text-color") ||
            anchor?.style.color ||
            element.style.color ||
            "#ffffff"
          );
        },
      },
      borderRadius: {
        default: "8px",
        parseHTML: (element) => {
          const anchor = element.querySelector("a");
          return (
            element.getAttribute("data-border-radius") ||
            anchor?.style.borderRadius ||
            element.style.borderRadius ||
            "8px"
          );
        },
      },
      alignment: {
        default: "center",
        parseHTML: (element) => {
          const align =
            element.getAttribute("data-align") ||
            element.style.textAlign ||
            "center";
          return align === "left" || align === "right" ? align : "center";
        },
      },
      fontSize: {
        default: "15px",
        parseHTML: (element) => {
          const anchor = element.querySelector("a");
          return (
            element.getAttribute("data-font-size") ||
            anchor?.style.fontSize ||
            element.style.fontSize ||
            "15px"
          );
        },
      },
      fontWeight: {
        default: "600",
        parseHTML: (element) => {
          const anchor = element.querySelector("a");
          return (
            element.getAttribute("data-font-weight") ||
            anchor?.style.fontWeight ||
            element.style.fontWeight ||
            "600"
          );
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="cta-button"]',
      },
      {
        tag: 'a[data-type="cta-button"]',
      },
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const {
        label = "Click Here",
        url = "#",
        buttonColor = "#000000",
        textColor = "#ffffff",
        borderRadius = "8px",
        alignment = "center",
        fontSize = "15px",
        fontWeight = "600",
      } = node.attrs;

      const dom = document.createElement("div");
      dom.setAttribute("data-type", "cta-button");
      dom.setAttribute("data-button-color", buttonColor);
      dom.setAttribute("data-text-color", textColor);
      dom.setAttribute("data-border-radius", borderRadius);
      dom.setAttribute("data-align", alignment);
      dom.setAttribute("data-url", url);
      dom.setAttribute("data-font-size", fontSize);
      dom.setAttribute("data-font-weight", fontWeight);
      dom.style.textAlign = alignment;
      dom.style.margin = "24px 0";

      const a = document.createElement("a");
      a.setAttribute("href", url);
      a.textContent = label;
      a.style.backgroundColor = buttonColor;
      a.style.color = textColor;
      a.style.padding = "12px 24px";
      a.style.textDecoration = "none";
      a.style.borderRadius = borderRadius;
      a.style.fontWeight = fontWeight;
      a.style.fontSize = fontSize;
      a.style.display = "inline-block";
      a.style.cursor = "pointer";
      a.style.userSelect = "none";
      a.style.transition = "outline 0.15s ease, transform 0.15s ease";

      const handleSelect = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof getPos === "function") {
          const pos = getPos();
          if (typeof pos === "number") {
            const tr = editor.view.state.tr.setSelection(
              NodeSelection.create(editor.view.state.doc, pos),
            );
            editor.view.dispatch(tr);
            editor.view.focus();
          }
        }
      };

      a.addEventListener("click", handleSelect);
      dom.addEventListener("click", handleSelect);

      dom.appendChild(a);

      return {
        dom,
        selectNode() {
          dom.classList.add("ProseMirror-selectednode");
          a.style.outline = "2px solid #3b82f6";
          a.style.outlineOffset = "3px";
        },
        deselectNode() {
          dom.classList.remove("ProseMirror-selectednode");
          a.style.outline = "none";
          a.style.outlineOffset = "0px";
        },
        update(newNode) {
          if (newNode.type.name !== "ctaButton") return false;
          const {
            label: newLabel,
            url: newUrl,
            buttonColor: newBtnColor,
            textColor: newTextColor,
            borderRadius: newBorderRadius,
            alignment: newAlign,
            fontSize: newFontSize,
            fontWeight: newFontWeight,
          } = newNode.attrs;

          dom.setAttribute("data-button-color", newBtnColor || "#000000");
          dom.setAttribute("data-text-color", newTextColor || "#ffffff");
          dom.setAttribute("data-border-radius", newBorderRadius || "8px");
          dom.setAttribute("data-align", newAlign || "center");
          dom.setAttribute("data-url", newUrl || "#");
          dom.setAttribute("data-font-size", newFontSize || "15px");
          dom.setAttribute("data-font-weight", newFontWeight || "600");
          dom.style.textAlign = newAlign || "center";

          a.setAttribute("href", newUrl || "#");
          a.textContent = newLabel || "Click Here";
          a.style.backgroundColor = newBtnColor || "#000000";
          a.style.color = newTextColor || "#ffffff";
          a.style.borderRadius = newBorderRadius || "8px";
          a.style.fontSize = newFontSize || "15px";
          a.style.fontWeight = newFontWeight || "600";
          return true;
        },
        destroy() {
          a.removeEventListener("click", handleSelect);
          dom.removeEventListener("click", handleSelect);
        },
      };
    };
  },

  renderHTML({ HTMLAttributes }) {
    const {
      label = "Click Here",
      url = "#",
      buttonColor = "#000000",
      textColor = "#ffffff",
      borderRadius = "8px",
      alignment = "center",
      fontSize = "15px",
      fontWeight = "600",
    } = HTMLAttributes;

    return [
      "div",
      {
        "data-type": "cta-button",
        "data-button-color": buttonColor,
        "data-text-color": textColor,
        "data-border-radius": borderRadius,
        "data-align": alignment,
        "data-url": url,
        "data-font-size": fontSize,
        "data-font-weight": fontWeight,
        style: `text-align: ${alignment}; margin: 24px 0;`,
      },
      [
        "a",
        {
          href: url,
          style: `background-color: ${buttonColor}; color: ${textColor}; padding: 12px 24px; text-decoration: none; border-radius: ${borderRadius}; font-weight: ${fontWeight}; font-size: ${fontSize}; display: inline-block;`,
        },
        label,
      ],
    ];
  },
});

// -------------------------------------------------------------
// 6. ImageBlockExtension & CustomImageExtension
// -------------------------------------------------------------

export const ImageBlockExtension = Node.create({
  name: "imageBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: {
        default: "",
        parseHTML: (element) => {
          const img =
            element.querySelector("img") ||
            (element.tagName === "IMG" ? element : null);
          return img?.getAttribute("src") || "";
        },
      },
      alt: {
        default: "",
        parseHTML: (element) => {
          const img =
            element.querySelector("img") ||
            (element.tagName === "IMG" ? element : null);
          return img?.getAttribute("alt") || "";
        },
      },
      href: {
        default: "",
        parseHTML: (element) => {
          const a = element.querySelector("a");
          return (
            a?.getAttribute("href") || element.getAttribute("data-href") || ""
          );
        },
      },
      alignment: {
        default: "center",
        parseHTML: (element) =>
          element.getAttribute("data-align") ||
          element.style.textAlign ||
          "center",
      },
      style: {
        default: {
          width: "100%",
          height: "auto",
          borderRadius: "8px",
          borderWidth: "0px",
          borderStyle: "solid",
          borderColor: "#e4e4e7",
          padding: "0px",
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-node-type="imageBlock"]' }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const align = node.attrs.alignment || "center";
    const src = node.attrs.src || "";
    const alt = node.attrs.alt || "";
    const href = node.attrs.href || "";
    const imgCss = styleObjectToCss({
      maxWidth: "100%",
      height: "auto",
      display: "inline-block",
      ...node.attrs.style,
    });

    const imgTag = ["img", { src, alt, style: imgCss }];

    if (href) {
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          "data-node-type": "imageBlock",
          style: `text-align: ${align}; margin: 16px 0;`,
        }),
        [
          "a",
          { href, target: "_blank", style: "display: inline-block;" },
          imgTag,
        ],
      ];
    }

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "imageBlock",
        style: `text-align: ${align}; margin: 16px 0;`,
      }),
      imgTag,
    ];
  },
});

export const CustomImageExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("src"),
        renderHTML: (attributes) => {
          if (!attributes.src) return {};
          return { src: attributes.src };
        },
      },
      alt: {
        default: null,
        parseHTML: (element) => element.getAttribute("alt"),
        renderHTML: (attributes) => {
          if (!attributes.alt) return {};
          return { alt: attributes.alt };
        },
      },
      width: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("width") || element.style.width || null,
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return {
            width: attributes.width,
          };
        },
      },
      href: {
        default: null,
        parseHTML: (element) => {
          if (element.parentElement && element.parentElement.tagName === "A") {
            return element.parentElement.getAttribute("href");
          }
          return element.getAttribute("data-href");
        },
        renderHTML: (attributes) => {
          if (!attributes.href) return {};
          return {
            "data-href": attributes.href,
          };
        },
      },
      alignment: {
        default: "center",
        parseHTML: (element) => {
          const dataAlign = element.getAttribute("data-align");
          if (
            dataAlign === "left" ||
            dataAlign === "right" ||
            dataAlign === "center"
          ) {
            return dataAlign;
          }
          const ml = element.style.marginLeft;
          const mr = element.style.marginRight;
          const m = element.style.margin;
          if (
            m === "0px auto" ||
            m === "0 auto" ||
            (ml === "auto" && mr === "auto")
          ) {
            return "center";
          }
          if (mr === "auto" && (ml === "0" || ml === "0px" || !ml)) {
            return "left";
          }
          if (ml === "auto" && (mr === "0" || mr === "0px" || !mr)) {
            return "right";
          }
          return "center";
        },
        renderHTML: (attributes) => {
          const widthCss = attributes.width
            ? `width: ${attributes.width}; `
            : "";
          const align = attributes.alignment || "center";
          let marginCss = "margin: 0 auto; display: block;";
          if (align === "left") {
            marginCss = "margin-right: auto; margin-left: 0; display: block;";
          } else if (align === "right") {
            marginCss = "margin-left: auto; margin-right: 0; display: block;";
          } else if (align === "center") {
            marginCss = "margin: 0 auto; display: block;";
          }
          return {
            "data-align": align,
            style: `${widthCss}max-width: 100%; height: auto; ${marginCss}`,
          };
        },
      },
    };
  },
});

// -------------------------------------------------------------
// 7. VariableNodeExtension
// -------------------------------------------------------------

export const VariableNodeExtension = Node.create({
  name: "variable",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      key: {
        default: "event.title",
        parseHTML: (element) =>
          element.getAttribute("data-variable") || "event.title",
      },
      label: {
        default: "Event Title",
        parseHTML: (element) =>
          element.getAttribute("data-label") || "Event Title",
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-variable]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const key = node.attrs.key || "event.title";
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-variable": key,
        class:
          "inline-flex items-center rounded bg-zinc-900 text-zinc-100 px-1.5 py-0.5 text-xs font-mono mx-0.5",
      }),
      `{{${key}}}`,
    ];
  },
});

// -------------------------------------------------------------
// 8. BlockStyleExtension (Global block attributes)
// -------------------------------------------------------------

export const BlockStyleExtension = Extension.create({
  name: "blockStyle",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "blockquote", "listItem"],
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (element) => element.style.backgroundColor || null,
            renderHTML: (attributes) => {
              if (!attributes.backgroundColor) return {};
              return {
                style: `background-color: ${attributes.backgroundColor}`,
              };
            },
          },
          borderColor: {
            default: null,
            parseHTML: (element) => element.style.borderColor || null,
            renderHTML: (attributes) => {
              if (!attributes.borderColor) return {};
              return { style: `border-color: ${attributes.borderColor}` };
            },
          },
          borderWidth: {
            default: null,
            parseHTML: (element) => element.style.borderWidth || null,
            renderHTML: (attributes) => {
              if (!attributes.borderWidth) return {};
              return { style: `border-width: ${attributes.borderWidth}` };
            },
          },
          borderStyle: {
            default: null,
            parseHTML: (element) => element.style.borderStyle || null,
            renderHTML: (attributes) => {
              if (!attributes.borderStyle) return {};
              return { style: `border-style: ${attributes.borderStyle}` };
            },
          },
          borderRadius: {
            default: null,
            parseHTML: (element) => element.style.borderRadius || null,
            renderHTML: (attributes) => {
              if (!attributes.borderRadius) return {};
              return { style: `border-radius: ${attributes.borderRadius}` };
            },
          },
          padding: {
            default: null,
            parseHTML: (element) => element.style.padding || null,
            renderHTML: (attributes) => {
              if (!attributes.padding) return {};
              return { style: `padding: ${attributes.padding}` };
            },
          },
          marginTop: {
            default: null,
            parseHTML: (element) => element.style.marginTop || null,
            renderHTML: (attributes) => {
              if (!attributes.marginTop) return {};
              return { style: `margin-top: ${attributes.marginTop}` };
            },
          },
          marginBottom: {
            default: null,
            parseHTML: (element) => element.style.marginBottom || null,
            renderHTML: (attributes) => {
              if (!attributes.marginBottom) return {};
              return { style: `margin-bottom: ${attributes.marginBottom}` };
            },
          },
        },
      },
    ];
  },
});
