"use client";

import React from "react";
import { ChevronLeft, Palette, Settings2, Sparkles } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { TicketType } from "@/types/ticketType";
import type { StudioMode } from "../../types";
import { cn } from "@/lib/utils";
import styles from "./StudioHeader.module.css";

interface StudioHeaderProps {
  activeTicket: TicketType | null;
  mode: StudioMode;
  ticketTypesList: TicketType[];
  canvasWidth: number;
  canvasHeight: number;
  isSaving: boolean;
  onClose?: () => void;
  onModeChange: (m: StudioMode) => void;
  onSwitchTicket: (t: TicketType) => void;
  onStartNewTicket: () => void;
  onSave: () => void;
}

export default function StudioHeader({
  activeTicket,
  mode,
  ticketTypesList,
  canvasWidth,
  canvasHeight,
  isSaving,
  onClose,
  onModeChange,
  onSwitchTicket,
  onStartNewTicket,
  onSave,
}: StudioHeaderProps) {
  return (
    <div className={styles.topHeader}>
      <div className={styles.topLeftControls}>
        {onClose && (
          <button
            type="button"
            className={styles.backBtn}
            onClick={onClose}
            data-testid="cancel-btn"
            title="Back to Ticket Tiers"
          >
            <ChevronLeft size={16} />
            <span>All Tickets</span>
          </button>
        )}

        <h2 className={styles.headerTitle}>
          {activeTicket ? activeTicket.name : "Create Ticket Type"}
        </h2>

        {/* Mode Switcher */}
        <div className={styles.modeSwitcher} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "edit"}
            className={cn(
              styles.modeBtn,
              mode === "edit" && styles.modeBtnActive,
            )}
            onClick={() => onModeChange("edit")}
            data-testid="mode-edit-btn"
          >
            <Palette size={14} />
            <span>Pass Designer</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "settings"}
            className={cn(
              styles.modeBtn,
              mode === "settings" && styles.modeBtnActive,
            )}
            onClick={() => onModeChange("settings")}
            data-testid="mode-settings-btn"
          >
            <Settings2 size={14} />
            <span>Ticket Details</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "preview"}
            className={cn(
              styles.modeBtn,
              mode === "preview" && styles.modeBtnActive,
            )}
            onClick={() => onModeChange("preview")}
            data-testid="mode-preview-btn"
          >
            <Sparkles size={14} />
            <span>Sample Preview</span>
          </button>
        </div>

        {/* Tier Selector Dropdown */}
        {ticketTypesList.length > 0 && (
          <div className={styles.tierSelectWrapper}>
            <Select
              value={activeTicket?.id || "__new__"}
              onValueChange={(val) => {
                if (val === "__new__") {
                  onStartNewTicket();
                } else {
                  const found = ticketTypesList.find((t) => t.id === val);
                  if (found) onSwitchTicket(found);
                }
              }}
            >
              <SelectTrigger className="h-[34px] text-xs">
                <SelectValue placeholder="Switch tier" />
              </SelectTrigger>
              <SelectContent>
                {ticketTypesList.map((t, idx) => (
                  <SelectItem
                    key={t.id || `tier-${idx}`}
                    value={t.id || `tier-${idx}`}
                  >
                    {t.name}
                  </SelectItem>
                ))}
                <SelectItem value="__new__">+ New Ticket Tier</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className={styles.topRightControls}>
        {mode !== "settings" && (
          <div className={styles.artboardInfo}>
            {canvasWidth} × {canvasHeight} px Artboard
          </div>
        )}

        <button
          type="button"
          className={styles.headerSaveBtn}
          onClick={onSave}
          disabled={isSaving}
          data-testid="ticket-submit-btn"
        >
          {isSaving
            ? "Saving..."
            : activeTicket
              ? "Save Changes"
              : "Create Ticket"}
        </button>
      </div>
    </div>
  );
}

