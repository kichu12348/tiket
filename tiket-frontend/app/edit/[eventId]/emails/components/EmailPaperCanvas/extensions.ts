import { Extension, Node } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";

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
