"use client";

import { useMemo } from "react";
import type {
  EmailAnalytics,
  EmailLog,
  OpenTimeBucketItem,
} from "@/types/email";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Clock } from "lucide-react";
import { getTemplateTypeLabel } from "../../functions/formatLogValues";
import { computeOpenTimeDistribution } from "../../functions/computeEmailMetrics";
import styles from "./AnalyticsCharts.module.css";

interface AnalyticsChartsProps {
  metrics: EmailAnalytics;
  logs?: EmailLog[];
}

interface CustomTooltipPayloadItem {
  name?: string;
  value?: number;
  dataKey?: string;
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
        <div className={styles.tooltipLabelGroup}>
          <span className={styles.legendColorSent} />
          <span>Sent:</span>
        </div>
        <span className={styles.tooltipValSent}>{item.Sent}</span>
      </div>
      <div className={styles.tooltipRow}>
        <div className={styles.tooltipLabelGroup}>
          <span className={styles.legendColorOpened} />
          <span>Opened:</span>
        </div>
        <span className={styles.tooltipValOpened}>
          {item.Opened} ({item.rate ?? 0}%)
        </span>
      </div>
    </div>
  );
}

interface CustomPieTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: OpenTimeBucketItem;
  }>;
}

function CustomPieTooltip({ active, payload }: CustomPieTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className={styles.customTooltip}>
      <span className={styles.tooltipTitle}>{item.bucket}</span>
      <div className={styles.tooltipRow}>
        <div className={styles.tooltipLabelGroup}>
          <span
            className={styles.breakdownColorIndicator}
            style={{
              backgroundColor: BUCKET_COLORS[item.bucket] || "var(--chart-1)",
            }}
          />
          <span>Opened:</span>
        </div>
        <span className={styles.tooltipValSent}>{item.count}</span>
      </div>
      <div className={styles.tooltipRow}>
        <span>Share:</span>
        <span className={styles.tooltipValOpened}>{item.percentage}%</span>
      </div>
    </div>
  );
}

const BUCKET_COLORS: Record<string, string> = {
  "Within 5 min": "var(--chart-1)",
  "Within 30 min": "var(--chart-2)",
  "Within 2 hr": "var(--chart-3)",
  "After 2 hr": "var(--chart-4)",
};

export default function AnalyticsCharts({
  metrics,
  logs,
}: AnalyticsChartsProps) {
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

  // Open Time Distribution: 4 buckets (Within 5 min, Within 30 min, Within 2 hr, After 2 hr)
  const openTimeData = useMemo(() => {
    if (
      metrics.openTimeDistribution &&
      metrics.openTimeDistribution.length > 0
    ) {
      return metrics.openTimeDistribution;
    }
    if (logs && logs.length > 0) {
      return computeOpenTimeDistribution(logs);
    }
    return [
      { bucket: "Within 5 min", count: 0, percentage: 0 },
      { bucket: "Within 30 min", count: 0, percentage: 0 },
      { bucket: "Within 2 hr", count: 0, percentage: 0 },
      { bucket: "After 2 hr", count: 0, percentage: 0 },
    ];
  }, [metrics.openTimeDistribution, logs]);

  const totalOpenedCount = useMemo(() => {
    return openTimeData.reduce((acc, curr) => acc + curr.count, 0);
  }, [openTimeData]);

  const activePieSlices = useMemo(() => {
    return openTimeData.filter((d) => d.count > 0);
  }, [openTimeData]);

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
                stroke="var(--chart-grid)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--chart-axis-text)", fontSize: 11 }}
                axisLine={{ stroke: "var(--chart-axis-line)" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "var(--chart-axis-text)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CustomBarTooltip />}
                cursor={{ fill: "var(--chart-cursor)", radius: 4 }}
              />
              <Bar
                dataKey="Sent"
                fill="var(--chart-bar-sent)"
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
              />
              <Bar
                dataKey="Opened"
                fill="var(--chart-bar-opened)"
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Opens Timeline Chart (Open Time Distribution Pie) */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <span className={styles.chartTitle}>Time to Open</span>
          <span className={styles.chartHeaderBadge}>Opens Timeline Chart</span>
        </div>

        <div className={styles.chartContainer}>
          {totalOpenedCount === 0 ? (
            <div className={styles.emptyChartPlaceholder}>
              <Clock size={20} className={styles.emptyIcon} />
              <span>No opened email events recorded yet</span>
            </div>
          ) : (
            <div className={styles.pieContainer}>
              <div className={styles.donutWrapper}>
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie
                      data={activePieSlices}
                      dataKey="count"
                      nameKey="bucket"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={65}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {activePieSlices.map((entry) => (
                        <Cell
                          key={`slice-${entry.bucket}`}
                          fill={BUCKET_COLORS[entry.bucket] || "var(--chart-1)"}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className={styles.donutCenter}>
                  <span className={styles.donutCenterNumber}>
                    {totalOpenedCount}
                  </span>
                  <span className={styles.donutCenterLabel}>Opened</span>
                </div>
              </div>

              <div className={styles.breakdownGrid}>
                {openTimeData.map((item) => {
                  const color = BUCKET_COLORS[item.bucket] || "var(--chart-1)";
                  return (
                    <div key={item.bucket} className={styles.breakdownRow}>
                      <div className={styles.breakdownNameCol}>
                        <span
                          className={styles.breakdownColorIndicator}
                          style={{ backgroundColor: color }}
                        />
                        <span className={styles.breakdownBucketName}>
                          {item.bucket}
                        </span>
                      </div>
                      <div className={styles.breakdownValuesCol}>
                        <span className={styles.breakdownCountVal}>
                          {item.count}
                        </span>
                        <span className={styles.breakdownPercentVal}>
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
