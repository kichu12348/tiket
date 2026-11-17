
import React from "react";
import type { EmailAnalytics } from "@/types/email";
import {
  Mail,
  MailOpen,
  EyeOff,
  AlertTriangle,
  Clock,
} from "lucide-react";
import styles from "./AnalyticsCards.module.css";

interface AnalyticsCardsProps {
  metrics: EmailAnalytics;
}

export default function AnalyticsCards({ metrics }: AnalyticsCardsProps) {
  return (
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

      {metrics.queuedCount !== undefined && metrics.queuedCount > 0 && (
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Queued</span>
            <Clock size={16} className={styles.kpiIconMuted} />
          </div>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>{metrics.queuedCount}</span>
          </div>
          <span className={styles.kpiSub}>Awaiting transmission</span>
        </div>
      )}
    </div>
  );
}
