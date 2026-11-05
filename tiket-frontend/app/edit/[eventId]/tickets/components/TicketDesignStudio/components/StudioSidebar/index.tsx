"use client";

import React from "react";
import type { TicketDesignerLayer } from "../../types";
import type { FormField } from "@/types/form";
import LayersList from "../LayersList";
import LayerInspector from "../LayerInspector";
import styles from "./StudioSidebar.module.css";

interface StudioSidebarProps {
  layers: TicketDesignerLayer[];
  selectedLayerId: string | null;
  selectedLayer: TicketDesignerLayer | null;
  formFields: FormField[];
  ticketName: string;
  isPaid: boolean;
  price: string;
  hasLimitCapacity: boolean;
  quantityLimit: string;
  onSelectLayer: (id: string) => void;
  onAddTextLayer: () => void;
  onAddQrLayer: () => void;
  onDeleteLayer: (id: string, e?: React.MouseEvent) => void;
  onUpdateLayer: (fields: Partial<TicketDesignerLayer>) => void;
  onSwitchToSettings: () => void;
}

export default function StudioSidebar({
  layers,
  selectedLayerId,
  selectedLayer,
  formFields,
  ticketName,
  isPaid,
  price,
  hasLimitCapacity,
  quantityLimit,
  onSelectLayer,
  onAddTextLayer,
  onAddQrLayer,
  onDeleteLayer,
  onUpdateLayer,
  onSwitchToSettings,
}: StudioSidebarProps) {
  return (
    <div className={`${styles.sidebar} scrollbar`}>
      <LayersList
        layers={layers}
        selectedLayerId={selectedLayerId}
        onSelectLayer={onSelectLayer}
        onAddTextLayer={onAddTextLayer}
        onAddQrLayer={onAddQrLayer}
        onDeleteLayer={onDeleteLayer}
      />

      <LayerInspector
        selectedLayer={selectedLayer}
        formFields={formFields}
        onUpdateLayer={onUpdateLayer}
      />

      <div className={styles.overviewCard}>
        <div className={styles.overviewHeader}>
          <span className={styles.overviewTitle}>Tier Overview</span>
        </div>
        <div className={styles.overviewContent}>
          <div className={styles.overviewRow}>
            <span className={styles.overviewLabel}>Name:</span>
            <span className={styles.overviewValue}>
              {ticketName || "Untitled"}
            </span>
          </div>
          <div className={styles.overviewRow}>
            <span className={styles.overviewLabel}>Price:</span>
            <span className={styles.overviewValue}>
              {isPaid ? `₹${price || 0}` : "Free"}
            </span>
          </div>
          <div className={styles.overviewRow}>
            <span className={styles.overviewLabel}>Capacity:</span>
            <span className={styles.overviewValue}>
              {hasLimitCapacity && quantityLimit
                ? quantityLimit
                : "Unlimited"}
            </span>
          </div>
          <button
            type="button"
            className={styles.quickLinkBtn}
            onClick={onSwitchToSettings}
          >
            Edit Full Ticket Settings
          </button>
        </div>
      </div>
    </div>
  );
}
