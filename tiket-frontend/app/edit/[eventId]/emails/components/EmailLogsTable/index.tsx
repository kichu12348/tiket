"use client";

import React from "react";
import { EmailLog } from "@/types/email";
import { History, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import styles from "./EmailLogsTable.module.css";

interface EmailLogsTableProps {
  logs: EmailLog[];
  isLoading: boolean;
}

export default function EmailLogsTable({ logs, isLoading }: EmailLogsTableProps) {
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

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <History size={16} className={styles.icon} />
          <h4 className={styles.title}>Email Delivery History Logs ({logs.length})</h4>
        </div>
        <p className={styles.subtitle}>
          Track sent invitations, confirmations, test messages, and automated email dispatches.
        </p>
      </div>

      {logs.length === 0 ? (
        <div className={styles.emptyState}>
          <Clock size={32} className={styles.emptyIcon} />
          <p className={styles.emptyText}>No email logs recorded yet for this event.</p>
        </div>
      ) : (
        <div className={`${styles.tableWrapper} scrollbar`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Sent At</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <div className={styles.recipientCol}>
                      <span className={styles.recipientName}>
                        {log.recipientName || "Attendee"}
                      </span>
                      <span className={styles.recipientEmail}>{log.recipientEmail}</span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.subjectText}>{log.subject}</span>
                  </td>
                  <td>
                    <span className={styles.statusBadge} data-status={log.status}>
                      {log.status === "sent" ? (
                        <CheckCircle size={12} />
                      ) : (
                        <AlertTriangle size={12} />
                      )}
                      <span>{log.status.toUpperCase()}</span>
                    </span>
                  </td>
                  <td>
                    <span className={styles.timeText}>
                      {new Date(log.sentAt).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
