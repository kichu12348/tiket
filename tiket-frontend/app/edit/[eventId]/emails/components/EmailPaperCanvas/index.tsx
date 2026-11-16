"use client";
import { NodeSelection } from "@tiptap/pm/state";

import React, { useState, useEffect, useRef } from "react";
import { useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { TextStyle, Color, FontFamily } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Underline } from "@tiptap/extension-underline";
import { Placeholder } from "@tiptap/extension-placeholder";

import type {
  EmailTemplate,
  AvailableVariables,
  EmailDocumentJSON,
  EmailNodeJSON,
  EmailDocumentNode,
} from "@/types/email";
import { EmailModelSerializer } from "@/lib/emailModelSerializer";
import {
  createDefaultEmailDocument,
  compileEmailJsonToHtml,
  normalizeEmailDocumentDoc,
} from "@/utils/emailJsonCompiler";
import { useTipTapSync } from "@/hooks/useTipTapSync";
import {
  StyledParagraph,
  StyledHeading,
  StyledBlockquote,
  StyledBulletList,
  StyledOrderedList,
  StyledListItem,
  BlockStyleExtension,
  ContainerBlockExtension,
  CustomLinkExtension,
  ImageBlockExtension,
  ButtonBlockExtension,
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
  const [isEditingLink, setIsEditingLink] = useState(false);
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
        paragraph: false,
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      StyledParagraph,
      StyledHeading,
      StyledBlockquote,
      StyledBulletList,
      StyledOrderedList,
      StyledListItem,
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      Underline,
      CustomLinkExtension.configure({
        openOnClick: false,
        autolink: false,
      }),
      ContainerBlockExtension,
      ImageBlockExtension,
      ButtonBlockExtension,
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
        ? normalizeEmailDocumentDoc(template.body.doc)
        : typeof template.body === "string"
          ? EmailModelSerializer.deserializeHtmlToJson(template.body)
          : createDefaultEmailDocument().doc,
    immediatelyRender: false,
    onTransaction: () => {
      setSelectionTick((tick) => tick + 1);
    },
  });

  const tipTapSync = useTipTapSync(editor);

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
        editor.commands.setContent(normalizeEmailDocumentDoc(template.body.doc));
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
    const docJson = normalizeEmailDocumentDoc(editor.getJSON() as EmailNodeJSON);
    const documentJson: EmailDocumentJSON = {
      version: 1,
      canvasStyle:
        template.body &&
        typeof template.body === "object" &&
        "canvasStyle" in template.body &&
        template.body.canvasStyle
          ? template.body.canvasStyle
          : {
              backgroundColor: "#ffffff",
              color: "#111827",
              maxWidth: "600px",
              padding: "32px",
              borderRadius: "12px",
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
        type: "buttonBlock",
        attrs: {
          href: ctaUrl.trim(),
          alignment: "center",
          label: ctaLabel.trim(),
          style: {
            backgroundColor: "#000000",
            color: "#ffffff",
            padding: "12px 24px",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "15px",
          },
        },
        content: [
          {
            type: "text",
            text: ctaLabel.trim(),
          },
        ],
      })
      .run();

    setIsCtaModalOpen(false);
    savedSelectionRef.current = null;
  };

  const handleOpenLinkModal = () => {
    if (editor) {
      const isLink = editor.isActive("link");
      setIsEditingLink(isLink);
      if (isLink) {
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
    } else {
      setIsEditingLink(false);
    }
    setIsLinkModalOpen(true);
  };

  const handleRemoveLink = () => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (savedSelectionRef.current) {
      chain.setTextSelection(savedSelectionRef.current);
    }
    chain.extendMarkRange("link").unsetLink().run();
    setIsLinkModalOpen(false);
    setLinkUrl("");
    setLinkText("");
    setIsEditingLink(false);
    savedSelectionRef.current = null;
  };

  const handleApplyLink = (urlOverride?: string, textOverride?: string) => {
    const urlToUse = urlOverride !== undefined ? urlOverride : linkUrl;
    const textToUse = textOverride !== undefined ? textOverride : linkText;
    const trimmedUrl = urlToUse.trim();

    if (!trimmedUrl) {
      handleRemoveLink();
      return;
    }

    const chain = editor.chain().focus();
    const sel = savedSelectionRef.current || {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };

    chain.setTextSelection(sel);

    const isCollapsed = sel.from === sel.to;
    const currentSelectedText = isCollapsed
      ? ""
      : editor.state.doc.textBetween(sel.from, sel.to, " ");
    const trimmedText = textToUse.trim();

    if (isCollapsed) {
      const textToInsert = trimmedText || trimmedUrl;
      chain.insertContent({
        type: "text",
        text: textToInsert,
        marks: [{ type: "link", attrs: { href: trimmedUrl } }],
      });
    } else if (trimmedText && trimmedText !== currentSelectedText) {
      chain.insertContent({
        type: "text",
        text: trimmedText,
        marks: [{ type: "link", attrs: { href: trimmedUrl } }],
      });
    } else {
      chain.extendMarkRange("link").setLink({ href: trimmedUrl });
    }

    chain.unsetLink();
    chain.run();

    setIsLinkModalOpen(false);
    setLinkUrl("");
    setLinkText("");
    setIsEditingLink(false);
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
    const stripped = v.key.replace(/^\{\{\s*/, "").replace(/\s*\}\}$/, "");
    sampleValues[stripped] = v.sample;
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

  const currentDocJson = normalizeEmailDocumentDoc(
    editor.getJSON() as EmailNodeJSON,
  );
  const currentDocModel: EmailDocumentJSON = {
    version: 1,
    canvasStyle:
      template.body &&
      typeof template.body === "object" &&
      "canvasStyle" in template.body &&
      template.body.canvasStyle
        ? template.body.canvasStyle
        : {
            backgroundColor: "#ffffff",
            color: "#111827",
            maxWidth: "600px",
            padding: "32px",
            borderRadius: "12px",
          },
    doc: currentDocJson,
  };

  const previewSubject = renderInterpolated(subject, false) || "(No Subject)";
  const compiledRawHtml = compileEmailJsonToHtml(currentDocModel);
  const previewBodyHtml =
    compileEmailJsonToHtml(currentDocModel, sampleValues) ||
    renderInterpolated(
      EmailModelSerializer.serializeJsonToHtml(
        editor.getJSON() as unknown as EmailDocumentNode,
      ),
      true,
    ) ||
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
  const getActiveBlockInfo = () => {
    if (!editor) return null;
    const { selection } = editor.state;
    if (selection instanceof NodeSelection) {
      return { pos: selection.from, node: selection.node, type: selection.node.type.name };
    }
    const { $from } = selection;
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d);
      const name = node.type.name;
      if (
        name === "heading" ||
        name === "paragraph" ||
        name === "blockquote" ||
        name === "listItem" ||
        name === "containerBlock" ||
        name === "container"
      ) {
        return { pos: $from.before(d), node, type: name };
      }
    }
    return null;
  };

  const getInnermostBlock = (): { blockType: string; elementType: string } => {
    if (editor.state.selection instanceof NodeSelection) {
      const node = editor.state.selection.node;
      if (node.type.name === "ctaButton" || node.type.name === "buttonBlock") {
        return { blockType: node.type.name, elementType: "ctaButton" };
      }
      if (node.type.name === "image" || node.type.name === "imageBlock") {
        return { blockType: node.type.name, elementType: "image" };
      }
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
      if (name === "containerBlock") return { blockType: "containerBlock", elementType: "container" };
      if (name === "container") return { blockType: "container", elementType: "container" };
    }
    return { blockType: "paragraph", elementType: "p" };
  };

  const { blockType: activeBlockType, elementType: currentElementType } = getInnermostBlock();
  const activeBlockInfo = getActiveBlockInfo();
  const activeBlockNode = activeBlockInfo?.node;

  const blockAttrs = activeBlockNode ? activeBlockNode.attrs : editor.getAttributes(activeBlockType);
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

  const updateBlockAttribute = (attrName: string, attrVal: string | null) => {
    // When selection is CTA or image, don't apply block attributes (Bug 2.3)
    if (editor.state.selection instanceof NodeSelection) {
      const name = editor.state.selection.node.type.name;
      if (name === "ctaButton" || name === "image" || name === "buttonBlock" || name === "imageBlock") {
        return;
      }
    }
    if (
      activeBlockType === "ctaButton" ||
      activeBlockType === "image" ||
      activeBlockType === "buttonBlock" ||
      activeBlockType === "imageBlock"
    ) {
      return;
    }

    const info = getActiveBlockInfo();
    if (!info) return;
    const { pos, node } = info;
    const existingStyle = (node.attrs.style && typeof node.attrs.style === "object"
      ? node.attrs.style
      : {}) as Record<string, string>;
    const updatedStyle = { ...existingStyle };
    if (attrVal === null || attrVal === undefined || attrVal === "") {
      delete updatedStyle[attrName];
    } else {
      updatedStyle[attrName] = attrVal;
    }

    const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      style: updatedStyle,
    });
    editor.view.dispatch(tr);
  };

  // Active Card Container Detection & Helpers
  const getActiveContainerInfo = () => {
    if (!editor) return null;
    const { selection } = editor.state;
    if (
      selection instanceof NodeSelection &&
      (selection.node.type.name === "containerBlock" ||
        selection.node.type.name === "container")
    ) {
      return { pos: selection.from, node: selection.node };
    }
    const { $from } = selection;
    for (let d = $from.depth; d > 0; d--) {
      const n = $from.node(d);
      if (n.type.name === "containerBlock" || n.type.name === "container") {
        return { pos: $from.before(d), node: n };
      }
    }
    return null;
  };

  const activeContainerInfo = getActiveContainerInfo();
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

  const handleUnwrapContainer = () => {
    const info = getActiveContainerInfo();
    if (!info) return;
    const { pos, node } = info;
    const tr = editor.state.tr;
    tr.replaceWith(pos, pos + node.nodeSize, node.content);
    editor.view.dispatch(tr);
    editor.view.focus();
  };

  const handleDeleteContainer = () => {
    const info = getActiveContainerInfo();
    if (!info) return;
    const { pos, node } = info;
    const tr = editor.state.tr.delete(pos, pos + node.nodeSize);
    editor.view.dispatch(tr);
    editor.view.focus();
  };

  const updateContainerStyleAttribute = (styleKey: string, val: string | null) => {
    const info = getActiveContainerInfo();
    if (!info) return;
    const { pos, node } = info;
    const existingStyle = (node.attrs.style && typeof node.attrs.style === "object"
      ? node.attrs.style
      : {}) as Record<string, string>;
    const updatedStyle = { ...existingStyle };
    if (val === null || val === undefined || val === "") {
      delete updatedStyle[styleKey];
    } else {
      updatedStyle[styleKey] = val;
    }
    const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      style: updatedStyle,
    });
    editor.view.dispatch(tr);
  };

  // Active Image & Link Getters
  const isImageNodeSelected =
    editor.state.selection instanceof NodeSelection &&
    (editor.state.selection.node.type.name === "image" ||
      editor.state.selection.node.type.name === "imageBlock");

  const isImageActive = editor.isActive("image") || editor.isActive("imageBlock") || isImageNodeSelected;

  const activeImageAttrs = isImageNodeSelected
    ? (editor.state.selection as NodeSelection).node.attrs
    : (editor.isActive("imageBlock")
        ? editor.getAttributes("imageBlock")
        : editor.getAttributes("image")) || {};
  const activeLinkAttrs = editor.getAttributes("link");

  const imageStyle = (activeImageAttrs.style && typeof activeImageAttrs.style === "object"
    ? activeImageAttrs.style
    : {}) as Record<string, string>;
  const currentImageSrc = (activeImageAttrs.src as string) || "";
  const currentImageAlt = (activeImageAttrs.alt as string) || "";
  const currentImageWidth = imageStyle.width || (activeImageAttrs.width as string) || "";
  const currentImageHref =
    (activeImageAttrs.href as string) || (activeLinkAttrs.href as string) || "";
  const currentImageAlignment =
    (activeImageAttrs.alignment as "left" | "center" | "right") || "center";

  const getSelectedImagePos = (): number | null => {
    const { selection } = editor.state;
    if (
      selection instanceof NodeSelection &&
      (selection.node.type.name === "image" || selection.node.type.name === "imageBlock")
    ) {
      return selection.from;
    }
    return null;
  };

  const getTargetImageType = (): string => {
    if (
      editor.state.selection instanceof NodeSelection &&
      editor.state.selection.node.type.name === "imageBlock"
    ) {
      return "imageBlock";
    }
    if (editor.isActive("imageBlock")) return "imageBlock";
    return "image";
  };

  const updateImageSrc = (newSrc: string) => {
    const targetType = getTargetImageType();
    const pos = getSelectedImagePos();
    if (pos !== null) {
      editor
        .chain()
        .updateAttributes(targetType, { src: newSrc })
        .setNodeSelection(pos)
        .run();
    } else {
      editor.chain().updateAttributes(targetType, { src: newSrc }).run();
    }
  };

  const updateImageAlt = (newAlt: string) => {
    const targetType = getTargetImageType();
    const pos = getSelectedImagePos();
    if (pos !== null) {
      editor
        .chain()
        .updateAttributes(targetType, { alt: newAlt })
        .setNodeSelection(pos)
        .run();
    } else {
      editor.chain().updateAttributes(targetType, { alt: newAlt }).run();
    }
  };

  const updateImageWidth = (newWidth: string) => {
    const targetType = getTargetImageType();
    const pos = getSelectedImagePos();
    const current = editor.getAttributes(targetType);
    const existingStyle = (current.style && typeof current.style === "object"
      ? current.style
      : {}) as Record<string, string>;
    const attrsToUpdate = {
      width: newWidth || null,
      style: { ...existingStyle, width: newWidth || undefined },
    };
    if (pos !== null) {
      editor
        .chain()
        .updateAttributes(targetType, attrsToUpdate)
        .setNodeSelection(pos)
        .run();
    } else {
      editor.chain().updateAttributes(targetType, attrsToUpdate).run();
    }
  };

  const updateImageHref = (newHref: string) => {
    const targetType = getTargetImageType();
    const pos = getSelectedImagePos();
    const trimmed = newHref.trim();
    if (!trimmed) {
      if (pos !== null) {
        editor
          .chain()
          .updateAttributes(targetType, { href: null })
          .setNodeSelection(pos)
          .run();
      } else {
        editor.chain().updateAttributes(targetType, { href: null }).run();
      }
    } else {
      if (pos !== null) {
        editor
          .chain()
          .updateAttributes(targetType, { href: trimmed })
          .setNodeSelection(pos)
          .run();
      } else {
        editor.chain().updateAttributes(targetType, { href: trimmed }).run();
      }
    }
  };

  const updateImageAlignment = (alignment: "left" | "center" | "right") => {
    const targetType = getTargetImageType();
    const pos = getSelectedImagePos();
    if (pos !== null) {
      editor
        .chain()
        .updateAttributes(targetType, { alignment })
        .setNodeSelection(pos)
        .run();
    } else {
      editor.chain().updateAttributes(targetType, { alignment }).run();
    }
  };

  // Active CTA Button Detection
  const getActiveButtonInfo = () => {
    if (!editor) return null;
    const { selection } = editor.state;
    if (
      selection instanceof NodeSelection &&
      (selection.node.type.name === "ctaButton" ||
        selection.node.type.name === "buttonBlock")
    ) {
      return { pos: selection.from, node: selection.node };
    }
    const { $from } = selection;
    for (let d = $from.depth; d > 0; d--) {
      const n = $from.node(d);
      if (n.type.name === "ctaButton" || n.type.name === "buttonBlock") {
        return { pos: $from.before(d), node: n };
      }
    }
    return null;
  };

  const activeButtonInfo = getActiveButtonInfo();
  const isCtaActive = Boolean(activeButtonInfo);
  const activeCtaNode = activeButtonInfo?.node;
  const activeCtaAttrs = (activeCtaNode ? activeCtaNode.attrs : editor.getAttributes("buttonBlock")) || {};

  const ctaStyle = (activeCtaAttrs.style && typeof activeCtaAttrs.style === "object"
    ? activeCtaAttrs.style
    : {}) as Record<string, string>;
  const currentCtaLabel =
    (activeCtaNode?.textContent || (activeCtaAttrs.label as string) || "").trim();
  const currentCtaUrl =
    (activeCtaAttrs.href as string) || (activeCtaAttrs.url as string) || "";
  const currentCtaButtonColor =
    ctaStyle.backgroundColor || (activeCtaAttrs.buttonColor as string) || "#000000";
  const currentCtaTextColor =
    ctaStyle.color || (activeCtaAttrs.textColor as string) || "#ffffff";
  const currentCtaBorderRadius =
    ctaStyle.borderRadius || (activeCtaAttrs.borderRadius as string) || "8px";
  const currentCtaAlignment =
    (activeCtaAttrs.alignment as "left" | "center" | "right") || "center";
  const currentCtaPadding = ctaStyle.padding || "12px 24px";
  const currentCtaFontSize = ctaStyle.fontSize || "15px";
  const currentCtaFontWeight = ctaStyle.fontWeight || "600";
  const currentCtaHeight = ctaStyle.height || "";
  const currentCtaWidth = ctaStyle.width || "";
  const normalizeDimension = (val: unknown): string => {
    if (val === null || val === undefined || val === "") return "";
    const s = String(val).trim();
    if (/^\d+(\.\d+)?$/.test(s)) return `${s}px`;
    return s;
  };

  const currentCtaMarginTop =
    normalizeDimension(ctaStyle.marginTop) ||
    normalizeDimension(activeCtaAttrs.marginTop) ||
    normalizeDimension(ctaStyle.margin?.split(" ")[0]) ||
    "16px";
  const currentCtaMarginBottom =
    normalizeDimension(ctaStyle.marginBottom) ||
    normalizeDimension(activeCtaAttrs.marginBottom) ||
    normalizeDimension(ctaStyle.margin?.split(" ")[1] || ctaStyle.margin?.split(" ")[0]) ||
    "16px";

  const handleDeleteCta = () => {
    const info = getActiveButtonInfo();
    if (!info) return;
    const { pos, node } = info;
    const tr = editor.state.tr.delete(pos, pos + node.nodeSize);
    editor.view.dispatch(tr);
    editor.view.focus();
  };

  const updateCtaStyleAttribute = (styleKey: string, val: string | null) => {
    const info = getActiveButtonInfo();
    if (!info) return;
    const { pos, node } = info;

    const existingStyle = (node.attrs.style && typeof node.attrs.style === "object"
      ? node.attrs.style
      : {}) as Record<string, string>;
    const updatedStyle = { ...existingStyle };
    if (val === null || val === undefined || val === "") {
      delete updatedStyle[styleKey];
    } else {
      const normalizedVal =
        (styleKey === "marginTop" || styleKey === "marginBottom" || styleKey === "width" || styleKey === "height") &&
        /^\d+(\.\d+)?$/.test(val.trim())
          ? `${val.trim()}px`
          : val;
      updatedStyle[styleKey] = normalizedVal;
    }

    const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      style: updatedStyle,
    });
    editor.view.dispatch(tr);
  };

  const updateCtaAttributes = (attrs: Record<string, string>) => {
    const info = getActiveButtonInfo();
    if (!info) return;
    const { pos, node } = info;
    const targetType = node.type.name;

    const existingStyle = (node.attrs.style && typeof node.attrs.style === "object"
      ? node.attrs.style
      : {}) as Record<string, string>;

    const styleUpdates: Record<string, string> = {};
    if (attrs.buttonColor) styleUpdates.backgroundColor = attrs.buttonColor;
    if (attrs.textColor) styleUpdates.color = attrs.textColor;
    if (attrs.borderRadius) styleUpdates.borderRadius = attrs.borderRadius;

    const mergedAttrs: Record<string, unknown> = {
      ...node.attrs,
      ...attrs,
    };
    if (attrs.url) {
      mergedAttrs.href = attrs.url;
    }
    if (Object.keys(styleUpdates).length > 0) {
      mergedAttrs.style = {
        ...existingStyle,
        ...styleUpdates,
      };
    }

    const tr = editor.state.tr;
    if (attrs.label !== undefined && targetType === "buttonBlock") {
      const contentStart = pos + 1;
      const contentEnd = pos + node.nodeSize - 1;
      tr.replaceWith(
        contentStart,
        contentEnd,
        attrs.label ? editor.state.schema.text(attrs.label) : []
      );
    }
    tr.setNodeMarkup(pos, undefined, mergedAttrs);
    editor.view.dispatch(tr);
  };

  const toggleBoldAndWeight = () => {
    tipTapSync.toggleBoldUnified();
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
          onRemoveLink={handleRemoveLink}
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
          currentCtaPadding={currentCtaPadding}
          currentCtaFontSize={currentCtaFontSize}
          currentCtaFontWeight={currentCtaFontWeight}
          currentCtaHeight={currentCtaHeight}
          currentCtaWidth={currentCtaWidth}
          currentCtaMarginTop={currentCtaMarginTop}
          currentCtaMarginBottom={currentCtaMarginBottom}
          updateCtaAttributes={updateCtaAttributes}
          updateCtaStyleAttribute={updateCtaStyleAttribute}
          onDeleteCta={handleDeleteCta}
          isContainerActive={isContainerActive}
          currentContainerBgColor={currentContainerBgColor}
          currentContainerBorderStyle={currentContainerBorderStyle}
          currentContainerBorderWidth={currentContainerBorderWidth}
          currentContainerBorderColor={currentContainerBorderColor}
          currentContainerBorderRadius={currentContainerBorderRadius}
          currentContainerPadding={currentContainerPadding}
          currentContainerMarginTop={currentContainerMarginTop}
          currentContainerMarginBottom={currentContainerMarginBottom}
          updateContainerStyleAttribute={updateContainerStyleAttribute}
          onUnwrapContainer={handleUnwrapContainer}
          onDeleteContainer={handleDeleteContainer}
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
          documentJson={currentDocModel}
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
          setLinkUrl("");
          setLinkText("");
          setIsEditingLink(false);
          savedSelectionRef.current = null;
        }}
        linkUrl={linkUrl}
        setLinkUrl={setLinkUrl}
        linkText={linkText}
        setLinkText={setLinkText}
        handleApplyLink={handleApplyLink}
        isEditing={isEditingLink}
        onRemoveLink={handleRemoveLink}
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
