import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

export function getSelectedImagePos(editor: Editor | null): number | null {
  if (!editor) return null;
  const { selection } = editor.state;
  if (
    selection instanceof NodeSelection &&
    (selection.node.type.name === "image" ||
      selection.node.type.name === "imageBlock")
  ) {
    return selection.from;
  }
  return null;
}

export function getTargetImageType(editor: Editor | null): string {
  if (!editor) return "image";
  if (
    editor.state.selection instanceof NodeSelection &&
    editor.state.selection.node.type.name === "imageBlock"
  ) {
    return "imageBlock";
  }
  if (editor.isActive("imageBlock")) return "imageBlock";
  return "image";
}

export function updateImageSrc(editor: Editor | null, newSrc: string): void {
  if (!editor) return;
  const targetType = getTargetImageType(editor);
  const pos = getSelectedImagePos(editor);
  if (pos !== null) {
    editor
      .chain()
      .updateAttributes(targetType, { src: newSrc })
      .setNodeSelection(pos)
      .run();
  } else {
    editor.chain().updateAttributes(targetType, { src: newSrc }).run();
  }
}

export function updateImageAlt(editor: Editor | null, newAlt: string): void {
  if (!editor) return;
  const targetType = getTargetImageType(editor);
  const pos = getSelectedImagePos(editor);
  if (pos !== null) {
    editor
      .chain()
      .updateAttributes(targetType, { alt: newAlt })
      .setNodeSelection(pos)
      .run();
  } else {
    editor.chain().updateAttributes(targetType, { alt: newAlt }).run();
  }
}

export function updateImageWidth(editor: Editor | null, newWidth: string): void {
  if (!editor) return;
  const targetType = getTargetImageType(editor);
  const pos = getSelectedImagePos(editor);
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
}

export function updateImageHref(editor: Editor | null, newHref: string): void {
  if (!editor) return;
  const targetType = getTargetImageType(editor);
  const pos = getSelectedImagePos(editor);
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
}

export function updateImageAlignment(
  editor: Editor | null,
  alignment: "left" | "center" | "right",
): void {
  if (!editor) return;
  const targetType = getTargetImageType(editor);
  const pos = getSelectedImagePos(editor);
  if (pos !== null) {
    editor
      .chain()
      .updateAttributes(targetType, { alignment })
      .setNodeSelection(pos)
      .run();
  } else {
    editor.chain().updateAttributes(targetType, { alignment }).run();
  }
}

export interface InsertImageParams {
  src: string;
  alt?: string;
  width?: string;
  href?: string;
}

export function insertOrUpdateImage(
  editor: Editor | null,
  savedSelection: { from: number; to: number } | null,
  { src, alt, width, href }: InsertImageParams,
): void {
  if (!editor) return;
  const trimmedSrc = src.trim();
  if (!trimmedSrc) return;

  const trimmedAlt = alt?.trim() || "";
  const trimmedWidth = width?.trim() || "";
  const trimmedHref = href?.trim() || "";

  const chain = editor.chain().focus();
  if (savedSelection) {
    chain.setTextSelection(savedSelection);
  }

  if (
    editor.state.selection instanceof NodeSelection &&
    editor.state.selection.node.type.name === "image"
  ) {
    chain.updateAttributes("image", {
      src: trimmedSrc,
      alt: trimmedAlt || null,
      width: trimmedWidth || null,
      href: trimmedHref || null,
    });
  } else {
    chain.setImage({
      src: trimmedSrc,
      alt: trimmedAlt || undefined,
    });

    const attrsToUpdate: Record<string, string> = {};
    if (trimmedWidth) attrsToUpdate.width = trimmedWidth;
    if (trimmedHref) attrsToUpdate.href = trimmedHref;
    if (Object.keys(attrsToUpdate).length > 0) {
      chain.updateAttributes("image", attrsToUpdate);
    }
  }
  chain.run();
}
