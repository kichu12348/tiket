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

import { Editor } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { NodeSelection } from "@tiptap/pm/state";
import { CustomButtonExtension } from "../extensions";

describe("CustomButtonExtension & CTA Button Interaction", () => {
  let editor: Editor;

  beforeEach(() => {
    document.body.innerHTML = '<div id="editor-container"></div>';
    const container = document.getElementById("editor-container")!;

    editor = new Editor({
      element: container,
      extensions: [
        StarterKit,
        CustomButtonExtension,
      ],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Welcome to the event!" }],
          },
          {
            type: "ctaButton",
            attrs: {
              label: "Get Your Ticket Pass",
              url: "https://example.com/tickets/123",
              buttonColor: "#000000",
              textColor: "#ffffff",
              borderRadius: "8px",
              alignment: "center",
            },
          },
        ],
      },
    });
  });

  test("1. Renders CTA button node with data-type attribute and proper text", () => {
    const ctaDiv = document.querySelector('[data-type="cta-button"]');
    expect(ctaDiv).not.toBeNull();

    const anchor = ctaDiv?.querySelector("a");
    expect(anchor).not.toBeNull();
    expect(anchor?.textContent).toBe("Get Your Ticket Pass");
    expect(anchor?.getAttribute("href")).toBe("https://example.com/tickets/123");
  });

  test("2. Clicking on CTA button anchor prevents browser navigation and selects the node", () => {
    const ctaDiv = document.querySelector('[data-type="cta-button"]');
    const anchor = ctaDiv?.querySelector("a") as HTMLAnchorElement;
    expect(anchor).not.toBeNull();

    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
    });

    anchor.dispatchEvent(clickEvent);

    // Navigation must be cancelled
    expect(clickEvent.defaultPrevented).toBe(true);

    // CTA Button node must be selected in editor state
    const selection = editor.state.selection;
    expect(selection instanceof NodeSelection).toBe(true);
    if (selection instanceof NodeSelection) {
      expect(selection.node.type.name).toBe("ctaButton");
      expect(selection.node.attrs.label).toBe("Get Your Ticket Pass");
    }
  });

  test("3. Clicking on CTA button outer wrapper also prevents navigation and selects the node", () => {
    const ctaDiv = document.querySelector('[data-type="cta-button"]') as HTMLDivElement;
    expect(ctaDiv).not.toBeNull();

    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
    });

    ctaDiv.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);

    const selection = editor.state.selection;
    expect(selection instanceof NodeSelection).toBe(true);
    if (selection instanceof NodeSelection) {
      expect(selection.node.type.name).toBe("ctaButton");
    }
  });

  test("4. Updating CTA button attributes updates DOM without losing NodeSelection", () => {
    // Select the button
    const ctaDiv = document.querySelector('[data-type="cta-button"]');
    const anchor = ctaDiv?.querySelector("a") as HTMLAnchorElement;
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    // Update attributes
    editor.commands.updateAttributes("ctaButton", {
      label: "Updated Pass Label",
      buttonColor: "#2563eb",
      borderRadius: "12px",
    });

    // Verify DOM was updated
    expect(anchor.textContent).toBe("Updated Pass Label");
    expect(anchor.style.backgroundColor).toBe("#2563eb");
    expect(anchor.style.borderRadius).toBe("12px");
  });
});
