"use client";

import React from "react";
import type {
  EventInsightsSummary,
  TierBreakdownItem,
} from "@/types/attendee";
import {
  Gauge,
  Ticket,
  AlertTriangle,
  CheckCircle,
  IndianRupee,
  Sparkles,
} from "lucide-react";
import styles from "./CapacityMeter.module.css";

interface CapacityMeterProps {
  summary: EventInsightsSummary;
  tierBreakdown: TierBreakdownItem[];
  availabilityRemaining?: number | null;
}

export default function CapacityMeter({
  summary,
  tierBreakdown,
  availabilityRemaining,
}: CapacityMeterProps) {
  const totalCapacity = summary.capacity;
  const isUnlimited = totalCapacity === null || totalCapacity === 0;

  const capacityPercentage =
    !isUnlimited && totalCapacity
      ? Math.min(100, Math.round((summary.confirmedCount / totalCapacity) * 100))
      : 0;

  const isNearingCapacity = !isUnlimited && capacityPercentage >= 85;
  const isSoldOut = !isUnlimited && capacityPercentage >= 100;

  const formatRupees = (paise: number) => {
    return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
  };

  return (
    <div className={styles.container}>
      {/* Overall Event Capacity Utilization */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.headerTitleRow}>
              <Gauge size={18} className={styles.headerIcon} />
              <h2 className={styles.sectionTitle}>Capacity Utilization</h2>
            </div>
            <span className={styles.sectionSubtitle}>
              Real-time ticket allocation and inventory saturation
            </span>
          </div>

          <div className={styles.badgeRow}>
            {isSoldOut ? (
              <span className={styles.badgeDanger}>Sold Out</span>
            ) : isNearingCapacity ? (
              <span className={styles.badgeWarning}>Nearing Capacity</span>
            ) : isUnlimited ? (
              <span className={styles.badgeInfo}>Unlimited Capacity</span>
            ) : (
              <span className={styles.badgeSuccess}>Healthy Inventory</span>
            )}
          </div>
        </div>

        {/* Warning Banner if Nearing Capacity */}
        {isNearingCapacity && (
          <div
            className={isSoldOut ? styles.bannerDanger : styles.bannerWarning}
          >
            <AlertTriangle size={16} />
            <span>
              {isSoldOut
                ? "Event is completely sold out! All allocated spots have been claimed."
                : `High Demand: ${capacityPercentage}% of capacity claimed. Only ${
                    summary.remainingCapacity ?? 0
                  } spots remain.`}
            </span>
          </div>
        )}

        {/* Big Meter Bar */}
        <div className={styles.meterContainer}>
          <div className={styles.meterTop}>
            <div className={styles.statGroup}>
              <span className={styles.statPrimary}>
                {summary.confirmedCount.toLocaleString("en-IN")}
              </span>
              <span className={styles.statDivider}>/</span>
              <span className={styles.statSecondary}>
                {isUnlimited ? "∞" : totalCapacity?.toLocaleString("en-IN")}
              </span>
              <span className={styles.statLabel}>confirmed attendees</span>
            </div>

            {!isUnlimited && (
              <span className={styles.meterPercent}>
                {capacityPercentage}% filled
              </span>
            )}
          </div>

          <div className={styles.progressBarWrapper}>
            <div
              className={`${styles.progressBarFill} ${
                isSoldOut
                  ? styles.fillDanger
                  : isNearingCapacity
                    ? styles.fillWarning
                    : styles.fillSuccess
              }`}
              style={{
                width: isUnlimited
                  ? summary.confirmedCount > 0
                    ? "100%"
                    : "0%"
                  : `${capacityPercentage}%`,
              }}
            />
          </div>

          {/* Meter Legend & Sub-metrics */}
          <div className={styles.legendRow}>
            <div className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{
                  background: isSoldOut
                    ? "var(--status-danger)"
                    : isNearingCapacity
                      ? "var(--status-warning)"
                      : "var(--status-success)",
                }}
              />
              <span>
                Sold / Confirmed:{" "}
                <strong>{summary.confirmedCount.toLocaleString("en-IN")}</strong>
              </span>
            </div>

            {!isUnlimited && (
              <div className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ background: "var(--text-muted)" }}
                />
                <span>
                  Remaining:{" "}
                  <strong>
                    {summary.remainingCapacity?.toLocaleString("en-IN") ?? 0}
                  </strong>
                </span>
              </div>
            )}

            {availabilityRemaining !== undefined &&
              availabilityRemaining !== null && (
                <div className={styles.legendItem}>
                  <Sparkles size={12} className={styles.legendIcon} />
                  <span>
                    Checkout Spots Left:{" "}
                    <strong>{availabilityRemaining}</strong>
                  </span>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Ticket Tier Breakdown */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.headerTitleRow}>
              <Ticket size={18} className={styles.headerIcon} />
              <h2 className={styles.sectionTitle}>Ticket Tiers</h2>
            </div>
            <span className={styles.sectionSubtitle}>
              Breakdown of inventory and revenue generated per ticket tier
            </span>
          </div>
        </div>

        <div className={styles.tierList}>
          {tierBreakdown && tierBreakdown.length > 0 ? (
            tierBreakdown.map((tier) => {
              const tierCapacity = tier.capacity;
              const hasTierLimit =
                tierCapacity !== null && tierCapacity !== undefined && tierCapacity > 0;
              const tierPct = hasTierLimit
                ? Math.min(100, Math.round((tier.sold / tierCapacity) * 100))
                : 0;
              const isTierSoldOut = hasTierLimit && tier.sold >= tierCapacity;

              return (
                <div key={tier.ticketTypeId} className={styles.tierItem}>
                  <div className={styles.tierTop}>
                    <div className={styles.tierMeta}>
                      <span className={styles.tierName}>{tier.name}</span>
                      {isTierSoldOut ? (
                        <span className={styles.tierBadgeDanger}>Sold Out</span>
                      ) : tier.sold > 0 ? (
                        <span className={styles.tierBadgeActive}>Active</span>
                      ) : (
                        <span className={styles.tierBadgeInactive}>No Sales</span>
                      )}
                    </div>

                    <div className={styles.tierCounts}>
                      <span className={styles.tierSoldCount}>
                        {tier.sold.toLocaleString("en-IN")}
                      </span>
                      <span className={styles.tierCapacityCount}>
                        / {hasTierLimit ? tierCapacity : "∞"}
                      </span>
                      {hasTierLimit && (
                        <span className={styles.tierPercentText}>
                          ({tierPct}%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tier Progress Bar */}
                  {hasTierLimit && (
                    <div className={styles.tierProgressTrack}>
                      <div
                        className={`${styles.tierProgressFill} ${
                          isTierSoldOut
                            ? styles.tierFillDanger
                            : tierPct >= 85
                              ? styles.tierFillWarning
                              : styles.tierFillPrimary
                        }`}
                        style={{ width: `${tierPct}%` }}
                      />
                    </div>
                  )}

                  {/* Sub-row: Revenue & Check-Ins */}
                  <div className={styles.tierBottomRow}>
                    <div className={styles.tierSubMetric}>
                      <IndianRupee size={13} />
                      <span>
                        Revenue:{" "}
                        <strong>{formatRupees(tier.revenuePaise)}</strong>
                      </span>
                    </div>

                    <div className={styles.tierSubMetric}>
                      <CheckCircle size={13} />
                      <span>
                        Checked In:{" "}
                        <strong>
                          {tier.checkedIn.toLocaleString("en-IN")}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className={styles.emptyTiers}>
              <Ticket size={28} className={styles.emptyIcon} />
              <span>No ticket tiers configured for this event.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

