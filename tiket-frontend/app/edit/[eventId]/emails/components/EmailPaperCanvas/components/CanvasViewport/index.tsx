"use client";

import React, { useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { EditorContent } from "@tiptap/react";
import { toast } from "sonner";
import DOMPurify from "isomorphic-dompurify";
import { FileJson, CheckCircle2, AlertCircle, Copy, Check } from "lucide-react";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { validateEmailDocument } from "@/validators/email.validator";
import type { EmailDocumentJSON, EmailNodeJSON } from "@/types/email";
import styles from "./CanvasViewport.module.css";

interface CanvasViewportProps {
  canvasMode: "edit" | "preview" | "code";
  deviceView: "desktop" | "mobile";
  editor: Editor;
  compiledRawHtml?: string;
  previewBodyHtml?: string;
  documentJson?: EmailDocumentJSON;
}

function countDocNodes(node?: EmailNodeJSON): number {
  if (!node) return 0;
  let count = 1;
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      count += countDocNodes(child);
    }
  }
  return count;
}

export default function CanvasViewport({
  canvasMode,
  deviceView,
  editor,
  compiledRawHtml: _compiledRawHtml,
  previewBodyHtml = "",
  documentJson,
}: CanvasViewportProps) {
  const [isCopied, setIsCopied] = useState(false);

  const activeDocJson: EmailDocumentJSON = useMemo(() => {
    if (documentJson) return documentJson;
    return {
      version: 1,
      canvasStyle: {
        backgroundColor: "#f4f4f5",
        contentBackgroundColor: "#ffffff",
        contentWidth: "600px",
        padding: "32px",
      },
      doc: (editor
        ? editor.getJSON()
        : { type: "doc", content: [] }) as EmailNodeJSON,
    };
  }, [documentJson, editor]);

  const validationResult = useMemo(() => {
    return validateEmailDocument(activeDocJson);
  }, [activeDocJson]);

  const formattedJson = useMemo(() => {
    try {
      return JSON.stringify(activeDocJson, null, 2);
    } catch {
      return "{}";
    }
  }, [activeDocJson]);

  const totalNodes = useMemo(() => {
    return countDocNodes(activeDocJson.doc);
  }, [activeDocJson.doc]);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(formattedJson);
    setIsCopied(true);
    toast.success("JSON document copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className={styles.canvasOuterViewport}>
      {canvasMode === "code" ? (
        <div className={styles.codeViewViewport}>
          <div className={styles.codeHeaderBar}>
            <div className={styles.codeHeaderLeft}>
              <FileJson size={16} className={styles.codeFileIcon} />
              <span className={styles.codeHeaderTitle}>
                email-document.json
              </span>
              {!validationResult.success && (
                <Badge
                  variant="destructive"
                  className="gap-1 text-xs py-0.5 px-2"
                  title={validationResult.error}
                >
                  <AlertCircle size={12} />
                  <span>Invalid: {validationResult.error}</span>
                </Badge>
              )}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={handleCopyJson}
              className="h-7 text-xs gap-1.5 cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy JSON</span>
                </>
              )}
            </Button>
          </div>

          <ScrollArea className={styles.jsonScrollArea}>
            <pre className={styles.jsonCodeBlock}>
              <code>{formattedJson}</code>
            </pre>
            <ScrollBar orientation="horizontal" />
            <ScrollBar orientation="vertical" />
          </ScrollArea>

          <div className={styles.codeMetaFooter}>
            <div className={styles.codeMetaLeft}>
              <span>Nodes: {totalNodes}</span>
              <span>Version: {activeDocJson.version || 1}</span>
            </div>
            <div className={styles.codeMetaRight}>
              <span>
                Width:{" "}
                {(activeDocJson.canvasStyle?.contentWidth as string) || "600px"}
              </span>
              <span>
                {validationResult.success ? "Schema: OK" : "Schema: Error"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.paperDocumentCard} data-device={deviceView}>
          <div className={styles.paperBodyArea}>
            {canvasMode === "edit" ? (
              <EditorContent editor={editor} className={styles.tiptapEditor} />
            ) : (
              <div
                className={styles.previewRenderedBody}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(previewBodyHtml),
                }}
              />
            )}
          </div>

          {/* Permanent Email Footer */}
          <div className={styles.emailPermanentFooter}>
            <p className={styles.footerQueryText}>
              If you have any questions or queries regarding this event, feel
              free to reply directly to this email or reach out to us at{" "}
              <a href="mailto:support@tiket.com" className={styles.footerLink}>
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
