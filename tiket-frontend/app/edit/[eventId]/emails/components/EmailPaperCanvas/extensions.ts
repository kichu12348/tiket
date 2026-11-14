import { Extension, Node } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { Plugin, NodeSelection } from "@tiptap/pm/state";

// Custom Tiptap Extension for Block Inline Attributes
export const BlockStyleExtension = Extension.create({
  name: "blockStyle",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "blockquote", "listItem", "container"],
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

// Custom Container Extension for styled card boxes (<div style="...">)
export const ContainerExtension = Node.create({
  name: "container",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,
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

// Custom Link Extension that preserves inline style & class attributes (critical for CTA buttons)
export const CustomLinkExtension = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          if (!attributes.style) {
            return { style: "color: #2563eb; text-decoration: underline;" };
          }
          return { style: attributes.style };
        },
      },
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute("class"),
        renderHTML: (attributes) => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        },
      },
    };
  },
});

// Custom Image Extension extending Tiptap Image with width, alignment, and click link
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

// Custom CTA Button Node Extension (<div data-type="cta-button" style="..."><a>...</a></div>)
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
      const dom = document.createElement("div");
      dom.setAttribute("data-type", "cta-button");
      dom.setAttribute(
        "data-button-color",
        (node.attrs.buttonColor as string) || "#000000",
      );
      dom.setAttribute(
        "data-text-color",
        (node.attrs.textColor as string) || "#ffffff",
      );
      dom.setAttribute(
        "data-border-radius",
        (node.attrs.borderRadius as string) || "8px",
      );
      dom.setAttribute(
        "data-align",
        (node.attrs.alignment as string) || "center",
      );
      dom.setAttribute("data-url", (node.attrs.url as string) || "#");
      dom.style.textAlign = (node.attrs.alignment as string) || "center";
      dom.style.margin = "24px 0";

      const a = document.createElement("a");
      a.setAttribute("href", (node.attrs.url as string) || "#");
      a.textContent = (node.attrs.label as string) || "Click Here";
      a.style.backgroundColor =
        (node.attrs.buttonColor as string) || "#000000";
      a.style.color = (node.attrs.textColor as string) || "#ffffff";
      a.style.padding = "12px 24px";
      a.style.textDecoration = "none";
      a.style.borderRadius =
        (node.attrs.borderRadius as string) || "8px";
      a.style.fontWeight = "600";
      a.style.fontSize = "15px";
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
          const { label, url, buttonColor, textColor, borderRadius, alignment } =
            newNode.attrs;
          dom.setAttribute("data-button-color", buttonColor || "#000000");
          dom.setAttribute("data-text-color", textColor || "#ffffff");
          dom.setAttribute("data-border-radius", borderRadius || "8px");
          dom.setAttribute("data-align", alignment || "center");
          dom.setAttribute("data-url", url || "#");
          dom.style.textAlign = alignment || "center";

          a.setAttribute("href", url || "#");
          a.textContent = label || "Click Here";
          a.style.backgroundColor = buttonColor || "#000000";
          a.style.color = textColor || "#ffffff";
          a.style.borderRadius = borderRadius || "8px";
          return true;
        },
        destroy() {
          a.removeEventListener("click", handleSelect);
          dom.removeEventListener("click", handleSelect);
        },
      };
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleClickOn(view, _pos, node, nodePos, event) {
            if (node.type.name === "ctaButton") {
              event.preventDefault();
              event.stopPropagation();
              const tr = view.state.tr.setSelection(
                NodeSelection.create(view.state.doc, nodePos),
              );
              view.dispatch(tr);
              view.focus();
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const {
      label = "Click Here",
      url = "#",
      buttonColor = "#000000",
      textColor = "#ffffff",
      borderRadius = "8px",
      alignment = "center",
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
        style: `text-align: ${alignment}; margin: 24px 0;`,
      },
      [
        "a",
        {
          href: url,
          style: `background-color: ${buttonColor}; color: ${textColor}; padding: 12px 24px; text-decoration: none; border-radius: ${borderRadius}; font-weight: 600; font-size: 15px; display: inline-block; cursor: pointer; user-select: none;`,
        },
        label,
      ],
    ];
  },
});
