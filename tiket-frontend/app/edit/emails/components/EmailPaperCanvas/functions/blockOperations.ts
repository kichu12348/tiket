import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";

export interface ActiveBlockInfo {
  pos: number;
  node: ProseMirrorNode;
  type: string;
}

export interface InnermostBlockInfo {
  blockType: string;
  elementType: string;
}

export function getActiveBlockInfo(editor: Editor | null): ActiveBlockInfo | null {
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
}

export function getInnermostBlock(editor: Editor | null): InnermostBlockInfo {
  if (!editor) return { blockType: "paragraph", elementType: "p" };

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
    if (
      name === "bulletList" ||
      (name === "listItem" && $from.node(d - 1)?.type.name === "bulletList")
    ) {
      return { blockType: "listItem", elementType: "bullet" };
    }
    if (
      name === "orderedList" ||
      (name === "listItem" && $from.node(d - 1)?.type.name === "orderedList")
    ) {
      return { blockType: "listItem", elementType: "ordered" };
    }
    if (name === "listItem") return { blockType: "listItem", elementType: "bullet" };
    if (name === "containerBlock") return { blockType: "containerBlock", elementType: "container" };
    if (name === "container") return { blockType: "container", elementType: "container" };
  }
  return { blockType: "paragraph", elementType: "p" };
}

export function updateBlockAttribute(
  editor: Editor | null,
  activeBlockType: string,
  attrName: string,
  attrVal: string | null,
): void {
  if (!editor) return;

  // When selection is CTA or image, don't apply block attributes (Bug 2.3)
  if (editor.state.selection instanceof NodeSelection) {
    const name = editor.state.selection.node.type.name;
    if (
      name === "ctaButton" ||
      name === "image" ||
      name === "buttonBlock" ||
      name === "imageBlock"
    ) {
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

  const info = getActiveBlockInfo(editor);
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
}
