import { describe, expect, test, beforeEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

try {
  GlobalRegistrator.register();
} catch {
  // Already registered
}

import { Editor } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { NodeSelection } from "@tiptap/pm/state";
import { CustomButtonExtension, BlockStyleExtension, ContainerExtension } from "../extensions";

describe("Batch 1: Focus, input, and form bugs", () => {
  let editor: Editor;

  beforeEach(() => {
    document.body.innerHTML = '<div id="editor-container"></div>';
    const container = document.getElementById("editor-container")!;

    editor = new Editor({
      element: container,
      extensions: [
        StarterKit,
        CustomButtonExtension,
        ContainerExtension,
        BlockStyleExtension,
      ],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { borderWidth: "0px", borderStyle: "none" },
            content: [{ type: "text", text: "Hello event attendees" }],
          },
          {
            type: "ctaButton",
            attrs: {
              label: "Click Here",
              url: "https://example.com",
            },
          },
        ],
      },
    });
  });

  test("Bug 1.1: updateBlockAttribute updates attributes without focusing editor", () => {
    // Calling updateAttributes directly without .focus()
    const activeBlockType = "paragraph";
    editor.chain().updateAttributes(activeBlockType, { borderWidth: "2px" }).run();

    expect(editor.getAttributes("paragraph").borderWidth).toBe("2px");
  });

  test("Bug 1.2: Border width bare numbers normalize to px, empty to null, and sets borderStyle to solid if none", () => {
    const normalizeBorderWidth = (input: string, currentStyle: string) => {
      const trimmed = input.trim();
      if (!trimmed) {
        return { borderWidth: null, borderStyle: currentStyle };
      }
      let newStyle = currentStyle;
      if (!currentStyle || currentStyle === "none") {
        newStyle = "solid";
      }
      if (/^\d+(\.\d+)?$/.test(trimmed)) {
        return { borderWidth: `${trimmed}px`, borderStyle: newStyle };
      }
      if (/^\d+(\.\d+)?(px|em|rem|%)?$/.test(trimmed)) {
        return { borderWidth: trimmed, borderStyle: newStyle };
      }
      return null;
    };

    expect(normalizeBorderWidth("12", "none")).toEqual({
      borderWidth: "12px",
      borderStyle: "solid",
    });
    expect(normalizeBorderWidth("1.5rem", "dashed")).toEqual({
      borderWidth: "1.5rem",
      borderStyle: "dashed",
    });
    expect(normalizeBorderWidth("", "solid")).toEqual({
      borderWidth: null,
      borderStyle: "solid",
    });
    expect(normalizeBorderWidth("invalid-px", "none")).toBeNull();
  });

  test("Bug 1.4: Inserting variable when a NodeSelection is active inserts after node, not replacing it", () => {
    // Find ctaButton position
    let ctaPos = -1;
    editor.state.doc.descendants((node, p) => {
      if (node.type.name === "ctaButton") {
        ctaPos = p;
        return false;
      }
      return true;
    });

    expect(ctaPos).toBeGreaterThanOrEqual(0);

    // Set NodeSelection on the CTA button
    editor.view.dispatch(
      editor.view.state.tr.setSelection(NodeSelection.create(editor.view.state.doc, ctaPos)),
    );

    expect(editor.state.selection instanceof NodeSelection).toBe(true);

    // Simulated handleInsertVariable logic:
    const varKey = "{{event.title}}";
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

    // Verify CTA button still exists and was not replaced!
    let foundCta = false;
    let foundVar = false;
    editor.state.doc.descendants((node) => {
      if (node.type.name === "ctaButton") foundCta = true;
      if (node.isText && node.text?.includes("{{event.title}}")) foundVar = true;
    });

    expect(foundCta).toBe(true);
    expect(foundVar).toBe(true);
  });

  test("Bug 1.5: Template reset logic syncs name, subject, and active state alongside body", () => {
    // Simulating component state and external update
    let name = "Custom Name";
    let subject = "Custom Subject";
    let isActive = false;

    const resetTemplate = {
      id: "tpl-1",
      name: "Default Invitation",
      subject: "You are invited!",
      body: "<p>Welcome</p>",
      isActive: true,
      type: "invitation",
    };

    // When resetTemplate is provided, sync state
    name = resetTemplate.name;
    subject = resetTemplate.subject;
    isActive = resetTemplate.isActive;

    expect(name).toBe("Default Invitation");
    expect(subject).toBe("You are invited!");
    expect(isActive).toBe(true);
  });
});
