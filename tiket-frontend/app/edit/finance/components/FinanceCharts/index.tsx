import { useMemo } from "react";
import type { DailyRevenuePoint, TierRevenueSummary } from "@/types/commerce";
import { formatMoney } from "@/lib/money";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { TrendingUp, BarChart2 } from "lucide-react";
import styles from "./FinanceCharts.module.css";

export interface FinanceChartsProps {
  dailyRevenueSeries?: DailyRevenuePoint[];
  revenueByTier?: TierRevenueSummary[];
  grossRevenuePaise: number;
  netOrganizerRevenuePaise: number;
  platformFeesPaise: number;
  totalDiscountsPaise: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      date: string;
      formattedDate: string;
      grossPaise: number;
      netPaise: number;
      ordersCount: number;
    };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;

  return (
    <div className={styles.customTooltip}>
      <span className={styles.tooltipDate}>{data.formattedDate}</span>
      <div className={styles.tooltipItem}>
        <span className={styles.tooltipLabel}>Net Organizer:</span>
        <span className={styles.tooltipValue}>
          {formatMoney(data.netPaise)}
        </span>
      </div>
      <div className={styles.tooltipItem}>
        <span className={styles.tooltipLabel}>Gross Revenue:</span>
        <span className={styles.tooltipValue}>
          {formatMoney(data.grossPaise)}
        </span>
      </div>
      <div className={styles.tooltipItem}>
        <span className={styles.tooltipLabel}>Paid Orders:</span>
        <span className={styles.tooltipValue}>{data.ordersCount}</span>
      </div>
    </div>
  );
}

export default function FinanceCharts({
  dailyRevenueSeries = [],
  revenueByTier = [],
  grossRevenuePaise,
  netOrganizerRevenuePaise,
  platformFeesPaise,
  totalDiscountsPaise,
}: FinanceChartsProps) {
  const chartData = useMemo(() => {
    return dailyRevenueSeries.map((pt) => {
      let formattedDate = pt.date;
      try {
        const parts = pt.date.split("-");
        if (parts.length === 3) {
          const d = new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2]),
          );
          formattedDate = d.toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
          });
        }
      } catch {
        formattedDate = pt.date;
      }

      return {
        date: pt.date,
        formattedDate,
        gross: pt.grossPaise / 100,
        net: pt.netPaise / 100,
        grossPaise: pt.grossPaise,
        netPaise: pt.netPaise,
        ordersCount: pt.ordersCount,
      };
    });
  }, [dailyRevenueSeries]);

  const hasSales = chartData.some((pt) => pt.grossPaise > 0);

  // Waterfall calculation
  const totalBase = Math.max(
    grossRevenuePaise,
    netOrganizerRevenuePaise + platformFeesPaise + totalDiscountsPaise,
    1,
  );
  const netPct = Math.min(100, Math.max(0, (netOrganizerRevenuePaise / totalBase) * 100));
  const feesPct = Math.min(100 - netPct, Math.max(0, (platformFeesPaise / totalBase) * 100));
  const discountsPct = Math.min(
    100 - netPct - feesPct,
    Math.max(0, (totalDiscountsPaise / totalBase) * 100),
  );

  return (
    <div className={styles.chartsGrid} data-testid="finance-charts-grid">
      {/* 1. Revenue & Net Payout Trend (65% width) */}
      <div className={styles.chartCard}>
        <div className={styles.cardHeader}>
          <div className={styles.headerText}>
            <h3 className={styles.chartTitle}>Revenue & Net Payout Trend</h3>
            <p className={styles.chartSubtitle}>
              Daily gross sales vs net organizer earnings
            </p>
          </div>

          {hasSales && (
            <div className={styles.legendRow}>
              <div className={styles.legendItem}>
                <span className={styles.legendDotNet} />
                <span>Net Share</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDotGross} />
                <span>Gross</span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.chartContainer}>
          {!hasSales ? (
            <div className={styles.emptyState}>
              <TrendingUp size={28} className={styles.emptyIcon} />
              <span>No paid ticket sales in this date range yet.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fafafa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#fafafa" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a1a1aa" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#a1a1aa" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="formattedDate"
                  stroke="#52525b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#27272a" }}
                />
                <YAxis
                  stroke="#52525b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#27272a" }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="gross"
                  stroke="#71717a"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  fillOpacity={1}
                  fill="url(#grossGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="net"
                  stroke="#fafafa"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#netGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 2. Revenue by Ticket Tier & Waterfall (35% width) */}
      <div className={`${styles.chartCard} ${styles.waterfallCard}`}>
        <div className={styles.cardHeader}>
          <div className={styles.headerText}>
            <h3 className={styles.chartTitle}>Revenue by Tier & Fees</h3>
            <p className={styles.chartSubtitle}>
              Retained net revenue vs fees and discounts
            </p>
          </div>
        </div>

        {/* Waterfall Progress Bar */}
        <div className={styles.waterfallSection}>
          <div className={styles.waterfallHeader}>
            <span>Retention Breakdown</span>
            <span>{netPct.toFixed(1)}% Retained</span>
          </div>
          <div className={styles.waterfallBar}>
            <div
              className={styles.waterfallNet}
              style={{ width: `${netPct}%` }}
              title={`Net: ${netPct.toFixed(1)}%`}
            />
            <div
              className={styles.waterfallFees}
              style={{ width: `${feesPct}%` }}
              title={`Fees: ${feesPct.toFixed(1)}%`}
            />
            <div
              className={styles.waterfallDiscounts}
              style={{ width: `${discountsPct}%` }}
              title={`Discounts: ${discountsPct.toFixed(1)}%`}
            />
          </div>
          <div className={styles.waterfallLegend}>
            <div className={styles.waterfallLegendItem}>
              <span className={styles.dotNet} />
              <span>Net ({netPct.toFixed(0)}%)</span>
            </div>
            <div className={styles.waterfallLegendItem}>
              <span className={styles.dotFees} />
              <span>Fees ({feesPct.toFixed(0)}%)</span>
            </div>
            {discountsPct > 0 && (
              <div className={styles.waterfallLegendItem}>
                <span className={styles.dotDiscounts} />
                <span>Discounts ({discountsPct.toFixed(0)}%)</span>
              </div>
            )}
          </div>
        </div>

        {/* Tier List */}
        <div className={styles.tierList}>
          {revenueByTier.length === 0 ? (
            <div className={styles.emptyState}>
              <BarChart2 size={24} className={styles.emptyIcon} />
              <span>No ticket tiers created yet.</span>
            </div>
          ) : (
            revenueByTier.map((tier) => (
              <div key={tier.ticketTypeId} className={styles.tierRow}>
                <div className={styles.tierInfo}>
                  <span className={styles.tierName}>{tier.ticketTypeName}</span>
                  <span className={styles.tierSold}>
                    {tier.ticketsSold} {tier.ticketsSold === 1 ? "ticket" : "tickets"} sold
                  </span>
                </div>
                <div className={styles.tierAmounts}>
                  <span className={styles.tierNet}>
                    {formatMoney(tier.netPaise)}
                  </span>
                  <span className={styles.tierGross}>
                    Gross {formatMoney(tier.grossPaise)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
