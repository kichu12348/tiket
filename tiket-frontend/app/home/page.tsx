"use client";


import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./Home.module.css";
import { Search, Plus, LogOut } from "lucide-react";
import { useToken } from "@/hooks/useToken";
import { BsCalendar4Week } from "react-icons/bs";
import EventList from "./Components/EventList";
import { getMyEvents } from "./api/events";
import SkeletonList from "./Components/SkeletonList";
import type { Event } from "@/types/event";

export default function Home() {
  const { logout } = useToken();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const events = await getMyEvents();
      setEvents(events);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const filteredEvents = events;

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
            <button className={styles.softIconBtn} aria-label="Search">
              <Search size={18} />
            </button>
            <button className={styles.softIconBtn} onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={18} /></button>
          </div>
        </header>

        {/* Main Content */}
        <main className={styles.main}>
          <div className={styles.topSection}>
            <h1 className={styles.pageTitle}>Events</h1>

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
          </div>
          {loading ? (
            <SkeletonList count={4} />
          ) : filteredEvents.length > 0 ? (
            <EventList events={filteredEvents} />
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIconWrapper}>
                <BsCalendar4Week size={56} />
              </div>

              <h2 className={styles.emptyTitle}>No events here</h2>
              <p className={styles.emptySubtitle}>
                You haven&apos;t scheduled anything yet. Create your first event to
                get started.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
