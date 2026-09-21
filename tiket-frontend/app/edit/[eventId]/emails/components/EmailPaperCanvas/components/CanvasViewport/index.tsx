"use client";

import React from "react";
import { Editor, EditorContent } from "@tiptap/react";
import { toast } from "sonner";
import styles from "./CanvasViewport.module.css";

interface CanvasViewportProps {
  canvasMode: "edit" | "preview" | "code";
  deviceView: "desktop" | "mobile";
  editor: Editor;
  compiledRawHtml: string;
  previewBodyHtml: string;
}

export default function CanvasViewport({
  canvasMode,
  deviceView,
  editor,
  compiledRawHtml,
  previewBodyHtml,
}: CanvasViewportProps) {
  return (
    <div className={styles.canvasOuterViewport}>
      {canvasMode === "code" ? (
        <div className={styles.codeViewViewport}>
          <div className={styles.codeHeaderBar}>
            <span className={styles.codeHeaderTitle}>
              HTML Email Document Output
            </span>
            <button
              type="button"
              className={styles.copyCodeBtn}
              onClick={() => {
                navigator.clipboard.writeText(compiledRawHtml);
                toast.success("HTML code copied to clipboard!");
              }}
            >
              Copy HTML
            </button>
          </div>
          <textarea
            className={styles.htmlCodeTextarea}
            value={compiledRawHtml}
            readOnly
          />
        </div>
      ) : (
        <div className={styles.paperDocumentCard} data-device={deviceView}>
          <div className={styles.paperBodyArea}>
            {canvasMode === "edit" ? (
              <EditorContent
                editor={editor}
                className={styles.tiptapEditor}
              />
            ) : (
              <div
                className={styles.previewRenderedBody}
                dangerouslySetInnerHTML={{ __html: previewBodyHtml }}
              />
            )}
          </div>

          {/* Permanent Email Footer */}
          <div className={styles.emailPermanentFooter}>
            <p className={styles.footerQueryText}>
              If you have any questions or queries regarding this event, feel
              free to reply directly to this email or reach out to us at{" "}
              <a
                href="mailto:support@tiket.com"
                className={styles.footerLink}
              >
                support@tiket.com
              </a>
              .
            </p>
            <p className={styles.footerBranding}>
              Sent via <strong>Tiket Event Platform</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
