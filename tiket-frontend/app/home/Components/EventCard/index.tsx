import { MapPin, UsersRound, CalendarClock } from "lucide-react";
import { Event } from "@/types/event";
import styles from "./EventCard.module.css";
import { getImageUrl } from "@/constants/config";
import Image from "@/components/Image";
import Link from "next/link";

const timeFormatter = new Intl.DateTimeFormat("en", {
  hour: "numeric",
  minute: "2-digit",
});

type EventCardProps = {
  event: Event;
};

export default function EventCard({ event }: EventCardProps) {
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  const now = new Date();

  const locationText =
    event.locationType === "online"
      ? "Virtual Event"
      : event.locationDetails?.name || "Venue TBA";

  const isLive = now >= start && now <= end;

  return (
    <Link href={`/edit/${event.id}/overview`} className={styles.card}>
      {/* 1. Core Info (Left Column) */}
      <div className={styles.infoColumn}>
        {/* Kicker: Live status and time */}
        <div className={styles.kicker}>
          {isLive && (
            <span className={styles.statusLive}>
              <span className={styles.liveDot} /> LIVE
            </span>
          )}
          <span className={styles.time}>{timeFormatter.format(start)}</span>
        </div>

        {/* Title */}
        <h3 className={styles.title}>{event.title}</h3>

        {/* Metadata */}
        <div className={styles.meta}>
          <div className={styles.metaRow}>
            {/* Using a generic avatar placeholder since host data isn't in Event type right now */}
            <div className={styles.hostAvatar}></div>
            <span className={styles.metaText}>By Ticket</span>
          </div>

          <div className={styles.metaRow}>
            <MapPin size={14} className={styles.metaIcon} />
            <span className={styles.metaText}>{locationText}</span>
          </div>

          {event.capacity && (
            <div className={styles.metaRow}>
              <UsersRound size={14} className={styles.metaIcon} />
              <span className={styles.metaText}>{event.capacity} spots</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Visual Anchor (Right Column) */}
      <div className={styles.imageColumn}>
        {event.coverImage ? (
          <Image
            src={getImageUrl(event.coverImage, {
              width: 400,
              height: 400,
            })}
            alt={event.title}
            className={styles.imageFallback}
            loading="lazy"
          />
        ) : (
          <div
            className={styles.generatedPoster}
            style={{ backgroundColor: event.color || "var(--color-soft-bg)" }}
            aria-hidden="true"
          >
            <span className={styles.posterTitle}>{event.title}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
