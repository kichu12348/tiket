import type { Editor } from "@tiptap/core";

export function setEditorFontWeight(editor: Editor | null, val: string): void {
  if (!editor) return;
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
}
