"use client";

import React from "react";
import { ChevronLeft, Palette, Settings2, Sparkles } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectSeparator,
} from "@/components/ui/select";
import type { TicketType } from "@/types/ticketType";
import type { StudioMode } from "../../types";
import { cn } from "@/lib/utils";
import styles from "./StudioHeader.module.css";

// --- 3 Canonical Tabs Configuration ---
const TABS: { id: StudioMode; label: string; icon: React.ReactNode }[] = [
  { id: "edit", label: "Pass Designer", icon: <Palette size={16} /> },
  { id: "settings", label: "Ticket Details", icon: <Settings2 size={16} /> },
  { id: "preview", label: "Sample Preview", icon: <Sparkles size={16} /> },
];

// --- Subcomponent: TierSelect ---
interface TierSelectProps {
  activeTicket: TicketType | null;
  ticketTypesList: TicketType[];
  onSwitchTicket: (t: TicketType) => void;
  onStartNewTicket: () => void;
}

function TierSelect({
  activeTicket,
  ticketTypesList,
  onSwitchTicket,
  onStartNewTicket,
}: TierSelectProps) {
  const currentTitle = activeTicket ? activeTicket.name : "Create Ticket Type";

  if (ticketTypesList.length === 0) {
    return (
      <span className={styles.tierStaticName} title={currentTitle}>
        {currentTitle}
      </span>
    );
  }

  return (
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
      <SelectTrigger
        className={styles.tierTextTrigger}
        aria-label="Select Ticket Tier"
      >
        <span className={styles.tierName} title={currentTitle}>
          {currentTitle}
        </span>
      </SelectTrigger>
      <SelectContent
        align="start"
        sideOffset={8}
        className={cn(
          "z-[9999] min-w-[200px] max-w-[280px]",
          "border border-white/10 bg-[#16171b]/98 backdrop-blur-2xl",
          "p-1.5 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.45)]",
        )}
      >
        <SelectGroup>
          {ticketTypesList.map((t, idx) => (
            <SelectItem
              key={t.id || `tier-${idx}`}
              value={t.id || `tier-${idx}`}
              className="rounded-lg text-[13px] font-medium py-2 pl-8 pr-3"
            >
              <span className="truncate max-w-[220px]">{t.name}</span>
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator className="my-1.5 bg-white/10" />
        <SelectItem
          value="__new__"
          className="rounded-lg text-[13px] font-medium text-white/80 hover:text-white py-2 pl-8 pr-3 cursor-pointer"
        >
          + New Ticket Tier
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

// --- Main Component: StudioHeader ---
interface StudioHeaderProps {
  activeTicket: TicketType | null;
  mode: StudioMode;
  ticketTypesList: TicketType[];
  canvasWidth?: number;
  canvasHeight?: number;
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
  isSaving,
  onClose,
  onModeChange,
  onSwitchTicket,
  onStartNewTicket,
  onSave,
}: StudioHeaderProps) {
  return (
    <header className={styles.headerContainer}>
      {/* =====================================================================
          ROW 1 (height 56px, flex, justify-between, items-center, px-16):
          Left: Breadcrumb (All Tickets / Tier Name Dropdown)
          Right: Save Changes Primary Button
          ===================================================================== */}
      <div className={styles.row1}>
        <div className={styles.breadcrumb}>
          {onClose && (
            <button
              type="button"
              className={styles.ghostBackBtn}
              onClick={onClose}
              data-testid="cancel-btn"
              title="All Tickets"
              aria-label="All Tickets"
            >
              <ChevronLeft size={18} className="shrink-0" />
              <span className={styles.backBtnText}>All Tickets</span>
            </button>
          )}

          {onClose && (
            <span className={styles.breadcrumbSeparator} aria-hidden="true">
              /
            </span>
          )}

          <TierSelect
            activeTicket={activeTicket}
            ticketTypesList={ticketTypesList}
            onSwitchTicket={onSwitchTicket}
            onStartNewTicket={onStartNewTicket}
          />
        </div>

        <div className={styles.row1Right}>
          <button
            type="button"
            className={styles.saveBtn}
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

      {/* =====================================================================
          ROW 2 (height 44px, bottom border):
          Tabs: Pass Designer, Ticket Details, Sample Preview, Artboard.
          Underline style with 2px bottom border indicator, horizontal scrollable.
          ===================================================================== */}
      <div className={styles.row2}>
        <div
          className={styles.tabsScrollContainer}
          role="tablist"
          aria-label="Editor modes"
        >
          {TABS.map((tab) => {
            const isActive = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={tab.label}
                title={tab.label}
                className={cn(
                  styles.underlineTab,
                  isActive && styles.underlineTabActive,
                )}
                onClick={() => onModeChange(tab.id)}
                data-testid={`mode-${tab.id}-btn`}
              >
                <span className={styles.tabIcon}>{tab.icon}</span>
                <span
                  className={cn(
                    styles.tabLabel,
                    isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                  )}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
