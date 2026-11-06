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
  ticketName: _ticketName,
  isPaid: _isPaid,
  price: _price,
  hasLimitCapacity: _hasLimitCapacity,
  quantityLimit: _quantityLimit,
  onSelectLayer,
  onAddTextLayer,
  onAddQrLayer,
  onDeleteLayer,
  onUpdateLayer,
  onSwitchToSettings: _onSwitchToSettings,
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
    </div>
  );
}
