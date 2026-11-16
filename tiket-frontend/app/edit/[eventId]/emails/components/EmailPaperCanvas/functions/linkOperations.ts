import type { Editor } from "@tiptap/core";

export function removeLink(
  editor: Editor | null,
  savedSelection: { from: number; to: number } | null,
): void {
  if (!editor) return;
  const chain = editor.chain().focus();
  if (savedSelection) {
    chain.setTextSelection(savedSelection);
  }
  chain.extendMarkRange("link").unsetLink().run();

  // Clear any stored link marks so the cursor doesn't inherit the mark
  const { state, view } = editor;
  const tr = state.tr.setStoredMarks([]);
  view.dispatch(tr);
}

export function deleteLink(
  editor: Editor | null,
  savedSelection: { from: number; to: number } | null,
): void {
  if (!editor) return;
  const chain = editor.chain().focus();
  if (savedSelection) {
    chain.setTextSelection(savedSelection);
  }
  chain.extendMarkRange("link").deleteSelection().run();
}

export function applyLink(
  editor: Editor | null,
  savedSelection: { from: number; to: number } | null,
  linkUrl: string,
  linkText: string,
): void {
  if (!editor) return;
  const trimmedUrl = linkUrl.trim();

  if (!trimmedUrl) {
    removeLink(editor, savedSelection);
    return;
  }

  const chain = editor.chain().focus();
  const sel = savedSelection || {
    from: editor.state.selection.from,
    to: editor.state.selection.to,
  };

  chain.setTextSelection(sel);

  const isCollapsed = sel.from === sel.to;
  const currentSelectedText = isCollapsed
    ? ""
    : editor.state.doc.textBetween(sel.from, sel.to, " ");
  const trimmedText = linkText.trim();

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

  chain.run();

  // Clear stored marks after insertion so the cursor doesn't inherit the link mark
  const { state, view } = editor;
  if (state.storedMarks && state.storedMarks.length > 0) {
    view.dispatch(state.tr.setStoredMarks([]));
  }
}
