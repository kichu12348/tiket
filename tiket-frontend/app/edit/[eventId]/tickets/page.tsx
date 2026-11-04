"use client";

import { useState } from "react";
import { useEventStore } from "@/store/useEventStore";
import { cn } from "@/lib/utils";
import TicketTypesPanel from "./components/TicketTypesPanel";
import TicketDesignStudio from "./components/TicketDesignStudio";
import styles from "./Tickets.module.css";

export default function EditTicketsPage() {
  const { event } = useEventStore();
  const [activeTab, setActiveTab] = useState<"tiers" | "designer">("tiers");

  if (!event) return null;

  return (
    <div className={cn(styles.page, activeTab === "designer" && styles.pageWide)}>
      <div className={styles.header}>
        <h1 className={styles.title}>Tickets</h1>
        <p className={styles.subtitle}>
          Manage your ticket tiers, pricing, and custom pass designs.
        </p>

        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "tiers"}
            className={cn(styles.tabBtn, activeTab === "tiers" && styles.tabBtnActive)}
            onClick={() => setActiveTab("tiers")}
          >
            Ticket Tiers
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "designer"}
            className={cn(styles.tabBtn, activeTab === "designer" && styles.tabBtnActive)}
            onClick={() => setActiveTab("designer")}
          >
            Custom Ticket Designer
          </button>
        </div>
      </div>

      {activeTab === "tiers" ? (
        <TicketTypesPanel eventId={event.id} />
      ) : (
        <TicketDesignStudio eventId={event.id} />
      )}
    </div>
  );
}
