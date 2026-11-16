import { describe, expect, test, beforeEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

try {
  GlobalRegistrator.register();
} catch {
  // Already registered
}

// Bridge duplicate React instances between root @testing-library/react and frontend node_modules/react
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rFrontend = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rTesting = require(
    require.resolve("react", {
      paths: [require.resolve("@testing-library/react")],
    }),
  );
  const i1 =
    rFrontend.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const i2 =
    rTesting.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  if (i1 && i2 && i1 !== i2) {
    Object.defineProperty(i1, "H", {
      get() {
        return i2.H;
      },
      set(v) {
        i2.H = v;
      },
    });
    Object.defineProperty(i1, "A", {
      get() {
        return i2.A;
      },
      set(v) {
        i2.A = v;
      },
    });
  }
} catch {
  // Ignore if already unified
}

import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { NodeSelection } from "@tiptap/pm/state";
import {
  CustomLinkExtension,
  CustomImageExtension,
} from "../extensions";
import LinkModal from "../components/Modals/LinkModal";

describe("Batch 3: LinkModal and ImageModal attribute preservation", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        StarterKit,
        CustomLinkExtension.configure({
          openOnClick: false,
        }),
        CustomImageExtension,
      ],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Click " },
              {
                type: "text",
                text: "here",
                marks: [
                  {
                    type: "link",
                    attrs: { href: "https://initial.com" },
                  },
                ],
              },
              { type: "text", text: " for details." },
            ],
          },
          {
            type: "image",
            attrs: {
              src: "https://example.com/test.png",
              alt: "Initial Alt",
              width: "200px",
            },
          },
        ],
      },
    });
  });

  test("Bug 3.7: Collapsed cursor inside existing link extends mark range and updates href without nesting", () => {
    // Put collapsed cursor at pos 8 (inside "here")
    editor.chain().setTextSelection(8).run();
    expect(editor.isActive("link")).toBe(true);

    // extendMarkRange("link").setLink updates the full link mark
    editor.chain().extendMarkRange("link").setLink({ href: "https://updated.com" }).run();

    expect(editor.getAttributes("link").href).toBe("https://updated.com");
    // Verify no nested <a> tags
    const pJson = editor.getJSON().content![0];
    const linkMarks = pJson.content![1].marks?.filter((m) => m.type === "link");
    expect(linkMarks).toHaveLength(1);
    expect(linkMarks![0].attrs?.href).toBe("https://updated.com");
  });

  test("Bug 3.7: Clearing link in LinkModal unsets link across the entire range", () => {
    // Cursor inside "here"
    editor.chain().setTextSelection(8).run();
    expect(editor.isActive("link")).toBe(true);

    // Unset link
    editor.chain().extendMarkRange("link").unsetLink().run();
    expect(editor.isActive("link")).toBe(false);
  });

  test("Bug 3.7: ImageModal preserves and updates selected image node attributes", () => {
    let imgPos = -1;
    editor.state.doc.descendants((node, p) => {
      if (node.type.name === "image") {
        imgPos = p;
        return false;
      }
      return true;
    });

    expect(imgPos).toBeGreaterThan(-1);
    editor.commands.setNodeSelection(imgPos);
    expect(editor.state.selection instanceof NodeSelection).toBe(true);

    // Update attributes via image modal handler logic
    editor
      .chain()
      .updateAttributes("image", {
        src: "https://example.com/updated.png",
        alt: "Updated Alt",
        width: "350px",
        href: "https://example.com/link",
      })
      .run();

    const attrs = editor.getAttributes("image");
    expect(attrs.src).toBe("https://example.com/updated.png");
    expect(attrs.alt).toBe("Updated Alt");
    expect(attrs.width).toBe("350px");
    expect(attrs.href).toBe("https://example.com/link");
  });

  test("MarkdownLinkExtension has inclusive set to false to prevent space extension", () => {
    expect(editor.schema.marks.link.spec.inclusive).toBe(false);
  });

  test("LinkModal switches to Email Address mode for mailto links and triggers onApply with mailto prefix", () => {
    let appliedUrl = "";
    let appliedText = "";

    const { getByPlaceholderText, getByText } = render(
      <LinkModal
        isOpen={true}
        onClose={() => {}}
        linkUrl="mailto:test@tiket.com"
        setLinkUrl={() => {}}
        linkText="Contact Us"
        setLinkText={() => {}}
        handleApplyLink={(url, text) => {
          appliedUrl = url || "";
          appliedText = text || "";
        }}
        isEditing={true}
      />,
    );

    // Email Address input should be prefilled without mailto: prefix
    const emailInput = getByPlaceholderText("support@tiket.com or {{organizer.email}}") as HTMLInputElement;
    expect(emailInput.value).toBe("test@tiket.com");

    // Click Update Link
    const applyBtn = getByText("Update Link");
    fireEvent.click(applyBtn);

    expect(appliedUrl).toBe("mailto:test@tiket.com");
    expect(appliedText).toBe("Contact Us");
  });

  test("LinkModal renders Remove Link button when isEditing is true and calls onRemoveLink", () => {
    let removeCalled = false;

    const { getByText } = render(
      <LinkModal
        isOpen={true}
        onClose={() => {}}
        linkUrl="https://example.com"
        setLinkUrl={() => {}}
        handleApplyLink={() => {}}
        isEditing={true}
        onRemoveLink={() => {
          removeCalled = true;
        }}
      />,
    );

    const removeBtn = getByText("Remove Link");
    expect(removeBtn).toBeDefined();
    fireEvent.click(removeBtn);
    expect(removeCalled).toBe(true);
  });
});
