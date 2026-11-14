"use client";

import type { OperationsSummary, TierCheckInStat } from "@/types/operations";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCheck, Calendar, Users, Clock, Ticket } from "lucide-react";
import styles from "./OperationsStats.module.css";

export interface OperationsStatsProps {
  summary?: OperationsSummary | null;
  loading?: boolean;
}

function getTierModeLabel(tier: TierCheckInStat): string {
  if (tier.multiDayCheckIn) {
    if (tier.maxCheckInsPerDay && tier.maxCheckInsPerDay > 0) {
      return `Multi-Day · ${tier.maxCheckInsPerDay}/day`;
    }
    return "Multi-Day · Unlimited";
  }
  return "Single-Use";
}

export default function OperationsStats({
  summary,
  loading = false,
}: OperationsStatsProps) {
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.kpiGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
        <div className={styles.tierSection}>
          <Skeleton className="h-6 w-48 mb-2" />
          <div className={styles.tierList}>
            {[1, 2].map((i) => (
              <div key={i} className={styles.tierCard}>
                <div className={styles.tierHeader}>
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalTickets = summary?.totalTickets ?? 0;
  const checkedInTotal = summary?.checkedInTotal ?? 0;
  const checkedInToday = summary?.checkedInToday ?? 0;
  const pendingApprovals = summary?.pendingApprovals ?? 0;
  const remainingArrivals = Math.max(0, totalTickets - checkedInTotal);
  const tiers = summary?.tiers ?? [];

  const totalCheckInPercent =
    totalTickets > 0 ? Math.round((checkedInTotal / totalTickets) * 100) : 0;

  return (
    <div className={styles.container}>
      {/* 4-card KPI Grid */}
      <div className={styles.kpiGrid}>
        {/* 1. Total Checked In */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Total Checked In</span>
            <div className={styles.kpiIconWrapperSuccess}>
              <UserCheck size={18} />
            </div>
          </div>
          <div className={styles.kpiBody}>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{checkedInTotal}</span>
              <span className={styles.kpiSubtext}>/ {totalTickets} total</span>
            </div>
            <div className={styles.progressWrapper}>
              <div className={styles.progressMeta}>
                <span>Progress</span>
                <span>{totalCheckInPercent}%</span>
              </div>
              <Progress
                value={totalCheckInPercent}
                className={styles.progressBar}
              />
            </div>
          </div>
        </div>

        {/* 2. Checked In Today */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Checked In Today</span>
            <div className={styles.kpiIconWrapper}>
              <Calendar size={18} />
            </div>
          </div>
          <div className={styles.kpiBody}>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{checkedInToday}</span>
              <span className={styles.kpiSubtext}>today</span>
            </div>
            <span className={styles.kpiSubtext}>Active session check-ins</span>
          </div>
        </div>

        {/* 3. Remaining Arrivals */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Remaining Arrivals</span>
            <div className={styles.kpiIconWrapper}>
              <Users size={18} />
            </div>
          </div>
          <div className={styles.kpiBody}>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{remainingArrivals}</span>
              <span className={styles.kpiSubtext}>expected</span>
            </div>
            <span className={styles.kpiSubtext}>Ticket holders yet to arrive</span>
          </div>
        </div>

        {/* 4. Pending Approvals */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Pending Approvals</span>
            <div
              className={
                pendingApprovals > 0
                  ? styles.kpiIconWrapperWarning
                  : styles.kpiIconWrapper
              }
            >
              <Clock size={18} />
            </div>
          </div>
          <div className={styles.kpiBody}>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{pendingApprovals}</span>
              <span className={styles.kpiSubtext}>requests</span>
            </div>
            <span className={styles.kpiSubtext}>
              {pendingApprovals > 0
                ? "Requires host approval"
                : "All registrations processed"}
            </span>
          </div>
        </div>
      </div>

      {/* Check-In Progress by Ticket Tier */}
      <div className={styles.tierSection}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            Check-In Progress by Ticket Tier
          </h3>
        </div>

        {tiers.length === 0 ? (
          <div className={styles.emptyTiers}>
            <Ticket size={24} className="mx-auto mb-2 opacity-40" />
            <p>No ticket tier data available</p>
          </div>
        ) : (
          <div className={styles.tierList}>
            {tiers.map((tier) => {
              const tierPercent =
                tier.total > 0
                  ? Math.round((tier.checkedIn / tier.total) * 100)
                  : 0;
              const modeLabel = getTierModeLabel(tier);

              return (
                <div key={tier.ticketTypeId} className={styles.tierCard}>
                  <div className={styles.tierHeader}>
                    <div className={styles.tierTitleBlock}>
                      <span className={styles.tierName}>{tier.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {modeLabel}
                      </Badge>
                    </div>
                    <div className={styles.tierStatsBlock}>
                      <span className={styles.tierCount}>
                        <span className={styles.tierCountStrong}>
                          {tier.checkedIn}
                        </span>{" "}
                        / {tier.total}
                      </span>
                      <span className={styles.tierPercentBadge}>
                        {tierPercent}%
                      </span>
                    </div>
                  </div>
                  <Progress value={tierPercent} className={styles.progressBar} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
