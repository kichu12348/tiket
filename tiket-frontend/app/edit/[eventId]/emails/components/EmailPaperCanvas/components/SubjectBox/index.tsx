"use client";

import React from "react";
import styles from "./SubjectBox.module.css";

interface SubjectBoxProps {
  subject: string;
  setSubject: (subject: string) => void;
  canvasMode: "edit" | "preview" | "code";
  previewSubject: string;
}

export default function SubjectBox({
  subject,
  setSubject,
  canvasMode,
  previewSubject,
}: SubjectBoxProps) {
  return (
    <div className={styles.subjectBoxContainer}>
      <label className={styles.subjectBoxLabel}>Subject</label>
      {canvasMode === "edit" ? (
        <input
          type="text"
          className={styles.subjectBoxInput}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="You're Invited to {{event_title}} | See you there!"
          required
        />
      ) : (
        <div className={styles.subjectBoxPreview}>{previewSubject}</div>
      )}
    </div>
  );
}
