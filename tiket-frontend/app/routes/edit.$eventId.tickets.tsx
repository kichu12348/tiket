import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useEventStore } from "@/store/useEventStore";
import type { TicketType } from "@/types/ticketType";
import { getCoupons } from "@/api/commerce";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TicketTypesPanel from "@/app/edit/tickets/components/TicketTypesPanel";
import TicketDesignStudio from "@/app/edit/tickets/components/TicketDesignStudio";
import CouponsPanel from "@/app/edit/tickets/components/CouponsPanel";
import styles from "@/app/edit/tickets/Tickets.module.css";

export const Route = createFileRoute("/edit/$eventId/tickets")({
  ssr: false,
  component: EditTicketsPage,
});

function EditTicketsPage() {
  const { event } = useEventStore();
  const [activeTab, setActiveTab] = useState<"tiers" | "coupons" | "designer">(
    "tiers",
  );
  const [couponCount, setCouponCount] = useState<number>(0);
  const [selectedTicketForDesign, setSelectedTicketForDesign] =
    useState<TicketType | null>(null);
  const [studioMode, setStudioMode] = useState<"edit" | "settings" | "preview">(
    "edit",
  );

  useEffect(() => {
    if (!event?.id) return;
    getCoupons(event.id)
      .then((coupons) => {
        if (Array.isArray(coupons)) {
          setCouponCount(coupons.length);
        }
      })
      .catch(() => {});
  }, [event?.id]);

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
      {activeTab !== "designer" && (
        <>
          <div className={styles.header}>
            <h1 className={styles.title}>Tickets</h1>
            <p className={styles.subtitle}>
              Manage your ticket tiers, pricing, and custom pass designs.
            </p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              if (val === "designer") {
                setStudioMode("edit");
              }
              setActiveTab(val as "tiers" | "coupons" | "designer");
            }}
            className={styles.tabsRoot}
          >
            <TabsList className={styles.tabsList}>
              <TabsTrigger
                value="tiers"
                data-testid="tab-ticket-tiers"
                className={styles.tabTrigger}
                onClick={() => setActiveTab("tiers")}
              >
                Ticket Tiers
              </TabsTrigger>
              <TabsTrigger
                value="coupons"
                data-testid="tab-coupons"
                className={styles.tabTrigger}
                onClick={() => setActiveTab("coupons")}
              >
                <span>Coupons</span>
                <span
                  className={styles.countBadge}
                  data-testid="coupons-count-badge"
                >
                  {couponCount}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </>
      )}

      {activeTab === "tiers" ? (
        <TicketTypesPanel
          eventId={event.id}
          onAddTicket={handleAddTicket}
          onEditTicket={handleEditTicket}
          onDesignTicket={handleDesignTicket}
        />
      ) : activeTab === "coupons" ? (
        <CouponsPanel eventId={event.id} onCountChange={setCouponCount} />
      ) : (
        <TicketDesignStudio
          eventId={event.id}
          ticket={selectedTicketForDesign}
          initialMode={studioMode}
          onClose={handleCloseStudio}
          onSaved={(updatedTicket) => {
            if (studioMode === "settings") {
              setActiveTab("tiers");
              setSelectedTicketForDesign(null);
            } else {
              setSelectedTicketForDesign(updatedTicket);
            }
          }}
        />
      )}
    </div>
  );
}
