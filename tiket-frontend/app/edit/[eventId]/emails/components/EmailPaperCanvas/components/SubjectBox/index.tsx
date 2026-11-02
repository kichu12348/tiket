"use client";

import React, { useRef } from "react";
import styles from "./SubjectBox.module.css";

interface VariableItem {
  key: string;
  label: string;
  sample: string;
}

interface SubjectBoxProps {
  subject: string;
  setSubject: (subject: string) => void;
  canvasMode: "edit" | "preview" | "code";
  previewSubject: string;
  variables?: VariableItem[];
}

export default function SubjectBox({
  subject,
  setSubject,
  canvasMode,
  previewSubject,
  variables = [],
}: SubjectBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const insertVariableAtCursor = (varKey: string) => {
    const input = inputRef.current;
    if (!input) {
      setSubject(subject ? `${subject} ${varKey}` : varKey);
      return;
    }
    const start = input.selectionStart ?? subject.length;
    const end = input.selectionEnd ?? subject.length;
    const before = subject.substring(0, start);
    const after = subject.substring(end);
    const addition =
      before.endsWith(" ") || before.length === 0
        ? `${varKey} `
        : ` ${varKey} `;
    const nextSubject = before + addition + after;

    setSubject(nextSubject);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const nextPos = start + addition.length;
        inputRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 0);
  };

  return (
    <div className={styles.subjectBoxContainer}>
      <div className={styles.subjectHeaderRow}>
        <label className={styles.subjectBoxLabel}>Subject Line</label>
        {canvasMode === "edit" && variables.length > 0 && (
          <div className={styles.subjectVarsRow}>
            <span className={styles.insertTagLabel}>Insert tag:</span>
            {variables.slice(0, 5).map((v) => (
              <button
                key={v.key}
                type="button"
                className={styles.varPillBtn}
                onClick={() => insertVariableAtCursor(v.key)}
                title={`Insert ${v.key} (${v.label})`}
              >
                {v.key}
              </button>
            ))}
          </div>
        )}
      </div>

      {canvasMode === "edit" ? (
        <input
          ref={inputRef}
          type="text"
          className={styles.subjectBoxInput}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="You're Invited to {{event.title}} | See you there!"
          required
        />
      ) : (
        <div className={styles.subjectBoxPreview}>{previewSubject}</div>
      )}
    </div>
  );
}
