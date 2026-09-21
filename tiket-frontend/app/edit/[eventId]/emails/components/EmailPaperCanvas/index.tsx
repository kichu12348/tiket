"use client";

import React, { useState, useEffect } from "react";
import { useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { TextStyle, Color, FontFamily } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";

import { EmailTemplate, AvailableVariables } from "@/types/email";
import { BlockStyleExtension, CustomImageExtension } from "./extensions";
import TopControlBar from "./components/TopControlBar";
import SubjectBox from "./components/SubjectBox";
import InspectorSidebar from "./components/InspectorSidebar";
import CanvasViewport from "./components/CanvasViewport";
import ActionFooter from "./components/ActionFooter";
import CtaModal from "./components/Modals/CtaModal";
import LinkModal from "./components/Modals/LinkModal";
import ImageModal from "./components/Modals/ImageModal";

import styles from "./EmailPaperCanvas.module.css";

interface EmailPaperCanvasProps {
  template: EmailTemplate;
  variables: AvailableVariables | null;
  onSave: (updated: Partial<EmailTemplate>) => Promise<void>;
  onReset: () => Promise<void>;
  onDelete?: () => Promise<void>;
  onOpenSendTest: () => void;
  onOpenSendBatch: () => void;
  isSaving: boolean;
}

const DEFAULT_EMAIL_BODY = `<table style="background-color: #ffffff;" role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
    <tbody>
      <tr>
        <td align="center">
          <table style="width: 100%; max-width: 600px; background-color: #ffffff; margin: 0 auto;" role="presentation" border="0" width="600" cellspacing="0" cellpadding="0">
            <tbody>
              <tr>
                <td style="padding: 20px 30px;">
                  <table style="width: 100%;" role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
                    <tbody>
                      <tr>
                        <td style="white-space: nowrap;" align="left">
                          <img style="height: 30px; margin-right: 10px;" src="https://raw.githubusercontent.com/theparentcompany-xyz/images/refs/heads/main/Logo%20v1.png" alt="MakeMyPass">
                        </td>
                        <td align="right">
                          <img style="width: 50px; max-width: 100%; height: auto;" src="https://raw.githubusercontent.com/theparentcompany-xyz/images/refs/heads/main/tickachunew.png" alt="MMP Logo">
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr class="inner-html" contenteditable="true">
                <td style="padding: 20px 30px;">
                  <h1 style="font-size: 26.4px; color: #004a55; margin-bottom: 20px;"><span style="font-weight: normal;">You're invited to</span>&nbsp;{{event_title}} <span style="font-weight: normal;">–</span> <span style="font-weight: normal;">See You There!</span></h1><p style="font-size: 14px; color: #666666;">Hi {{name}},</p><p style="font-size: 14px; color: #666666;">Greetings from Team EXODIA.</p><p style="font-size: 14px; color: #666666;">We are pleased to inform you that you have been allotted a free entry ticket for EXODIA 3.0.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>`;

export default function EmailPaperCanvas({
  template,
  variables,
  onSave,
  onReset,
  onDelete,
  onOpenSendTest,
  onOpenSendBatch,
  isSaving,
}: EmailPaperCanvasProps) {
  const [name, setName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject || "");
  const [isActive, setIsActive] = useState(template.isActive);
  const [deviceView, setDeviceView] = useState<"desktop" | "mobile">("desktop");
  const [canvasMode, setCanvasMode] = useState<"edit" | "preview" | "code">(
    "edit",
  );
  const [, setSelectionTick] = useState(0);

  // Modal states for links, CTA buttons & images
  const [isCtaModalOpen, setIsCtaModalOpen] = useState(false);
  const [ctaLabel, setCtaLabel] = useState("View Your Digital Pass");
  const [ctaUrl, setCtaUrl] = useState("{{event.passUrl}}");

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageLinkUrl, setImageLinkUrl] = useState("");
  const [imageWidth, setImageWidth] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
        underline: false,
      }),
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          style: "color: #2563eb; text-decoration: underline;",
        },
      }),
      CustomImageExtension,
      Placeholder.configure({
        placeholder:
          "Click or select text here to start editing your email template...",
      }),
      BlockStyleExtension,
    ],
    content: template.body || DEFAULT_EMAIL_BODY,
    immediatelyRender: false,
    onTransaction: () => {
      setSelectionTick((tick) => tick + 1);
    },
  });

  // Sync external template updates safely
  useEffect(() => {
    setName(template.name);
    setSubject(template.subject || "");
    setIsActive(template.isActive);
  }, [template.name, template.subject, template.isActive]);


  useEffect(() => {
    if (editor && template.body) {
      if (editor.getHTML() !== template.body) {
        editor.commands.setContent(template.body);
      }
    }
  }, [template.id, editor]);

  if (!editor) return null;

  const handleSave = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const compiledHtml = editor.getHTML();

    await onSave({
      name,
      subject,
      body: compiledHtml,
      isActive,
    });
  };

  const handleInsertVariable = (varKey: string) => {
    editor.chain().focus().insertContent(` ${varKey} `).run();
  };

  const handleInsertCtaButton = () => {
    if (!ctaLabel.trim() || !ctaUrl.trim()) return;

    const buttonHtml = `
<p style="text-align: center; margin: 28px 0;">
  <a href="${ctaUrl.trim()}" style="background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
    ${ctaLabel.trim()}
  </a>
</p>
`.trim();

    editor.chain().focus().insertContent(buttonHtml).run();
    setIsCtaModalOpen(false);
  };

  const handleApplyLink = () => {
    if (!linkUrl.trim()) {
      setIsLinkModalOpen(false);
      return;
    }
    editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
    setIsLinkModalOpen(false);
    setLinkUrl("");
  };

  const handleInsertImage = () => {
    if (!imageUrl.trim()) return;

    const src = imageUrl.trim();
    const alt = imageAlt.trim();
    const width = imageWidth.trim();

    editor
      .chain()
      .focus()
      .setImage({
        src,
        alt: alt || undefined,
      })
      .run();

    if (width || imageLinkUrl.trim()) {
      const attrs: Record<string, string> = {};
      if (width) attrs.width = width;
      editor.chain().updateAttributes("image", attrs).run();
      if (imageLinkUrl.trim()) {
        editor.chain().setLink({ href: imageLinkUrl.trim() }).run();
      }
    }

    setIsImageModalOpen(false);
    setImageUrl("");
    setImageAlt("");
    setImageLinkUrl("");
    setImageWidth("");
  };

  const allVars = variables
    ? [
        ...(variables.eventVariables || []),
        ...(variables.attendeeVariables || []),
        ...(variables.ticketVariables || []),
        ...(variables.formVariables || []),
      ]
    : [];

  const sampleValues: Record<string, string> = {};
  allVars.forEach((v) => {
    sampleValues[v.key] = v.sample;
  });

  const renderInterpolated = (templateStr: string) => {
    if (!templateStr) return "";
    return templateStr.replace(
      /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g,
      (match, key) => {
        const fullKey = `{{${key}}}`;
        return sampleValues[fullKey] || match;
      },
    );
  };

  const previewSubject = renderInterpolated(subject) || "(No Subject)";
  const compiledRawHtml = editor.getHTML();
  const previewBodyHtml =
    renderInterpolated(compiledRawHtml) ||
    "<p style='color:#9ca3af;'>No content written yet...</p>";

  // Current Active Node Style Getters
  const currentFontFamily =
    editor.getAttributes("textStyle").fontFamily || "__default__";
  const currentFontWeight =
    editor.getAttributes("textStyle").fontWeight || "400";
  const currentTextColor = editor.getAttributes("textStyle").color || "#111827";
  const currentHighlightColor = editor.getAttributes("highlight").color || "";
  const currentBlockBgColor =
    editor.getAttributes("paragraph").backgroundColor || "";
  const currentBorderStyle =
    editor.getAttributes("paragraph").borderStyle || "none";
  const currentBorderWidth =
    editor.getAttributes("paragraph").borderWidth || "0px";
  const currentBorderColor =
    editor.getAttributes("paragraph").borderColor || "#e5e7eb";
  const currentBorderRadius =
    editor.getAttributes("paragraph").borderRadius || "0px";
  const currentPadding = editor.getAttributes("paragraph").padding || "0px";

  // Active Image & Link Getters
  const isImageNodeSelected =
    editor.state.selection &&
    (editor.state.selection as any).node &&
    (editor.state.selection as any).node.type.name === "image";

  const isImageActive = editor.isActive("image") || isImageNodeSelected;

  const activeImageAttrs = editor.getAttributes("image");
  const activeLinkAttrs = editor.getAttributes("link");

  const currentImageSrc = activeImageAttrs.src || "";
  const currentImageAlt = activeImageAttrs.alt || "";
  const currentImageWidth = activeImageAttrs.width || "";
  const currentImageHref = activeLinkAttrs.href || "";
  const currentImageAlignment =
    (activeImageAttrs.alignment as "left" | "center" | "right") || "center";

  const getSelectedImagePos = (): number | null => {
    if (!editor) return null;
    const { selection } = editor.state;
    if (
      selection &&
      (selection as any).node &&
      (selection as any).node.type.name === "image"
    ) {
      return selection.from;
    }
    return null;
  };

  const updateImageSrc = (newSrc: string) => {
    if (!editor) return;
    const pos = getSelectedImagePos();
    if (pos !== null) {
      editor
        .chain()
        .updateAttributes("image", { src: newSrc })
        .setNodeSelection(pos)
        .run();
    } else {
      editor.chain().updateAttributes("image", { src: newSrc }).run();
    }
  };

  const updateImageAlt = (newAlt: string) => {
    if (!editor) return;
    const pos = getSelectedImagePos();
    if (pos !== null) {
      editor
        .chain()
        .updateAttributes("image", { alt: newAlt })
        .setNodeSelection(pos)
        .run();
    } else {
      editor.chain().updateAttributes("image", { alt: newAlt }).run();
    }
  };

  const updateImageWidth = (newWidth: string) => {
    if (!editor) return;
    const pos = getSelectedImagePos();
    if (pos !== null) {
      editor
        .chain()
        .updateAttributes("image", { width: newWidth })
        .setNodeSelection(pos)
        .run();
    } else {
      editor.chain().updateAttributes("image", { width: newWidth }).run();
    }
  };

  const updateImageHref = (newHref: string) => {
    if (!editor) return;
    const pos = getSelectedImagePos();
    if (!newHref.trim()) {
      if (pos !== null) {
        editor.chain().unsetLink().setNodeSelection(pos).run();
      } else {
        editor.chain().unsetLink().run();
      }
    } else {
      if (pos !== null) {
        editor
          .chain()
          .setLink({ href: newHref.trim() })
          .setNodeSelection(pos)
          .run();
      } else {
        editor.chain().setLink({ href: newHref.trim() }).run();
      }
    }
  };

  const updateImageAlignment = (alignment: "left" | "center" | "right") => {
    if (!editor) return;
    const pos = getSelectedImagePos();
    if (pos !== null) {
      editor
        .chain()
        .updateAttributes("image", { alignment })
        .setNodeSelection(pos)
        .run();
    } else {
      editor.chain().updateAttributes("image", { alignment }).run();
    }
  };

  const currentElementType = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : editor.isActive("blockquote")
          ? "quote"
          : editor.isActive("bulletList")
            ? "bullet"
            : editor.isActive("orderedList")
              ? "ordered"
              : "p";

  return (
    <form className={styles.workspaceCard} onSubmit={handleSave}>
      {/* Upper Control Bar */}
      <TopControlBar
        name={name}
        setName={setName}
        templateType={template.type}
        editor={editor}
        deviceView={deviceView}
        setDeviceView={setDeviceView}
        canvasMode={canvasMode}
        setCanvasMode={setCanvasMode}
        isActive={isActive}
        setIsActive={setIsActive}
      />

      {/* Dedicated Subject Line Input Box */}
      <SubjectBox
        subject={subject}
        setSubject={setSubject}
        canvasMode={canvasMode}
        previewSubject={previewSubject}
      />

      {/* Main Two-Column Editor Body */}
      <div className={styles.editorBodyLayout}>
        {/* Left Inspector Sidebar */}
        <InspectorSidebar
          editor={editor}
          allVars={allVars}
          onOpenCtaModal={() => setIsCtaModalOpen(true)}
          onOpenLinkModal={() => setIsLinkModalOpen(true)}
          onOpenImageModal={() => setIsImageModalOpen(true)}
          currentFontFamily={currentFontFamily}
          currentFontWeight={currentFontWeight}
          currentTextColor={currentTextColor}
          currentHighlightColor={currentHighlightColor}
          currentBlockBgColor={currentBlockBgColor}
          currentBorderStyle={currentBorderStyle}
          currentBorderWidth={currentBorderWidth}
          currentBorderColor={currentBorderColor}
          currentBorderRadius={currentBorderRadius}
          currentPadding={currentPadding}
          currentElementType={currentElementType}
          isImageActive={isImageActive}
          currentImageSrc={currentImageSrc}
          currentImageAlt={currentImageAlt}
          currentImageWidth={currentImageWidth}
          currentImageHref={currentImageHref}
          currentImageAlignment={currentImageAlignment}
          updateImageSrc={updateImageSrc}
          updateImageAlt={updateImageAlt}
          updateImageWidth={updateImageWidth}
          updateImageHref={updateImageHref}
          updateImageAlignment={updateImageAlignment}
          handleInsertVariable={handleInsertVariable}
        />

        {/* Right Viewport Canvas */}
        <CanvasViewport
          canvasMode={canvasMode}
          deviceView={deviceView}
          editor={editor}
          compiledRawHtml={compiledRawHtml}
          previewBodyHtml={previewBodyHtml}
        />
      </div>

      {/* Bottom Actions Footer */}
      <ActionFooter
        templateType={template.type}
        onReset={onReset}
        onDelete={onDelete}
        onOpenSendTest={onOpenSendTest}
        onOpenSendBatch={onOpenSendBatch}
        isSaving={isSaving}
      />

      {/* Modals */}
      <CtaModal
        isOpen={isCtaModalOpen}
        onClose={() => setIsCtaModalOpen(false)}
        ctaLabel={ctaLabel}
        setCtaLabel={setCtaLabel}
        ctaUrl={ctaUrl}
        setCtaUrl={setCtaUrl}
        handleInsertCtaButton={handleInsertCtaButton}
      />

      <LinkModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        linkUrl={linkUrl}
        setLinkUrl={setLinkUrl}
        handleApplyLink={handleApplyLink}
      />

      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        imageUrl={imageUrl}
        setImageUrl={setImageUrl}
        imageLinkUrl={imageLinkUrl}
        setImageLinkUrl={setImageLinkUrl}
        imageAlt={imageAlt}
        setImageAlt={setImageAlt}
        imageWidth={imageWidth}
        setImageWidth={setImageWidth}
        handleInsertImage={handleInsertImage}
      />
    </form>
  );
}
