"use client";

import React from "react";
import { AvailableVariables, VariableItem } from "@/types/email";
import { Tag, Sparkles } from "lucide-react";
import styles from "./VariablePicker.module.css";

interface VariablePickerProps {
  variables: AvailableVariables | null;
  onInsertVariable: (variableKey: string) => void;
}

export default function VariablePicker({
  variables,
  onInsertVariable,
}: VariablePickerProps) {
  if (!variables) return null;

  const sections: { title: string; items: VariableItem[] }[] = [
    { title: "Event", items: variables.eventVariables || [] },
    { title: "Attendee", items: variables.attendeeVariables || [] },
    { title: "Ticket", items: variables.ticketVariables || [] },
    { title: "Form Fields", items: variables.formVariables || [] },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Sparkles size={16} className={styles.icon} />
          <h4 className={styles.title}>Dynamic Variable Placeholders</h4>
        </div>
        <p className={styles.subtitle}>
          Click any tag to insert variable placeholders into your email subject or body.
        </p>
      </div>

      <div className={styles.sectionsList}>
        {sections.map(
          (sec) =>
            sec.items.length > 0 && (
              <div key={sec.title} className={styles.sectionGroup}>
                <span className={styles.groupLabel}>{sec.title}</span>
                <div className={styles.chipsGrid}>
                  {sec.items.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      className={styles.chip}
                      onClick={() => onInsertVariable(v.key)}
                      title={`Sample: ${v.sample}`}
                    >
                      <Tag size={12} />
                      <span>{v.label}</span>
                      <code className={styles.codeTag}>{v.key}</code>
                    </button>
                  ))}
                </div>
              </div>
            ),
        )}
      </div>
    </div>
  );
}
