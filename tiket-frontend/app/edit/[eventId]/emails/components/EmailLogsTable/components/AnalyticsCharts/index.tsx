"use client";

import { useMemo } from "react";
import type { EmailAnalytics } from "@/types/email";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Clock } from "lucide-react";
import { getTemplateTypeLabel } from "../../functions/formatLogValues";
import styles from "./AnalyticsCharts.module.css";

interface AnalyticsChartsProps {
  metrics: EmailAnalytics;
}

interface CustomTooltipPayloadItem {
  name: string;
  value: number;
  dataKey: string;
  payload?: {
    name?: string;
    date?: string;
    fullDate?: string;
    Sent: number;
    Opened: number;
    rate?: number;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  label?: string;
}

function CustomBarTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className={styles.customTooltip}>
      <span className={styles.tooltipTitle}>{label}</span>
      <div className={styles.tooltipRow}>
        <span>Sent:</span>
        <span className={styles.tooltipValSent}>{item.Sent}</span>
      </div>
      <div className={styles.tooltipRow}>
        <span>Opened:</span>
        <span className={styles.tooltipValOpened}>
          {item.Opened} ({item.rate ?? 0}%)
        </span>
      </div>
    </div>
  );
}

function CustomTimelineTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className={styles.customTooltip}>
      <span className={styles.tooltipTitle}>{item.fullDate || item.date}</span>
      <div className={styles.tooltipRow}>
        <span>Sent:</span>
        <span className={styles.tooltipValSent}>{item.Sent}</span>
      </div>
      <div className={styles.tooltipRow}>
        <span>Opened:</span>
        <span className={styles.tooltipValOpened}>{item.Opened}</span>
      </div>
    </div>
  );
}

export default function AnalyticsCharts({ metrics }: AnalyticsChartsProps) {
  // Bar chart data: Sent vs Opened by Type
  const barChartData = useMemo(() => {
    const rawTypes =
      metrics.byType && metrics.byType.length > 0
        ? metrics.byType
        : [
            {
              templateType: "confirmation",
              sent: 0,
              opened: 0,
              openRatePercent: 0,
            },
            { templateType: "checkin", sent: 0, opened: 0, openRatePercent: 0 },
            {
              templateType: "invitation",
              sent: 0,
              opened: 0,
              openRatePercent: 0,
            },
            {
              templateType: "thank_you",
              sent: 0,
              opened: 0,
              openRatePercent: 0,
            },
            { templateType: "sorry", sent: 0, opened: 0, openRatePercent: 0 },
            { templateType: "custom", sent: 0, opened: 0, openRatePercent: 0 },
          ];

    return rawTypes.map((t) => ({
      name: getTemplateTypeLabel(t.templateType),
      Sent: t.sent,
      Opened: t.opened,
      rate: t.openRatePercent,
    }));
  }, [metrics.byType]);

  // Timeline chart data
  const timelineChartData = useMemo(() => {
    if (!metrics.timeline || metrics.timeline.length === 0) return [];
    return metrics.timeline.map((d) => ({
      date: d.bucket.slice(5),
      fullDate: d.bucket,
      Sent: d.sent,
      Opened: d.opened,
    }));
  }, [metrics.timeline]);

  return (
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

        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={barChartData}
              margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar
                dataKey="Sent"
                fill="rgba(255,255,255,0.3)"
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
              />
              <Bar
                dataKey="Opened"
                fill="#28a745"
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
              />
            </BarChart>
          </ResponsiveContainer>
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

        <div className={styles.chartContainer}>
          {timelineChartData.length === 0 ? (
            <div className={styles.emptyChartPlaceholder}>
              <Clock size={20} className={styles.emptyIcon} />
              <span>No delivery timeline events recorded yet</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart
                data={timelineChartData}
                margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="rgba(255,255,255,0.4)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor="rgba(255,255,255,0.4)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="gradOpened" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#28a745" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#28a745" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTimelineTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Sent"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gradSent)"
                />
                <Area
                  type="monotone"
                  dataKey="Opened"
                  stroke="#28a745"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gradOpened)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
