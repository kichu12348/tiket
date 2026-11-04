"use client";

import React, { useState, useMemo } from "react";
import type { EmailLog, EmailAnalytics } from "@/types/email";
import {
  History,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Mail,
  MailOpen,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2,
  X,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import DOMPurify from "isomorphic-dompurify";
import { resendEmailLog } from "@/api/emails";
import { getErrorMessage } from "@/lib/errors";
import styles from "./EmailLogsTable.module.css";

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  confirmation: "Confirmation",
  checkin: "Check-in",
  invitation: "Invitation",
  thank_you: "Thank You",
  sorry: "Sorry",
  custom: "Custom",
};

interface EmailLogsTableProps {
  logs: EmailLog[];
  analytics?: EmailAnalytics | null;
  isLoading: boolean;
  onResend?: (logId: string) => Promise<void>;
  eventId?: string;
}

export default function EmailLogsTable({
  logs,
  analytics,
  isLoading,
  onResend,
  eventId,
}: EmailLogsTableProps) {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "opened" | "unopened" | "failed"
  >("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [previewLog, setPreviewLog] = useState<EmailLog | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Compute analytics dynamically if not provided by backend/mock
  const metrics: EmailAnalytics = useMemo(() => {
    if (analytics) return analytics;

    const totalSent = logs.filter((l) => l.status === "sent").length;
    const totalFailed = logs.filter((l) => l.status === "failed").length;
    const totalOpened = logs.filter(
      (l) => (l.openCount !== undefined && l.openCount > 0) || Boolean(l.openedAt),
    ).length;
    const totalUnopened = logs.filter(
      (l) =>
        l.status === "sent" &&
        (!l.openCount || l.openCount === 0) &&
        !l.openedAt,
    ).length;
    const openRatePercent =
      totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

    const standardTypes = [
      "confirmation",
      "checkin",
      "invitation",
      "thank_you",
      "sorry",
      "custom",
    ];
    const typesSet = new Set(standardTypes);
    logs.forEach((l) => {
      if (l.templateType) typesSet.add(l.templateType);
    });

    const byType = Array.from(typesSet).map((t) => {
      const typeLogs = logs.filter((l) => (l.templateType || "custom") === t);
      const sent = typeLogs.filter((l) => l.status === "sent").length;
      const opened = typeLogs.filter(
        (l) =>
          (l.openCount !== undefined && l.openCount > 0) || Boolean(l.openedAt),
      ).length;
      const unopened = Math.max(0, sent - opened);
      const failed = typeLogs.filter((l) => l.status === "failed").length;
      const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
      return {
        templateType: t,
        sent,
        opened,
        unopened,
        failed,
        openRatePercent: openRate,
      };
    });

    const timelineMap = new Map<
      string,
      { bucket: string; sent: number; opened: number }
    >();
    for (const log of logs) {
      if (log.sentAt) {
        const bucket = new Date(log.sentAt).toISOString().slice(0, 10);
        const item = timelineMap.get(bucket) || { bucket, sent: 0, opened: 0 };
        if (log.status === "sent") item.sent += 1;
        timelineMap.set(bucket, item);
      }
      if (log.openedAt) {
        const bucket = new Date(log.openedAt).toISOString().slice(0, 10);
        const item = timelineMap.get(bucket) || { bucket, sent: 0, opened: 0 };
        item.opened += 1;
        timelineMap.set(bucket, item);
      }
    }
    const timeline = Array.from(timelineMap.values()).sort((a, b) =>
      a.bucket.localeCompare(b.bucket),
    );

    return {
      totalSent,
      totalFailed,
      totalOpened,
      totalUnopened,
      openRatePercent,
      byType,
      timeline,
    };
  }, [analytics, logs]);

  // Filter logs based on active controls
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Status filter
      if (statusFilter === "opened") {
        const isOpened =
          (log.openCount !== undefined && log.openCount > 0) ||
          Boolean(log.openedAt);
        if (!isOpened) return false;
      } else if (statusFilter === "unopened") {
        const isOpened =
          (log.openCount !== undefined && log.openCount > 0) ||
          Boolean(log.openedAt);
        if (isOpened || log.status !== "sent") return false;
      } else if (statusFilter === "failed") {
        if (log.status !== "failed") return false;
      }

      // 2. Type filter
      if (typeFilter !== "all") {
        const currentType = log.templateType || "custom";
        if (currentType !== typeFilter) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesEmail = log.recipientEmail.toLowerCase().includes(query);
        const matchesName = (log.recipientName || "").toLowerCase().includes(query);
        const matchesSubject = log.subject.toLowerCase().includes(query);
        if (!matchesEmail && !matchesName && !matchesSubject) return false;
      }

      return true;
    });
  }, [logs, statusFilter, typeFilter, searchQuery]);

  // 1-Click Resend Handler
  const handleResend = async (log: EmailLog) => {
    try {
      setResendingId(log.id);
      if (onResend) {
        await onResend(log.id);
      } else if (eventId) {
        await resendEmailLog(eventId, log.id);
        toast.success(`Email resent successfully to ${log.recipientEmail}!`);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to resend email");
    } finally {
      setResendingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <History size={16} className={styles.icon} />
          <h4 className={styles.title}>Email Delivery History Logs</h4>
        </div>
        <p className={styles.emptyText}>Loading email delivery logs...</p>
      </div>
    );
  }

  // Type Breakdown SVG calculation
  const breakdownTypes = metrics.byType.length > 0
    ? metrics.byType
    : [
        { templateType: "confirmation", sent: 0, opened: 0, unopened: 0, failed: 0, openRatePercent: 0 },
        { templateType: "checkin", sent: 0, opened: 0, unopened: 0, failed: 0, openRatePercent: 0 },
        { templateType: "invitation", sent: 0, opened: 0, unopened: 0, failed: 0, openRatePercent: 0 },
        { templateType: "thank_you", sent: 0, opened: 0, unopened: 0, failed: 0, openRatePercent: 0 },
        { templateType: "sorry", sent: 0, opened: 0, unopened: 0, failed: 0, openRatePercent: 0 },
        { templateType: "custom", sent: 0, opened: 0, unopened: 0, failed: 0, openRatePercent: 0 },
      ];

  const maxTypeVal = Math.max(
    1,
    ...breakdownTypes.map((t) => Math.max(t.sent, t.opened)),
  );

  // Timeline SVG calculation
  const timelineData = metrics.timeline;
  const maxTimelineVal = Math.max(
    1,
    ...timelineData.map((d) => Math.max(d.sent, d.opened)),
  );

  return (
    <div className={styles.card}>
      {/* 1. Header */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <History size={16} className={styles.icon} />
          <h4 className={styles.title}>
            Email Delivery History Logs ({logs.length})
          </h4>
        </div>
        <p className={styles.subtitle}>
          Track sent invitations, confirmations, test messages, and automated
          email dispatches.
        </p>
      </div>

      {/* 2. Email Analytics Dashboard Header */}
      <div className={styles.analyticsSection}>
        {/* KPI Cards */}
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Total Sent</span>
              <Mail size={16} className={styles.kpiIcon} />
            </div>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{metrics.totalSent}</span>
            </div>
            <span className={styles.kpiSub}>All dispatched messages</span>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Opened</span>
              <MailOpen size={16} className={styles.kpiIconSuccess} />
            </div>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{metrics.totalOpened}</span>
              <span className={styles.kpiBadgeSuccess}>
                {metrics.openRatePercent}% Open Rate
              </span>
            </div>
            <span className={styles.kpiSub}>Unique opened messages</span>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Unopened</span>
              <EyeOff size={16} className={styles.kpiIconMuted} />
            </div>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{metrics.totalUnopened}</span>
            </div>
            <span className={styles.kpiSub}>Awaiting attendee view</span>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Failed</span>
              <AlertTriangle size={16} className={styles.kpiIconDanger} />
            </div>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{metrics.totalFailed}</span>
            </div>
            <span className={styles.kpiSub}>Bounced or error states</span>
          </div>
        </div>

        {/* Visual Charts Grid */}
        <div className={styles.chartsGrid}>
          {/* Chart 1: Sent vs. Opened by Email Type */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <span className={styles.chartTitle}>
                Sent vs. Opened by Email Type
              </span>
              <div className={styles.chartLegend}>
                <span className={styles.legendItem}>
                  <span className={styles.legendColorSent} /> Sent
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendColorOpened} /> Opened
                </span>
              </div>
            </div>

            <div className={styles.svgContainer}>
              <svg
                viewBox="0 0 540 180"
                className={styles.chartSvg}
                preserveAspectRatio="none"
              >
                {/* Horizontal grid lines */}
                <line
                  x1="30"
                  y1="30"
                  x2="520"
                  y2="30"
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="3 3"
                />
                <line
                  x1="30"
                  y1="85"
                  x2="520"
                  y2="85"
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="3 3"
                />
                <line
                  x1="30"
                  y1="140"
                  x2="520"
                  y2="140"
                  stroke="rgba(255,255,255,0.12)"
                />

                {breakdownTypes.map((item, index) => {
                  const colWidth = 75;
                  const xBase = 40 + index * colWidth;
                  const maxBarHeight = 100;
                  const sentHeight = Math.max(
                    2,
                    (item.sent / maxTypeVal) * maxBarHeight,
                  );
                  const openedHeight = Math.max(
                    item.opened > 0 ? 2 : 0,
                    (item.opened / maxTypeVal) * maxBarHeight,
                  );

                  const sentY = 140 - sentHeight;
                  const openedY = 140 - openedHeight;

                  const label =
                    TEMPLATE_TYPE_LABELS[item.templateType] ||
                    item.templateType;

                  return (
                    <g key={item.templateType} className={styles.barGroup}>
                      {/* Sent bar */}
                      <rect
                        x={xBase}
                        y={sentY}
                        width="20"
                        height={sentHeight}
                        rx="4"
                        className={styles.barSent}
                      >
                        <title>{`${label} Sent: ${item.sent}`}</title>
                      </rect>
                      {/* Opened bar */}
                      <rect
                        x={xBase + 24}
                        y={openedY}
                        width="20"
                        height={openedHeight}
                        rx="4"
                        className={styles.barOpened}
                      >
                        <title>{`${label} Opened: ${item.opened} (${item.openRatePercent}%)`}</title>
                      </rect>
                      {/* Type Label */}
                      <text
                        x={xBase + 22}
                        y="158"
                        textAnchor="middle"
                        className={styles.axisText}
                      >
                        {label.length > 8 ? `${label.slice(0, 7)}…` : label}
                      </text>
                      {/* Stat text above bars */}
                      <text
                        x={xBase + 10}
                        y={sentY - 4}
                        textAnchor="middle"
                        className={styles.barValueText}
                      >
                        {item.sent > 0 ? item.sent : ""}
                      </text>
                      <text
                        x={xBase + 34}
                        y={openedY - 4}
                        textAnchor="middle"
                        className={styles.barValueTextSuccess}
                      >
                        {item.opened > 0 ? item.opened : ""}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Chart 2: Opens Timeline Chart */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <span className={styles.chartTitle}>Opens Timeline Chart</span>
              <div className={styles.chartLegend}>
                <span className={styles.legendItem}>
                  <span className={styles.legendColorSent} /> Sent
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendColorOpened} /> Opened
                </span>
              </div>
            </div>

            <div className={styles.svgContainer}>
              {timelineData.length === 0 ? (
                <div className={styles.emptyChartPlaceholder}>
                  <Clock size={20} className={styles.emptyIcon} />
                  <span>No delivery timeline events recorded yet</span>
                </div>
              ) : (
                <svg
                  viewBox="0 0 540 180"
                  className={styles.chartSvg}
                  preserveAspectRatio="none"
                >
                  <line
                    x1="30"
                    y1="30"
                    x2="520"
                    y2="30"
                    stroke="rgba(255,255,255,0.06)"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1="30"
                    y1="85"
                    x2="520"
                    y2="85"
                    stroke="rgba(255,255,255,0.06)"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1="30"
                    y1="140"
                    x2="520"
                    y2="140"
                    stroke="rgba(255,255,255,0.12)"
                  />

                  {/* Draw timeline points and connector lines */}
                  {timelineData.map((d, idx) => {
                    const step =
                      timelineData.length > 1
                        ? (520 - 50) / (timelineData.length - 1)
                        : 235;
                    const cx = 50 + idx * step;
                    const maxH = 100;
                    const sentY = 140 - (d.sent / maxTimelineVal) * maxH;
                    const openedY = 140 - (d.opened / maxTimelineVal) * maxH;

                    return (
                      <g key={d.bucket}>
                        {/* Sent dot */}
                        <circle
                          cx={cx}
                          cy={sentY}
                          r="5"
                          className={styles.timelineDotSent}
                        >
                          <title>{`${d.bucket} - Sent: ${d.sent}`}</title>
                        </circle>
                        {/* Opened dot */}
                        <circle
                          cx={cx}
                          cy={openedY}
                          r="5"
                          className={styles.timelineDotOpened}
                        >
                          <title>{`${d.bucket} - Opened: ${d.opened}`}</title>
                        </circle>
                        {/* Date label */}
                        <text
                          x={cx}
                          y="158"
                          textAnchor="middle"
                          className={styles.axisText}
                        >
                          {d.bucket.slice(5)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter Controls Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterPills}>
          <button
            type="button"
            className={styles.filterPill}
            data-active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          >
            All ({logs.length})
          </button>
          <button
            type="button"
            className={styles.filterPill}
            data-active={statusFilter === "opened"}
            onClick={() => setStatusFilter("opened")}
          >
            Opened ({metrics.totalOpened})
          </button>
          <button
            type="button"
            className={styles.filterPill}
            data-active={statusFilter === "unopened"}
            onClick={() => setStatusFilter("unopened")}
          >
            Unopened ({metrics.totalUnopened})
          </button>
          <button
            type="button"
            className={styles.filterPill}
            data-active={statusFilter === "failed"}
            onClick={() => setStatusFilter("failed")}
          >
            Failed ({metrics.totalFailed})
          </button>
        </div>

        <div className={styles.filterRight}>
          {/* Template Type Selector Dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={styles.typeSelect}
            aria-label="Filter by email type"
          >
            <option value="all">All Email Types</option>
            <option value="confirmation">Confirmation</option>
            <option value="checkin">Check-in</option>
            <option value="invitation">Invitation</option>
            <option value="thank_you">Thank You</option>
            <option value="sorry">Sorry</option>
            <option value="custom">Custom</option>
          </select>

          {/* Search box */}
          <div className={styles.searchWrapper}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search recipient or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>
      </div>

      {/* 4. Logs Table */}
      {logs.length === 0 ? (
        <div className={styles.emptyState}>
          <Clock size={32} className={styles.emptyIcon} />
          <p className={styles.emptyText}>
            No email logs recorded yet for this event.
          </p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className={styles.emptyState}>
          <Clock size={32} className={styles.emptyIcon} />
          <p className={styles.emptyText}>
            No email logs match the selected filters.
          </p>
        </div>
      ) : (
        <div className={`${styles.tableWrapper} scrollbar`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Type</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Open Tracking</th>
                <th>Sent At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const isOpened =
                  (log.openCount !== undefined && log.openCount > 0) ||
                  Boolean(log.openedAt);
                const typeName =
                  TEMPLATE_TYPE_LABELS[log.templateType || "custom"] ||
                  log.templateType ||
                  "Custom";

                return (
                  <tr key={log.id}>
                    {/* Recipient */}
                    <td>
                      <div className={styles.recipientCol}>
                        <span className={styles.recipientName}>
                          {log.recipientName || "Attendee"}
                        </span>
                        <span className={styles.recipientEmail}>
                          {log.recipientEmail}
                        </span>
                      </div>
                    </td>

                    {/* Email Type Badge */}
                    <td>
                      <span className={styles.typeBadge}>{typeName}</span>
                    </td>

                    {/* Subject */}
                    <td>
                      <span className={styles.subjectText}>{log.subject}</span>
                    </td>

                    {/* Status Badge */}
                    <td>
                      <span
                        className={styles.statusBadge}
                        data-status={log.status}
                      >
                        {log.status === "sent" ? (
                          <CheckCircle size={12} />
                        ) : (
                          <AlertTriangle size={12} />
                        )}
                        <span>{log.status.toUpperCase()}</span>
                      </span>
                    </td>

                    {/* Open Tracking Status */}
                    <td>
                      {isOpened ? (
                        <span className={styles.openedBadge}>
                          <CheckCircle2 size={13} />
                          <span>
                            {log.openedAt
                              ? `Opened at ${new Date(log.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} (${log.openCount || 1}x)`
                              : `Opened (${log.openCount || 1}x)`}
                          </span>
                        </span>
                      ) : (
                        <span className={styles.unopenedBadge}>
                          <Clock size={13} />
                          <span>Unopened</span>
                        </span>
                      )}
                    </td>

                    {/* Sent Timestamp */}
                    <td>
                      <div className={styles.timeCol}>
                        <span className={styles.timeText}>
                          {new Date(log.sentAt).toLocaleString()}
                        </span>
                        {log.resentCount && log.resentCount > 0 ? (
                          <span className={styles.resentTag}>
                            Resent ({log.resentCount}x)
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Actions: Preview & Resend */}
                    <td>
                      <div className={styles.actionsCol}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => setPreviewLog(log)}
                          title="Preview sent email HTML"
                          aria-label="Preview Sent Email"
                        >
                          <Eye size={13} />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => handleResend(log)}
                          disabled={resendingId === log.id}
                          title="Resend this email"
                          aria-label="Resend Email"
                        >
                          {resendingId === log.id ? (
                            <Loader2 size={13} className={styles.spinner} />
                          ) : (
                            <RefreshCw size={13} />
                          )}
                          <span>
                            {resendingId === log.id ? "Sending..." : "Resend"}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Sent Email HTML Preview Modal */}
      {previewLog && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewLog(null)}
        >
          <div
            className={styles.modalDialog}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleBox}>
                <Mail size={18} className={styles.modalHeaderIcon} />
                <h3 className={styles.modalTitle}>Sent Email HTML Preview</h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setPreviewLog(null)}
                aria-label="Close Preview"
              >
                <X size={18} />
              </button>
            </div>

            {/* Email Meta Bar */}
            <div className={styles.modalMetaBar}>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>To:</span>
                <span className={styles.metaValue}>
                  {previewLog.recipientName
                    ? `${previewLog.recipientName} <${previewLog.recipientEmail}>`
                    : previewLog.recipientEmail}
                </span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Subject:</span>
                <span className={styles.metaValue}>{previewLog.subject}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Type:</span>
                <span className={styles.typeBadge}>
                  {TEMPLATE_TYPE_LABELS[previewLog.templateType || "custom"] ||
                    previewLog.templateType ||
                    "Custom"}
                </span>
                <span className={styles.metaDivider}>•</span>
                <span className={styles.metaLabel}>Sent:</span>
                <span className={styles.metaTime}>
                  {new Date(previewLog.sentAt).toLocaleString()}
                </span>
                {previewLog.openedAt && (
                  <>
                    <span className={styles.metaDivider}>•</span>
                    <span className={styles.openedBadge}>
                      <CheckCircle2 size={12} />
                      <span>
                        Opened at{" "}
                        {new Date(previewLog.openedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        ({previewLog.openCount || 1}x)
                      </span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Rendered Email Body in sandboxed iframe */}
            <div className={styles.modalBodyWrapper}>
              <iframe
                title="Sent Email Preview"
                srcDoc={DOMPurify.sanitize(
                  previewLog.renderedBody || previewLog.subject,
                )}
                sandbox="allow-same-origin"
                className={styles.previewIframe}
              />
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnCloseModal}
                onClick={() => setPreviewLog(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
