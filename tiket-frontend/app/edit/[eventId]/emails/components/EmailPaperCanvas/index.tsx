"use client";
import { NodeSelection } from "@tiptap/pm/state";

import React, { useState, useEffect, useRef } from "react";
import { useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { TextStyle, Color, FontFamily } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extension-placeholder";

import type { EmailTemplate, AvailableVariables } from "@/types/email";
import { EmailModelSerializer } from "@/lib/emailModelSerializer";
import {
  BlockStyleExtension,
  ContainerExtension,
  CustomLinkExtension,
  CustomImageExtension,
} from "./extensions";
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

const DEFAULT_EMAIL_BODY = `
<div style="font-family: Arial, Helvetica, sans-serif; background-color: #ffffff; color: #111827; max-width: 600px; margin: 0 auto; padding: 32px; border-radius: 12px; border: 1px solid #e5e7eb; box-sizing: border-box;">
  <h1 style="font-size: 24px; color: #111827; margin-bottom: 20px;">You're invited to {{event.title}}!</h1>
  <p style="font-size: 15px; color: #374151;">Hi {{attendee.name}},</p>
  <p style="font-size: 15px; color: #374151;">We are delighted to invite you to join us at <strong>{{event.title}}</strong>.</p>
</div>
`.trim();

function EmailPaperCanvasContent({
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
  const [canvasMode, setCanvasMode] = useState<"edit" | "preview" | "code">("edit");
  const [, setSelectionTick] = useState(0);

  // Saved selection tracking ref for modal insertions
  const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);

  // Modal states for links, CTA buttons & images
  const [isCtaModalOpen, setIsCtaModalOpen] = useState(false);
  const [ctaLabel, setCtaLabel] = useState("View Your Digital Pass");
  const [ctaUrl, setCtaUrl] = useState("{{event.passUrl}}");

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

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
        types: ["heading", "paragraph", "container"],
      }),
      CustomLinkExtension.configure({
        openOnClick: false,
      }),
      ContainerExtension,
      CustomImageExtension,
      Placeholder.configure({
        placeholder: "Click or select text here to start editing your email template...",
      }),
      BlockStyleExtension,
    ],
    content: EmailModelSerializer.deserializeHtmlToJson(
      template.body || DEFAULT_EMAIL_BODY,
    ),
    immediatelyRender: false,
    onTransaction: () => {
      setSelectionTick((tick) => tick + 1);
    },
  });

  // Sync external template updates safely
  useEffect(() => {
    if (editor && template.body) {
      const currentSerialized = EmailModelSerializer.serializeJsonToHtml(editor.getJSON());
      if (currentSerialized !== template.body) {
        const deserialized = EmailModelSerializer.deserializeHtmlToJson(template.body);
        editor.commands.setContent(deserialized);
      }
    }
  }, [template.body, editor]);

  if (!editor) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const compiledHtml = EmailModelSerializer.serializeJsonToHtml(editor.getJSON());

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

  const handleOpenCtaModal = () => {
    if (editor) {
      savedSelectionRef.current = {
        from: editor.state.selection.from,
        to: editor.state.selection.to,
      };
    }
    setIsCtaModalOpen(true);
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

    const chain = editor.chain().focus();
    if (savedSelectionRef.current) {
      chain.setTextSelection(savedSelectionRef.current);
    }

    const { $from } = editor.state.selection;
    const currentParagraphEmpty =
      $from.parent.type.name === "paragraph" && $from.parent.content.size === 0;

    if (currentParagraphEmpty) {
      chain.insertContent(buttonHtml).run();
    } else {
      chain.insertContentAt(editor.state.selection.to, buttonHtml).run();
    }

    setIsCtaModalOpen(false);
    savedSelectionRef.current = null;
  };

  const handleOpenLinkModal = () => {
    if (editor) {
      savedSelectionRef.current = {
        from: editor.state.selection.from,
        to: editor.state.selection.to,
      };
      const activeHref = (editor.getAttributes("link").href as string) || "";
      setLinkUrl(activeHref);

      const { from, to } = editor.state.selection;
      if (from !== to) {
        setLinkText(editor.state.doc.textBetween(from, to, " "));
      } else {
        setLinkText("");
      }
    }
    setIsLinkModalOpen(true);
  };

  const handleApplyLink = () => {
    if (!linkUrl.trim()) {
      if (savedSelectionRef.current) {
        editor.chain().focus().setTextSelection(savedSelectionRef.current).unsetLink().run();
      } else {
        editor.chain().focus().unsetLink().run();
      }
      setIsLinkModalOpen(false);
      setLinkUrl("");
      setLinkText("");
      savedSelectionRef.current = null;
      return;
    }

    const chain = editor.chain().focus();
    if (savedSelectionRef.current) {
      chain.setTextSelection(savedSelectionRef.current);
      const isCollapsed = savedSelectionRef.current.from === savedSelectionRef.current.to;
      if (isCollapsed) {
        const textToInsert = linkText.trim() || linkUrl.trim();
        chain.insertContent(
          `<a href="${linkUrl.trim()}" style="color: #2563eb; text-decoration: underline;">${textToInsert}</a>`,
        );
      } else {
        chain.setLink({ href: linkUrl.trim() });
      }
    } else {
      chain.setLink({ href: linkUrl.trim() });
    }
    chain.run();

    setIsLinkModalOpen(false);
    setLinkUrl("");
    setLinkText("");
    savedSelectionRef.current = null;
  };

  const handleOpenImageModal = () => {
    if (editor) {
      savedSelectionRef.current = {
        from: editor.state.selection.from,
        to: editor.state.selection.to,
      };
    }
    setIsImageModalOpen(true);
  };

  const handleInsertImage = () => {
    if (!imageUrl.trim()) return;

    const src = imageUrl.trim();
    const alt = imageAlt.trim();
    const width = imageWidth.trim();
    const href = imageLinkUrl.trim();

    const chain = editor.chain().focus();
    if (savedSelectionRef.current) {
      chain.setTextSelection(savedSelectionRef.current);
    }

    chain.setImage({
      src,
      alt: alt || undefined,
    });

    const attrsToUpdate: Record<string, string> = {};
    if (width) attrsToUpdate.width = width;
    if (href) attrsToUpdate.href = href;
    if (Object.keys(attrsToUpdate).length > 0) {
      chain.updateAttributes("image", attrsToUpdate);
    }
    chain.run();

    setIsImageModalOpen(false);
    setImageUrl("");
    setImageAlt("");
    setImageLinkUrl("");
    setImageWidth("");
    savedSelectionRef.current = null;
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
  const compiledRawHtml = EmailModelSerializer.serializeJsonToHtml(editor.getJSON());
  const previewBodyHtml =
    renderInterpolated(compiledRawHtml) ||
    "<p style='color:#9ca3af;'>No content written yet...</p>";

  // Current Active Node Style Getters
  const currentFontFamily =
    (editor.getAttributes("textStyle").fontFamily as string) || "__default__";
  const currentFontWeight =
    (editor.getAttributes("textStyle").fontWeight as string) || "400";
  const currentTextColor =
    (editor.getAttributes("textStyle").color as string) || "#111827";
  const currentHighlightColor =
    (editor.getAttributes("highlight").color as string) || "";

  // Dynamic active block type detection
  const activeBlockType = editor.isActive("heading")
    ? "heading"
    : editor.isActive("container")
      ? "container"
      : editor.isActive("blockquote")
        ? "blockquote"
        : editor.isActive("listItem")
          ? "listItem"
          : "paragraph";

  const blockAttrs = editor.getAttributes(activeBlockType);
  const currentBlockBgColor = (blockAttrs.backgroundColor as string) || "";
  const currentBorderStyle = (blockAttrs.borderStyle as string) || "none";
  const currentBorderWidth = (blockAttrs.borderWidth as string) || "0px";
  const currentBorderColor = (blockAttrs.borderColor as string) || "#e5e7eb";
  const currentBorderRadius = (blockAttrs.borderRadius as string) || "0px";
  const currentPadding = (blockAttrs.padding as string) || "0px";

  const updateBlockAttribute = (attrName: string, attrVal: string | null) => {
    editor.chain().focus().updateAttributes(activeBlockType, { [attrName]: attrVal }).run();
  };

  // Active Image & Link Getters
  const isImageNodeSelected =
    editor.state.selection instanceof NodeSelection &&
    editor.state.selection.node.type.name === "image";

  const isImageActive = editor.isActive("image") || isImageNodeSelected;

  const activeImageAttrs = editor.getAttributes("image");
  const activeLinkAttrs = editor.getAttributes("link");

  const currentImageSrc = (activeImageAttrs.src as string) || "";
  const currentImageAlt = (activeImageAttrs.alt as string) || "";
  const currentImageWidth = (activeImageAttrs.width as string) || "";
  const currentImageHref =
    (activeImageAttrs.href as string) || (activeLinkAttrs.href as string) || "";
  const currentImageAlignment =
    (activeImageAttrs.alignment as "left" | "center" | "right") || "center";

  const getSelectedImagePos = (): number | null => {
    const { selection } = editor.state;
    if (
      selection instanceof NodeSelection &&
      selection.node.type.name === "image"
    ) {
      return selection.from;
    }
    return null;
  };

  const updateImageSrc = (newSrc: string) => {
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
    const pos = getSelectedImagePos();
    const trimmed = newHref.trim();
    if (!trimmed) {
      if (pos !== null) {
        editor
          .chain()
          .updateAttributes("image", { href: null })
          .setNodeSelection(pos)
          .run();
      } else {
        editor.chain().updateAttributes("image", { href: null }).run();
      }
    } else {
      if (pos !== null) {
        editor
          .chain()
          .updateAttributes("image", { href: trimmed })
          .setNodeSelection(pos)
          .run();
      } else {
        editor.chain().updateAttributes("image", { href: trimmed }).run();
      }
    }
  };

  const updateImageAlignment = (alignment: "left" | "center" | "right") => {
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
        : editor.isActive("container")
          ? "container"
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

      {/* Dedicated Subject Line Input Box with Variable Insertion */}
      <SubjectBox
        subject={subject}
        setSubject={setSubject}
        canvasMode={canvasMode}
        previewSubject={previewSubject}
        variables={allVars}
      />

      {/* Main Two-Column Editor Body */}
      <div className={styles.editorBodyLayout}>
        {/* Left Inspector Sidebar */}
        <InspectorSidebar
          editor={editor}
          allVars={allVars}
          onOpenCtaModal={handleOpenCtaModal}
          onOpenLinkModal={handleOpenLinkModal}
          onOpenImageModal={handleOpenImageModal}
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
          updateBlockAttribute={updateBlockAttribute}
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
        onClose={() => {
          setIsCtaModalOpen(false);
          savedSelectionRef.current = null;
        }}
        ctaLabel={ctaLabel}
        setCtaLabel={setCtaLabel}
        ctaUrl={ctaUrl}
        setCtaUrl={setCtaUrl}
        handleInsertCtaButton={handleInsertCtaButton}
      />

      <LinkModal
        isOpen={isLinkModalOpen}
        onClose={() => {
          setIsLinkModalOpen(false);
          savedSelectionRef.current = null;
        }}
        linkUrl={linkUrl}
        setLinkUrl={setLinkUrl}
        linkText={linkText}
        setLinkText={setLinkText}
        handleApplyLink={handleApplyLink}
      />

      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => {
          setIsImageModalOpen(false);
          savedSelectionRef.current = null;
        }}
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

export default function EmailPaperCanvas(props: EmailPaperCanvasProps) {
  return (
    <EmailPaperCanvasContent
      key={props.template.id + props.template.updatedAt}
      {...props}
    />
  );
}
