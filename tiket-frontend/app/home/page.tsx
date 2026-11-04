"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./Home.module.css";
import {
  Search,
  Plus,
  LogOut,
  Send,
  Check,
  X,
  Loader2,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { useToken } from "@/hooks/useToken";
import { BsCalendar4Week, BsTicketPerforated } from "react-icons/bs";
import EventList from "./Components/EventList";
import { getMyEvents, getMyTickets } from "./api/events";
import {
  acceptTicketTransfer,
  cancelTicketTransfer,
} from "@/api/tickets";
import SkeletonList from "./Components/SkeletonList";
import type { Event } from "@/types/event";
import type {
  TicketPassData,
  UserTicketSummary,
  IncomingTransfer,
} from "@/types/ticket";
import { toast } from "sonner";

export default function Home() {
  const { logout } = useToken();
  const [mainTab, setMainTab] = useState<"events" | "tickets">("events");
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Tickets state
  const [tickets, setTickets] = useState<(TicketPassData | UserTicketSummary)[]>(
    [],
  );
  const [incomingTransfers, setIncomingTransfers] = useState<
    IncomingTransfer[]
  >([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [processingTransferId, setProcessingTransferId] = useState<
    string | null
  >(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const eventsData = await getMyEvents();
        setEvents(eventsData || []);
      } catch (err) {
        console.error("Failed to load events", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const data = await getMyTickets();
      setTickets(data?.tickets || []);
      setIncomingTransfers(data?.incomingTransfers || []);
    } catch (err) {
      console.error("Failed to load tickets", err);
      toast.error("Failed to load your tickets");
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    if (mainTab === "tickets") {
      getMyTickets()
        .then((data) => {
          if (!ignore) {
            setTickets(data?.tickets || []);
            setIncomingTransfers(data?.incomingTransfers || []);
            setLoadingTickets(false);
          }
        })
        .catch((err) => {
          if (!ignore) {
            console.error("Failed to load tickets", err);
            toast.error("Failed to load your tickets");
            setLoadingTickets(false);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [mainTab]);

  const handleAcceptTransfer = async (transferId: string) => {
    setProcessingTransferId(transferId);
    try {
      await acceptTicketTransfer(transferId);
      toast.success("Ticket transfer accepted!");
      await fetchTickets();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to accept transfer";
      toast.error(msg);
    } finally {
      setProcessingTransferId(null);
    }
  };

  const handleDeclineTransfer = async (transferId: string) => {
    setProcessingTransferId(transferId);
    try {
      await cancelTicketTransfer(transferId);
      toast.success("Ticket transfer declined");
      setIncomingTransfers((prev) => prev.filter((t) => t.id !== transferId));
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to decline transfer";
      toast.error(msg);
    } finally {
      setProcessingTransferId(null);
    }
  };

  const now = new Date().getTime();
  const filteredEvents = events.filter((event) => {
    const end = new Date(event.endDate || event.startDate).getTime();
    const isPast = end < now;
    if (activeTab === "upcoming" && isPast) return false;
    if (activeTab === "past" && !isPast) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = event.title?.toLowerCase().includes(q);
      const locationMatch =
        typeof event.locationDetails === "object" && event.locationDetails?.name
          ? event.locationDetails.name.toLowerCase().includes(q)
          : false;
      return Boolean(titleMatch || locationMatch);
    }

    return true;
  });

  const filteredTickets = tickets.filter((ticket) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const titleMatch = ticket.event?.title?.toLowerCase().includes(q);
    const tierMatch = ticket.ticketType?.name?.toLowerCase().includes(q);
    return Boolean(titleMatch || tierMatch);
  });

  return (
    <div className={styles.page}>
      <div className={styles.background} />
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href="/" className={styles.logo}>
              Tiket<span className={styles.dot}>.</span>
            </Link>
          </div>

          <div className={styles.headerRight}>
            <Link href="/create" className={styles.createEventBtn}>
              <Plus size={18} strokeWidth={2.5} />
              <span>Create Event</span>
            </Link>
            {showSearch && (
              <input
                type="text"
                placeholder={
                  mainTab === "events"
                    ? "Search events..."
                    : "Search tickets..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{
                  background: "var(--color-soft-bg)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "9999px",
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.85rem",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
              />
            )}
            <button
              className={styles.softIconBtn}
              onClick={() => setShowSearch((prev) => !prev)}
              aria-label="Search"
            >
              <Search size={18} />
            </button>
            <button
              className={styles.softIconBtn}
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className={styles.main}>
          <div className={styles.topSection}>
            <div className={styles.headerToggleRow}>
              <div
                className={styles.mainToggleGroup}
                role="tablist"
                aria-label="Dashboard views"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mainTab === "events"}
                  data-testid="tab-my-events"
                  className={`${styles.mainToggleBtn} ${mainTab === "events" ? styles.mainToggleBtnActive : ""}`}
                  onClick={() => setMainTab("events")}
                >
                  My Events
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mainTab === "tickets"}
                  data-testid="tab-my-tickets"
                  className={`${styles.mainToggleBtn} ${mainTab === "tickets" ? styles.mainToggleBtnActive : ""}`}
                  onClick={() => {
                    setMainTab("tickets");
                    setLoadingTickets(true);
                  }}
                >
                  My Tickets
                </button>
              </div>

              {mainTab === "events" && (
                <div className={styles.toggleGroup}>
                  <button
                    className={`${styles.toggleBtn} ${activeTab === "upcoming" ? styles.toggleBtnActive : ""}`}
                    onClick={() => setActiveTab("upcoming")}
                  >
                    Upcoming
                  </button>
                  <button
                    className={`${styles.toggleBtn} ${activeTab === "past" ? styles.toggleBtnActive : ""}`}
                    onClick={() => setActiveTab("past")}
                  >
                    Past
                  </button>
                </div>
              )}
            </div>
          </div>

          {mainTab === "events" ? (
            loading ? (
              <SkeletonList count={4} />
            ) : filteredEvents.length > 0 ? (
              <EventList events={filteredEvents} />
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIconWrapper}>
                  <BsCalendar4Week size={56} />
                </div>

                <h2 className={styles.emptyTitle}>
                  {searchQuery
                    ? "No matching events"
                    : activeTab === "past"
                      ? "No past events"
                      : "No upcoming events"}
                </h2>
                <p className={styles.emptySubtitle}>
                  {searchQuery
                    ? "Try searching for a different event title or location."
                    : activeTab === "past"
                      ? "Events that have ended will appear here."
                      : "You haven't scheduled anything yet. Create your first event to get started."}
                </p>
              </div>
            )
          ) : loadingTickets ? (
            <SkeletonList count={4} />
          ) : (
            <div>
              {/* Incoming Ticket Transfers Banner */}
              {incomingTransfers.length > 0 && (
                <div
                  className={styles.transfersBanner}
                  data-testid="incoming-transfers-banner"
                >
                  <div className={styles.transfersHeader}>
                    <h2 className={styles.transfersTitle}>
                      <Send size={18} />
                      <span>Incoming Ticket Transfers</span>
                      <span className={styles.transfersCount}>
                        {incomingTransfers.length}
                      </span>
                    </h2>
                  </div>
                  <div className={styles.transfersList}>
                    {incomingTransfers.map((transfer) => {
                      const eventTitle =
                        transfer.event?.title ||
                        transfer.ticket?.event?.title ||
                        "Event Pass";
                      const tierName =
                        transfer.ticketType?.name ||
                        transfer.ticket?.ticketType?.name ||
                        "General Admission";
                      const sender =
                        transfer.senderName ||
                        transfer.senderEmail ||
                        transfer.fromUserId ||
                        "Another attendee";

                      return (
                        <div
                          key={transfer.id}
                          className={styles.transferItem}
                          data-testid={`transfer-item-${transfer.id}`}
                        >
                          <div className={styles.transferInfo}>
                            <span className={styles.transferEventTitle}>
                              {eventTitle} &bull; {tierName}
                            </span>
                            <span className={styles.transferSender}>
                              Sent from {sender}
                            </span>
                          </div>
                          <div className={styles.transferActions}>
                            <button
                              type="button"
                              onClick={() => handleAcceptTransfer(transfer.id)}
                              disabled={processingTransferId === transfer.id}
                              className={styles.btnAccept}
                              data-testid={`accept-transfer-${transfer.id}`}
                            >
                              {processingTransferId === transfer.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Check size={13} />
                              )}
                              <span>Accept</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeclineTransfer(transfer.id)
                              }
                              disabled={processingTransferId === transfer.id}
                              className={styles.btnDecline}
                              data-testid={`decline-transfer-${transfer.id}`}
                            >
                              {processingTransferId === transfer.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <X size={13} />
                              )}
                              <span>Decline</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* User Tickets Grid */}
              {filteredTickets.length > 0 ? (
                <div
                  className={styles.ticketGrid}
                  data-testid="my-tickets-grid"
                >
                  {filteredTickets.map((ticket) => {
                    const eventTitle =
                      ticket.event?.title || "Untitled Event";
                    const tierName =
                      ticket.ticketType?.name || "General Admission";
                    const status = ticket.status || "active";
                    const startDate = ticket.event?.startDate;
                    const formattedDate = startDate
                      ? new Date(startDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Date TBA";

                    const getStatusClass = () => {
                      switch (status) {
                        case "active":
                          return styles.statusBadgeActive;
                        case "pending_approval":
                          return styles.statusBadgePending;
                        case "used":
                          return styles.statusBadgeUsed;
                        case "cancelled":
                        case "refunded":
                          return styles.statusBadgeCancelled;
                        default:
                          return styles.statusBadgeActive;
                      }
                    };

                    const getStatusLabel = () => {
                      switch (status) {
                        case "active":
                          return "Active";
                        case "pending_approval":
                          return "Pending Approval";
                        case "used":
                          return "Used";
                        case "cancelled":
                          return "Cancelled";
                        case "refunded":
                          return "Refunded";
                        default:
                          return status;
                      }
                    };

                    return (
                      <Link
                        key={ticket.id}
                        href={`/passes/${ticket.id}`}
                        className={styles.ticketCard}
                        data-testid={`ticket-card-${ticket.id}`}
                      >
                        <div className={styles.ticketCardTop}>
                          <div>
                            <h3 className={styles.ticketEventTitle}>
                              {eventTitle}
                            </h3>
                            <span className={styles.ticketTierName}>
                              {tierName}
                            </span>
                          </div>
                          <span
                            className={`${styles.statusBadge} ${getStatusClass()}`}
                            data-status={status}
                            data-testid={`ticket-status-${status}`}
                          >
                            {getStatusLabel()}
                          </span>
                        </div>

                        <div className={styles.ticketCardBottom}>
                          <div className={styles.ticketDate}>
                            <Calendar size={14} />
                            <span>{formattedDate}</span>
                          </div>
                          <div className={styles.viewPassBtn}>
                            <span>View Pass</span>
                            <ChevronRight size={15} />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIconWrapper}>
                    <BsTicketPerforated size={56} />
                  </div>
                  <h2 className={styles.emptyTitle}>
                    {searchQuery ? "No matching tickets" : "No tickets yet"}
                  </h2>
                  <p className={styles.emptySubtitle}>
                    {searchQuery
                      ? "Try searching for a different event title."
                      : "You haven't acquired any tickets yet. Explore upcoming events to get passes."}
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
