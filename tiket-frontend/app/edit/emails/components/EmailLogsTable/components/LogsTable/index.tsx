
import React from "react";
import type { EmailLog } from "@/types/email";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  getTemplateTypeLabel,
  formatDateTime,
  formatTimeOnly,
} from "../../functions/formatLogValues";
import styles from "./LogsTable.module.css";

interface LogsTableProps {
  logs: EmailLog[];
  totalLogsCount: number;
  onPreview: (log: EmailLog) => void;
  onResend: (log: EmailLog) => Promise<void>;
  resendingId: string | null;
}

export default function LogsTable({
  logs,
  totalLogsCount,
  onPreview,
  onResend,
  resendingId,
}: LogsTableProps) {
  if (totalLogsCount === 0) {
    return (
      <div className={styles.emptyState}>
        <Clock size={32} className={styles.emptyIcon} />
        <p className={styles.emptyText}>
          No email logs recorded yet for this event.
        </p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Clock size={32} className={styles.emptyIcon} />
        <p className={styles.emptyText}>
          No email logs match the selected filters.
        </p>
      </div>
    );
  }

  return (
    <div className={`${styles.tableWrapper} scrollbar`}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={styles.tableHeaderCell}>Recipient</TableHead>
            <TableHead className={styles.tableHeaderCell}>Type</TableHead>
            <TableHead className={styles.tableHeaderCell}>Subject</TableHead>
            <TableHead className={styles.tableHeaderCell}>Status</TableHead>
            <TableHead className={styles.tableHeaderCell}>Open Tracking</TableHead>
            <TableHead className={styles.tableHeaderCell}>Sent At</TableHead>
            <TableHead className={styles.tableHeaderCell}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const isOpened =
              (log.openCount !== undefined && log.openCount > 0) ||
              Boolean(log.openedAt);
            const typeName = getTemplateTypeLabel(log.templateType);

            return (
              <TableRow key={log.id}>
                {/* Recipient */}
                <TableCell className={styles.tableCell}>
                  <div className={styles.recipientCol}>
                    <span className={styles.recipientName}>
                      {log.recipientName || "Attendee"}
                    </span>
                    <span className={styles.recipientEmail}>
                      {log.recipientEmail}
                    </span>
                  </div>
                </TableCell>

                {/* Email Type Badge */}
                <TableCell className={styles.tableCell}>
                  <span className={styles.typeBadge}>{typeName}</span>
                </TableCell>

                {/* Subject */}
                <TableCell className={styles.tableCell}>
                  <span className={styles.subjectText}>{log.subject}</span>
                </TableCell>

                {/* Status Badge */}
                <TableCell className={styles.tableCell}>
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
                </TableCell>

                {/* Open Tracking Status */}
                <TableCell className={styles.tableCell}>
                  {isOpened ? (
                    <span className={styles.openedBadge}>
                      <CheckCircle2 size={13} />
                      <span>
                        {log.openedAt
                          ? `Opened at ${formatTimeOnly(log.openedAt)} (${log.openCount || 1}x)`
                          : `Opened (${log.openCount || 1}x)`}
                      </span>
                    </span>
                  ) : (
                    <span className={styles.unopenedBadge}>
                      <Clock size={13} />
                      <span>Unopened</span>
                    </span>
                  )}
                </TableCell>

                {/* Sent Timestamp */}
                <TableCell className={styles.tableCell}>
                  <div className={styles.timeCol}>
                    <span className={styles.timeText}>
                      {formatDateTime(log.sentAt)}
                    </span>
                    {log.resentCount && log.resentCount > 0 ? (
                      <span className={styles.resentTag}>
                        Resent ({log.resentCount}x)
                      </span>
                    ) : null}
                  </div>
                </TableCell>

                {/* Actions: Preview & Resend */}
                <TableCell className={styles.tableCell}>
                  <div className={styles.actionsCol}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => onPreview(log)}
                      title="Preview sent email HTML"
                      aria-label="Preview Sent Email"
                    >
                      <Eye size={13} />
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => onResend(log)}
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
