"use client";

import React, { useState, useMemo } from "react";
import type { EmailLog, EmailAnalytics } from "@/types/email";
import { History } from "lucide-react";
import { toast } from "sonner";
import { resendEmailLog } from "@/api/emails";
import { getErrorMessage } from "@/lib/errors";

import AnalyticsCards from "./components/AnalyticsCards";
import AnalyticsCharts from "./components/AnalyticsCharts";
import LogsFilterBar from "./components/LogsFilterBar";
import LogsTable from "./components/LogsTable";
import SentEmailPreviewModal from "./components/SentEmailPreviewModal";

import { computeEmailMetrics } from "./functions/computeEmailMetrics";
import {
  filterEmailLogs,
  type EmailLogStatusFilter,
} from "./functions/filterEmailLogs";

import styles from "./EmailLogsTable.module.css";

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
  const [statusFilter, setStatusFilter] = useState<EmailLogStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [previewLog, setPreviewLog] = useState<EmailLog | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Compute analytics metrics
  const metrics = useMemo(
    () => computeEmailMetrics(logs, analytics),
    [analytics, logs],
  );

  // Filter logs based on active controls
  const filteredLogs = useMemo(
    () => filterEmailLogs(logs, statusFilter, typeFilter, searchQuery),
    [logs, statusFilter, typeFilter, searchQuery],
  );

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
      if (!onResend) {
        toast.error(getErrorMessage(err) || "Failed to resend email");
      }
    } finally {
      setResendingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <History size={16} className={styles.icon} />
            <h4 className={styles.title}>Email Delivery History Logs</h4>
          </div>
        </div>
        <p className={styles.emptyText}>Loading email delivery logs...</p>
      </div>
    );
  }

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
        <AnalyticsCards metrics={metrics} />
        <AnalyticsCharts metrics={metrics} logs={logs} />
      </div>

      {/* 3. Filter Controls Bar */}
      <LogsFilterBar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        totalCount={logs.length}
        openedCount={metrics.totalOpened}
        unopenedCount={metrics.totalUnopened}
        failedCount={metrics.totalFailed}
      />

      {/* 4. Logs Table */}
      <LogsTable
        logs={filteredLogs}
        totalLogsCount={logs.length}
        onPreview={setPreviewLog}
        onResend={handleResend}
        resendingId={resendingId}
      />

      {/* 5. Sent Email HTML Preview Modal */}
      <SentEmailPreviewModal
        log={previewLog}
        onClose={() => setPreviewLog(null)}
      />
    </div>
  );
}
