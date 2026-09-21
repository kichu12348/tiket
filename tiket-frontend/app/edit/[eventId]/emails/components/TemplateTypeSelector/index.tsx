"use client";

import React from "react";
import { EmailTemplateType, EmailTemplate } from "@/types/email";
import {
  Mail,
  CheckCircle2,
  QrCode,
  Heart,
  AlertCircle,
  Plus,
  FileText,
} from "lucide-react";
import styles from "./TemplateTypeSelector.module.css";

interface TemplateTypeSelectorProps {
  activeType: EmailTemplateType;
  onSelectType: (type: EmailTemplateType) => void;
  templates: EmailTemplate[];
  onCreateCustom: () => void;
}

const CATEGORIES: {
  type: EmailTemplateType;
  label: string;
  icon: React.ElementType;
  desc: string;
}[] = [
  {
    type: "confirmation",
    label: "Confirmation",
    icon: CheckCircle2,
    desc: "Auto-sent on booking",
  },
  {
    type: "checkin",
    label: "Check-in",
    icon: QrCode,
    desc: "Auto-sent on scan",
  },
  {
    type: "invitation",
    label: "Invitation",
    icon: Mail,
    desc: "Invite attendees",
  },
  {
    type: "thank_you",
    label: "Thank You",
    icon: Heart,
    desc: "Post-event thanks",
  },
  {
    type: "sorry",
    label: "Missed Event",
    icon: AlertCircle,
    desc: "Post-event missed",
  },
  {
    type: "custom",
    label: "Custom Templates",
    icon: FileText,
    desc: "Custom emails",
  },
];

export default function TemplateTypeSelector({
  activeType,
  onSelectType,
  templates,
  onCreateCustom,
}: TemplateTypeSelectorProps) {
  return (
    <div className={`${styles.container} scrollbar`}>
      <div className={styles.tabsRow}>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeType === cat.type;
          const count = templates.filter((t) => t.type === cat.type).length;
          const isDisabled = cat.type === "custom";

          return (
            <button
              key={cat.type}
              className={styles.tabBtn}
              data-active={isActive}
              disabled={isDisabled}
              onClick={() => onSelectType(cat.type)}
              style={{
                opacity: isDisabled ? 0.5 : 1,
                cursor: isDisabled ? "not-allowed" : "pointer",
              }}
            >
              <Icon size={16} className={styles.icon} />
              <div className={styles.labelCol}>
                <span className={styles.tabLabel}>{cat.label}</span>
                <span className={styles.tabDesc}>{cat.desc}</span>
              </div>
              {count > 0 && <span className={styles.badge}>{count}</span>}
            </button>
          );
        })}

        {activeType === "custom" && (
          <button className={styles.addCustomBtn} onClick={onCreateCustom}>
            <Plus size={16} />
            <span>New Custom</span>
          </button>
        )}
      </div>
    </div>
  );
}
