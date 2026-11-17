import { useState, useEffect } from "react";
import { useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { TextStyle, Color, FontFamily } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { Placeholder } from "@tiptap/extension-placeholder";

import type { EmailTemplate, EmailDocumentNode } from "@/types/email";
import { EmailModelSerializer } from "@/lib/emailModelSerializer";
import {
  createDefaultEmailDocument,
  normalizeEmailDocumentDoc,
} from "@/utils/emailJsonCompiler";
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
  CustomHighlightExtension,
  ImageBlockExtension,
  ButtonBlockExtension,
  CustomTextStyleExtension,
  VariableNodeExtension,
} from "../extensions";

export function useEmailEditor(template: EmailTemplate): {
  editor: Editor | null;
  selectionTick: number;
} {
  const [selectionTick, setSelectionTick] = useState(0);

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
      CustomHighlightExtension.configure({ multicolor: true }),
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
        placeholder:
          "Click or select text here to start editing your email template...",
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

  return { editor, selectionTick };
}
