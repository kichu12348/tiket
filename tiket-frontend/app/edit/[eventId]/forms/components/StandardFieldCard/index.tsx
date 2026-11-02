import React from "react";
import { Lock } from "lucide-react";
import Dropdown from "@/components/Dropdown";
import type { StandardField, StandardFieldStatus } from "../../types";
import styles from "./StandardFieldCard.module.css";

interface Props {
  field: StandardField;
  onChange: (status: StandardFieldStatus) => void;
}

export default function StandardFieldCard({ field, onChange }: Props) {
  const isStatic = field.name === "name" || field.name === "email";

  return (
    <div className={styles.standardCard}>
      <div className={styles.standardCardLeft}>
        <div className={styles.standardCardIcon}>{field.icon}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontWeight: 500 }}>
            {field.name === "name" ? "Full Name" : field.label}
          </span>
          {isStatic ? (
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <Lock size={10} style={{ opacity: 0.7 }} />
              Page 1 Standard Field (Locked)
            </span>
          ) : (
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
              }}
            >
              Page 1 Standard Field
            </span>
          )}
        </div>
      </div>
      {isStatic ? (
        <span
          style={{
            fontSize: "0.85rem",
            color: "var(--color-text-secondary)",
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            background: "var(--color-soft-bg)",
            padding: "0.2rem 0.5rem",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <Lock size={12} style={{ opacity: 0.6 }} />
          Required
        </span>
      ) : (
        <div style={{ marginLeft: "auto" }}>
          <Dropdown
            options={[
              { label: "Required", value: "Required" },
              { label: "Optional", value: "Optional" },
              { label: "Off", value: "Off" },
            ]}
            value={field.status}
            btnColor="transparent"
            onChange={(val) => onChange(val as StandardFieldStatus)}
            width="auto"
            renderTriggerContent={(selected) => (
              <span
                style={{
                  color:
                    selected?.value === "Off"
                      ? "var(--color-text-soft)"
                      : "var(--color-text-secondary)",
                  fontSize: "0.85rem",
                  fontWeight: 400,
                }}
              >
                {selected?.label}
              </span>
            )}
          />
        </div>
      )}
    </div>
  );
}
