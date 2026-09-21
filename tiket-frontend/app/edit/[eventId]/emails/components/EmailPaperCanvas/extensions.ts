import { Extension } from "@tiptap/react";
import { Image } from "@tiptap/extension-image";

// Custom Tiptap Extension for Block Inline Attributes
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
        },
      },
    ];
  },
});

// Custom Tiptap Extension for Image Attributes (Extends Tiptap's Image extension with width & alignment margins)
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
