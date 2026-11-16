import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";

export interface ActiveButtonInfo {
  pos: number;
  node: ProseMirrorNode;
}

export function normalizeDimension(val: unknown): string {
  if (val === null || val === undefined || val === "") return "";
  const s = String(val).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return `${s}px`;
  return s;
}

export function getActiveButtonInfo(
  editor: Editor | null,
): ActiveButtonInfo | null {
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
}

export function deleteCta(editor: Editor | null): void {
  if (!editor) return;
  const info = getActiveButtonInfo(editor);
  if (!info) return;
  const { pos, node } = info;
  const tr = editor.state.tr.delete(pos, pos + node.nodeSize);
  editor.view.dispatch(tr);
  editor.view.focus();
}

export function updateCtaStyleAttribute(
  editor: Editor | null,
  styleKey: string,
  val: string | null,
): void {
  if (!editor) return;
  const info = getActiveButtonInfo(editor);
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
      (styleKey === "marginTop" ||
        styleKey === "marginBottom" ||
        styleKey === "width" ||
        styleKey === "height") &&
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
}

export function updateCtaAttributes(
  editor: Editor | null,
  attrs: Record<string, string>,
): void {
  if (!editor) return;
  const info = getActiveButtonInfo(editor);
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
      attrs.label ? editor.state.schema.text(attrs.label) : [],
    );
  }
  tr.setNodeMarkup(pos, undefined, mergedAttrs);
  editor.view.dispatch(tr);
}

export function insertCtaButton(
  editor: Editor | null,
  savedSelection: { from: number; to: number } | null,
  label: string,
  url: string,
): void {
  if (!editor) return;
  const trimmedLabel = label.trim();
  const trimmedUrl = url.trim();
  if (!trimmedLabel || !trimmedUrl) return;

  const chain = editor.chain().focus();
  if (savedSelection) {
    chain.setTextSelection(savedSelection);
  }

  chain
    .insertContent({
      type: "buttonBlock",
      attrs: {
        href: trimmedUrl,
        alignment: "center",
        label: trimmedLabel,
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
          text: trimmedLabel,
        },
      ],
    })
    .run();
}
