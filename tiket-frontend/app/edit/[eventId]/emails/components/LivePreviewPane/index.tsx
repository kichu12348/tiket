"use client";

import React from "react";
import { AvailableVariables } from "@/types/email";
import { Eye, Smartphone, Monitor } from "lucide-react";
import styles from "./LivePreviewPane.module.css";

interface LivePreviewPaneProps {
  subject: string;
  body: string;
  variables: AvailableVariables | null;
}

export default function LivePreviewPane({
  subject,
  body,
  variables,
}: LivePreviewPaneProps) {
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");

  // Interpolate sample data into subject & body for live preview
  const sampleValues: Record<string, string> = {};
  if (variables) {
    [
      ...(variables.eventVariables || []),
      ...(variables.attendeeVariables || []),
      ...(variables.ticketVariables || []),
      ...(variables.formVariables || []),
    ].forEach((v) => {
      sampleValues[v.key] = v.sample;
    });
  }

  const renderInterpolated = (templateStr: string) => {
    if (!templateStr) return "";
    return templateStr.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, key) => {
      const fullKey = `{{${key}}}`;
      return sampleValues[fullKey] || match;
    });
  };

  const previewSubject = renderInterpolated(subject) || "(No Subject)";
  const previewBodyHtml = renderInterpolated(body) || "<p style='color: rgba(255,255,255,0.4);'>No template content written yet...</p>";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Eye size={16} className={styles.icon} />
          <h4 className={styles.title}>Live Email Preview</h4>
        </div>
        <div className={styles.deviceToggle}>
          <button
            className={styles.deviceBtn}
            data-active={device === "desktop"}
            onClick={() => setDevice("desktop")}
            title="Desktop View"
          >
            <Monitor size={14} />
          </button>
          <button
            className={styles.deviceBtn}
            data-active={device === "mobile"}
            onClick={() => setDevice("mobile")}
            title="Mobile View"
          >
            <Smartphone size={14} />
          </button>
        </div>
      </div>

      <div className={styles.previewFrameWrapper} data-device={device}>
        <div className={styles.emailHeaderBar}>
          <div className={styles.headerRow}>
            <span className={styles.label}>From:</span>
            <span className={styles.value}>Tiket Events &lt;noreply@tiket.app&gt;</span>
          </div>
          <div className={styles.headerRow}>
            <span className={styles.label}>Subject:</span>
            <span className={styles.subjectValue}>{previewSubject}</span>
          </div>
        </div>

        <div className={`${styles.emailBodyCanvas} scrollbar`}>
          <div
            className={styles.renderedHtmlContent}
            dangerouslySetInnerHTML={{ __html: previewBodyHtml }}
          />
        </div>
      </div>
    </div>
  );
}
