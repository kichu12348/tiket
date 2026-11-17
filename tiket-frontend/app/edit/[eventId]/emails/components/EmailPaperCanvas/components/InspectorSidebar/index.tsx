
import React from "react";
import type { Editor } from "@tiptap/react";
import Dropdown from "@/components/Dropdown";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  SlidersHorizontal,
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Image as ImageIcon,
  Link as LinkIcon,
  MousePointerClick,
  Layers,
  Ungroup,
  Check,
} from "lucide-react";
import { useTipTapSync } from "@/hooks/useTipTapSync";
import {
  FONT_FAMILIES,
  FONT_WEIGHTS,
  BORDER_STYLES,
  CORNER_RADII,
  PADDING_SIZES,
  MARGIN_SIZES,
  ELEMENT_TYPES,
} from "../../constants";
import styles from "./InspectorSidebar.module.css";

interface InspectorSidebarProps {
  editor: Editor;
  allVars: Array<{ key: string; label: string; sample: string }>;
  onOpenCtaModal: () => void;
  onOpenLinkModal: () => void;
  onRemoveLink?: () => void;
  onDeleteLink?: () => void;
  onOpenImageModal: () => void;
  currentFontFamily: string;
  currentFontWeight: string;
  currentTextColor: string;
  currentHighlightColor: string;
  currentBlockBgColor: string;
  currentBorderStyle: string;
  currentBorderWidth: string;
  currentBorderColor: string;
  currentBorderRadius: string;
  currentPadding: string;
  currentMarginTop?: string;
  currentMarginBottom?: string;
  currentElementType: string;
  updateBlockAttribute: (attrName: string, attrVal: string | null) => void;
  isImageActive: boolean;
  currentImageSrc: string;
  currentImageAlt: string;
  currentImageWidth: string;
  currentImageHref: string;
  currentImageAlignment: "left" | "center" | "right";
  updateImageSrc: (src: string) => void;
  updateImageAlt: (alt: string) => void;
  updateImageWidth: (width: string) => void;
  updateImageHref: (href: string) => void;
  updateImageAlignment: (alignment: "left" | "center" | "right") => void;
  handleInsertVariable: (varKey: string) => void;
  isCtaActive?: boolean;
  currentCtaLabel?: string;
  currentCtaUrl?: string;
  currentCtaButtonColor?: string;
  currentCtaTextColor?: string;
  currentCtaBorderRadius?: string;
  currentCtaAlignment?: "left" | "center" | "right";
  currentCtaPadding?: string;
  currentCtaFontSize?: string;
  currentCtaFontWeight?: string;
  currentCtaHeight?: string;
  currentCtaWidth?: string;
  currentCtaMarginTop?: string;
  currentCtaMarginBottom?: string;
  updateCtaAttributes?: (attrs: Record<string, string>) => void;
  updateCtaStyleAttribute?: (styleKey: string, val: string | null) => void;
  onDeleteCta?: () => void;
  isContainerActive?: boolean;
  currentContainerBgColor?: string;
  currentContainerBorderStyle?: string;
  currentContainerBorderWidth?: string;
  currentContainerBorderColor?: string;
  currentContainerBorderRadius?: string;
  currentContainerPadding?: string;
  currentContainerMarginTop?: string;
  currentContainerMarginBottom?: string;
  updateContainerStyleAttribute?: (
    styleKey: string,
    val: string | null,
  ) => void;
  onUnwrapContainer?: () => void;
  onDeleteContainer?: () => void;
  onToggleBold?: () => void;
  onSetFontWeight?: (weight: string) => void;
}

export default function InspectorSidebar({
  editor,
  allVars,
  onOpenCtaModal,
  onOpenLinkModal,
  onRemoveLink,
  onDeleteLink,
  onOpenImageModal,
  currentFontFamily,
  currentFontWeight,
  currentTextColor,
  currentHighlightColor,
  currentBlockBgColor,
  currentBorderStyle,
  currentBorderWidth,
  currentBorderColor,
  currentBorderRadius,
  currentPadding,
  currentMarginTop = "0px",
  currentMarginBottom = "0px",
  currentElementType,
  updateBlockAttribute,
  isImageActive,
  currentImageSrc,
  currentImageAlt,
  currentImageWidth,
  currentImageHref,
  currentImageAlignment,
  updateImageSrc,
  updateImageAlt,
  updateImageWidth,
  updateImageHref,
  updateImageAlignment,
  handleInsertVariable,
  isCtaActive = false,
  currentCtaLabel = "",
  currentCtaUrl = "",
  currentCtaButtonColor = "#000000",
  currentCtaTextColor = "#ffffff",
  currentCtaBorderRadius = "8px",
  currentCtaAlignment = "center",
  currentCtaPadding = "12px 24px",
  currentCtaFontSize = "15px",
  currentCtaFontWeight: _currentCtaFontWeight = "600",
  currentCtaHeight = "",
  currentCtaWidth = "auto",
  currentCtaMarginTop = "0px",
  currentCtaMarginBottom = "0px",
  updateCtaAttributes,
  updateCtaStyleAttribute,
  onDeleteCta,
  isContainerActive = false,
  currentContainerBgColor = "",
  currentContainerBorderStyle = "solid",
  currentContainerBorderWidth = "1px",
  currentContainerBorderColor = "#e5e7eb",
  currentContainerBorderRadius = "8px",
  currentContainerPadding = "20px",
  currentContainerMarginTop = "16px",
  currentContainerMarginBottom = "16px",
  updateContainerStyleAttribute,
  onUnwrapContainer,
  onDeleteContainer,
  onToggleBold,
  onSetFontWeight,
}: InspectorSidebarProps) {
  const tipTapSync = useTipTapSync(editor);
  const [userToggledSections, setUserToggledSections] = React.useState<
    string[]
  >(["textFormatting", "bgBorders", "containerControls"]);

  // Local drafts to prevent transactions on every keystroke
  const [borderWidthDraft, setBorderWidthDraft] = React.useState(
    currentBorderWidth || "",
  );
  const [containerBorderWidthDraft, setContainerBorderWidthDraft] =
    React.useState(currentContainerBorderWidth || "");
  const [ctaLabelDraft, setCtaLabelDraft] = React.useState(
    currentCtaLabel || "",
  );
  const [ctaUrlDraft, setCtaUrlDraft] = React.useState(currentCtaUrl || "");
  const [ctaFontSizeDraft, setCtaFontSizeDraft] = React.useState(
    currentCtaFontSize || "",
  );
  const [ctaHeightDraft, setCtaHeightDraft] = React.useState(
    currentCtaHeight || "",
  );
  const [ctaWidthDraft, setCtaWidthDraft] = React.useState(
    currentCtaWidth || "",
  );
  const [imageSrcDraft, setImageSrcDraft] = React.useState(
    currentImageSrc || "",
  );
  const [imageHrefDraft, setImageHrefDraft] = React.useState(
    currentImageHref || "",
  );
  const [imageWidthDraft, setImageWidthDraft] = React.useState(
    currentImageWidth || "",
  );
  const [imageAltDraft, setImageAltDraft] = React.useState(
    currentImageAlt || "",
  );
  const activeFontSizeStr = String(tipTapSync.activeTextStyle.fontSize || "");
  const [fontSizeDraft, setFontSizeDraft] = React.useState(activeFontSizeStr);

  const [prevValues, setPrevValues] = React.useState({
    borderWidth: currentBorderWidth || "",
    containerBorderWidth: currentContainerBorderWidth || "",
    ctaLabel: currentCtaLabel || "",
    ctaUrl: currentCtaUrl || "",
    ctaPadding: currentCtaPadding || "",
    ctaFontSize: currentCtaFontSize || "",
    ctaHeight: currentCtaHeight || "",
    ctaWidth: currentCtaWidth || "",
    imageSrc: currentImageSrc || "",
    imageHref: currentImageHref || "",
    imageWidth: currentImageWidth || "",
    imageAlt: currentImageAlt || "",
    fontSize: activeFontSizeStr,
  });

  if (
    currentBorderWidth !== prevValues.borderWidth ||
    currentContainerBorderWidth !== prevValues.containerBorderWidth ||
    currentCtaLabel !== prevValues.ctaLabel ||
    currentCtaUrl !== prevValues.ctaUrl ||
    currentCtaPadding !== prevValues.ctaPadding ||
    currentCtaFontSize !== prevValues.ctaFontSize ||
    currentCtaHeight !== prevValues.ctaHeight ||
    currentCtaWidth !== prevValues.ctaWidth ||
    currentImageSrc !== prevValues.imageSrc ||
    currentImageHref !== prevValues.imageHref ||
    currentImageWidth !== prevValues.imageWidth ||
    currentImageAlt !== prevValues.imageAlt ||
    activeFontSizeStr !== prevValues.fontSize
  ) {
    setPrevValues({
      borderWidth: currentBorderWidth || "",
      containerBorderWidth: currentContainerBorderWidth || "",
      ctaLabel: currentCtaLabel || "",
      ctaUrl: currentCtaUrl || "",
      ctaPadding: currentCtaPadding || "",
      ctaFontSize: currentCtaFontSize || "",
      ctaHeight: currentCtaHeight || "",
      ctaWidth: currentCtaWidth || "",
      imageSrc: currentImageSrc || "",
      imageHref: currentImageHref || "",
      imageWidth: currentImageWidth || "",
      imageAlt: currentImageAlt || "",
      fontSize: activeFontSizeStr,
    });
    setBorderWidthDraft(currentBorderWidth || "");
    setContainerBorderWidthDraft(currentContainerBorderWidth || "");
    setCtaLabelDraft(currentCtaLabel || "");
    setCtaUrlDraft(currentCtaUrl || "");
    setCtaFontSizeDraft(currentCtaFontSize || "");
    setCtaHeightDraft(currentCtaHeight || "");
    setCtaWidthDraft(currentCtaWidth || "");
    setImageSrcDraft(currentImageSrc || "");
    setImageHrefDraft(currentImageHref || "");
    setImageWidthDraft(currentImageWidth || "");
    setImageAltDraft(currentImageAlt || "");
    setFontSizeDraft(activeFontSizeStr);
  }

  const commitBorderWidth = () => {
    const trimmed = borderWidthDraft.trim();
    if (!trimmed) {
      updateBlockAttribute("borderWidth", null);
      setBorderWidthDraft("");
      return;
    }
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const normalized = `${trimmed}px`;
      if (!currentBorderStyle || currentBorderStyle === "none") {
        updateBlockAttribute("borderStyle", "solid");
      }
      updateBlockAttribute("borderWidth", normalized);
      setBorderWidthDraft(normalized);
      return;
    }
    if (/^\d+(\.\d+)?(px|em|rem|%)?$/.test(trimmed)) {
      if (!currentBorderStyle || currentBorderStyle === "none") {
        updateBlockAttribute("borderStyle", "solid");
      }
      updateBlockAttribute("borderWidth", trimmed);
      setBorderWidthDraft(trimmed);
      return;
    }
    setBorderWidthDraft(currentBorderWidth || "");
  };

  const commitContainerBorderWidth = () => {
    const trimmed = containerBorderWidthDraft.trim();
    if (!trimmed) {
      updateContainerStyleAttribute?.("borderWidth", null);
      setContainerBorderWidthDraft("");
      return;
    }
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const normalized = `${trimmed}px`;
      if (
        !currentContainerBorderStyle ||
        currentContainerBorderStyle === "none"
      ) {
        updateContainerStyleAttribute?.("borderStyle", "solid");
      }
      updateContainerStyleAttribute?.("borderWidth", normalized);
      setContainerBorderWidthDraft(normalized);
      return;
    }
    if (/^\d+(\.\d+)?(px|em|rem|%)?$/.test(trimmed)) {
      if (
        !currentContainerBorderStyle ||
        currentContainerBorderStyle === "none"
      ) {
        updateContainerStyleAttribute?.("borderStyle", "solid");
      }
      updateContainerStyleAttribute?.("borderWidth", trimmed);
      setContainerBorderWidthDraft(trimmed);
      return;
    }
    setContainerBorderWidthDraft(currentContainerBorderWidth || "");
  };

  const commitCtaLabel = () => {
    const trimmed = ctaLabelDraft.trim();
    if (!trimmed) {
      const fallback = currentCtaLabel || "Click Here";
      setCtaLabelDraft(fallback);
      updateCtaAttributes?.({ label: fallback });
      return;
    }
    updateCtaAttributes?.({ label: trimmed });
  };

  const commitCtaUrl = () => {
    const trimmed = ctaUrlDraft.trim();
    updateCtaAttributes?.({ url: trimmed || "#" });
  };

  const commitCtaHeight = () => {
    const trimmed = ctaHeightDraft.trim();
    if (!trimmed || trimmed === "auto") {
      updateCtaStyleAttribute?.("height", null);
      setCtaHeightDraft("");
      return;
    }
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const normalized = `${trimmed}px`;
      updateCtaStyleAttribute?.("height", normalized);
      setCtaHeightDraft(normalized);
      return;
    }
    if (/^\d+(\.\d+)?(px|em|rem|%)?$/.test(trimmed)) {
      updateCtaStyleAttribute?.("height", trimmed);
      setCtaHeightDraft(trimmed);
      return;
    }
    setCtaHeightDraft(currentCtaHeight || "");
  };

  const commitCtaWidth = () => {
    const trimmed = ctaWidthDraft.trim();
    if (!trimmed || trimmed === "auto") {
      updateCtaStyleAttribute?.("width", null);
      setCtaWidthDraft("auto");
      return;
    }
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const normalized = `${trimmed}px`;
      updateCtaStyleAttribute?.("width", normalized);
      setCtaWidthDraft(normalized);
      return;
    }
    if (/^\d+(\.\d+)?(px|em|rem|%)?$/.test(trimmed)) {
      updateCtaStyleAttribute?.("width", trimmed);
      setCtaWidthDraft(trimmed);
      return;
    }
    setCtaWidthDraft(currentCtaWidth || "auto");
  };

  const commitFontSize = () => {
    const trimmed = fontSizeDraft.trim();
    if (!trimmed) {
      tipTapSync.updateInlineStyleLive({ fontSize: undefined });
      setFontSizeDraft("");
      return;
    }
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const norm = `${trimmed}px`;
      tipTapSync.updateInlineStyleLive({ fontSize: norm });
      setFontSizeDraft(norm);
      return;
    }
    if (/^\d+(\.\d+)?(px|pt|em|rem)?$/.test(trimmed)) {
      tipTapSync.updateInlineStyleLive({ fontSize: trimmed });
      setFontSizeDraft(trimmed);
      return;
    }
    setFontSizeDraft(String(tipTapSync.activeTextStyle.fontSize || ""));
  };

  const commitImageWidth = () => {
    const trimmed = imageWidthDraft.trim();
    if (!trimmed) {
      updateImageWidth("");
      setImageWidthDraft("");
      return;
    }
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const normalized = `${trimmed}px`;
      updateImageWidth(normalized);
      setImageWidthDraft(normalized);
      return;
    }
    if (/^\d+(\.\d+)?(px|em|rem|%)?$/.test(trimmed)) {
      updateImageWidth(trimmed);
      setImageWidthDraft(trimmed);
      return;
    }
    setImageWidthDraft(currentImageWidth || "");
  };

  const commitImageSrc = () => {
    updateImageSrc(imageSrcDraft.trim());
  };
  const commitImageHref = () => {
    updateImageHref(imageHrefDraft.trim());
  };
  const commitImageAlt = () => {
    updateImageAlt(imageAltDraft.trim());
  };

  const handleInputKeyDown =
    (commitFn: () => void) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        commitFn();
        e.currentTarget.blur();
      }
    };

  const activeAlignment = React.useMemo(() => {
    const nodeAttrs = tipTapSync.activeNodeAttrs || {};
    const styleObj = (
      nodeAttrs.style && typeof nodeAttrs.style === "object"
        ? nodeAttrs.style
        : {}
    ) as Record<string, string>;
    return (nodeAttrs.alignment as string) || styleObj.textAlign || "left";
  }, [tipTapSync.activeNodeAttrs]);

  const setAlignment = (align: "left" | "center" | "right" | "justify") => {
    tipTapSync.updateBlockAttrsLive({ alignment: align });
    updateBlockAttribute("textAlign", align);
  };

  const selectedFontValue = React.useMemo(() => {
    const rawFam =
      tipTapSync.activeTextStyle.fontFamily || currentFontFamily || "";
    const fam = String(rawFam);
    if (!fam || fam === "__default__") {
      return "__default__";
    }
    const getPrimaryFont = (f: string) =>
      f.split(",")[0].replace(/['"]/g, "").trim().toLowerCase();
    const curPrimary = getPrimaryFont(fam);
    const match = FONT_FAMILIES.find((f) => {
      if (f.value === "__default__") return false;
      return getPrimaryFont(f.value) === curPrimary;
    });
    return match ? match.value : fam;
  }, [tipTapSync.activeTextStyle.fontFamily, currentFontFamily]);

  const ctaPaddingOptions = React.useMemo(() => {
    const defaultCtaPaddings = [
      { label: "Compact (8px 16px)", value: "8px 16px" },
      { label: "Normal (12px 24px)", value: "12px 24px" },
      { label: "Large (16px 32px)", value: "16px 32px" },
      { label: "Extra Large (18px 36px)", value: "18px 36px" },
    ];
    if (
      !currentCtaPadding ||
      defaultCtaPaddings.some((o) => o.value === currentCtaPadding)
    ) {
      return defaultCtaPaddings;
    }
    return [
      ...defaultCtaPaddings,
      { label: `Custom (${currentCtaPadding})`, value: currentCtaPadding },
    ];
  }, [currentCtaPadding]);

  const paddingOptions = React.useMemo(() => {
    if (
      !currentPadding ||
      PADDING_SIZES.some((o) => o.value === currentPadding)
    ) {
      return PADDING_SIZES;
    }
    return [
      ...PADDING_SIZES,
      { label: `Custom (${currentPadding})`, value: currentPadding },
    ];
  }, [currentPadding]);

  const marginTopOptions = React.useMemo(() => {
    if (
      !currentMarginTop ||
      MARGIN_SIZES.some((o) => o.value === currentMarginTop)
    ) {
      return MARGIN_SIZES;
    }
    return [
      ...MARGIN_SIZES,
      { label: `Custom (${currentMarginTop})`, value: currentMarginTop },
    ];
  }, [currentMarginTop]);

  const marginBottomOptions = React.useMemo(() => {
    if (
      !currentMarginBottom ||
      MARGIN_SIZES.some((o) => o.value === currentMarginBottom)
    ) {
      return MARGIN_SIZES;
    }
    return [
      ...MARGIN_SIZES,
      { label: `Custom (${currentMarginBottom})`, value: currentMarginBottom },
    ];
  }, [currentMarginBottom]);

  const ctaMarginTopOptions = React.useMemo(() => {
    const val = currentCtaMarginTop || "16px";
    if (MARGIN_SIZES.some((o) => o.value === val)) {
      return MARGIN_SIZES;
    }
    return [...MARGIN_SIZES, { label: `Custom (${val})`, value: val }];
  }, [currentCtaMarginTop]);

  const ctaMarginBottomOptions = React.useMemo(() => {
    const val = currentCtaMarginBottom || "16px";
    if (MARGIN_SIZES.some((o) => o.value === val)) {
      return MARGIN_SIZES;
    }
    return [...MARGIN_SIZES, { label: `Custom (${val})`, value: val }];
  }, [currentCtaMarginBottom]);

  const handleElementTypeChange = (val: string) => {
    if (val === "p") {
      editor.chain().focus().liftListItem("listItem").setParagraph().run();
    } else if (val === "h1") {
      if (!editor.isActive("heading", { level: 1 })) {
        editor.chain().focus().setHeading({ level: 1 }).run();
      }
    } else if (val === "h2") {
      if (!editor.isActive("heading", { level: 2 })) {
        editor.chain().focus().setHeading({ level: 2 }).run();
      }
    } else if (val === "h3") {
      if (!editor.isActive("heading", { level: 3 })) {
        editor.chain().focus().setHeading({ level: 3 }).run();
      }
    } else if (val === "container") {
      if (editor.isActive("containerBlock") || editor.isActive("container")) {
        editor
          .chain()
          .focus()
          .lift(
            editor.isActive("containerBlock") ? "containerBlock" : "container",
          )
          .run();
      } else {
        editor.chain().focus().wrapIn("containerBlock").run();
      }
    } else if (val === "quote") {
      if (editor.isActive("blockquote")) {
        editor.chain().focus().lift("blockquote").run();
      } else {
        editor.chain().focus().wrapIn("blockquote").run();
      }
    } else if (val === "bullet") {
      editor.chain().focus().toggleBulletList().run();
    } else if (val === "ordered") {
      editor.chain().focus().toggleOrderedList().run();
    }
  };

  const containerPaddingOptions = React.useMemo(() => {
    if (
      !currentContainerPadding ||
      PADDING_SIZES.some((o) => o.value === currentContainerPadding)
    ) {
      return PADDING_SIZES;
    }
    return [
      ...PADDING_SIZES,
      {
        label: `Custom (${currentContainerPadding})`,
        value: currentContainerPadding,
      },
    ];
  }, [currentContainerPadding]);

  const containerMarginTopOptions = React.useMemo(() => {
    if (
      !currentContainerMarginTop ||
      MARGIN_SIZES.some((o) => o.value === currentContainerMarginTop)
    ) {
      return MARGIN_SIZES;
    }
    return [
      ...MARGIN_SIZES,
      {
        label: `Custom (${currentContainerMarginTop})`,
        value: currentContainerMarginTop,
      },
    ];
  }, [currentContainerMarginTop]);

  const containerMarginBottomOptions = React.useMemo(() => {
    if (
      !currentContainerMarginBottom ||
      MARGIN_SIZES.some((o) => o.value === currentContainerMarginBottom)
    ) {
      return MARGIN_SIZES;
    }
    return [
      ...MARGIN_SIZES,
      {
        label: `Custom (${currentContainerMarginBottom})`,
        value: currentContainerMarginBottom,
      },
    ];
  }, [currentContainerMarginBottom]);

  const prevIsCtaActive = React.useRef(isCtaActive);
  const prevIsImageActive = React.useRef(isImageActive);
  const prevIsContainerActive = React.useRef(isContainerActive);

  React.useEffect(() => {
    if (isCtaActive && !prevIsCtaActive.current) {
      setUserToggledSections((prev) =>
        prev.includes("buttonControls") ? prev : [...prev, "buttonControls"],
      );
    }
    prevIsCtaActive.current = isCtaActive;
  }, [isCtaActive]);

  React.useEffect(() => {
    if (isImageActive && !prevIsImageActive.current) {
      setUserToggledSections((prev) =>
        prev.includes("imageControls") ? prev : [...prev, "imageControls"],
      );
    }
    prevIsImageActive.current = isImageActive;
  }, [isImageActive]);

  React.useEffect(() => {
    if (isContainerActive && !prevIsContainerActive.current) {
      setUserToggledSections((prev) =>
        prev.includes("containerControls")
          ? prev
          : [...prev, "containerControls"],
      );
    }
    prevIsContainerActive.current = isContainerActive;
  }, [isContainerActive]);

  return (
    <div className={styles.leftInspectorSidebar}>
      <div className={styles.sidebarHeaderTitleRow}>
        <div className={styles.sidebarHeaderLeft}>
          <SlidersHorizontal size={15} className={styles.sidebarTitleIcon} />
          <span className={styles.sidebarTitleText}>Inspector</span>
        </div>
        <div className={styles.quickActionGroup}>
          <button
            type="button"
            className={styles.quickActionBtn}
            onClick={onOpenCtaModal}
            title="Add Call-to-Action Button"
          >
            <Plus size={13} strokeWidth={2.5} />
            <span>CTA</span>
          </button>
        </div>
      </div>

      <p className={styles.inspectorInstructionText}>
        Select text or an element in the editor, then use the options below to
        style it.
      </p>

      <Accordion
        type="multiple"
        value={userToggledSections}
        onValueChange={setUserToggledSections}
        className="w-full"
      >
        {!isCtaActive && (
          <>
            {/* 1. Text Formatting Accordion Item */}
            <AccordionItem value="textFormatting">
              <AccordionTrigger>Text Formatting</AccordionTrigger>
              <AccordionContent>
                {/* Element Type */}
                <div className={styles.inputFieldGroup}>
                  <label className={styles.inputLabel}>Element Type</label>
                  <Dropdown
                    variant="dark"
                    options={ELEMENT_TYPES}
                    value={currentElementType}
                    onChange={handleElementTypeChange}
                    placeholder="Element Type"
                    btnWidth="100%"
                    width="100%"
                  />
                </div>

                {/* Font Family (Full width for clear, non-wrapping typography selection) */}
                <div className={styles.inputFieldGroup}>
                  <label className={styles.inputLabel}>Font Family</label>
                  <Dropdown
                    variant="dark"
                    options={FONT_FAMILIES}
                    value={selectedFontValue}
                    onChange={(val) => {
                      if (val === "__default__") {
                        editor.chain().focus().unsetFontFamily().run();
                        tipTapSync.updateInlineStyleLive(
                          { fontFamily: undefined },
                          true,
                        );
                      } else {
                        editor.chain().focus().setFontFamily(val).run();
                        tipTapSync.updateInlineStyleLive(
                          { fontFamily: val },
                          true,
                        );
                      }
                    }}
                    renderTriggerContent={(selected) => (
                      <span
                        style={{
                          fontFamily:
                            selected && selected.value !== "__default__"
                              ? selected.value
                              : undefined,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "inline-block",
                          maxWidth: "220px",
                        }}
                      >
                        {selected ? selected.label : "Font Family"}
                      </span>
                    )}
                    renderOption={(option, isSelected) => (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          fontFamily:
                            option.value !== "__default__"
                              ? option.value
                              : undefined,
                        }}
                      >
                        <span style={{ fontSize: "0.85rem" }}>
                          {option.label}
                        </span>
                        {isSelected && (
                          <Check size={14} style={{ color: "#34d399" }} />
                        )}
                      </div>
                    )}
                    placeholder="Font Family"
                    btnWidth="100%"
                    width="100%"
                  />
                </div>

                {/* Font Size & Font Weight */}
                <div className={styles.rowTwoGrid}>
                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Font Size</label>
                    <input
                      type="text"
                      className={styles.inputControl}
                      value={fontSizeDraft}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFontSizeDraft(val);
                        const trimmed = val.trim();
                        if (/^\d+(\.\d+)?$/.test(trimmed)) {
                          tipTapSync.updateInlineStyleLive({
                            fontSize: `${trimmed}px`,
                          });
                        } else if (
                          /^\d+(\.\d+)?(px|pt|em|rem)?$/.test(trimmed)
                        ) {
                          tipTapSync.updateInlineStyleLive({
                            fontSize: trimmed,
                          });
                        }
                      }}
                      onBlur={commitFontSize}
                      onKeyDown={handleInputKeyDown(commitFontSize)}
                      placeholder="e.g. 15px"
                    />
                  </div>

                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Font Weight</label>
                    <Dropdown
                      variant="dark"
                      options={FONT_WEIGHTS}
                      value={
                        tipTapSync.isBold
                          ? "700"
                          : (tipTapSync.activeTextStyle.fontWeight as string) ||
                            currentFontWeight ||
                            "400"
                      }
                      onChange={(val) => {
                        if (onSetFontWeight) {
                          onSetFontWeight(val);
                        }
                        tipTapSync.updateInlineStyleLive(
                          { fontWeight: val },
                          true,
                        );
                      }}
                      placeholder="Font Weight"
                      btnWidth="100%"
                      width="100%"
                    />
                  </div>
                </div>

                {/* Text ColorPicker */}
                <div className={styles.inputFieldGroup}>
                  <label className={styles.inputLabel}>Text Color</label>
                  <ColorPicker
                    value={
                      (tipTapSync.activeTextStyle.color as string) ||
                      currentTextColor ||
                      "#111827"
                    }
                    allowAlpha={false}
                    onChange={(color) => {
                      tipTapSync.updateInlineStyleLive({ color });
                      editor.chain().setColor(color).run();
                    }}
                  />
                </div>

                {/* Highlight ColorPicker */}
                <div className={styles.inputFieldGroup}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <label className={styles.inputLabel}>Highlight Color</label>
                    {((tipTapSync.activeTextStyle.backgroundColor as string) ||
                      currentHighlightColor) && (
                      <button
                        type="button"
                        className={styles.clearSwatchBtn}
                        onClick={() => {
                          tipTapSync.updateInlineStyleLive({
                            backgroundColor: undefined,
                          });
                          editor.chain().unsetHighlight().run();
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <ColorPicker
                    value={
                      (tipTapSync.activeTextStyle.backgroundColor as string) ||
                      currentHighlightColor ||
                      ""
                    }
                    allowAlpha={false}
                    onChange={(color) => {
                      tipTapSync.updateInlineStyleLive({
                        backgroundColor: color,
                      });
                      editor.chain().setHighlight({ color }).run();
                    }}
                  />
                </div>

                {/* Alignments */}
                <div className={styles.inputFieldGroup}>
                  <label className={styles.inputLabel}>Text Alignment</label>
                  <div className={styles.buttonToggleGroup}>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      data-active={activeAlignment === "left"}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setAlignment("left")}
                    >
                      <AlignLeft size={15} />
                    </button>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      data-active={activeAlignment === "center"}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setAlignment("center")}
                    >
                      <AlignCenter size={15} />
                    </button>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      data-active={activeAlignment === "right"}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setAlignment("right")}
                    >
                      <AlignRight size={15} />
                    </button>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      data-active={activeAlignment === "justify"}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setAlignment("justify")}
                    >
                      <AlignJustify size={15} />
                    </button>
                  </div>
                </div>

                {/* Bold, Italic, Underline, Strike */}
                <div className={styles.inputFieldGroup}>
                  <label className={styles.inputLabel}>Formatting</label>
                  <div className={styles.buttonToggleGroup}>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      data-active={
                        tipTapSync.isBold ||
                        editor.isActive("bold") ||
                        currentFontWeight === "700" ||
                        currentFontWeight === "bold"
                      }
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (onToggleBold) {
                          onToggleBold();
                        } else {
                          tipTapSync.toggleBoldUnified();
                        }
                      }}
                    >
                      <Bold size={15} />
                    </button>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      data-active={editor.isActive("italic")}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        editor.chain().focus().toggleItalic().run()
                      }
                    >
                      <Italic size={15} />
                    </button>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      data-active={editor.isActive("underline")}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        editor.chain().focus().toggleUnderline().run()
                      }
                    >
                      <UnderlineIcon size={15} />
                    </button>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      data-active={editor.isActive("strike")}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        editor.chain().focus().toggleStrike().run()
                      }
                    >
                      <Strikethrough size={15} />
                    </button>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      data-active={editor.isActive("link")}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={onOpenLinkModal}
                      title={
                        editor.isActive("link") ? "Edit Link" : "Insert Link"
                      }
                    >
                      <LinkIcon size={15} />
                    </button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 2. Background & Borders Accordion Item */}
            <AccordionItem value="bgBorders">
              <AccordionTrigger>Background & Borders</AccordionTrigger>
              <AccordionContent>
                {/* Block Background ColorPicker */}
                <div className={styles.inputFieldGroup}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <label className={styles.inputLabel}>
                      Block Background
                    </label>
                    {currentBlockBgColor && (
                      <button
                        type="button"
                        className={styles.clearSwatchBtn}
                        onClick={() =>
                          updateBlockAttribute("backgroundColor", null)
                        }
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <ColorPicker
                    value={currentBlockBgColor}
                    onChange={(color) =>
                      updateBlockAttribute("backgroundColor", color)
                    }
                  />
                </div>

                {/* Border Style & Width */}
                <div className={styles.rowTwoGrid}>
                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Border Style</label>
                    <Dropdown
                      variant="dark"
                      options={BORDER_STYLES}
                      value={currentBorderStyle}
                      onChange={(val) =>
                        updateBlockAttribute("borderStyle", val)
                      }
                      placeholder="Style"
                      btnWidth="100%"
                      width="100%"
                    />
                  </div>

                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Width</label>
                    <input
                      type="text"
                      className={styles.inputControl}
                      value={borderWidthDraft}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBorderWidthDraft(val);
                        const trimmed = val.trim();
                        if (!trimmed) {
                          updateBlockAttribute("borderWidth", null);
                        } else if (/^\d+(\.\d+)?$/.test(trimmed)) {
                          if (
                            !currentBorderStyle ||
                            currentBorderStyle === "none"
                          ) {
                            updateBlockAttribute("borderStyle", "solid");
                          }
                          updateBlockAttribute("borderWidth", `${trimmed}px`);
                        } else if (
                          /^\d+(\.\d+)?(px|em|rem|%)?$/.test(trimmed)
                        ) {
                          if (
                            !currentBorderStyle ||
                            currentBorderStyle === "none"
                          ) {
                            updateBlockAttribute("borderStyle", "solid");
                          }
                          updateBlockAttribute("borderWidth", trimmed);
                        }
                      }}
                      onBlur={commitBorderWidth}
                      onKeyDown={handleInputKeyDown(commitBorderWidth)}
                      placeholder="e.g. 1px"
                    />
                  </div>
                </div>

                {/* Border ColorPicker */}
                <div className={styles.inputFieldGroup}>
                  <label className={styles.inputLabel}>Border Color</label>
                  <ColorPicker
                    value={currentBorderColor}
                    allowAlpha={false}
                    onChange={(color) =>
                      updateBlockAttribute("borderColor", color)
                    }
                  />
                </div>

                {/* Corner Radius */}
                <div className={styles.inputFieldGroup}>
                  <label className={styles.inputLabel}>Corner Radius</label>
                  <Dropdown
                    variant="dark"
                    options={CORNER_RADII}
                    value={currentBorderRadius}
                    onChange={(val) =>
                      updateBlockAttribute("borderRadius", val)
                    }
                    placeholder="Radius"
                    btnWidth="100%"
                    width="100%"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 3. Spacing Accordion Item */}
            <AccordionItem value="spacing">
              <AccordionTrigger>Spacing</AccordionTrigger>
              <AccordionContent>
                <div className={styles.inputFieldGroup}>
                  <label className={styles.inputLabel}>Internal Padding</label>
                  <Dropdown
                    variant="dark"
                    options={paddingOptions}
                    value={currentPadding}
                    onChange={(val) => updateBlockAttribute("padding", val)}
                    placeholder="Padding"
                    btnWidth="100%"
                    width="100%"
                  />
                </div>

                <div className={styles.rowTwoGrid}>
                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Margin Top</label>
                    <Dropdown
                      variant="dark"
                      options={marginTopOptions}
                      value={currentMarginTop}
                      onChange={(val) => updateBlockAttribute("marginTop", val)}
                      placeholder="Top"
                      btnWidth="100%"
                      width="100%"
                    />
                  </div>
                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Margin Bottom</label>
                    <Dropdown
                      variant="dark"
                      options={marginBottomOptions}
                      value={currentMarginBottom}
                      onChange={(val) =>
                        updateBlockAttribute("marginBottom", val)
                      }
                      placeholder="Bottom"
                      btnWidth="100%"
                      width="100%"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </>
        )}

        {/* Card Container Accordion Item */}
        <AccordionItem value="containerControls">
          <AccordionTrigger>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <Layers size={15} />
              <span>Card Container</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {isContainerActive ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: "0.4rem",
                  }}
                >
                  {onUnwrapContainer && (
                    <button
                      type="button"
                      className={styles.clearSwatchBtn}
                      onClick={onUnwrapContainer}
                      title="Unwrap contents out of container box"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <Ungroup size={12} />
                      <span>Unwrap</span>
                    </button>
                  )}
                  {onDeleteContainer && (
                    <button
                      type="button"
                      className={styles.clearSwatchBtn}
                      onClick={onDeleteContainer}
                      title="Delete entire container box"
                    >
                      Delete
                    </button>
                  )}
                </div>

                {/* Container Background Color */}
                <div className={styles.inputFieldGroup}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <label className={styles.inputLabel}>
                      Background Color
                    </label>
                    {currentContainerBgColor && (
                      <button
                        type="button"
                        className={styles.clearSwatchBtn}
                        onClick={() =>
                          updateContainerStyleAttribute?.(
                            "backgroundColor",
                            null,
                          )
                        }
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <ColorPicker
                    value={currentContainerBgColor}
                    onChange={(color) =>
                      updateContainerStyleAttribute?.("backgroundColor", color)
                    }
                  />
                </div>

                {/* Border Style & Width */}
                <div className={styles.rowTwoGrid}>
                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Border Style</label>
                    <Dropdown
                      variant="dark"
                      options={BORDER_STYLES}
                      value={currentContainerBorderStyle}
                      onChange={(val) =>
                        updateContainerStyleAttribute?.("borderStyle", val)
                      }
                      placeholder="Style"
                      btnWidth="100%"
                      width="100%"
                    />
                  </div>

                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Border Width</label>
                    <input
                      type="text"
                      className={styles.inputControl}
                      value={containerBorderWidthDraft}
                      onChange={(e) => {
                        const val = e.target.value;
                        setContainerBorderWidthDraft(val);
                        const trimmed = val.trim();
                        if (!trimmed) {
                          updateContainerStyleAttribute?.("borderWidth", null);
                        } else if (/^\d+(\.\d+)?$/.test(trimmed)) {
                          if (
                            !currentContainerBorderStyle ||
                            currentContainerBorderStyle === "none"
                          ) {
                            updateContainerStyleAttribute?.(
                              "borderStyle",
                              "solid",
                            );
                          }
                          updateContainerStyleAttribute?.(
                            "borderWidth",
                            `${trimmed}px`,
                          );
                        } else if (
                          /^\d+(\.\d+)?(px|em|rem|%)?$/.test(trimmed)
                        ) {
                          if (
                            !currentContainerBorderStyle ||
                            currentContainerBorderStyle === "none"
                          ) {
                            updateContainerStyleAttribute?.(
                              "borderStyle",
                              "solid",
                            );
                          }
                          updateContainerStyleAttribute?.(
                            "borderWidth",
                            trimmed,
                          );
                        }
                      }}
                      onBlur={commitContainerBorderWidth}
                      onKeyDown={handleInputKeyDown(commitContainerBorderWidth)}
                      placeholder="e.g. 1px"
                    />
                  </div>
                </div>

                {/* Border Color */}
                <div className={styles.inputFieldGroup}>
                  <label className={styles.inputLabel}>Border Color</label>
                  <ColorPicker
                    value={currentContainerBorderColor}
                    allowAlpha={false}
                    onChange={(color) =>
                      updateContainerStyleAttribute?.("borderColor", color)
                    }
                  />
                </div>

                {/* Corner Radius */}
                <div className={styles.inputFieldGroup}>
                  <label className={styles.inputLabel}>Corner Radius</label>
                  <Dropdown
                    variant="dark"
                    options={CORNER_RADII}
                    value={currentContainerBorderRadius}
                    onChange={(val) =>
                      updateContainerStyleAttribute?.("borderRadius", val)
                    }
                    placeholder="Radius"
                    btnWidth="100%"
                    width="100%"
                  />
                </div>

                {/* Padding */}
                <div className={styles.inputFieldGroup}>
                  <label className={styles.inputLabel}>Internal Padding</label>
                  <Dropdown
                    variant="dark"
                    options={containerPaddingOptions}
                    value={currentContainerPadding}
                    onChange={(val) =>
                      updateContainerStyleAttribute?.("padding", val)
                    }
                    placeholder="Padding"
                    btnWidth="100%"
                    width="100%"
                  />
                </div>

                {/* Margins */}
                <div className={styles.rowTwoGrid}>
                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Margin Top</label>
                    <Dropdown
                      variant="dark"
                      options={containerMarginTopOptions}
                      value={currentContainerMarginTop}
                      onChange={(val) =>
                        updateContainerStyleAttribute?.("marginTop", val)
                      }
                      placeholder="Top"
                      btnWidth="100%"
                      width="100%"
                    />
                  </div>
                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Margin Bottom</label>
                    <Dropdown
                      variant="dark"
                      options={containerMarginBottomOptions}
                      value={currentContainerMarginBottom}
                      onChange={(val) =>
                        updateContainerStyleAttribute?.("marginBottom", val)
                      }
                      placeholder="Bottom"
                      btnWidth="100%"
                      width="100%"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                }}
              >
                <p className={styles.inspectorInstructionText}>
                  Wrap any highlighted section into a styled card container box,
                  or click an existing box to edit its padding, background, and
                  borders.
                </p>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    fontSize: "0.78rem",
                  }}
                  onClick={() =>
                    editor.chain().focus().wrapIn("containerBlock").run()
                  }
                >
                  <Layers size={14} />
                  <span>Wrap in Card Box</span>
                </button>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 4. Button Controls Accordion Item */}
        <AccordionItem value="buttonControls">
          <AccordionTrigger>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <MousePointerClick size={15} />
              <span>Button Controls</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {isCtaActive ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    className={styles.inputLabel}
                    style={{ color: "#34d399" }}
                  >
                    ● Active Button Selected
                  </span>
                  <button
                    type="button"
                    className={styles.clearSwatchBtn}
                    onClick={() => {
                      if (onDeleteCta) {
                        onDeleteCta();
                      } else {
                        editor.chain().focus().deleteSelection().run();
                      }
                    }}
                    title="Delete selected button"
                  >
                    Delete
                  </button>
                </div>

                {/* Button Label */}
                <div className={styles.inputFieldGroup}>
                  <label className={styles.inputLabel}>Button Label</label>
                  <input
                    type="text"
                    className={styles.inputControl}
                    value={ctaLabelDraft}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCtaLabelDraft(val);
                      updateCtaAttributes?.({ label: val });
                    }}
                    onBlur={commitCtaLabel}
                    onKeyDown={handleInputKeyDown(commitCtaLabel)}
                    placeholder="e.g. View Ticket"
                  />
                </div>

                {/* Target URL */}
                <div className={styles.inputFieldGroup}>
                  <label className={styles.inputLabel}>Button Link (URL)</label>
                  <input
                    type="text"
                    className={styles.inputControl}
                    value={ctaUrlDraft}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCtaUrlDraft(val);
                      updateCtaAttributes?.({ url: val });
                    }}
                    onBlur={commitCtaUrl}
                    onKeyDown={handleInputKeyDown(commitCtaUrl)}
                    placeholder="e.g. {{event.passUrl}} or https://..."
                  />
                </div>

                {/* Alignment */}
                <div className={styles.inputFieldGroup}>
                  <label className={styles.inputLabel}>Alignment</label>
                  <div className={styles.buttonToggleGroup}>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      data-active={currentCtaAlignment === "left"}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        updateCtaAttributes?.({ alignment: "left" })
                      }
                      title="Align Left"
                    >
                      <AlignLeft size={15} />
                    </button>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      data-active={currentCtaAlignment === "center"}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        updateCtaAttributes?.({ alignment: "center" })
                      }
                      title="Align Center"
                    >
                      <AlignCenter size={15} />
                    </button>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      data-active={currentCtaAlignment === "right"}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        updateCtaAttributes?.({ alignment: "right" })
                      }
                      title="Align Right"
                    >
                      <AlignRight size={15} />
                    </button>
                  </div>
                </div>

                {/* Width & Height */}
                <div className={styles.rowTwoGrid}>
                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Width</label>
                    <input
                      type="text"
                      className={styles.inputControl}
                      value={ctaWidthDraft}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCtaWidthDraft(val);
                        const trimmed = val.trim();
                        if (!trimmed || trimmed === "auto") {
                          updateCtaStyleAttribute?.("width", null);
                        } else if (/^\d+(\.\d+)?$/.test(trimmed)) {
                          updateCtaStyleAttribute?.("width", `${trimmed}px`);
                        } else if (
                          /^\d+(\.\d+)?(px|em|rem|%)?$/.test(trimmed)
                        ) {
                          updateCtaStyleAttribute?.("width", trimmed);
                        }
                      }}
                      onBlur={commitCtaWidth}
                      onKeyDown={handleInputKeyDown(commitCtaWidth)}
                      placeholder="auto or 200px"
                    />
                  </div>
                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Height</label>
                    <input
                      type="text"
                      className={styles.inputControl}
                      value={ctaHeightDraft}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCtaHeightDraft(val);
                        const trimmed = val.trim();
                        if (!trimmed || trimmed === "auto") {
                          updateCtaStyleAttribute?.("height", null);
                        } else if (/^\d+(\.\d+)?$/.test(trimmed)) {
                          updateCtaStyleAttribute?.("height", `${trimmed}px`);
                        } else if (
                          /^\d+(\.\d+)?(px|em|rem|%)?$/.test(trimmed)
                        ) {
                          updateCtaStyleAttribute?.("height", trimmed);
                        }
                      }}
                      onBlur={commitCtaHeight}
                      onKeyDown={handleInputKeyDown(commitCtaHeight)}
                      placeholder="auto or 48px"
                    />
                  </div>
                </div>

                {/* Button Color & Text Color */}
                <div className={styles.rowTwoGrid}>
                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Button Color</label>
                    <ColorPicker
                      value={currentCtaButtonColor}
                      allowAlpha={false}
                      onChange={(color) =>
                        updateCtaAttributes?.({ buttonColor: color })
                      }
                    />
                  </div>
                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Text Color</label>
                    <ColorPicker
                      value={currentCtaTextColor}
                      allowAlpha={false}
                      onChange={(color) =>
                        updateCtaAttributes?.({ textColor: color })
                      }
                    />
                  </div>
                </div>

                {/* Corner Radius & Font Size */}
                <div className={styles.rowTwoGrid}>
                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Corner Radius</label>
                    <Dropdown
                      variant="dark"
                      options={CORNER_RADII}
                      value={currentCtaBorderRadius}
                      onChange={(val) =>
                        updateCtaAttributes?.({ borderRadius: val })
                      }
                      placeholder="Radius"
                      btnWidth="100%"
                      width="100%"
                    />
                  </div>
                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Font Size</label>
                    <input
                      type="text"
                      className={styles.inputControl}
                      value={ctaFontSizeDraft}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCtaFontSizeDraft(val);
                        const trimmed = val.trim();
                        if (/^\d+(\.\d+)?$/.test(trimmed)) {
                          updateCtaStyleAttribute?.("fontSize", `${trimmed}px`);
                        } else if (
                          /^\d+(\.\d+)?(px|pt|em|rem)?$/.test(trimmed)
                        ) {
                          updateCtaStyleAttribute?.("fontSize", trimmed);
                        }
                      }}
                      onBlur={() => {
                        const trimmed = ctaFontSizeDraft.trim();
                        if (/^\d+(\.\d+)?$/.test(trimmed)) {
                          updateCtaStyleAttribute?.("fontSize", `${trimmed}px`);
                          setCtaFontSizeDraft(`${trimmed}px`);
                        } else {
                          setCtaFontSizeDraft(currentCtaFontSize || "15px");
                        }
                      }}
                      placeholder="15px"
                    />
                  </div>
                </div>

                {/* Padding */}
                <div className={styles.inputFieldGroup}>
                  <label className={styles.inputLabel}>Internal Padding</label>
                  <Dropdown
                    variant="dark"
                    options={ctaPaddingOptions}
                    value={currentCtaPadding}
                    onChange={(val) =>
                      updateCtaStyleAttribute?.("padding", val)
                    }
                    placeholder="Padding"
                    btnWidth="100%"
                    width="100%"
                  />
                </div>

                {/* Margins */}
                <div className={styles.rowTwoGrid}>
                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Margin Top</label>
                    <Dropdown
                      variant="dark"
                      options={ctaMarginTopOptions}
                      value={currentCtaMarginTop || "16px"}
                      onChange={(val) =>
                        updateCtaStyleAttribute?.("marginTop", val)
                      }
                      placeholder="Top"
                      btnWidth="100%"
                      width="100%"
                    />
                  </div>
                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Margin Bottom</label>
                    <Dropdown
                      variant="dark"
                      options={ctaMarginBottomOptions}
                      value={currentCtaMarginBottom || "16px"}
                      onChange={(val) =>
                        updateCtaStyleAttribute?.("marginBottom", val)
                      }
                      placeholder="Bottom"
                      btnWidth="100%"
                      width="100%"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                }}
              >
                <p className={styles.inspectorInstructionText}>
                  Click any CTA button in the email canvas to inspect and edit
                  its text, link, colors, and styling.
                </p>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    fontSize: "0.78rem",
                  }}
                  onClick={onOpenCtaModal}
                >
                  <MousePointerClick size={14} />
                  <span>Insert CTA Button</span>
                </button>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 5. Image Controls Accordion Item */}
        <AccordionItem value="imageControls">
          <AccordionTrigger>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <ImageIcon size={15} />
              <span>Image Controls</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {isImageActive ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    className={styles.inputLabel}
                    style={{ color: "#34d399" }}
                  >
                    ● Active Image Selected
                  </span>
                  <button
                    type="button"
                    className={styles.clearSwatchBtn}
                    onClick={() =>
                      editor.chain().focus().deleteSelection().run()
                    }
                    title="Delete selected image"
                  >
                    Delete
                  </button>
                </div>

                {/* Image Alignment */}
                <div className={styles.inputFieldGroup}>
                  <label className={styles.inputLabel}>Image Alignment</label>
                  <div className={styles.buttonToggleGroup}>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      data-active={currentImageAlignment === "left"}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => updateImageAlignment("left")}
                      title="Align Image Left"
                    >
                      <AlignLeft size={15} />
                    </button>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      data-active={currentImageAlignment === "center"}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => updateImageAlignment("center")}
                      title="Align Image Center"
                    >
                      <AlignCenter size={15} />
                    </button>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      data-active={currentImageAlignment === "right"}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => updateImageAlignment("right")}
                      title="Align Image Right"
                    >
                      <AlignRight size={15} />
                    </button>
                  </div>
                </div>

                {/* Image Source URL */}
                <div className={styles.inputFieldGroup}>
                  <label className={styles.inputLabel}>Image Source URL</label>
                  <input
                    type="text"
                    className={styles.inputControl}
                    value={imageSrcDraft}
                    onChange={(e) => {
                      const val = e.target.value;
                      setImageSrcDraft(val);
                      updateImageSrc(val.trim());
                    }}
                    onBlur={commitImageSrc}
                    onKeyDown={handleInputKeyDown(commitImageSrc)}
                    placeholder="https://example.com/image.png"
                  />
                </div>

                {/* Click-Through Link Destination */}
                <div className={styles.inputFieldGroup}>
                  <label className={styles.inputLabel}>
                    Click Link Destination (href)
                  </label>
                  <input
                    type="text"
                    className={styles.inputControl}
                    value={imageHrefDraft}
                    onChange={(e) => {
                      const val = e.target.value;
                      setImageHrefDraft(val);
                      updateImageHref(val.trim());
                    }}
                    onBlur={commitImageHref}
                    onKeyDown={handleInputKeyDown(commitImageHref)}
                    placeholder="e.g. https://example.com or {{event.url}}"
                  />
                </div>

                {/* Width & Alt */}
                <div className={styles.rowTwoGrid}>
                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Width</label>
                    <input
                      type="text"
                      className={styles.inputControl}
                      value={imageWidthDraft}
                      onChange={(e) => {
                        const val = e.target.value;
                        setImageWidthDraft(val);
                        const trimmed = val.trim();
                        if (!trimmed) {
                          updateImageWidth("");
                        } else if (/^\d+(\.\d+)?$/.test(trimmed)) {
                          updateImageWidth(`${trimmed}px`);
                        } else if (
                          /^\d+(\.\d+)?(px|em|rem|%)?$/.test(trimmed)
                        ) {
                          updateImageWidth(trimmed);
                        }
                      }}
                      onBlur={commitImageWidth}
                      onKeyDown={handleInputKeyDown(commitImageWidth)}
                      placeholder="300px"
                    />
                  </div>
                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Alt Text</label>
                    <input
                      type="text"
                      className={styles.inputControl}
                      value={imageAltDraft}
                      onChange={(e) => {
                        const val = e.target.value;
                        setImageAltDraft(val);
                        updateImageAlt(val);
                      }}
                      onBlur={commitImageAlt}
                      onKeyDown={handleInputKeyDown(commitImageAlt)}
                      placeholder="Description"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                }}
              >
                <p className={styles.inspectorInstructionText}>
                  Click any image in the email canvas to inspect and edit its
                  alignment, link, width, or source URL.
                </p>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    fontSize: "0.78rem",
                  }}
                  onClick={onOpenImageModal}
                >
                  <ImageIcon size={14} />
                  <span>Insert Image</span>
                </button>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 5. Links & Actions Accordion Item */}
        <AccordionItem value="linksActions">
          <AccordionTrigger>Links & Actions</AccordionTrigger>
          <AccordionContent>
            {editor.isActive("link") ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  padding: "0.65rem 0.75rem",
                  backgroundColor: "var(--color-soft-bg)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <LinkIcon size={13} />
                    Active Link
                  </span>
                  {onRemoveLink && (
                    <button
                      type="button"
                      className={styles.clearSwatchBtn}
                      style={{ fontSize: "0.75rem" }}
                      onClick={onRemoveLink}
                      title="Unlink — keep the text"
                    >
                      Unlink
                    </button>
                  )}
                  {onDeleteLink && (
                    <button
                      type="button"
                      className={styles.clearSwatchBtn}
                      style={{ color: "#f87171", fontSize: "0.75rem" }}
                      onClick={onDeleteLink}
                      title="Remove link and its text"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--color-text-soft)",
                    wordBreak: "break-all",
                    maxHeight: "48px",
                    overflowY: "auto",
                  }}
                >
                  {(editor.getAttributes("link").href as string) || "(No URL)"}
                </div>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={onOpenLinkModal}
                >
                  <LinkIcon size={14} />
                  <span>Edit Link</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.btnSecondary}
                style={{ width: "100%", justifyContent: "center" }}
                onClick={onOpenLinkModal}
              >
                <LinkIcon size={15} />
                <span>Insert Hyperlink</span>
              </button>
            )}

            <button
              type="button"
              className={styles.btnSecondary}
              style={{ width: "100%", justifyContent: "center" }}
              onClick={onOpenImageModal}
            >
              <ImageIcon size={15} />
              <span>Insert Linked Image</span>
            </button>

            <button
              type="button"
              className={styles.btnPrimary}
              style={{ width: "100%", justifyContent: "center" }}
              onClick={onOpenCtaModal}
            >
              <MousePointerClick size={15} />
              <span>Add CTA Button</span>
            </button>
          </AccordionContent>
        </AccordionItem>

        {/* 6. Element Styling & Data Accordion Item */}
        <AccordionItem value="elementStyling">
          <AccordionTrigger>Element Styling & Data</AccordionTrigger>
          <AccordionContent>
            <div className={styles.inputFieldGroup}>
              <label className={styles.inputLabel}>Element Type</label>
              <Dropdown
                variant="dark"
                options={ELEMENT_TYPES}
                value={currentElementType}
                onChange={handleElementTypeChange}
                placeholder="Element Type"
                btnWidth="100%"
                width="100%"
              />
            </div>

            <div className={styles.inputFieldGroup}>
              <label className={styles.inputLabel}>Insert Dynamic Tags</label>
              <div className={styles.varsFlexWrap}>
                {allVars.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    className={styles.sidebarVarPill}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleInsertVariable(v.key)}
                    title={`Insert ${v.key}`}
                  >
                    {v.key}
                  </button>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
