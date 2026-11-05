"use client";

import { useState } from "react";
import { useEventStore } from "@/store/useEventStore";
import { cn } from "@/lib/utils";
import type { TicketType } from "@/types/ticketType";
import TicketTypesPanel from "./components/TicketTypesPanel";
import TicketDesignStudio from "./components/TicketDesignStudio";
import styles from "./Tickets.module.css";

export default function EditTicketsPage() {
  const { event } = useEventStore();
  const [activeTab, setActiveTab] = useState<"tiers" | "designer">("tiers");
  const [selectedTicketForDesign, setSelectedTicketForDesign] =
    useState<TicketType | null>(null);
  const [studioMode, setStudioMode] = useState<
    "edit" | "settings" | "preview"
  >("edit");

  if (!event) return null;

  const handleAddTicket = () => {
    setSelectedTicketForDesign(null);
    setStudioMode("settings");
    setActiveTab("designer");
  };

  const handleEditTicket = (ticket: TicketType) => {
    setSelectedTicketForDesign(ticket);
    setStudioMode("settings");
    setActiveTab("designer");
  };

  const handleDesignTicket = (ticket: TicketType) => {
    setSelectedTicketForDesign(ticket);
    setStudioMode("edit");
    setActiveTab("designer");
  };

  const handleCloseStudio = () => {
    setActiveTab("tiers");
    setSelectedTicketForDesign(null);
  };

  return (
    <div className={styles.page}>
      {activeTab === "tiers" && (
        <div className={styles.header}>
          <h1 className={styles.title}>Tickets</h1>
          <p className={styles.subtitle}>
            Manage your ticket tiers, pricing, and custom pass designs.
          </p>

          <div className={styles.tabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={true}
              className={cn(styles.tabBtn, styles.tabBtnActive)}
              onClick={() => setActiveTab("tiers")}
            >
              Ticket Tiers
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={false}
              className={styles.tabBtn}
              onClick={() => {
                setSelectedTicketForDesign(null);
                setStudioMode("edit");
                setActiveTab("designer");
              }}
            >
              Custom Ticket Designer
            </button>
          </div>
        </div>
      )}

      {activeTab === "tiers" ? (
        <TicketTypesPanel
          eventId={event.id}
          onAddTicket={handleAddTicket}
          onEditTicket={handleEditTicket}
          onDesignTicket={handleDesignTicket}
        />
      ) : (
        <TicketDesignStudio
          eventId={event.id}
          ticket={selectedTicketForDesign}
          initialMode={studioMode}
          onClose={handleCloseStudio}
          onSaved={() => {
            setActiveTab("tiers");
            setSelectedTicketForDesign(null);
          }}
        />
      )}
    </div>
  );
}
