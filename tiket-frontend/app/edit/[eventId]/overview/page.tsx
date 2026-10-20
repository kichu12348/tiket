"use client";

import { useEventRevision } from "@/hooks/useLiveEvent";
import { useAvailability } from "@/hooks/useAvailability";
import { useEffect, useState } from "react";
import { useEventStore } from "@/store/useEventStore";
import { format } from "date-fns";
import Link from "next/link";
import type { EventHost } from "@/api/events";
import { getEventHosts } from "@/api/events";
import { getAttendees } from "@/api/attendees";
import type { AttendeeItem } from "@/types/attendee";
import {
  Calendar,
  MapPin,
  Users,
  ExternalLink,
  Edit2,
  Clock,
} from "lucide-react";
import styles from "./Overview.module.css";

export default function EditOverviewPage() {
  const { event } = useEventStore();
  const revision = useEventRevision(event?.id || "");
  const availability = useAvailability(event?.id || "");

  const [hosts, setHosts] = useState<EventHost[]>([]);
  const [isLoadingHosts, setIsLoadingHosts] = useState(true);

  const [recentAttendees, setRecentAttendees] = useState<AttendeeItem[]>([]);
  const [registeredCount, setRegisteredCount] = useState<number>(0);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState<boolean>(true);

  useEffect(() => {
    if (event?.id) {
      getEventHosts(event.id)
        .then(setHosts)
        .catch(console.error)
        .finally(() => setIsLoadingHosts(false));

      getAttendees(event.id, { limit: 5 })
        .then((res) => {
          setRecentAttendees(res.attendees || []);
          setRegisteredCount(res.total || 0);
        })
        .catch(console.error)
        .finally(() => setIsLoadingAttendees(false));
    }
  }, [event?.id, revision]);

  if (!event) return null;

  const eventLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/${event.slug}`
      : `/${event.slug}`;
  const totalCapacity = event.capacity || 0;
  const capacityPercentage =
    totalCapacity > 0
      ? Math.min(100, Math.round((registeredCount / totalCapacity) * 100))
      : 0;

  const getLocationDisplay = (): string => {
    if (!event.locationDetails) return "TBA";

    const details =
      typeof event.locationDetails === "string"
        ? (() => {
            try {
              return JSON.parse(event.locationDetails);
            } catch {
              return event.locationDetails;
            }
          })()
        : event.locationDetails;

    if (typeof details === "string") {
      return details || "TBA";
    }

    if (details && typeof details === "object") {
      if (event.locationType === "online") {
        return details.link || "Online";
      }
      return details.name || details.address || details.link || "TBA";
    }

    return "TBA";
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.statusBadge} data-status={event.status}>
            <span className={styles.statusDot} />
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </div>
          <h1 className={styles.title}>{event.title || "Untitled Event"}</h1>
        </div>
        <div className={styles.headerRight}>
          <Link
            href={eventLink}
            target="_blank"
            className={styles.btnSecondary}
          >
            <ExternalLink size={16} />
            View Event Page
          </Link>
          <Link
            href={`/edit/${event.id}/details`}
            className={styles.btnPrimary}
          >
            <Edit2 size={16} />
            Edit Details
          </Link>
        </div>
      </div>

      {/* Event Recap */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Event Recap</h2>
            <span className={styles.sectionSubtitle}>
              Quick overview of your event&apos;s core details.
            </span>
          </div>
        </div>
        <div className={styles.recapGrid}>
          <div className={styles.recapItem}>
            <Calendar size={18} className={styles.recapIcon} />
            <div className={styles.recapText}>
              <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                {format(new Date(event.startDate), "EEEE, MMM d")}
              </span>
              <span>
                {format(new Date(event.startDate), "h:mm a")} -{" "}
                {format(new Date(event.endDate), "h:mm a")}
              </span>
            </div>
          </div>
          <div className={styles.recapItem}>
            <MapPin size={18} className={styles.recapIcon} />
            <div className={styles.recapText}>
              <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                {event.locationType === "online"
                  ? "Virtual Event"
                  : event.locationType === "hybrid"
                    ? "Hybrid Event"
                    : "In-Person"}
              </span>
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "200px",
                }}
              >
                {getLocationDisplay()}
              </span>
            </div>
          </div>
          <div className={styles.recapItem}>
            <Users size={18} className={styles.recapIcon} />
            <div className={styles.recapText}>
              <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                {event.capacity
                  ? `${event.capacity} Guests Max`
                  : "Unlimited Capacity"}
              </span>
              <span>
                {event.requireApproval ? "Approval Required" : "Auto-Approval"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* At a Glance (Metrics) */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.sectionTitle}>At a Glance</h2>
            <span className={styles.sectionSubtitle}>
              Registration progress and capacity.{" "}
              {availability?.remaining === null
                ? "Unlimited capacity"
                : availability
                  ? `${availability.remaining} spots available (including checkout holds).`
                  : ""}
            </span>
          </div>
        </div>
        <div>
          <div className={styles.glanceStats}>
            <span className={styles.statLarge}>
              {isLoadingAttendees ? "..." : registeredCount}
            </span>
            <span className={styles.statTotal}>
              / {totalCapacity > 0 ? totalCapacity : "∞"}
            </span>
            <span className={styles.statLabel}>registered guests</span>
          </div>
          <div className={styles.progressBarContainer}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${capacityPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Recent Registrations */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Recent Registrations</h2>
            <span className={styles.sectionSubtitle}>
              The latest attendees who signed up for your event.
            </span>
          </div>
          <Link
            href={`/edit/${event.id}/attendees`}
            className={styles.btnSecondary}
          >
            View All Attendees
          </Link>
        </div>

        <div className={styles.listContainer}>
          {isLoadingAttendees ? (
            <div className={styles.emptyState} style={{ padding: "1.5rem" }}>
              <span className={styles.emptyStateText}>
                Loading recent registrations...
              </span>
            </div>
          ) : recentAttendees.length > 0 ? (
            recentAttendees.map((item) => (
              <div key={item.id} className={styles.listItem}>
                <div className={styles.userInfo}>
                  <div className={styles.avatar}>
                    {item.user?.name
                      ? item.user.name.charAt(0).toUpperCase()
                      : "U"}
                  </div>
                  <div className={styles.userDetails}>
                    <span className={styles.userName}>
                      {item.user?.name || "Attendee"}
                    </span>
                    <span className={styles.userEmail}>{item.user?.email}</span>
                  </div>
                </div>
                <div className={styles.userMeta}>
                  {item.ticketType?.name && (
                    <span className={styles.ticketTypeBadge}>
                      {item.ticketType.name}
                    </span>
                  )}
                  <span
                    className={`${styles.badge} ${
                      item.status === "active" || item.status === "used"
                        ? styles.success
                        : styles.warning
                    }`}
                  >
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </span>
                  <span className={styles.timeAgo}>
                    {format(new Date(item.createdAt), "MMM d, h:mm a")}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <Clock size={32} color="var(--border-strong)" />
              <span className={styles.emptyStateText}>
                No registrations yet.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Hosts Management */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Hosts</h2>
            <span className={styles.sectionSubtitle}>
              Manage who has admin access to this event.
            </span>
          </div>
          <button className={styles.btnSecondary}>+ Add Host</button>
        </div>

        <div className={styles.listContainer}>
          {isLoadingHosts ? (
            <div className={styles.emptyState} style={{ padding: "1rem" }}>
              <span className={styles.emptyStateText}>Loading hosts...</span>
            </div>
          ) : hosts.length > 0 ? (
            hosts.map((host) => (
              <div key={host.id} className={styles.listItem}>
                <div className={styles.userInfo}>
                  <div className={styles.avatar}>
                    {host.name ? host.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className={styles.userDetails}>
                    <span className={styles.userName}>{host.name}</span>
                    <span className={styles.userEmail}>{host.email}</span>
                  </div>
                </div>
                <div className={styles.userMeta}>
                  <span
                    className={`${styles.badge} ${
                      host.isCreator ? styles.primary : ""
                    }`}
                  >
                    {host.role}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState} style={{ padding: "1rem" }}>
              <span className={styles.emptyStateText}>No hosts found.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
