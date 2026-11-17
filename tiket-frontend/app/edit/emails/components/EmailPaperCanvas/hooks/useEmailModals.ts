import { useState, useRef } from "react";
import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

export function useEmailModals(editor: Editor | null) {
  const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);

  // CTA Modal State
  const [isCtaModalOpen, setIsCtaModalOpen] = useState(false);
  const [ctaLabel, setCtaLabel] = useState("View Your Digital Pass");
  const [ctaUrl, setCtaUrl] = useState("{{event.passUrl}}");

  // Link Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  // Image Modal State
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageLinkUrl, setImageLinkUrl] = useState("");
  const [imageWidth, setImageWidth] = useState("");

  const handleOpenCtaModal = () => {
    if (editor) {
      savedSelectionRef.current = {
        from: editor.state.selection.from,
        to: editor.state.selection.to,
      };
    }
    setIsCtaModalOpen(true);
  };

  const handleCloseCtaModal = () => {
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

  const handleCloseLinkModal = () => {
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

  const handleCloseImageModal = () => {
    setIsImageModalOpen(false);
    setImageUrl("");
    setImageAlt("");
    setImageLinkUrl("");
    setImageWidth("");
    savedSelectionRef.current = null;
  };

  return {
    savedSelectionRef,

    // CTA
    isCtaModalOpen,
    ctaLabel,
    setCtaLabel,
    ctaUrl,
    setCtaUrl,
    handleOpenCtaModal,
    handleCloseCtaModal,

    // Link
    isLinkModalOpen,
    isEditingLink,
    linkUrl,
    setLinkUrl,
    linkText,
    setLinkText,
    handleOpenLinkModal,
    handleCloseLinkModal,

    // Image
    isImageModalOpen,
    imageUrl,
    setImageUrl,
    imageAlt,
    setImageAlt,
    imageLinkUrl,
    setImageLinkUrl,
    imageWidth,
    setImageWidth,
    handleOpenImageModal,
    handleCloseImageModal,
  };
}
