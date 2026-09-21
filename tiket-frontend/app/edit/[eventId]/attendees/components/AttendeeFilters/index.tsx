import { Search, Download, UserPlus, X } from "lucide-react";
import Dropdown from "@/components/Dropdown";
import { Input } from "@/components/ui/input";
import { TicketType } from "@/types/ticketType";
import { AttendeeFiltersState } from "@/types/attendee";
import styles from "./AttendeeFilters.module.css";

interface AttendeeFiltersProps {
  filters: AttendeeFiltersState;
  onFilterChange: (newFilters: Partial<AttendeeFiltersState>) => void;
  ticketTypes: TicketType[];
  onOpenRegisterModal: () => void;
  onExport: (format: "csv" | "json") => void;
}

export default function AttendeeFilters({
  filters,
  onFilterChange,
  ticketTypes,
  onOpenRegisterModal,
  onExport,
}: AttendeeFiltersProps) {
  const hasActiveFilters =
    filters.search ||
    filters.ticketTypeId ||
    filters.status ||
    filters.paymentStatus;

  const clearFilters = () => {
    onFilterChange({
      search: "",
      ticketTypeId: "",
      status: "",
      paymentStatus: "",
      page: 1,
    });
  };

  const ticketTypeOptions = [
    { label: "All Ticket Types", value: "" },
    ...ticketTypes.map((t) => ({
      label: `${t.name} (₹${t.price})`,
      value: t.id,
    })),
  ];

  const statusOptions = [
    { label: "All Statuses", value: "" },
    { label: "Active", value: "active" },
    { label: "Checked In", value: "used" },
    { label: "Transferred", value: "transferred" },
    { label: "Refunded", value: "refunded" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.leftFilters}>
        {/* Search Bar */}
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <Input
            type="text"
            placeholder="Search by name, email, QR..."
            value={filters.search}
            onChange={(e) =>
              onFilterChange({ search: e.target.value, page: 1 })
            }
            className={styles.searchInput}
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: "", page: 1 })}
              className={styles.clearSearchBtn}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className={styles.dropdownsWrapper}>
          {/* Radix UI Ticket Type Dropdown */}
          <Dropdown
            options={ticketTypeOptions}
            value={filters.ticketTypeId}
            onChange={(val) => onFilterChange({ ticketTypeId: val, page: 1 })}
            placeholder="All Ticket Types"
            className={styles.dropdown}
          />

          {/* Radix UI Ticket Status Dropdown */}
          <Dropdown
            options={statusOptions}
            value={filters.status}
            onChange={(val) => onFilterChange({ status: val, page: 1 })}
            placeholder="All Statuses"
            className={styles.dropdown}
          />
        </div>
        {hasActiveFilters && (
          <button onClick={clearFilters} className={styles.resetBtn}>
            Reset Filters
          </button>
        )}
      </div>

      <div className={styles.rightActions}>
        {/* Export Button */}
        <button
          onClick={() => onExport("csv")}
          className={styles.btnSecondary}
          title="Export CSV Roster"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>

        {/* Add Attendee Button */}
        <button onClick={onOpenRegisterModal} className={styles.btnPrimary}>
          <UserPlus size={16} />
          <span>Add Attendee</span>
        </button>
      </div>
    </div>
  );
}
