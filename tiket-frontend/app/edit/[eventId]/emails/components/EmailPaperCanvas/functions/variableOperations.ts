import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

export function insertVariable(editor: Editor | null, varKey: string): void {
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
}
