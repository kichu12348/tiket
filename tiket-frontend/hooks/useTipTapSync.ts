import { useState, useEffect, useCallback } from "react";
import { useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { TextStyle, Color, FontFamily } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extension-placeholder";
import { NodeSelection } from "@tiptap/pm/state";
import { EmailModelSerializer } from "@/lib/emailModelSerializer";
import {
  BlockStyleExtension,
  ContainerExtension,
  CustomLinkExtension,
  CustomImageExtension,
  CustomButtonExtension,
} from "@/app/edit/[eventId]/emails/components/EmailPaperCanvas/extensions";

interface UseTipTapSyncProps {
  initialContent: string;
}

export function useTipTapSync({ initialContent }: UseTipTapSyncProps) {
  const [, setSelectionTick] = useState(0);

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
      Placeholder.configure({
        placeholder: "Click or select text here to start editing your email template...",
      }),
      BlockStyleExtension,
    ],
    content: EmailModelSerializer.deserializeHtmlToJson(initialContent),
    immediatelyRender: false,
    onTransaction: () => {
      setSelectionTick((tick) => tick + 1);
    },
  });

  // Safely sync external content updates
  useEffect(() => {
    if (editor && initialContent) {
      const currentSerialized = EmailModelSerializer.serializeJsonToHtml(
        editor.getJSON(),
      );
      if (currentSerialized !== initialContent) {
        const deserialized =
          EmailModelSerializer.deserializeHtmlToJson(initialContent);
        editor.commands.setContent(deserialized);
      }
    }
  }, [initialContent, editor]);

  // Active element attributes
  const currentFontFamily =
    (editor?.getAttributes("textStyle").fontFamily as string) || "__default__";
  const currentFontWeight =
    (editor?.getAttributes("textStyle").fontWeight as string) || "400";
  const currentTextColor =
    (editor?.getAttributes("textStyle").color as string) || "#111827";
  const currentHighlightColor =
    (editor?.getAttributes("highlight").color as string) || "";

  // Bidirectional Bold <-> 700 Font Weight Sync
  const isBoldActive =
    Boolean(editor?.isActive("bold")) ||
    currentFontWeight === "700" ||
    currentFontWeight === "bold";

  const toggleBoldAndWeight = useCallback(() => {
    if (!editor) return;
    if (isBoldActive) {
      editor
        .chain()
        .focus()
        .unsetMark("bold")
        .setMark("textStyle", { fontWeight: "400" })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .setMark("bold")
        .setMark("textStyle", { fontWeight: "700" })
        .run();
    }
  }, [editor, isBoldActive]);

  const setFontWeight = useCallback(
    (val: string) => {
      if (!editor) return;
      const chain = editor.chain().focus().setMark("textStyle", { fontWeight: val });
      if (val === "700" || val === "800" || val === "900") {
        chain.setMark("bold");
      } else {
        chain.unsetMark("bold");
      }
      chain.run();
    },
    [editor],
  );

  // Active CTA Button Detection
  const isCtaSelected =
    Boolean(editor?.state.selection instanceof NodeSelection) &&
    (editor?.state.selection as NodeSelection).node.type.name === "ctaButton";
  const isCtaActive = Boolean(editor?.isActive("ctaButton")) || isCtaSelected;
  const activeCtaAttrs = editor?.getAttributes("ctaButton") || {};

  const currentCtaLabel = (activeCtaAttrs.label as string) || "";
  const currentCtaUrl = (activeCtaAttrs.url as string) || "";
  const currentCtaButtonColor = (activeCtaAttrs.buttonColor as string) || "#000000";
  const currentCtaTextColor = (activeCtaAttrs.textColor as string) || "#ffffff";
  const currentCtaBorderRadius = (activeCtaAttrs.borderRadius as string) || "8px";
  const currentCtaAlignment =
    (activeCtaAttrs.alignment as "left" | "center" | "right") || "center";

  const updateCtaAttributes = useCallback(
    (attrs: Record<string, string>) => {
      if (!editor) return;
      editor.chain().focus().updateAttributes("ctaButton", attrs).run();
    },
    [editor],
  );

  const insertCtaButton = useCallback(
    (label: string, url: string) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .insertContent({
          type: "ctaButton",
          attrs: {
            label: label.trim() || "Click Here",
            url: url.trim() || "#",
            buttonColor: "#000000",
            textColor: "#ffffff",
            borderRadius: "8px",
            alignment: "center",
          },
        })
        .run();
    },
    [editor],
  );

  // Active Image Detection
  const isImageSelected =
    Boolean(editor?.state.selection instanceof NodeSelection) &&
    (editor?.state.selection as NodeSelection).node.type.name === "image";
  const isImageActive = Boolean(editor?.isActive("image")) || isImageSelected;
  const activeImageAttrs = editor?.getAttributes("image") || {};
  const activeLinkAttrs = editor?.getAttributes("link") || {};

  const currentImageSrc = (activeImageAttrs.src as string) || "";
  const currentImageAlt = (activeImageAttrs.alt as string) || "";
  const currentImageWidth = (activeImageAttrs.width as string) || "";
  const currentImageHref =
    (activeImageAttrs.href as string) || (activeLinkAttrs.href as string) || "";
  const currentImageAlignment =
    (activeImageAttrs.alignment as "left" | "center" | "right") || "center";

  const insertVariable = useCallback(
    (varKey: string) => {
      if (!editor) return;
      editor.chain().focus().insertContent(` ${varKey} `).run();
    },
    [editor],
  );

  return {
    editor,
    isBoldActive,
    toggleBoldAndWeight,
    setFontWeight,
    currentFontFamily,
    currentFontWeight,
    currentTextColor,
    currentHighlightColor,
    isCtaActive,
    currentCtaLabel,
    currentCtaUrl,
    currentCtaButtonColor,
    currentCtaTextColor,
    currentCtaBorderRadius,
    currentCtaAlignment,
    updateCtaAttributes,
    insertCtaButton,
    isImageActive,
    currentImageSrc,
    currentImageAlt,
    currentImageWidth,
    currentImageHref,
    currentImageAlignment,
    insertVariable,
  };
}

export type TipTapSyncResult = ReturnType<typeof useTipTapSync>;
