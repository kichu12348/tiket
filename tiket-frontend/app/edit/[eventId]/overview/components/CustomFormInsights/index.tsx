"use client";

import React, { useState } from "react";
import type {
  CustomInsightWidget,
  FormFieldAnalyticsItem,
  TierBreakdownItem,
  RawResponseBreakdownItem,
} from "@/types/attendee";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  PieChart,
  BarChart2,
  TrendingUp,
  Table as TableIcon,
  X,
  FileQuestion,
} from "lucide-react";
import styles from "./CustomFormInsights.module.css";

interface CustomFormInsightsProps {
  eventId: string;
  widgets: CustomInsightWidget[];
  formFieldAnalytics: FormFieldAnalyticsItem[];
  tierBreakdown: TierBreakdownItem[];
  onUpdateWidgets: (updatedWidgets: CustomInsightWidget[]) => Promise<void> | void;
}

const PALETTE = [
  "#10b981", // emerald
  "#6366f1", // indigo
  "#f59e0b", // amber
  "#38bdf8", // sky
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#f97316", // orange
];

export default function CustomFormInsights({
  widgets,
  formFieldAnalytics,
  tierBreakdown,
  onUpdateWidgets,
}: CustomFormInsightsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);

  // Modal Form State
  const [fieldId, setFieldId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [chartType, setChartType] = useState<
    "bar" | "donut" | "stat" | "table"
  >("bar");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "checked_in" | "active"
  >("all");
  const [filterTicketTypeId, setFilterTicketTypeId] = useState<string>("");

  const handleOpenAdd = () => {
    setEditingWidgetId(null);
    const firstField = formFieldAnalytics[0];
    const initialFieldId = firstField ? firstField.fieldId : "";
    setFieldId(initialFieldId);
    setTitle(firstField ? `${firstField.label} Breakdown` : "Custom Insight");
    setChartType(
      firstField?.fieldType === "rating" || firstField?.fieldType === "number"
        ? "stat"
        : "bar",
    );
    setFilterStatus("all");
    setFilterTicketTypeId("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (widget: CustomInsightWidget) => {
    setEditingWidgetId(widget.id);
    setFieldId(widget.fieldId);
    setTitle(widget.title);
    setChartType(widget.chartType);
    setFilterStatus(widget.filterStatus || "all");
    setFilterTicketTypeId(widget.filterTicketTypeId || "");
    setIsModalOpen(true);
  };

  const handleFieldChange = (newFieldId: string) => {
    setFieldId(newFieldId);
    const selectedField = formFieldAnalytics.find(
      (f) => f.fieldId === newFieldId,
    );
    if (selectedField) {
      setTitle(`${selectedField.label} Breakdown`);
      if (
        selectedField.fieldType === "rating" ||
        selectedField.fieldType === "number"
      ) {
        setChartType("stat");
      }
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldId) return;

    const widgetPayload: CustomInsightWidget = {
      id: editingWidgetId || crypto.randomUUID(),
      title: title.trim() || "Custom Insight",
      fieldId,
      chartType,
      filterStatus,
      filterTicketTypeId: filterTicketTypeId || null,
    };

    let updatedList: CustomInsightWidget[];
    if (editingWidgetId) {
      updatedList = widgets.map((w) =>
        w.id === editingWidgetId ? widgetPayload : w,
      );
    } else {
      updatedList = [...widgets, widgetPayload];
    }

    await onUpdateWidgets(updatedList);
    setIsModalOpen(false);
  };

  const handleDelete = async (widgetId: string) => {
    const updated = widgets.filter((w) => w.id !== widgetId);
    await onUpdateWidgets(updated);
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= widgets.length) return;
    const copy = [...widgets];
    const temp = copy[index]!;
    copy[index] = copy[targetIndex]!;
    copy[targetIndex] = temp;
    await onUpdateWidgets(copy);
  };

  // Compute dynamic filtered data for a widget
  const getWidgetAnalytics = (widget: CustomInsightWidget) => {
    const fieldData = formFieldAnalytics.find(
      (f) => f.fieldId === widget.fieldId,
    );
    if (!fieldData) return null;

    const rawList: RawResponseBreakdownItem[] = fieldData.rawResponses || [];

    // Filter responses
    const filtered = rawList.filter((r) => {
      if (
        widget.filterTicketTypeId &&
        r.ticketTypeId !== widget.filterTicketTypeId
      ) {
        return false;
      }
      if (widget.filterStatus === "checked_in" && !r.isCheckedIn) {
        return false;
      }
      if (
        widget.filterStatus === "active" &&
        r.status !== "active" &&
        r.status !== "used"
      ) {
        return false;
      }
      return true;
    });

    const totalFiltered = filtered.length;
    const valueCountMap = new Map<string, number>();
    let numericSum = 0;
    let numericCount = 0;

    for (const r of filtered) {
      for (const val of r.values) {
        valueCountMap.set(val, (valueCountMap.get(val) || 0) + 1);
      }
      if (r.numericValue !== null && r.numericValue !== undefined) {
        numericSum += r.numericValue;
        numericCount += 1;
      }
    }

    const distribution = Array.from(valueCountMap.entries())
      .map(([value, count]) => ({
        value,
        count,
        percentage:
          totalFiltered > 0 ? Math.round((count / totalFiltered) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const averageNumeric =
      numericCount > 0
        ? Math.round((numericSum / numericCount) * 10) / 10
        : null;

    return {
      field: fieldData,
      totalResponses: totalFiltered,
      distribution,
      averageNumeric,
    };
  };

  return (
    <div className={styles.container}>
      {/* Section Header */}
      <div className={styles.sectionHeader}>
        <div className={styles.headerText}>
          <h2 className={styles.sectionTitle}>Custom Form Insights</h2>
          <span className={styles.sectionSubtitle}>
            Break down attendee answers across dietary, t-shirt size, ratings,
            or custom questions
          </span>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleOpenAdd}
            disabled={formFieldAnalytics.length === 0}
          >
            <Plus size={16} />
            <span>Add Form Insight</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {widgets.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconWrapper}>
            <PieChart size={24} />
          </div>
          <span className={styles.emptyTitle}>No Custom Insights Yet</span>
          <p className={styles.emptyDescription}>
            {formFieldAnalytics.length === 0
              ? "Add custom registration questions to your event form to create donut charts, bar distributions, and rating breakdowns."
              : "Visualize attendee answers as Donut Charts, Horizontal Bars, Average Ratings, or Value Breakdown tables with optional audience filters."}
          </p>
          {formFieldAnalytics.length > 0 && (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={handleOpenAdd}
            >
              <Plus size={15} />
              <span>Create First Insight</span>
            </button>
          )}
        </div>
      ) : (
        /* Widgets Grid */
        <div className={styles.grid}>
          {widgets.map((widget, index) => {
            const data = getWidgetAnalytics(widget);
            const tier = tierBreakdown.find(
              (t) => t.ticketTypeId === widget.filterTicketTypeId,
            );

            return (
              <div key={widget.id} className={styles.widgetCard}>
                {/* Header */}
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderLeft}>
                    <h3 className={styles.cardTitle}>{widget.title}</h3>
                    <div className={styles.badgeRow}>
                      <span className={styles.badge}>
                        {data?.field.label || "Field"}
                      </span>
                      {widget.filterStatus === "checked_in" && (
                        <span
                          className={`${styles.badge} ${styles.badgeHighlight}`}
                        >
                          Checked-In Only
                        </span>
                      )}
                      {widget.filterStatus === "active" && (
                        <span className={styles.badge}>Active Only</span>
                      )}
                      {tier && (
                        <span className={`${styles.badge} ${styles.badgeTier}`}>
                          {tier.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className={styles.cardControls}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => handleMove(index, "up")}
                      disabled={index === 0}
                      title="Move Up"
                      aria-label="Move Up"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => handleMove(index, "down")}
                      disabled={index === widgets.length - 1}
                      title="Move Down"
                      aria-label="Move Down"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => handleOpenEdit(widget)}
                      title="Edit Insight"
                      aria-label="Edit Insight"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      onClick={() => handleDelete(widget.id)}
                      title="Delete Insight"
                      aria-label="Delete Insight"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Content / Visualization */}
                {!data ? (
                  <div className={styles.statContainer}>
                    <FileQuestion size={24} color="var(--color-text-secondary)" />
                    <span className={styles.statMuted}>
                      Referenced field no longer exists.
                    </span>
                  </div>
                ) : data.totalResponses === 0 ? (
                  <div className={styles.statContainer}>
                    <span className={styles.statMuted}>
                      No responses recorded for this audience filter yet.
                    </span>
                  </div>
                ) : widget.chartType === "bar" ? (
                  /* Horizontal Bar Chart */
                  <div className={styles.barList}>
                    {data.distribution.map((item, idx) => {
                      const color = PALETTE[idx % PALETTE.length];
                      return (
                        <div key={item.value} className={styles.barRow}>
                          <div className={styles.barLabels}>
                            <span
                              className={styles.barValueName}
                              title={item.value}
                            >
                              {item.value}
                            </span>
                            <span className={styles.barStats}>
                              {item.count} ({item.percentage}%)
                            </span>
                          </div>
                          <div className={styles.barTrack}>
                            <div
                              className={styles.barFill}
                              style={{
                                width: `${Math.min(100, item.percentage)}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : widget.chartType === "donut" ? (
                  /* Donut Chart */
                  <div className={styles.donutContainer}>
                    <div className={styles.donutSvgWrapper}>
                      <svg width="160" height="160" viewBox="0 0 160 160">
                        {/* Background track circle */}
                        <circle
                          cx="80"
                          cy="80"
                          r="55"
                          fill="transparent"
                          stroke="rgba(255, 255, 255, 0.05)"
                          strokeWidth="18"
                        />
                        {/* Segment arcs */}
                        {(() => {
                          const radius = 55;
                          const circumference = 2 * Math.PI * radius; // ~345.57
                          let accumulatedPercent = 0;

                          return data.distribution.map((item, idx) => {
                            const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
                            const strokeDashoffset =
                              -(accumulatedPercent / 100) * circumference;
                            accumulatedPercent += item.percentage;
                            const color = PALETTE[idx % PALETTE.length];

                            return (
                              <circle
                                key={item.value}
                                cx="80"
                                cy="80"
                                r={radius}
                                fill="transparent"
                                stroke={color}
                                strokeWidth="18"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                transform="rotate(-90 80 80)"
                                strokeLinecap="butt"
                              />
                            );
                          });
                        })()}
                      </svg>
                      <div className={styles.donutCenter}>
                        <span className={styles.donutCenterValue}>
                          {data.totalResponses}
                        </span>
                        <span className={styles.donutCenterLabel}>Answers</span>
                      </div>
                    </div>

                    {/* Donut Legend */}
                    <div className={styles.legendList}>
                      {data.distribution.map((item, idx) => {
                        const color = PALETTE[idx % PALETTE.length];
                        return (
                          <div key={item.value} className={styles.legendItem}>
                            <div className={styles.legendLeft}>
                              <span
                                className={styles.legendColorDot}
                                style={{ backgroundColor: color }}
                              />
                              <span
                                className={styles.legendLabel}
                                title={item.value}
                              >
                                {item.value}
                              </span>
                            </div>
                            <span className={styles.legendRight}>
                              {item.count} ({item.percentage}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : widget.chartType === "stat" ? (
                  /* KPI Stat Card */
                  <div className={styles.statContainer}>
                    {data.averageNumeric !== null ? (
                      <>
                        <span className={styles.statLargeValue}>
                          {data.averageNumeric}
                          <span style={{ fontSize: "1.25rem", opacity: 0.6 }}>
                            {" "}
                            / 5
                          </span>
                        </span>
                        <span className={styles.statSubtitle}>
                          Average Rating
                        </span>
                        <span className={styles.statMuted}>
                          Based on {data.totalResponses} responses
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={styles.statLargeValue}>
                          {data.distribution[0]?.percentage ?? 0}%
                        </span>
                        <span className={styles.statSubtitle}>
                          Top Answer: {data.distribution[0]?.value || "N/A"}
                        </span>
                        <span className={styles.statMuted}>
                          {data.distribution[0]?.count ?? 0} of{" "}
                          {data.totalResponses} responses
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  /* Breakdown Table */
                  <div className={styles.tableContainer}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Option / Response</th>
                          <th style={{ textAlign: "right" }}>Count</th>
                          <th style={{ textAlign: "right" }}>Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.distribution.map((item, idx) => {
                          const color = PALETTE[idx % PALETTE.length];
                          return (
                            <tr key={item.value}>
                              <td>{item.value}</td>
                              <td style={{ textAlign: "right", fontWeight: 600 }}>
                                {item.count}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                {item.percentage}%
                                <div className={styles.tableMiniBar}>
                                  <div
                                    className={styles.tableMiniBarFill}
                                    style={{
                                      width: `${item.percentage}%`,
                                      backgroundColor: color,
                                    }}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Form Insight Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div
            className={styles.modalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className={styles.modalHeader}>
              <h3 id="modal-title" className={styles.modalTitle}>
                {editingWidgetId ? "Edit Form Insight" : "Add Form Insight"}
              </h3>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal}>
              <div className={styles.modalBody}>
                {/* Field Selection */}
                <div className={styles.formGroup}>
                  <label htmlFor="field-select" className={styles.label}>
                    Registration Form Question
                  </label>
                  <select
                    id="field-select"
                    className={styles.select}
                    value={fieldId}
                    onChange={(e) => handleFieldChange(e.target.value)}
                    required
                  >
                    {formFieldAnalytics.map((f) => (
                      <option key={f.fieldId} value={f.fieldId}>
                        {f.label} ({f.fieldType})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Widget Title */}
                <div className={styles.formGroup}>
                  <label htmlFor="widget-title" className={styles.label}>
                    Widget Title
                  </label>
                  <input
                    id="widget-title"
                    type="text"
                    className={styles.input}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Dietary Preference Breakdown"
                    required
                  />
                </div>

                {/* Visualization Style */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Visualization Style</label>
                  <div className={styles.chartTypeGrid}>
                    <button
                      type="button"
                      className={`${styles.chartTypeOption} ${
                        chartType === "bar"
                          ? styles.chartTypeOptionSelected
                          : ""
                      }`}
                      onClick={() => setChartType("bar")}
                    >
                      <BarChart2 size={16} />
                      <span>Horizontal Bar</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.chartTypeOption} ${
                        chartType === "donut"
                          ? styles.chartTypeOptionSelected
                          : ""
                      }`}
                      onClick={() => setChartType("donut")}
                    >
                      <PieChart size={16} />
                      <span>Donut Chart</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.chartTypeOption} ${
                        chartType === "stat"
                          ? styles.chartTypeOptionSelected
                          : ""
                      }`}
                      onClick={() => setChartType("stat")}
                    >
                      <TrendingUp size={16} />
                      <span>KPI Stat Card</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.chartTypeOption} ${
                        chartType === "table"
                          ? styles.chartTypeOptionSelected
                          : ""
                      }`}
                      onClick={() => setChartType("table")}
                    >
                      <TableIcon size={16} />
                      <span>Breakdown Table</span>
                    </button>
                  </div>
                </div>

                {/* Audience Filter */}
                <div className={styles.formGroup}>
                  <label htmlFor="status-filter" className={styles.label}>
                    Audience Filter
                  </label>
                  <select
                    id="status-filter"
                    className={styles.select}
                    value={filterStatus}
                    onChange={(e) =>
                      setFilterStatus(
                        e.target.value as "all" | "checked_in" | "active",
                      )
                    }
                  >
                    <option value="all">All Confirmed Attendees</option>
                    <option value="checked_in">Checked-In Attendees Only</option>
                    <option value="active">Active (Pre-Event) Only</option>
                  </select>
                </div>

                {/* Ticket Tier Filter */}
                <div className={styles.formGroup}>
                  <label htmlFor="tier-filter" className={styles.label}>
                    Ticket Tier Filter (Optional)
                  </label>
                  <select
                    id="tier-filter"
                    className={styles.select}
                    value={filterTicketTypeId}
                    onChange={(e) => setFilterTicketTypeId(e.target.value)}
                  >
                    <option value="">All Ticket Tiers</option>
                    {tierBreakdown.map((t) => (
                      <option key={t.ticketTypeId} value={t.ticketTypeId}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  {editingWidgetId ? "Update Insight" : "Save Insight"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
