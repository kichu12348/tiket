"use client";

import React from "react";
import type { Editor } from "@tiptap/react";
import Dropdown from "@/components/Dropdown";
import ColorPicker from "@/components/ColorPicker";
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
} from "lucide-react";
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
  updateCtaAttributes?: (attrs: Record<string, string>) => void;
  onToggleBold?: () => void;
  onSetFontWeight?: (weight: string) => void;
}

export default function InspectorSidebar({
  editor,
  allVars,
  onOpenCtaModal,
  onOpenLinkModal,
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
  updateCtaAttributes,
  onToggleBold,
  onSetFontWeight,
}: InspectorSidebarProps) {
  const [userToggledSections, setUserToggledSections] = React.useState<string[]>([
    "textFormatting",
    "bgBorders",
  ]);

  // Local drafts to prevent transactions on every keystroke
  const [borderWidthDraft, setBorderWidthDraft] = React.useState(currentBorderWidth || "");
  const [ctaLabelDraft, setCtaLabelDraft] = React.useState(currentCtaLabel || "");
  const [ctaUrlDraft, setCtaUrlDraft] = React.useState(currentCtaUrl || "");
  const [imageSrcDraft, setImageSrcDraft] = React.useState(currentImageSrc || "");
  const [imageHrefDraft, setImageHrefDraft] = React.useState(currentImageHref || "");
  const [imageWidthDraft, setImageWidthDraft] = React.useState(currentImageWidth || "");
  const [imageAltDraft, setImageAltDraft] = React.useState(currentImageAlt || "");

  const [prevValues, setPrevValues] = React.useState({
    borderWidth: currentBorderWidth || "",
    ctaLabel: currentCtaLabel || "",
    ctaUrl: currentCtaUrl || "",
    imageSrc: currentImageSrc || "",
    imageHref: currentImageHref || "",
    imageWidth: currentImageWidth || "",
    imageAlt: currentImageAlt || "",
  });

  if (
    currentBorderWidth !== prevValues.borderWidth ||
    currentCtaLabel !== prevValues.ctaLabel ||
    currentCtaUrl !== prevValues.ctaUrl ||
    currentImageSrc !== prevValues.imageSrc ||
    currentImageHref !== prevValues.imageHref ||
    currentImageWidth !== prevValues.imageWidth ||
    currentImageAlt !== prevValues.imageAlt
  ) {
    setPrevValues({
      borderWidth: currentBorderWidth || "",
      ctaLabel: currentCtaLabel || "",
      ctaUrl: currentCtaUrl || "",
      imageSrc: currentImageSrc || "",
      imageHref: currentImageHref || "",
      imageWidth: currentImageWidth || "",
      imageAlt: currentImageAlt || "",
    });
    setBorderWidthDraft(currentBorderWidth || "");
    setCtaLabelDraft(currentCtaLabel || "");
    setCtaUrlDraft(currentCtaUrl || "");
    setImageSrcDraft(currentImageSrc || "");
    setImageHrefDraft(currentImageHref || "");
    setImageWidthDraft(currentImageWidth || "");
    setImageAltDraft(currentImageAlt || "");
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

  const selectedFontValue = React.useMemo(() => {
    if (!currentFontFamily || currentFontFamily === "__default__") {
      return "__default__";
    }
    const getPrimaryFont = (f: string) =>
      f.split(",")[0].replace(/['"]/g, "").trim().toLowerCase();
    const curPrimary = getPrimaryFont(currentFontFamily);
    const match = FONT_FAMILIES.find((f) => {
      if (f.value === "__default__") return false;
      return getPrimaryFont(f.value) === curPrimary;
    });
    return match ? match.value : currentFontFamily;
  }, [currentFontFamily]);

  const paddingOptions = React.useMemo(() => {
    if (!currentPadding || PADDING_SIZES.some((o) => o.value === currentPadding)) {
      return PADDING_SIZES;
    }
    return [...PADDING_SIZES, { label: `Custom (${currentPadding})`, value: currentPadding }];
  }, [currentPadding]);

  const marginTopOptions = React.useMemo(() => {
    if (!currentMarginTop || MARGIN_SIZES.some((o) => o.value === currentMarginTop)) {
      return MARGIN_SIZES;
    }
    return [...MARGIN_SIZES, { label: `Custom (${currentMarginTop})`, value: currentMarginTop }];
  }, [currentMarginTop]);

  const marginBottomOptions = React.useMemo(() => {
    if (!currentMarginBottom || MARGIN_SIZES.some((o) => o.value === currentMarginBottom)) {
      return MARGIN_SIZES;
    }
    return [...MARGIN_SIZES, { label: `Custom (${currentMarginBottom})`, value: currentMarginBottom }];
  }, [currentMarginBottom]);

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
      if (editor.isActive("container")) {
        editor.chain().focus().lift("container").run();
      } else {
        editor.chain().focus().wrapIn("container").run();
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

  const activeSections = React.useMemo(() => {
    const list = [...userToggledSections];
    if (isCtaActive && !list.includes("buttonControls")) {
      list.push("buttonControls");
    }
    if (isImageActive && !list.includes("imageControls")) {
      list.push("imageControls");
    }
    return list;
  }, [userToggledSections, isCtaActive, isImageActive]);

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
        value={activeSections}
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

                {/* Font Family */}
                <div className={styles.inputFieldGroup}>
                  <label className={styles.inputLabel}>Font Family</label>
                  <Dropdown
                    variant="dark"
                    options={FONT_FAMILIES}
                    value={selectedFontValue}
                    onChange={(val) => {
                      if (val === "__default__") {
                        editor.chain().focus().unsetFontFamily().run();
                      } else {
                        editor.chain().focus().setFontFamily(val).run();
                      }
                    }}
                    placeholder="Font Family"
                    btnWidth="100%"
                    width="100%"
                  />
                </div>

            {/* Font Weight */}
            <div className={styles.inputFieldGroup}>
              <label className={styles.inputLabel}>Font Weight</label>
              <Dropdown
                variant="dark"
                options={FONT_WEIGHTS}
                value={currentFontWeight}
                onChange={(val) => {
                  if (onSetFontWeight) {
                    onSetFontWeight(val);
                  } else {
                    editor
                      .chain()
                      .focus()
                      .setMark("textStyle", { fontWeight: val })
                      .run();
                  }
                }}
                placeholder="Font Weight"
                btnWidth="100%"
                width="100%"
              />
            </div>

            {/* Text ColorPicker */}
            <div className={styles.inputFieldGroup}>
              <label className={styles.inputLabel}>Text Color</label>
              <ColorPicker
                value={currentTextColor}
                onChange={(color) =>
                  editor.chain().setColor(color).run()
                }
              />
            </div>

            {/* Highlight ColorPicker */}
            <div className={styles.inputFieldGroup}>
              <label className={styles.inputLabel}>Highlight Color</label>
              <ColorPicker
                value={currentHighlightColor}
                onChange={(color) =>
                  editor.chain().setHighlight({ color }).run()
                }
                reset={() => editor.chain().unsetHighlight().run()}
              />
            </div>

            {/* Alignments */}
            <div className={styles.inputFieldGroup}>
              <label className={styles.inputLabel}>Text Alignment</label>
              <div className={styles.buttonToggleGroup}>
                <button
                  type="button"
                  className={styles.toggleBtn}
                  data-active={editor.isActive({ textAlign: "left" })}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    editor.chain().focus().setTextAlign("left").run()
                  }
                >
                  <AlignLeft size={15} />
                </button>
                <button
                  type="button"
                  className={styles.toggleBtn}
                  data-active={editor.isActive({ textAlign: "center" })}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    editor.chain().focus().setTextAlign("center").run()
                  }
                >
                  <AlignCenter size={15} />
                </button>
                <button
                  type="button"
                  className={styles.toggleBtn}
                  data-active={editor.isActive({ textAlign: "right" })}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    editor.chain().focus().setTextAlign("right").run()
                  }
                >
                  <AlignRight size={15} />
                </button>
                <button
                  type="button"
                  className={styles.toggleBtn}
                  data-active={editor.isActive({ textAlign: "justify" })}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    editor.chain().focus().setTextAlign("justify").run()
                  }
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
                    editor.isActive("bold") ||
                    currentFontWeight === "700" ||
                    currentFontWeight === "bold"
                  }
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (onToggleBold) {
                      onToggleBold();
                    } else {
                      editor.chain().focus().toggleBold().run();
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
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                  <Italic size={15} />
                </button>
                <button
                  type="button"
                  className={styles.toggleBtn}
                  data-active={editor.isActive("underline")}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                >
                  <UnderlineIcon size={15} />
                </button>
                <button
                  type="button"
                  className={styles.toggleBtn}
                  data-active={editor.isActive("strike")}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                >
                  <Strikethrough size={15} />
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
              <label className={styles.inputLabel}>Block Background</label>
              <ColorPicker
                value={currentBlockBgColor}
                onChange={(color) =>
                  updateBlockAttribute("backgroundColor", color)
                }
                reset={() => updateBlockAttribute("backgroundColor", null)}
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
                  onChange={(val) => updateBlockAttribute("borderStyle", val)}
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
                  onChange={(e) => setBorderWidthDraft(e.target.value)}
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
                onChange={(color) => updateBlockAttribute("borderColor", color)}
              />
            </div>

            {/* Corner Radius */}
            <div className={styles.inputFieldGroup}>
              <label className={styles.inputLabel}>Corner Radius</label>
              <Dropdown
                variant="dark"
                options={CORNER_RADII}
                value={currentBorderRadius}
                onChange={(val) => updateBlockAttribute("borderRadius", val)}
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
                  onChange={(val) => updateBlockAttribute("marginBottom", val)}
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
                    onClick={() =>
                      editor.chain().focus().deleteSelection().run()
                    }
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
                    onChange={(e) => setCtaLabelDraft(e.target.value)}
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
                    onChange={(e) => setCtaUrlDraft(e.target.value)}
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

                {/* Button Color & Text Color */}
                <div className={styles.rowTwoGrid}>
                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Button Color</label>
                    <ColorPicker
                      value={currentCtaButtonColor}
                      onChange={(color) =>
                        updateCtaAttributes?.({ buttonColor: color })
                      }
                    />
                  </div>
                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Text Color</label>
                    <ColorPicker
                      value={currentCtaTextColor}
                      onChange={(color) =>
                        updateCtaAttributes?.({ textColor: color })
                      }
                    />
                  </div>
                </div>

                {/* Corner Radius */}
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
                  Click any CTA button in the email canvas to inspect and edit its
                  text, link, colors, and styling.
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
                    onChange={(e) => setImageSrcDraft(e.target.value)}
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
                    onChange={(e) => setImageHrefDraft(e.target.value)}
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
                      onChange={(e) => setImageWidthDraft(e.target.value)}
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
                      onChange={(e) => setImageAltDraft(e.target.value)}
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
            <button
              type="button"
              className={styles.btnSecondary}
              style={{ width: "100%", justifyContent: "center" }}
              onClick={onOpenLinkModal}
            >
              <LinkIcon size={15} />
              <span>Insert Hyperlink</span>
            </button>

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
