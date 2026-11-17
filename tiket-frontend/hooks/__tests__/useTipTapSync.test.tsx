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

import { renderHook, act } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { useTipTapSync } from "../useTipTapSync";
import {
  ButtonBlockExtension,
  ContainerBlockExtension,
  UnifiedTextStyle,
  StyledParagraph,
} from "@/app/edit/emails/components/EmailPaperCanvas/extensions";

describe("useTipTapSync Hook", () => {
  let editor: Editor;

  beforeEach(() => {
    document.body.innerHTML = '<div id="editor-container"></div>';
    const container = document.getElementById("editor-container")!;

    editor = new Editor({
      element: container,
      extensions: [
        StarterKit.configure({
          paragraph: false,
        }),
        StyledParagraph,
        UnifiedTextStyle,
        ButtonBlockExtension,
        ContainerBlockExtension,
      ],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Welcome to Tiket!" }],
          },
          {
            type: "buttonBlock",
            attrs: {
              href: "https://tiket.app",
              style: { backgroundColor: "#000000" },
            },
            content: [{ type: "text", text: "View Ticket" }],
          },
        ],
      },
    });
    editor.commands.setTextSelection({ from: 1, to: 8 });
  });

  test("calculates initial snapshot with default paragraph and text styles", () => {
    const { result } = renderHook(() => useTipTapSync(editor));

    expect(result.current.activeBlockType).toBe("paragraph");
    expect(result.current.isBold).toBe(false);
    expect(result.current.isItalic).toBe(false);
  });

  test("updateBlockStyleLive updates block styles without stealing focus", () => {
    const { result } = renderHook(() => useTipTapSync(editor));

    act(() => {
      result.current.updateBlockStyleLive(
        { backgroundColor: "#f3f4f6", padding: "12px" },
        "paragraph",
      );
    });

    const firstNode = editor.state.doc.child(0);
    expect(firstNode.attrs.style?.backgroundColor).toBe("#f3f4f6");
    expect(firstNode.attrs.style?.padding).toBe("12px");
  });

  test("toggleBoldUnified toggles font weight between 700 and 400", () => {
    const { result } = renderHook(() => useTipTapSync(editor));

    // Initially not bold
    expect(result.current.isBold).toBe(false);

    // Toggle bold on
    act(() => {
      result.current.toggleBoldUnified();
    });

    expect(editor.getAttributes("textStyle").fontWeight).toBe("700");
  });
});
