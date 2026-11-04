"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { format, parseISO, subDays } from "date-fns";
import type {
  DailySeriesItem,
  HourlyCheckInItem,
  EventInsightsSummary,
} from "@/types/attendee";
import {
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  Zap,
} from "lucide-react";
import styles from "./InsightsCharts.module.css";

interface InsightsChartsProps {
  eventId: string;
  dailySeries: DailySeriesItem[];
  hourlyCheckIns: HourlyCheckInItem[];
  summary: EventInsightsSummary;
}

type MetricType = "registrations" | "revenue";
type RangeType = "7d" | "30d" | "all";

export default function InsightsCharts({
  eventId,
  dailySeries,
  hourlyCheckIns,
  summary,
}: InsightsChartsProps) {
  const [metric, setMetric] = useState<MetricType>("registrations");
  const [range, setRange] = useState<RangeType>("30d");
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Filter series based on selected range
  const filteredSeries = useMemo(() => {
    if (!dailySeries || dailySeries.length === 0) return [];
    if (range === "all") return dailySeries;

    const daysCount = range === "7d" ? 7 : 30;
    const cutoffDate = subDays(new Date(), daysCount);

    const filtered = dailySeries.filter((item) => {
      try {
        const itemDate = parseISO(item.date);
        return itemDate >= cutoffDate;
      } catch {
        return true;
      }
    });

    return filtered.length > 0 ? filtered : dailySeries.slice(-daysCount);
  }, [dailySeries, range]);

  // Total for the selected metric and range
  const metricTotal = useMemo(() => {
    if (filteredSeries.length === 0) return 0;
    return filteredSeries.reduce((acc, curr) => {
      return (
        acc +
        (metric === "registrations"
          ? curr.registrations
          : Math.round(curr.revenuePaise / 100))
      );
    }, 0);
  }, [filteredSeries, metric]);

  // Chart SVG Dimensions
  const svgWidth = 640;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingTop = 20;
  const paddingBottom = 40;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Compute maximum value for scale
  const maxValue = useMemo(() => {
    if (filteredSeries.length === 0) return 10;
    const max = Math.max(
      ...filteredSeries.map((d) =>
        metric === "registrations"
          ? d.registrations
          : Math.round(d.revenuePaise / 100),
      ),
    );
    return max > 0 ? max : 10;
  }, [filteredSeries, metric]);

  // Coordinates calculation
  const points = useMemo(() => {
    if (filteredSeries.length === 0) return [];
    if (filteredSeries.length === 1) {
      const val =
        metric === "registrations"
          ? filteredSeries[0]!.registrations
          : Math.round(filteredSeries[0]!.revenuePaise / 100);
      const y = paddingTop + chartHeight - (val / maxValue) * chartHeight;
      return [
        {
          x: paddingX + chartWidth / 2,
          y,
          val,
          item: filteredSeries[0]!,
        },
      ];
    }

    return filteredSeries.map((item, index) => {
      const val =
        metric === "registrations"
          ? item.registrations
          : Math.round(item.revenuePaise / 100);
      const x = paddingX + (index / (filteredSeries.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (val / maxValue) * chartHeight;
      return { x, y, val, item };
    });
  }, [filteredSeries, metric, maxValue, chartWidth, chartHeight]);

  // Construct SVG paths
  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    if (points.length === 1) {
      return `M ${paddingX} ${points[0]!.y} L ${paddingX + chartWidth} ${points[0]!.y}`;
    }
    return points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, "");
  }, [points, chartWidth]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return "";
    const bottomY = paddingTop + chartHeight;
    if (points.length === 1) {
      return `M ${paddingX} ${points[0]!.y} L ${paddingX + chartWidth} ${points[0]!.y} L ${paddingX + chartWidth} ${bottomY} L ${paddingX} ${bottomY} Z`;
    }
    const firstX = points[0]!.x;
    const lastX = points[points.length - 1]!.x;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [linePath, points, chartHeight]);

  // Peak hourly check-in
  const peakCheckIn = useMemo(() => {
    if (!hourlyCheckIns || hourlyCheckIns.length === 0) return null;
    return [...hourlyCheckIns].sort((a, b) => b.count - a.count)[0];
  }, [hourlyCheckIns]);

  const maxHourlyCount = useMemo(() => {
    if (!hourlyCheckIns || hourlyCheckIns.length === 0) return 1;
    const max = Math.max(...hourlyCheckIns.map((h) => h.count));
    return max > 0 ? max : 1;
  }, [hourlyCheckIns]);

  return (
    <div className={styles.insightsWrapper}>
      {/* Pending Approvals Alert Banner */}
      {summary.pendingApprovalCount > 0 && (
        <div className={styles.approvalAlert}>
          <div className={styles.alertLeft}>
            <AlertCircle size={18} className={styles.alertIcon} />
            <span>
              <strong>{summary.pendingApprovalCount}</strong>{" "}
              {summary.pendingApprovalCount === 1
                ? "attendee is"
                : "attendees are"}{" "}
              awaiting your approval before their tickets are issued.
            </span>
          </div>
          <Link
            href={`/edit/${eventId}/attendees?status=pending_approval`}
            className={styles.alertLink}
          >
            Review Approvals
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Main Trend Chart Card */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.metricSwitcher}>
              <button
                type="button"
                className={`${styles.metricTab} ${
                  metric === "registrations" ? styles.activeTab : ""
                }`}
                onClick={() => setMetric("registrations")}
              >
                <Users size={16} />
                Registrations
              </button>
              <button
                type="button"
                className={`${styles.metricTab} ${
                  metric === "revenue" ? styles.activeTab : ""
                }`}
                onClick={() => setMetric("revenue")}
              >
                <TrendingUp size={16} />
                Revenue
              </button>
            </div>

            <div className={styles.headlineMetrics}>
              <span className={styles.headlineValue}>
                {metric === "registrations"
                  ? metricTotal.toLocaleString("en-IN")
                  : `₹${metricTotal.toLocaleString("en-IN")}`}
              </span>
              <span className={styles.headlineLabel}>
                total {metric} ({range === "all" ? "all time" : `last ${range}`})
              </span>
            </div>
          </div>

          <div className={styles.rangeSwitcher}>
            {(["7d", "30d", "all"] as RangeType[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`${styles.rangeBtn} ${
                  range === r ? styles.activeRange : ""
                }`}
                onClick={() => setRange(r)}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Area / Line Chart */}
        <div className={styles.svgContainer}>
          {points.length === 0 ? (
            <div className={styles.emptyChart}>
              <Clock size={28} />
              <span>No time-series data yet for this period</span>
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className={styles.svgChart}
              preserveAspectRatio="xMidYMid meet"
              onMouseLeave={() => setHoveredPointIndex(null)}
            >
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--text-primary)"
                    stopOpacity="0.25"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--text-primary)"
                    stopOpacity="0.0"
                  />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = paddingTop + chartHeight * pct;
                return (
                  <line
                    key={i}
                    x1={paddingX}
                    y1={y}
                    x2={svgWidth - paddingX}
                    y2={y}
                    stroke="var(--border-subtle)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Shaded Area */}
              <path d={areaPath} fill="url(#trendGradient)" />

              {/* Trend Polyline */}
              <path
                d={linePath}
                fill="none"
                stroke="var(--text-primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Active Crosshair Line on Hover */}
              {hoveredPointIndex !== null && points[hoveredPointIndex] && (
                <line
                  x1={points[hoveredPointIndex]!.x}
                  y1={paddingTop}
                  x2={points[hoveredPointIndex]!.x}
                  y2={paddingTop + chartHeight}
                  stroke="var(--text-muted)"
                  strokeDasharray="2 2"
                  strokeWidth="1.5"
                />
              )}

              {/* Interactive Data Points */}
              {points.map((pt, idx) => (
                <g key={idx}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPointIndex === idx ? 6 : 4}
                    fill={
                      hoveredPointIndex === idx
                        ? "var(--text-primary)"
                        : "var(--color-bg-base)"
                    }
                    stroke="var(--text-primary)"
                    strokeWidth="2"
                    className={styles.chartPoint}
                    onMouseEnter={() => setHoveredPointIndex(idx)}
                  />
                </g>
              ))}

              {/* X Axis Date Labels */}
              {points.length > 0 &&
                (() => {
                  const step = Math.max(1, Math.floor(points.length / 5));
                  const labelIndices = [];
                  for (let i = 0; i < points.length; i += step) {
                    labelIndices.push(i);
                  }
                  if (labelIndices[labelIndices.length - 1] !== points.length - 1) {
                    labelIndices.push(points.length - 1);
                  }

                  return labelIndices.map((idx) => {
                    const pt = points[idx]!;
                    let label = pt.item.date;
                    try {
                      label = format(parseISO(pt.item.date), "MMM d");
                    } catch {
                      // fallback to original string
                    }
                    return (
                      <text
                        key={idx}
                        x={pt.x}
                        y={svgHeight - 12}
                        textAnchor="middle"
                        fill="var(--text-muted)"
                        fontSize="11"
                        fontFamily="inherit"
                      >
                        {label}
                      </text>
                    );
                  });
                })()}
            </svg>
          )}

          {/* Interactive Tooltip Overlay */}
          {hoveredPointIndex !== null && points[hoveredPointIndex] && (
            <div
              className={styles.tooltip}
              style={{
                left: `${(points[hoveredPointIndex]!.x / svgWidth) * 100}%`,
                top: `${(points[hoveredPointIndex]!.y / svgHeight) * 100}%`,
              }}
            >
              <div className={styles.tooltipDate}>
                {(() => {
                  try {
                    return format(
                      parseISO(points[hoveredPointIndex]!.item.date),
                      "EEEE, MMM d, yyyy",
                    );
                  } catch {
                    return points[hoveredPointIndex]!.item.date;
                  }
                })()}
              </div>
              <div className={styles.tooltipValue}>
                {metric === "registrations"
                  ? `${points[hoveredPointIndex]!.val.toLocaleString("en-IN")} registrations`
                  : `₹${points[hoveredPointIndex]!.val.toLocaleString("en-IN")}`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Check-In Velocity & Conversion Funnel */}
      <div className={styles.dualGrid}>
        {/* Check-In Velocity */}
        <div className={styles.subCard}>
          <div className={styles.subCardHeader}>
            <div>
              <h3 className={styles.subCardTitle}>Check-In Velocity</h3>
              <span className={styles.subCardSubtitle}>
                Hourly distribution of door arrivals
              </span>
            </div>
            {peakCheckIn && peakCheckIn.count > 0 && (
              <div className={styles.peakBadge}>
                <Zap size={14} />
                <span>
                  Peak: {peakCheckIn.count} at {peakCheckIn.hour}
                </span>
              </div>
            )}
          </div>

          {hourlyCheckIns && hourlyCheckIns.length > 0 ? (
            <div className={styles.velocityBarsContainer}>
              <div className={styles.barsScroll}>
                {hourlyCheckIns.map((item, index) => {
                  const heightPercent = Math.max(
                    8,
                    Math.round((item.count / maxHourlyCount) * 100),
                  );
                  return (
                    <div
                      key={item.hour}
                      className={styles.barColumn}
                      onMouseEnter={() => setHoveredBarIndex(index)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                    >
                      {hoveredBarIndex === index && (
                        <div className={styles.barTooltip}>
                          <span>{item.count} check-ins</span>
                        </div>
                      )}
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className={styles.barLabel}>{item.hour}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={styles.emptyVelocity}>
              <Clock size={24} className={styles.emptyIcon} />
              <span>
                No check-ins recorded yet. Velocity will stream live as guests
                arrive.
              </span>
            </div>
          )}
        </div>

        {/* Conversion & Admission Funnel */}
        <div className={styles.subCard}>
          <div className={styles.subCardHeader}>
            <div>
              <h3 className={styles.subCardTitle}>Admission Funnel</h3>
              <span className={styles.subCardSubtitle}>
                Conversion from registration to door check-in
              </span>
            </div>
          </div>

          <div className={styles.funnelContainer}>
            {/* Step 1: Total Signups */}
            <div className={styles.funnelStep}>
              <div className={styles.stepTop}>
                <div className={styles.stepTitle}>
                  <Users size={16} />
                  <span>Total Signups</span>
                </div>
                <span className={styles.stepCount}>
                  {summary.totalRegistrations.toLocaleString("en-IN")}
                </span>
              </div>
              <div className={styles.funnelBar}>
                <div
                  className={styles.funnelProgress}
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            {/* Step 2: Confirmed */}
            <div className={styles.funnelStep}>
              <div className={styles.stepTop}>
                <div className={styles.stepTitle}>
                  <CheckCircle2 size={16} />
                  <span>Confirmed & Issued</span>
                </div>
                <div className={styles.stepMetrics}>
                  <span className={styles.stepCount}>
                    {summary.confirmedCount.toLocaleString("en-IN")}
                  </span>
                  <span className={styles.stepPercent}>
                    {summary.totalRegistrations > 0
                      ? `${Math.round(
                          (summary.confirmedCount /
                            summary.totalRegistrations) *
                            100,
                        )}%`
                      : "0%"}
                  </span>
                </div>
              </div>
              <div className={styles.funnelBar}>
                <div
                  className={styles.funnelProgress}
                  style={{
                    width: `${
                      summary.totalRegistrations > 0
                        ? Math.min(
                            100,
                            (summary.confirmedCount /
                              summary.totalRegistrations) *
                              100,
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Step 3: Checked In */}
            <div className={styles.funnelStep}>
              <div className={styles.stepTop}>
                <div className={styles.stepTitle}>
                  <Zap size={16} />
                  <span>Checked In (Door)</span>
                </div>
                <div className={styles.stepMetrics}>
                  <span className={styles.stepCount}>
                    {summary.checkedInCount.toLocaleString("en-IN")}
                  </span>
                  <span className={styles.stepPercentHighlight}>
                    {summary.checkInRatePercent}%
                  </span>
                </div>
              </div>
              <div className={styles.funnelBar}>
                <div
                  className={styles.funnelProgressHighlight}
                  style={{
                    width: `${Math.min(100, summary.checkInRatePercent)}%`,
                  }}
                />
              </div>
            </div>

            {/* Coupon / Promotion stat if available */}
            {summary.couponOrdersCount > 0 && (
              <div className={styles.couponNote}>
                <span>
                  🏷️ <strong>{summary.couponOrdersCount}</strong> orders used a
                  discount promo code.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
