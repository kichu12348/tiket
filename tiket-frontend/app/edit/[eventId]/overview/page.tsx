"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { useEventStore } from "@/store/useEventStore";
import { useLiveEvent, useEventRevision } from "@/hooks/useLiveEvent";
import { useAvailability } from "@/hooks/useAvailability";
import type { EventHost } from "@/api/events";
import { getEventHosts } from "@/api/events";
import { getEventInsights, updateCustomInsights } from "@/api/attendees";
import type {
  EventInsightsData,
  CustomInsightWidget,
} from "@/types/attendee";
import {
  Calendar,
  MapPin,
  Users,
  ExternalLink,
  Edit2,
  Clock,
  Copy,
  Check,
  QrCode,
  Mail,
  IndianRupee,
  Gauge,
  AlertCircle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import InsightsCharts from "./components/InsightsCharts";
import CapacityMeter from "./components/CapacityMeter";
import CustomFormInsights from "./components/CustomFormInsights";
import styles from "./Overview.module.css";

export default function EditOverviewPage() {
  const { event } = useEventStore();
  const eventId = event?.id || "";

  // Real-time live synchronization
  useLiveEvent(eventId);
  const revision = useEventRevision(eventId);
  const availability = useAvailability(eventId);

  const [hosts, setHosts] = useState<EventHost[]>([]);
  const [isLoadingHosts, setIsLoadingHosts] = useState(true);

  const [insights, setInsights] = useState<EventInsightsData | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(true);

  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!eventId) return;

    let isMounted = true;

    getEventHosts(eventId)
      .then((res) => {
        if (isMounted) setHosts(res || []);
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setIsLoadingHosts(false);
      });

    getEventInsights(eventId)
      .then((data) => {
        if (isMounted) setInsights(data);
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setIsLoadingInsights(false);
      });

    return () => {
      isMounted = false;
    };
  }, [eventId, revision]);

  if (!event) return null;

  const eventLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/${event.slug}`
      : `/${event.slug}`;

  const handleUpdateCustomWidgets = async (
    updatedWidgets: CustomInsightWidget[],
  ) => {
    try {
      setInsights((prev) =>
        prev
          ? {
              ...prev,
              customInsightsConfig: updatedWidgets,
            }
          : prev,
      );

      await updateCustomInsights(eventId, updatedWidgets);
      toast.success("Custom insights updated successfully!");
    } catch {
      toast.error("Failed to update custom insights.");
      if (eventId) {
        getEventInsights(eventId).then((data) => setInsights(data));
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(eventLink);
        setCopiedLink(true);
        toast.success("Public event link copied to clipboard!");
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  const formatRupees = (paise: number) => {
    const rupees = Math.round(paise / 100);
    return `₹${rupees.toLocaleString("en-IN")}`;
  };

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
        return (details as { link?: string }).link || "Online";
      }
      const loc = details as { name?: string; address?: string; link?: string };
      return loc.name || loc.address || loc.link || "TBA";
    }

    return "TBA";
  };

  const summary = insights?.summary;

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

        {/* Quick Actions */}
        <div className={styles.headerRight}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleCopyLink}
          >
            {copiedLink ? <Check size={16} /> : <Copy size={16} />}
            {copiedLink ? "Copied!" : "Copy Link"}
          </button>

          <Link
            href={eventLink}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnSecondary}
          >
            <ExternalLink size={16} />
            View Page
          </Link>

          <Link
            href={`/edit/${event.id}/emails`}
            className={styles.btnSecondary}
          >
            <Mail size={16} />
            Send Email
          </Link>

          <Link href="/scan" className={styles.btnSecondary}>
            <QrCode size={16} />
            Door Scanner
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

      {/* Pending Approvals Alert Banner */}
      {summary && summary.pendingApprovalCount > 0 && (
        <div className={styles.approvalBanner}>
          <div className={styles.approvalLeft}>
            <AlertCircle size={18} className={styles.approvalIcon} />
            <span>
              <strong>{summary.pendingApprovalCount}</strong>{" "}
              {summary.pendingApprovalCount === 1
                ? "attendee registration requires"
                : "attendee registrations require"}{" "}
              host approval before tickets are issued.
            </span>
          </div>
          <Link
            href={`/edit/${event.id}/attendees?status=pending_approval`}
            className={styles.approvalLink}
          >
            Review Approvals
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Top KPI Cards (Lu.ma / MakeMyPass Caliber) */}
      <div className={styles.kpiGrid}>
        {/* Card 1: Total Registrations */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Total Registrations</span>
            <div className={styles.kpiIconWrapper}>
              <Users size={16} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            {isLoadingInsights ? "..." : summary?.totalRegistrations ?? 0}
          </div>
          <span className={styles.kpiSubtext}>
            {summary
              ? `${summary.confirmedCount} confirmed · ${summary.pendingApprovalCount} pending`
              : "Loading summary..."}
          </span>
        </div>

        {/* Card 2: Net Revenue */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Net Revenue</span>
            <div className={styles.kpiIconWrapper}>
              <IndianRupee size={16} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            {isLoadingInsights
              ? "..."
              : formatRupees(summary?.netRevenuePaise ?? 0)}
          </div>
          <span className={styles.kpiSubtext}>
            {summary && summary.totalRefundedPaise > 0
              ? `${formatRupees(summary.totalRefundedPaise)} refunded`
              : "Processed payments"}
          </span>
        </div>

        {/* Card 3: Check-In Rate */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Check-In Rate</span>
            <div className={styles.kpiIconWrapper}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            {isLoadingInsights
              ? "..."
              : `${summary?.checkInRatePercent ?? 0}%`}
          </div>
          <span className={styles.kpiSubtext}>
            {summary
              ? `${summary.checkedInCount} of ${summary.confirmedCount} checked in`
              : "Door validation"}
          </span>
        </div>

        {/* Card 4: Remaining Capacity */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Remaining Capacity</span>
            <div className={styles.kpiIconWrapper}>
              <Gauge size={16} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            {isLoadingInsights
              ? "..."
              : summary?.capacity !== null && summary?.capacity !== undefined
                ? summary.remainingCapacity ?? 0
                : "∞"}
          </div>
          <span className={styles.kpiSubtext}>
            {summary?.capacity
              ? `of ${summary.capacity} total allocated spots`
              : "Unlimited attendee capacity"}
          </span>
        </div>
      </div>

      {/* Insights Time-Series Charts & Check-in Velocity */}
      {insights && (
        <InsightsCharts
          eventId={event.id}
          dailySeries={insights.dailySeries}
          hourlyCheckIns={insights.hourlyCheckIns}
          summary={insights.summary}
        />
      )}

      {/* Capacity Utilization & Ticket Tier Breakdown */}
      {insights && (
        <CapacityMeter
          summary={insights.summary}
          tierBreakdown={insights.tierBreakdown}
          availabilityRemaining={availability?.remaining}
        />
      )}

      {/* Custom Form Insights */}
      {insights && (
        <CustomFormInsights
          eventId={event.id}
          widgets={insights.customInsightsConfig || []}
          formFieldAnalytics={insights.formFieldAnalytics || []}
          tierBreakdown={insights.tierBreakdown || []}
          onUpdateWidgets={handleUpdateCustomWidgets}
        />
      )}

      {/* Recent Activity Feed */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Recent Activity</h2>
            <span className={styles.sectionSubtitle}>
              Latest attendee signups and door admissions
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
          {isLoadingInsights ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyStateText}>
                Loading activity feed...
              </span>
            </div>
          ) : insights && insights.recentActivity.length > 0 ? (
            insights.recentActivity.map((item) => (
              <div key={item.id} className={styles.listItem}>
                <div className={styles.userInfo}>
                  <div className={styles.avatar}>
                    {item.attendeeName
                      ? item.attendeeName.charAt(0).toUpperCase()
                      : "A"}
                  </div>
                  <div className={styles.userDetails}>
                    <span className={styles.userName}>
                      {item.attendeeName || "Attendee"}
                    </span>
                    <span className={styles.userEmail}>
                      {item.attendeeEmail}
                    </span>
                  </div>
                </div>

                <div className={styles.userMeta}>
                  {item.ticketTypeName && (
                    <span className={styles.ticketTypeBadge}>
                      {item.ticketTypeName}
                    </span>
                  )}
                  <span
                    className={`${styles.badge} ${
                      item.status === "active" || item.status === "used"
                        ? styles.success
                        : styles.warning
                    }`}
                  >
                    {item.status === "used"
                      ? "Checked In"
                      : item.status.charAt(0).toUpperCase() +
                        item.status.slice(1).replace("_", " ")}
                  </span>
                  <span className={styles.timeAgo}>
                    {(() => {
                      try {
                        return format(new Date(item.timestamp), "MMM d, h:mm a");
                      } catch {
                        return item.timestamp;
                      }
                    })()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <Clock size={32} />
              <span className={styles.emptyStateText}>
                No attendee activity yet.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Event Recap */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Event Recap</h2>
            <span className={styles.sectionSubtitle}>
              Core logistics and scheduled time window
            </span>
          </div>
        </div>
        <div className={styles.recapGrid}>
          <div className={styles.recapItem}>
            <Calendar size={18} className={styles.recapIcon} />
            <div className={styles.recapText}>
              <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                {format(new Date(event.startDate), "EEEE, MMM d, yyyy")}
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
                  maxWidth: "240px",
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
                  ? `${event.capacity} Total Spots`
                  : "Unlimited Capacity"}
              </span>
              <span>
                {event.requireApproval
                  ? "Host Approval Required"
                  : "Instant Confirmation"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hosts & Collaborators */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Hosts & Team</h2>
            <span className={styles.sectionSubtitle}>
              Team members with administrative access to this event
            </span>
          </div>
          <Link
            href={`/edit/${event.id}/team`}
            className={styles.btnSecondary}
          >
            Manage Team
          </Link>
        </div>

        <div className={styles.listContainer}>
          {isLoadingHosts ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyStateText}>Loading hosts...</span>
            </div>
          ) : hosts.length > 0 ? (
            hosts.map((host) => (
              <div key={host.id} className={styles.listItem}>
                <div className={styles.userInfo}>
                  <div className={styles.avatar}>
                    {host.name ? host.name.charAt(0).toUpperCase() : "H"}
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
            <div className={styles.emptyState}>
              <span className={styles.emptyStateText}>No hosts found.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
