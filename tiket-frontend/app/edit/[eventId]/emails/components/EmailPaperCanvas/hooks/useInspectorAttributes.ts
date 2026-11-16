import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import {
  getActiveBlockInfo,
  getInnermostBlock,
  getActiveContainerInfo,
  getActiveButtonInfo,
  normalizeDimension,
} from "../functions";

export function useInspectorAttributes(
  editor: Editor | null,
  _selectionTick?: number,
) {
  if (!editor) {
    return {
      currentFontFamily: "__default__",
      currentFontWeight: "400",
      currentTextColor: "#111827",
      currentHighlightColor: "",
      activeBlockType: "paragraph",
      currentElementType: "p",
      currentBlockBgColor: "",
      currentBorderStyle: "none",
      currentBorderWidth: "0px",
      currentBorderColor: "#e5e7eb",
      currentBorderRadius: "0px",
      currentPadding: "0px",
      currentMarginTop: "0px",
      currentMarginBottom: "0px",
      isContainerActive: false,
      currentContainerBgColor: "",
      currentContainerBorderStyle: "solid",
      currentContainerBorderWidth: "1px",
      currentContainerBorderColor: "#e5e7eb",
      currentContainerBorderRadius: "8px",
      currentContainerPadding: "20px",
      currentContainerMarginTop: "16px",
      currentContainerMarginBottom: "16px",
      isImageActive: false,
      currentImageSrc: "",
      currentImageAlt: "",
      currentImageWidth: "",
      currentImageHref: "",
      currentImageAlignment: "center" as const,
      isCtaActive: false,
      currentCtaLabel: "",
      currentCtaUrl: "",
      currentCtaButtonColor: "#000000",
      currentCtaTextColor: "#ffffff",
      currentCtaBorderRadius: "8px",
      currentCtaAlignment: "center" as const,
      currentCtaPadding: "12px 24px",
      currentCtaFontSize: "15px",
      currentCtaFontWeight: "600",
      currentCtaHeight: "",
      currentCtaWidth: "",
      currentCtaMarginTop: "16px",
      currentCtaMarginBottom: "16px",
    };
  }

  // Active Text Styles
  const currentFontFamily =
    (editor.getAttributes("textStyle").fontFamily as string) || "__default__";
  const currentFontWeight =
    (editor.getAttributes("textStyle").fontWeight as string) || "400";
  const currentTextColor =
    (editor.getAttributes("textStyle").color as string) || "#111827";
  const currentHighlightColor =
    (editor.getAttributes("highlight").style?.backgroundColor as string) ||
    (editor.getAttributes("highlight").color as string) ||
    "";

  // Active Block
  const { blockType: activeBlockType, elementType: currentElementType } =
    getInnermostBlock(editor);
  const activeBlockInfo = getActiveBlockInfo(editor);
  const activeBlockNode = activeBlockInfo?.node;

  const blockAttrs = activeBlockNode
    ? activeBlockNode.attrs
    : editor.getAttributes(activeBlockType);
  const blockStyle = (blockAttrs.style && typeof blockAttrs.style === "object"
    ? blockAttrs.style
    : {}) as Record<string, string>;
  const currentBlockBgColor = blockStyle.backgroundColor || "";
  const currentBorderStyle = blockStyle.borderStyle || "none";
  const currentBorderWidth = blockStyle.borderWidth || "0px";
  const currentBorderColor = blockStyle.borderColor || "#e5e7eb";
  const currentBorderRadius = blockStyle.borderRadius || "0px";
  const currentPadding = blockStyle.padding || "0px";
  const currentMarginTop = blockStyle.marginTop || "0px";
  const currentMarginBottom = blockStyle.marginBottom || "0px";

  // Active Container
  const activeContainerInfo = getActiveContainerInfo(editor);
  const isContainerActive = Boolean(activeContainerInfo);
  const activeContainerNode = activeContainerInfo?.node;
  const containerStyle = (activeContainerNode?.attrs.style &&
    typeof activeContainerNode.attrs.style === "object"
    ? activeContainerNode.attrs.style
    : {}) as Record<string, string>;

  const currentContainerBgColor = containerStyle.backgroundColor || "";
  const currentContainerBorderStyle = containerStyle.borderStyle || "solid";
  const currentContainerBorderWidth = containerStyle.borderWidth || "1px";
  const currentContainerBorderColor = containerStyle.borderColor || "#e5e7eb";
  const currentContainerBorderRadius = containerStyle.borderRadius || "8px";
  const currentContainerPadding = containerStyle.padding || "20px";
  const currentContainerMarginTop = containerStyle.marginTop || "16px";
  const currentContainerMarginBottom = containerStyle.marginBottom || "16px";

  // Active Image
  const isImageNodeSelected =
    editor.state.selection instanceof NodeSelection &&
    (editor.state.selection.node.type.name === "image" ||
      editor.state.selection.node.type.name === "imageBlock");

  const isImageActive =
    editor.isActive("image") ||
    editor.isActive("imageBlock") ||
    isImageNodeSelected;

  const activeImageAttrs = isImageNodeSelected
    ? (editor.state.selection as NodeSelection).node.attrs
    : (editor.isActive("imageBlock")
        ? editor.getAttributes("imageBlock")
        : editor.getAttributes("image")) || {};
  const activeLinkAttrs = editor.getAttributes("link");

  const imageStyle = (activeImageAttrs.style &&
    typeof activeImageAttrs.style === "object"
    ? activeImageAttrs.style
    : {}) as Record<string, string>;
  const currentImageSrc = (activeImageAttrs.src as string) || "";
  const currentImageAlt = (activeImageAttrs.alt as string) || "";
  const currentImageWidth =
    imageStyle.width || (activeImageAttrs.width as string) || "";
  const currentImageHref =
    (activeImageAttrs.href as string) ||
    (activeLinkAttrs.href as string) ||
    "";
  const currentImageAlignment =
    (activeImageAttrs.alignment as "left" | "center" | "right") || "center";

  // Active CTA Button
  const activeButtonInfo = getActiveButtonInfo(editor);
  const isCtaActive = Boolean(activeButtonInfo);
  const activeCtaNode = activeButtonInfo?.node;
  const activeCtaAttrs =
    (activeCtaNode
      ? activeCtaNode.attrs
      : editor.getAttributes("buttonBlock")) || {};

  const ctaStyle = (activeCtaAttrs.style &&
    typeof activeCtaAttrs.style === "object"
    ? activeCtaAttrs.style
    : {}) as Record<string, string>;
  const currentCtaLabel = (
    activeCtaNode?.textContent ||
    (activeCtaAttrs.label as string) ||
    ""
  ).trim();
  const currentCtaUrl =
    (activeCtaAttrs.href as string) || (activeCtaAttrs.url as string) || "";
  const currentCtaButtonColor =
    ctaStyle.backgroundColor ||
    (activeCtaAttrs.buttonColor as string) ||
    "#000000";
  const currentCtaTextColor =
    ctaStyle.color || (activeCtaAttrs.textColor as string) || "#ffffff";
  const currentCtaBorderRadius =
    ctaStyle.borderRadius ||
    (activeCtaAttrs.borderRadius as string) ||
    "8px";
  const currentCtaAlignment =
    (activeCtaAttrs.alignment as "left" | "center" | "right") || "center";
  const currentCtaPadding = ctaStyle.padding || "12px 24px";
  const currentCtaFontSize = ctaStyle.fontSize || "15px";
  const currentCtaFontWeight = ctaStyle.fontWeight || "600";
  const currentCtaHeight = ctaStyle.height || "";
  const currentCtaWidth = ctaStyle.width || "";

  const currentCtaMarginTop =
    normalizeDimension(ctaStyle.marginTop) ||
    normalizeDimension(activeCtaAttrs.marginTop) ||
    normalizeDimension(ctaStyle.margin?.split(" ")[0]) ||
    "16px";
  const currentCtaMarginBottom =
    normalizeDimension(ctaStyle.marginBottom) ||
    normalizeDimension(activeCtaAttrs.marginBottom) ||
    normalizeDimension(
      ctaStyle.margin?.split(" ")[1] || ctaStyle.margin?.split(" ")[0],
    ) ||
    "16px";

  return {
    currentFontFamily,
    currentFontWeight,
    currentTextColor,
    currentHighlightColor,
    activeBlockType,
    currentElementType,
    currentBlockBgColor,
    currentBorderStyle,
    currentBorderWidth,
    currentBorderColor,
    currentBorderRadius,
    currentPadding,
    currentMarginTop,
    currentMarginBottom,
    isContainerActive,
    currentContainerBgColor,
    currentContainerBorderStyle,
    currentContainerBorderWidth,
    currentContainerBorderColor,
    currentContainerBorderRadius,
    currentContainerPadding,
    currentContainerMarginTop,
    currentContainerMarginBottom,
    isImageActive,
    currentImageSrc,
    currentImageAlt,
    currentImageWidth,
    currentImageHref,
    currentImageAlignment,
    isCtaActive,
    currentCtaLabel,
    currentCtaUrl,
    currentCtaButtonColor,
    currentCtaTextColor,
    currentCtaBorderRadius,
    currentCtaAlignment,
    currentCtaPadding,
    currentCtaFontSize,
    currentCtaFontWeight,
    currentCtaHeight,
    currentCtaWidth,
    currentCtaMarginTop,
    currentCtaMarginBottom,
  };
}
