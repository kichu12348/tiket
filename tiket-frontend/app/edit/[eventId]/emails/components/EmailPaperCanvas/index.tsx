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

import type {
  EmailTemplate,
  AvailableVariables,
  EmailDocumentJSON,
  EmailNodeJSON,
  EmailDocumentNode,
} from "@/types/email";
import { EmailModelSerializer } from "@/lib/emailModelSerializer";
import { createDefaultEmailDocument } from "@/utils/emailJsonCompiler";
import {
  BlockStyleExtension,
  ContainerExtension,
  CustomLinkExtension,
  CustomImageExtension,
  CustomButtonExtension,
  CustomTextStyleExtension,
  VariableNodeExtension,
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
  eventId?: string;
}

function EmailPaperCanvasContent({
  template,
  variables,
  onSave,
  onReset,
  onDelete,
  onOpenSendTest,
  onOpenSendBatch,
  isSaving,
  eventId,
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
      CustomButtonExtension,
      CustomTextStyleExtension,
      VariableNodeExtension,
      Placeholder.configure({
        placeholder: "Click or select text here to start editing your email template...",
      }),
      BlockStyleExtension,
    ],
    editorProps: {
      handleDOMEvents: {
        click: (_view, event) => {
          const target = event.target as HTMLElement | null;
          // Intercept any clicks on <a> tags in editor mode to prevent navigation
          const anchor = target?.closest("a");
          if (anchor) {
            event.preventDefault();
          }
          return false;
        },
      },
    },
    content:
      template.body &&
      typeof template.body === "object" &&
      "doc" in template.body
        ? template.body.doc
        : typeof template.body === "string"
          ? EmailModelSerializer.deserializeHtmlToJson(template.body)
          : createDefaultEmailDocument().doc,
    immediatelyRender: false,
    onTransaction: () => {
      setSelectionTick((tick) => tick + 1);
    },
  });

  const [prevTemplate, setPrevTemplate] = useState(template);
  if (template !== prevTemplate) {
    setPrevTemplate(template);
    setName(template.name);
    setSubject(template.subject || "");
    setIsActive(template.isActive);
  }

  // Sync external template updates safely
  useEffect(() => {
    if (editor && template.body) {
      if (typeof template.body === "object" && "doc" in template.body) {
        editor.commands.setContent(template.body.doc);
      } else if (typeof template.body === "string") {
        const currentSerialized = EmailModelSerializer.serializeJsonToHtml(
          editor.getJSON() as unknown as EmailDocumentNode,
        );
        if (currentSerialized !== template.body) {
          const deserialized = EmailModelSerializer.deserializeHtmlToJson(
            template.body,
          );
          editor.commands.setContent(deserialized);
        }
      }
    }
  }, [template.body, editor]);

  if (!editor) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const docJson = editor.getJSON() as EmailNodeJSON;
    const documentJson: EmailDocumentJSON = {
      version: 1,
      canvasStyle:
        template.body &&
        typeof template.body === "object" &&
        "canvasStyle" in template.body
          ? template.body.canvasStyle
          : {
              backgroundColor: "#f4f4f5",
              contentBackgroundColor: "#ffffff",
              contentWidth: "600px",
              padding: "32px",
            },
      doc: docJson,
    };

    await onSave({
      name,
      subject,
      body: documentJson,
      isActive,
    });
  };

  const handleInsertVariable = (varKey: string) => {
    if (!editor) return;
    const { selection } = editor.state;
    if (selection instanceof NodeSelection) {
      editor
        .chain()
        .focus()
        .insertContentAt(selection.to, ` ${varKey} `)
        .run();
    } else {
      editor.chain().focus().insertContent(` ${varKey} `).run();
    }
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

    const chain = editor.chain().focus();
    if (savedSelectionRef.current) {
      chain.setTextSelection(savedSelectionRef.current);
    }

    chain
      .insertContent({
        type: "ctaButton",
        attrs: {
          label: ctaLabel.trim(),
          url: ctaUrl.trim(),
          buttonColor: "#000000",
          textColor: "#ffffff",
          borderRadius: "8px",
          alignment: "center",
        },
      })
      .run();

    setIsCtaModalOpen(false);
    savedSelectionRef.current = null;
  };

  const handleOpenLinkModal = () => {
    if (editor) {
      if (editor.isActive("link") && editor.state.selection.from === editor.state.selection.to) {
        editor.chain().extendMarkRange("link").run();
      }
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
    const trimmedUrl = linkUrl.trim();
    if (!trimmedUrl) {
      const chain = editor.chain().focus();
      if (savedSelectionRef.current) {
        chain.setTextSelection(savedSelectionRef.current);
      }
      chain.extendMarkRange("link").unsetLink().run();
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
        const textToInsert = linkText.trim() || trimmedUrl;
        chain.insertContent({
          type: "text",
          text: textToInsert,
          marks: [{ type: "link", attrs: { href: trimmedUrl } }],
        });
      } else {
        chain.extendMarkRange("link").setLink({ href: trimmedUrl });
      }
    } else {
      chain.extendMarkRange("link").setLink({ href: trimmedUrl });
    }
    chain.run();

    setIsLinkModalOpen(false);
    setLinkUrl("");
    setLinkText("");
    savedSelectionRef.current = null;
  };

  const handleOpenImageModal = () => {
    if (editor) {
      if (
        editor.state.selection instanceof NodeSelection &&
        editor.state.selection.node.type.name === "image"
      ) {
        const node = editor.state.selection.node;
        setImageUrl(node.attrs.src || "");
        setImageAlt(node.attrs.alt || "");
        setImageLinkUrl(node.attrs.href || "");
        setImageWidth(node.attrs.width || "");
      }
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

    if (
      editor.state.selection instanceof NodeSelection &&
      editor.state.selection.node.type.name === "image"
    ) {
      chain.updateAttributes("image", {
        src,
        alt: alt || null,
        width: width || null,
        href: href || null,
      });
    } else {
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

  const qrUrl =
    sampleValues["{{ticket.qrCodeUrl}}"] ||
    sampleValues["ticket.qrCodeUrl"] ||
    "https://quickchart.io/qr?text=TKT-884920-XYZ";

  const renderInterpolated = (templateStr: string, isBody = false) => {
    if (!templateStr) return "";

    let result = templateStr.replace(
      /src=["']\{\{\s*([^}]+?)\s*\}\}["']/g,
      (match, key) => {
        const trimmed = key.trim();
        const fullKey = `{{${trimmed}}}`;
        const val = sampleValues[fullKey] || sampleValues[trimmed];
        return `src="${val || qrUrl}"`;
      },
    );

    result = result.replace(
      /\{\{\s*([^}]+?)\s*\}\}/g,
      (match, key) => {
        const trimmedKey = key.trim();
        if (trimmedKey === "ticket.qrCodeUrl") {
          if (isBody) {
            return `<img src="${qrUrl}" alt="Ticket QR Code" width="160" height="160" style="display:block;margin:12px auto;border-radius:8px;border:1px solid #e5e7eb;" />`;
          }
          return qrUrl;
        }
        const fullKey = `{{${trimmedKey}}}`;
        return sampleValues[fullKey] || sampleValues[trimmedKey] || match;
      },
    );

    return result;
  };

  const previewSubject = renderInterpolated(subject, false) || "(No Subject)";
  const compiledRawHtml = EmailModelSerializer.serializeJsonToHtml(
    editor.getJSON() as unknown as EmailDocumentNode,
  );
  const previewBodyHtml =
    renderInterpolated(compiledRawHtml, true) ||
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

  // Innermost / deepest styleable block detection (Bug 2.3 & 2.4)
  const getInnermostBlock = (): { blockType: string; elementType: string } => {
    if (editor.state.selection instanceof NodeSelection) {
      const node = editor.state.selection.node;
      if (node.type.name === "ctaButton") return { blockType: "ctaButton", elementType: "ctaButton" };
      if (node.type.name === "image") return { blockType: "image", elementType: "image" };
    }
    const { $from } = editor.state.selection;
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d);
      const name = node.type.name;
      if (name === "heading") {
        const level = (node.attrs.level as number) || 1;
        return { blockType: "heading", elementType: `h${level}` };
      }
      if (name === "paragraph") return { blockType: "paragraph", elementType: "p" };
      if (name === "blockquote") return { blockType: "blockquote", elementType: "quote" };
      if (name === "bulletList" || (name === "listItem" && $from.node(d - 1)?.type.name === "bulletList")) {
        return { blockType: "listItem", elementType: "bullet" };
      }
      if (name === "orderedList" || (name === "listItem" && $from.node(d - 1)?.type.name === "orderedList")) {
        return { blockType: "listItem", elementType: "ordered" };
      }
      if (name === "listItem") return { blockType: "listItem", elementType: "bullet" };
      if (name === "container") return { blockType: "container", elementType: "container" };
    }
    return { blockType: "paragraph", elementType: "p" };
  };

  const { blockType: activeBlockType, elementType: currentElementType } = getInnermostBlock();

  const blockAttrs = editor.getAttributes(activeBlockType);
  const currentBlockBgColor = (blockAttrs.backgroundColor as string) || "";
  const currentBorderStyle = (blockAttrs.borderStyle as string) || "none";
  const currentBorderWidth = (blockAttrs.borderWidth as string) || "0px";
  const currentBorderColor = (blockAttrs.borderColor as string) || "#e5e7eb";
  const currentBorderRadius = (blockAttrs.borderRadius as string) || "0px";
  const currentPadding = (blockAttrs.padding as string) || "0px";
  const currentMarginTop = (blockAttrs.marginTop as string) || "0px";
  const currentMarginBottom = (blockAttrs.marginBottom as string) || "0px";

  const updateBlockAttribute = (attrName: string, attrVal: string | null) => {
    // When selection is CTA or image, don't apply block attributes (Bug 2.3)
    if (editor.state.selection instanceof NodeSelection) {
      const name = editor.state.selection.node.type.name;
      if (name === "ctaButton" || name === "image") {
        return;
      }
    }
    if (activeBlockType === "ctaButton" || activeBlockType === "image") {
      return;
    }
    editor.chain().updateAttributes(activeBlockType, { [attrName]: attrVal }).run();
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

  // Active CTA Button Detection
  const selectedCtaNode =
    editor.state.selection instanceof NodeSelection &&
    editor.state.selection.node.type.name === "ctaButton"
      ? editor.state.selection.node
      : null;
  const isCtaSelected = Boolean(selectedCtaNode);
  const isCtaActive = editor.isActive("ctaButton") || isCtaSelected;
  const activeCtaAttrs =
    selectedCtaNode?.attrs || editor.getAttributes("ctaButton") || {};

  const currentCtaLabel = (activeCtaAttrs.label as string) || "";
  const currentCtaUrl = (activeCtaAttrs.url as string) || "";
  const currentCtaButtonColor =
    (activeCtaAttrs.buttonColor as string) || "#000000";
  const currentCtaTextColor =
    (activeCtaAttrs.textColor as string) || "#ffffff";
  const currentCtaBorderRadius =
    (activeCtaAttrs.borderRadius as string) || "8px";
  const currentCtaAlignment =
    (activeCtaAttrs.alignment as "left" | "center" | "right") || "center";

  const updateCtaAttributes = (attrs: Record<string, string>) => {
    const { selection } = editor.state;
    if (
      selection instanceof NodeSelection &&
      selection.node.type.name === "ctaButton"
    ) {
      editor
        .chain()
        .updateAttributes("ctaButton", attrs)
        .setNodeSelection(selection.from)
        .run();
    } else {
      editor.chain().updateAttributes("ctaButton", attrs).run();
    }
  };

  const isBoldActive =
    Boolean(editor.isActive("bold")) ||
    currentFontWeight === "700" ||
    currentFontWeight === "800" ||
    currentFontWeight === "900" ||
    currentFontWeight === "bold";

  const toggleBoldAndWeight = () => {
    if (isBoldActive) {
      editor
        .chain()
        .focus()
        .unsetMark("bold")
        .setMark("textStyle", { fontWeight: null })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .setMark("textStyle", { fontWeight: "700" })
        .run();
    }
  };

  const setFontWeight = (val: string) => {
    if (val === "400" || !val) {
      editor
        .chain()
        .focus()
        .unsetMark("bold")
        .setMark("textStyle", { fontWeight: null })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .unsetMark("bold")
        .setMark("textStyle", { fontWeight: val })
        .run();
    }
  };

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
          currentMarginTop={currentMarginTop}
          currentMarginBottom={currentMarginBottom}
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
          isCtaActive={isCtaActive}
          currentCtaLabel={currentCtaLabel}
          currentCtaUrl={currentCtaUrl}
          currentCtaButtonColor={currentCtaButtonColor}
          currentCtaTextColor={currentCtaTextColor}
          currentCtaBorderRadius={currentCtaBorderRadius}
          currentCtaAlignment={currentCtaAlignment}
          updateCtaAttributes={updateCtaAttributes}
          onToggleBold={toggleBoldAndWeight}
          onSetFontWeight={setFontWeight}
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
        eventId={eventId}
      />
    </form>
  );
}

export default function EmailPaperCanvas(props: EmailPaperCanvasProps) {
  return (
    <EmailPaperCanvasContent
      key={props.template.id}
      {...props}
    />
  );
}
