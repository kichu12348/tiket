"use client";

import { useState } from "react";
import { useInView } from "react-intersection-observer";
import { Event } from "@/types/event";
import EventCard from "../EventCard";
import styles from "./EventList.module.css";

/* ── Formatters ──────────────────────────────── */

const dayFormatter = new Intl.DateTimeFormat("en", { weekday: "long" });
const monthDayFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

function getDateLabel(date: Date) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return monthDayFormatter.format(date);
}

function getDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/* ── Group events by day ─────────────────────── */

function groupEvents(events: Event[]) {
  const map: Record<string, { date: Date; events: Event[] }> = {};
  for (const event of events) {
    const date = new Date(event.startDate);
    const key = getDateKey(date);
    if (!map[key]) map[key] = { date, events: [] };
    map[key].events.push(event);
  }
  return Object.values(map)
    .map((g) => ({
      ...g,
      events: g.events.sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      ),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/* ── Single day section ──────────────────────── */

function DateGroup({ group }: { group: { date: Date; events: Event[] } }) {
  const [isStuck, setIsStuck] = useState(false);

  /**
   * A zero-height sentinel sits at the top of the section.
   * When it exits the viewport FROM THE TOP (boundingClientRect.top < 0),
   * the sticky header has "stuck" → apply pill styles.
   * react-intersection-observer handles the native IntersectionObserver wiring.
   */
  const { ref: sentinelRef } = useInView({
    threshold: 0,
    onChange(inView, entry) {
      if (!inView && entry.boundingClientRect.top < 0) {
        setIsStuck(true);
      } else {
        setIsStuck(false);
      }
    },
  });

  return (
    <section className={styles.group}>
      {/* Sentinel — watched, triggers stuck state */}
      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />

      {/* Sticky date header */}
      <div className={`${styles.dateHeader}${isStuck ? ` ${styles.stuck}` : ""}`}>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.dateLabel}>{getDateLabel(group.date)}</span>
        <span className={styles.weekday}>{dayFormatter.format(group.date)}</span>
      </div>

      {/* Event cards */}
      <div className={styles.cards}>
        {group.events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}

/* ── EventList ───────────────────────────────── */

export default function EventList({ events }: { events: Event[] }) {
  const groups = groupEvents(events);
  return (
    <div className={styles.timeline} aria-label="Event timeline">
      {groups.map((group) => (
        <DateGroup key={getDateKey(group.date)} group={group} />
      ))}
    </div>
  );
}
