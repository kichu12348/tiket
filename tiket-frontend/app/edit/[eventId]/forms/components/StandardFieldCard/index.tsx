import React from "react";
import Dropdown from "@/components/Dropdown";
import { StandardField, StandardFieldStatus } from "../../types";
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
        <span>{field.name === "name" ? "Full Name" : field.label}</span>
      </div>
      {isStatic ? (
        <span
          style={{
            fontSize: "0.85rem",
            color: "var(--color-text-secondary)",
            marginLeft: "auto",
          }}
        >
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
