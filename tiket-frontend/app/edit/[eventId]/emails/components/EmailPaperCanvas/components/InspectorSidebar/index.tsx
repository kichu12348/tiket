"use client";

import React from "react";
import { Editor } from "@tiptap/react";
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
  currentElementType: string;
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
  currentElementType,
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
}: InspectorSidebarProps) {
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
        defaultValue={["textFormatting", "bgBorders"]}
        className="w-full"
      >
        {/* 1. Text Formatting Accordion Item */}
        <AccordionItem value="textFormatting">
          <AccordionTrigger>Text Formatting</AccordionTrigger>
          <AccordionContent>
            {/* Font Family */}
            <div className={styles.inputFieldGroup}>
              <label className={styles.inputLabel}>Font Family</label>
              <Dropdown
                variant="dark"
                options={FONT_FAMILIES}
                value={currentFontFamily}
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
                onChange={(val) =>
                  editor
                    .chain()
                    .focus()
                    .setMark("textStyle", { fontWeight: val })
                    .run()
                }
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
                  editor.chain().focus().setColor(color).run()
                }
              />
            </div>

            {/* Highlight ColorPicker */}
            <div className={styles.inputFieldGroup}>
              <label className={styles.inputLabel}>Highlight Color</label>
              <ColorPicker
                value={currentHighlightColor}
                onChange={(color) =>
                  editor.chain().focus().setHighlight({ color }).run()
                }
                reset={() => editor.chain().focus().unsetHighlight().run()}
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
                  data-active={editor.isActive("bold")}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor.chain().focus().toggleBold().run()}
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
                  editor
                    .chain()
                    .focus()
                    .updateAttributes("paragraph", {
                      backgroundColor: color,
                    })
                    .run()
                }
                reset={() =>
                  editor
                    .chain()
                    .focus()
                    .updateAttributes("paragraph", {
                      backgroundColor: null,
                    })
                    .run()
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
                    editor
                      .chain()
                      .focus()
                      .updateAttributes("paragraph", { borderStyle: val })
                      .run()
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
                  value={currentBorderWidth}
                  onChange={(e) => {
                    const val = e.target.value;
                    const formatted = /^\d+$/.test(val) ? `${val}px` : val;
                    editor
                      .chain()
                      .updateAttributes("paragraph", {
                        borderWidth: formatted,
                      })
                      .run();
                  }}
                  placeholder="e.g. 1px"
                />
              </div>
            </div>

            {/* Border ColorPicker */}
            <div className={styles.inputFieldGroup}>
              <label className={styles.inputLabel}>Border Color</label>
              <ColorPicker
                value={currentBorderColor}
                onChange={(color) =>
                  editor
                    .chain()
                    .focus()
                    .updateAttributes("paragraph", { borderColor: color })
                    .run()
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
                  editor
                    .chain()
                    .focus()
                    .updateAttributes("paragraph", { borderRadius: val })
                    .run()
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
                options={PADDING_SIZES}
                value={currentPadding}
                onChange={(val) =>
                  editor
                    .chain()
                    .focus()
                    .updateAttributes("paragraph", { padding: val })
                    .run()
                }
                placeholder="Padding"
                btnWidth="100%"
                width="100%"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 4. Image Controls Accordion Item */}
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
                    value={currentImageSrc}
                    onChange={(e) => updateImageSrc(e.target.value)}
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
                    value={currentImageHref}
                    onChange={(e) => updateImageHref(e.target.value)}
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
                      value={currentImageWidth}
                      onChange={(e) => updateImageWidth(e.target.value)}
                      placeholder="300px"
                    />
                  </div>
                  <div className={styles.inputFieldGroup}>
                    <label className={styles.inputLabel}>Alt Text</label>
                    <input
                      type="text"
                      className={styles.inputControl}
                      value={currentImageAlt}
                      onChange={(e) => updateImageAlt(e.target.value)}
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
                onChange={(val) => {
                  if (val === "p") editor.chain().focus().setParagraph().run();
                  else if (val === "h1")
                    editor.chain().focus().toggleHeading({ level: 1 }).run();
                  else if (val === "h2")
                    editor.chain().focus().toggleHeading({ level: 2 }).run();
                  else if (val === "h3")
                    editor.chain().focus().toggleHeading({ level: 3 }).run();
                  else if (val === "quote")
                    editor.chain().focus().toggleBlockquote().run();
                  else if (val === "bullet")
                    editor.chain().focus().toggleBulletList().run();
                  else if (val === "ordered")
                    editor.chain().focus().toggleOrderedList().run();
                }}
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
