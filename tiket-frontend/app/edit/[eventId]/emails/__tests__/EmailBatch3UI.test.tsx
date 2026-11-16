import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import React from "react";

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

import { render, screen, cleanup } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import {
  ButtonBlockExtension,
  ContainerBlockExtension,
  ImageBlockExtension,
} from "../components/EmailPaperCanvas/extensions";
import CanvasViewport from "../components/EmailPaperCanvas/components/CanvasViewport";
import EmailLogsTable from "../components/EmailLogsTable";
import type { EmailLog, EmailAnalytics, EmailDocumentJSON } from "@/types/email";

describe("Batch 3: UI & Inspector Enhancements", () => {
  let editor: Editor;

  beforeEach(() => {
    cleanup();
    document.body.innerHTML = "";

    editor = new Editor({
      extensions: [
        StarterKit,
        TextStyle,
        ButtonBlockExtension,
        ContainerBlockExtension,
        ImageBlockExtension,
      ],
      content: {
        type: "doc",
        content: [
          {
            type: "containerBlock",
            attrs: {
              style: { backgroundColor: "#f4f4f5", padding: "16px" },
            },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Inside container block" }],
              },
            ],
          },
          {
            type: "buttonBlock",
            attrs: {
              href: "https://tiket.com/pass",
              alignment: "center",
              style: { backgroundColor: "#000000", color: "#ffffff" },
            },
            content: [{ type: "text", text: "View Pass" }],
          },
        ],
      },
    });
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    if (editor && !editor.isDestroyed) {
      editor.destroy();
    }
  });

  test("1. CanvasViewport renders edit mode with TipTap and preview mode with DOMPurify sanitization", () => {
    const maliciousHtml = '<p>Safe Text</p><script>alert("xss")</script><img src="x" onerror="alert(1)" />';
    const { container, rerender } = render(
      <CanvasViewport
        canvasMode="edit"
        deviceView="desktop"
        editor={editor}
        compiledRawHtml="<p>Raw HTML</p>"
        previewBodyHtml={maliciousHtml}
      />,
    );

    // In edit mode, EditorContent is present
    expect(container.querySelector(".ProseMirror")).toBeDefined();

    // Switch to preview mode
    rerender(
      <CanvasViewport
        canvasMode="preview"
        deviceView="mobile"
        editor={editor}
        compiledRawHtml="<p>Raw HTML</p>"
        previewBodyHtml={maliciousHtml}
      />,
    );

    // Script tag should be stripped by DOMPurify
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText("Safe Text")).toBeDefined();

    // Check device responsive attribute
    const card = container.querySelector('[data-device="mobile"]');
    expect(card).toBeDefined();
  });

  test("2. CanvasViewport renders code mode with JSON schema validator, ScrollArea, and copy button", () => {
    const validDoc: EmailDocumentJSON = {
      version: 1,
      canvasStyle: {
        backgroundColor: "#f4f4f5",
        contentBackgroundColor: "#ffffff",
        contentWidth: "600px",
        padding: "32px",
      },
      doc: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Hello World" }],
          },
        ],
      },
    };

    const { container, rerender } = render(
      <CanvasViewport
        canvasMode="code"
        deviceView="desktop"
        editor={editor}
        documentJson={validDoc}
      />,
    );

    // Verify document filename and valid schema badge
    expect(screen.getByText("email-document.json")).toBeDefined();
    expect(screen.getByText(/Valid Schema \(v1\)/i)).toBeDefined();

    // Verify code block inside ScrollArea
    const codeElem = container.querySelector("pre code");
    expect(codeElem).toBeDefined();
    expect(codeElem?.textContent).toContain('"type": "paragraph"');
    expect(codeElem?.textContent).toContain('"text": "Hello World"');

    // Verify copy button
    const copyBtn = screen.getByRole("button", { name: /Copy JSON/i });
    expect(copyBtn).toBeDefined();

    // Verify invalid schema triggers warning badge
    const invalidDoc = {
      version: 99,
      doc: { type: "doc" },
    } as unknown as EmailDocumentJSON;

    rerender(
      <CanvasViewport
        canvasMode="code"
        deviceView="desktop"
        editor={editor}
        documentJson={invalidDoc}
      />,
    );

    expect(screen.getByText(/Invalid:/i)).toBeDefined();
  });

  test("3. EmailLogsTable displays Queued count KPI card when queuedCount > 0", () => {
    const logs: EmailLog[] = [
      {
        id: "log-1",
        eventId: "evt-1",
        templateId: "t-1",
        recipientEmail: "alice@example.com",
        recipientName: "Alice",
        subject: "Invitation",
        status: "sent",
        errorMessage: null,
        sentAt: new Date().toISOString(),
      },
      {
        id: "log-2",
        eventId: "evt-1",
        templateId: "t-1",
        recipientEmail: "bob@example.com",
        recipientName: "Bob",
        subject: "Invitation",
        status: "queued",
        errorMessage: null,
        sentAt: new Date().toISOString(),
      },
    ];

    const analytics: EmailAnalytics = {
      totalSent: 1,
      totalFailed: 0,
      totalOpened: 0,
      totalUnopened: 1,
      queuedCount: 1,
      openRatePercent: 0,
      byType: [],
      timeline: [],
    };

    render(
      <EmailLogsTable
        logs={logs}
        analytics={analytics}
        isLoading={false}
      />,
    );

    expect(screen.getByText("QUEUED")).toBeDefined();
    expect(screen.getByText("Awaiting transmission")).toBeDefined();
  });
});
