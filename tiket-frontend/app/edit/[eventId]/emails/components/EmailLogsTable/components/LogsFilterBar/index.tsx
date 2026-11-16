"use client";

import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EmailLogStatusFilter } from "../../functions/filterEmailLogs";
import styles from "./LogsFilterBar.module.css";

interface LogsFilterBarProps {
  statusFilter: EmailLogStatusFilter;
  onStatusFilterChange: (status: EmailLogStatusFilter) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  totalCount: number;
  openedCount: number;
  unopenedCount: number;
  failedCount: number;
}

export default function LogsFilterBar({
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  searchQuery,
  onSearchQueryChange,
  totalCount,
  openedCount,
  unopenedCount,
  failedCount,
}: LogsFilterBarProps) {
  return (
    <div className={styles.filterBar}>
      {/* Status Filter Pills */}
      <div className={styles.filterPills}>
        <button
          type="button"
          className={styles.filterPill}
          data-active={statusFilter === "all"}
          onClick={() => onStatusFilterChange("all")}
        >
          All ({totalCount})
        </button>
        <button
          type="button"
          className={styles.filterPill}
          data-active={statusFilter === "opened"}
          onClick={() => onStatusFilterChange("opened")}
        >
          Opened ({openedCount})
        </button>
        <button
          type="button"
          className={styles.filterPill}
          data-active={statusFilter === "unopened"}
          onClick={() => onStatusFilterChange("unopened")}
        >
          Unopened ({unopenedCount})
        </button>
        <button
          type="button"
          className={styles.filterPill}
          data-active={statusFilter === "failed"}
          onClick={() => onStatusFilterChange("failed")}
        >
          Failed ({failedCount})
        </button>
      </div>

      <div className={styles.filterRight}>
        {/* Template Type Selector Dropdown with Shadcn Select */}
        <div className={styles.typeSelectWrapper}>
          <Select value={typeFilter} onValueChange={onTypeFilterChange}>
            <SelectTrigger
              className={styles.typeSelectTrigger}
              aria-label="Filter by email type"
            >
              <SelectValue placeholder="All Email Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Email Types</SelectItem>
              <SelectItem value="confirmation">Confirmation</SelectItem>
              <SelectItem value="checkin">Check-in</SelectItem>
              <SelectItem value="invitation">Invitation</SelectItem>
              <SelectItem value="thank_you">Thank You</SelectItem>
              <SelectItem value="sorry">Sorry</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search box */}
        <div className={styles.searchWrapper}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search recipient or subject..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>
    </div>
  );
}
