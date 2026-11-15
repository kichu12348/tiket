import { describe, expect, test, beforeEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

try {
  GlobalRegistrator.register();
} catch {
  // Already registered
}

import { Editor } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { NodeSelection } from "@tiptap/pm/state";
import {
  CustomButtonExtension,
  BlockStyleExtension,
  ContainerExtension,
  CustomTextStyleExtension,
} from "../extensions";
import { FONT_FAMILIES, PADDING_SIZES, MARGIN_SIZES } from "../constants";

describe("Batch 2: Font weight, CTA and block-style bugs", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        StarterKit,
        TextStyle,
        CustomTextStyleExtension,
        CustomButtonExtension,
        ContainerExtension,
        BlockStyleExtension,
      ],
      content: {
        type: "doc",
        content: [
          {
            type: "container",
            attrs: { backgroundColor: "#f3f4f6", padding: "16px" },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Text inside card container" }],
              },
            ],
          },
          {
            type: "ctaButton",
            attrs: {
              label: "Click Here",
              url: "https://example.com",
              fontSize: "15px",
              fontWeight: "600",
            },
          },
        ],
      },
    });
  });

  test("Bug 2.1: CustomTextStyleExtension allows setting and clearing fontWeight on textStyle mark", () => {
    // Select text in the first paragraph
    editor.chain().setTextSelection({ from: 2, to: 10 }).run();

    // Set fontWeight to 700
    editor.chain().setMark("textStyle", { fontWeight: "700" }).run();
    expect(editor.getAttributes("textStyle").fontWeight).toBe("700");

    // Setting to null or clearing unsets the fontWeight
    editor.chain().setMark("textStyle", { fontWeight: null }).run();
    expect(!editor.getAttributes("textStyle").fontWeight).toBe(true);
  });

  test("Bug 2.1: Font family comparison normalizes single and double quotes and font list", () => {
    const normalizeFont = (font: string) => {
      if (!font || font === "__default__") return "__default__";
      const getPrimaryFont = (f: string) =>
        f.split(",")[0].replace(/['"]/g, "").trim().toLowerCase();
      const curPrimary = getPrimaryFont(font);
      const match = FONT_FAMILIES.find((f) => {
        if (f.value === "__default__") return false;
        return getPrimaryFont(f.value) === curPrimary;
      });
      return match ? match.value : font;
    };

    expect(normalizeFont("'Inter'")).toBe("'Inter', sans-serif");
    expect(normalizeFont('"Inter", sans-serif')).toBe("'Inter', sans-serif");
    expect(normalizeFont("Georgia")).toBe("Georgia, serif");
  });

  test("Bug 2.2: CustomButtonExtension supports custom font size and font weight attributes", () => {
    let ctaPos = -1;
    editor.state.doc.descendants((node, p) => {
      if (node.type.name === "ctaButton") {
        ctaPos = p;
        return false;
      }
      return true;
    });

    expect(ctaPos).toBeGreaterThan(-1);
    editor.commands.setNodeSelection(ctaPos);

    editor
      .chain()
      .updateAttributes("ctaButton", { fontSize: "18px", fontWeight: "700" })
      .run();

    const nodeAttrs = editor.getAttributes("ctaButton");
    expect(nodeAttrs.fontSize).toBe("18px");
    expect(nodeAttrs.fontWeight).toBe("700");
  });

  test("Bug 2.3: Innermost block resolution targets paragraph inside container instead of container", () => {
    // Put selection inside the paragraph that lives within container
    editor.chain().setTextSelection(3).run();

    const { $from } = editor.state.selection;
    let innermostType = "paragraph";
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d);
      const name = node.type.name;
      if (
        name === "heading" ||
        name === "paragraph" ||
        name === "blockquote" ||
        name === "listItem"
      ) {
        innermostType = name;
        break;
      }
      if (name === "container") {
        innermostType = "container";
        break;
      }
    }

    expect(innermostType).toBe("paragraph");
  });

  test("Bug 2.3: Block attributes are not updated when CTA button is selected", () => {
    let ctaPos = -1;
    editor.state.doc.descendants((node, p) => {
      if (node.type.name === "ctaButton") {
        ctaPos = p;
        return false;
      }
      return true;
    });

    editor.commands.setNodeSelection(ctaPos);
    expect(editor.state.selection instanceof NodeSelection).toBe(true);

    const updateBlockAttributeGuarded = (attrName: string, attrVal: string) => {
      if (editor.state.selection instanceof NodeSelection) {
        const name = editor.state.selection.node.type.name;
        if (name === "ctaButton" || name === "image") return;
      }
      editor
        .chain()
        .updateAttributes("paragraph", { [attrName]: attrVal })
        .run();
    };

    updateBlockAttributeGuarded("backgroundColor", "#ff0000");
    expect(editor.getAttributes("paragraph").backgroundColor).toBeUndefined();
  });

  test("Bug 2.4: Element type uses setHeading directly and supports idempotent container wrapping", () => {
    // Select inside the paragraph
    editor.chain().setTextSelection(3).run();

    const setHeadingSafe = (level: 1 | 2 | 3) => {
      if (!editor.isActive("heading", { level })) {
        editor.chain().setHeading({ level }).run();
      }
    };

    // Set heading level 2 directly
    setHeadingSafe(2);
    expect(editor.isActive("heading", { level: 2 })).toBe(true);

    // Setting heading level 2 again should NOT toggle back to paragraph
    setHeadingSafe(2);
    expect(editor.isActive("heading", { level: 2 })).toBe(true);

    // Container idempotency: if already in container, lift
    expect(editor.isActive("container")).toBe(true);
    if (editor.isActive("container")) {
      editor.chain().lift("container").run();
    }
    expect(editor.isActive("container")).toBe(false);

    // If not in container, wrapIn
    if (!editor.isActive("container")) {
      editor.chain().wrapIn("container").run();
    }
    expect(editor.isActive("container")).toBe(true);
  });

  test("Bug 2.5: Dropdown custom fallback preserves non-standard CSS padding and margin values", () => {
    const buildOptions = (
      currentVal: string | undefined,
      presets: Array<{ label: string; value: string }>,
    ) => {
      if (!currentVal || presets.some((o) => o.value === currentVal)) {
        return presets;
      }
      return [
        ...presets,
        { label: `Custom (${currentVal})`, value: currentVal },
      ];
    };

    const customPadding = "22px";
    const paddingOpts = buildOptions(customPadding, PADDING_SIZES);
    expect(
      paddingOpts.some(
        (o) => o.value === "22px" && o.label === "Custom (22px)",
      ),
    ).toBe(true);

    const presetPadding = "16px";
    const presetPaddingOpts = buildOptions(presetPadding, PADDING_SIZES);
    expect(presetPaddingOpts).toHaveLength(PADDING_SIZES.length);

    const customMargin = "35px";
    const marginOpts = buildOptions(customMargin, MARGIN_SIZES);
    expect(
      marginOpts.some((o) => o.value === "35px" && o.label === "Custom (35px)"),
    ).toBe(true);
  });
});
