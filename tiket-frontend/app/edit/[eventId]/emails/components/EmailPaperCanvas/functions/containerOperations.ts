import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";

export interface ActiveContainerInfo {
  pos: number;
  node: ProseMirrorNode;
}

export function getActiveContainerInfo(
  editor: Editor | null,
): ActiveContainerInfo | null {
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
}

export function unwrapContainer(editor: Editor | null): void {
  if (!editor) return;
  const info = getActiveContainerInfo(editor);
  if (!info) return;
  const { pos, node } = info;
  const tr = editor.state.tr;
  tr.replaceWith(pos, pos + node.nodeSize, node.content);
  editor.view.dispatch(tr);
  editor.view.focus();
}

export function deleteContainer(editor: Editor | null): void {
  if (!editor) return;
  const info = getActiveContainerInfo(editor);
  if (!info) return;
  const { pos, node } = info;
  const tr = editor.state.tr.delete(pos, pos + node.nodeSize);
  editor.view.dispatch(tr);
  editor.view.focus();
}

export function updateContainerStyleAttribute(
  editor: Editor | null,
  styleKey: string,
  val: string | null,
): void {
  if (!editor) return;
  const info = getActiveContainerInfo(editor);
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
}
