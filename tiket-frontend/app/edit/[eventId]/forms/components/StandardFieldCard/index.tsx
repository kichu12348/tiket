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
        <div className={styles.cardTextCol}>
          <span className={styles.fieldName}>
            {field.name === "name" ? "Full Name" : field.label}
          </span>
          {isStatic ? (
            <span className={styles.fieldSubtitle}>
              <Lock size={10} className={styles.inlineLock} />
              Page 1 Standard Field (Locked)
            </span>
          ) : (
            <span className={styles.fieldSubtitle}>Page 1 Standard Field</span>
          )}
        </div>
      </div>
      {isStatic ? (
        <span className={styles.statusBadge}>
          <Lock size={12} className={styles.lockIcon} />
          Required
        </span>
      ) : (
        <div className={styles.dropdownWrapper}>
          <Dropdown
            options={[
              { label: "Required", value: "Required" },
              { label: "Optional", value: "Optional" },
              { label: "Off", value: "Off" },
            ]}
            value={field.status}
            onChange={(val) => onChange(val as StandardFieldStatus)}
            width="maxContent"
            triggerClassName={styles.dropdownTrigger}
            renderTriggerContent={(selected) => (
              <span
                className={
                  selected?.value === "Off"
                    ? styles.statusTextOff
                    : styles.statusText
                }
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
