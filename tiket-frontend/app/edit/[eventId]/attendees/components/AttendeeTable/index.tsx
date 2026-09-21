import {
  CheckCircle2,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import { AttendeeItem } from "@/types/attendee";
import styles from "./AttendeeTable.module.css";

interface AttendeeTableProps {
  attendees: AttendeeItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onToggleCheckIn: (ticketId: string) => void;
  onSelectAttendee: (ticketId: string) => void;
  onCancelTicket: (ticketId: string) => void;
  isLoading: boolean;
}

export default function AttendeeTable({
  attendees,
  total,
  page,
  limit,
  totalPages,
  onPageChange,
  onToggleCheckIn,
  onSelectAttendee,
  isLoading,
}: AttendeeTableProps) {
  if (!isLoading && attendees.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyIconWrapper}>
          <Users size={28} className={styles.emptyIcon} />
        </div>
        <h3 className={styles.emptyTitle}>No Attendees Found</h3>
        <p className={styles.emptySubtitle}>
          There are no registered attendees matching your current search or
          filters.
        </p>
      </div>
    );
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "used":
        return (
          <span className={styles.statusBadge} data-status="used">
            <CheckCircle2 size={12} />
            <span>Checked In</span>
          </span>
        );
      case "active":
        return (
          <span className={styles.statusBadge} data-status="active">
            <span>Active</span>
          </span>
        );
      case "transferred":
        return (
          <span className={styles.statusBadge} data-status="transferred">
            <span>Transferred</span>
          </span>
        );
      case "refunded":
        return (
          <span className={styles.statusBadge} data-status="refunded">
            <span>Refunded</span>
          </span>
        );
      case "cancelled":
        return (
          <span className={styles.statusBadge} data-status="cancelled">
            <XCircle size={12} />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className={styles.statusBadge} data-status="default">
            {status}
          </span>
        );
    }
  };

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableResponsive}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Attendee</th>
              <th>Ticket Type</th>
              <th>Price</th>
              <th>Registered</th>
              <th>Status</th>
              <th>Check-in Action</th>
              <th className={styles.alignRight}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {attendees.map((item) => {
              const isCheckedIn = item.status === "used";
              const isCancelled =
                item.status === "cancelled" || item.status === "refunded";

              return (
                <tr key={item.id} className={styles.row}>
                  {/* Attendee Info */}
                  <td className={styles.cellAttendee}>
                    <div
                      className={styles.attendeeClickable}
                      onClick={() => onSelectAttendee(item.id)}
                    >
                      <span className={styles.name}>{item.user.name}</span>
                      <span className={styles.email}>{item.user.email}</span>
                    </div>
                  </td>

                  {/* Ticket Type */}
                  <td>
                    <span className={styles.typeName}>
                      {item.ticketType.name}
                    </span>
                  </td>

                  {/* Price */}
                  <td>
                    <span className={styles.typePrice}>
                      ₹{item.ticketType.price}
                    </span>
                  </td>

                  {/* Date */}
                  <td>
                    <span className={styles.dateText}>
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td>{renderStatusBadge(item.status)}</td>

                  {/* Quick Check-In Action Toggle */}
                  <td>
                    <button
                      onClick={() => onToggleCheckIn(item.id)}
                      disabled={isCancelled}
                      className={`${styles.checkInBtn} ${isCheckedIn ? styles.checkedIn : styles.notCheckedIn}`}
                      title={
                        isCheckedIn
                          ? "Click to undo check-in"
                          : "Click to check-in"
                      }
                    >
                      <CheckCircle2 size={13} />
                      <span>{isCheckedIn ? "Checked In" : "Check In"}</span>
                    </button>
                  </td>

                  {/* Actions column */}
                  <td className={styles.alignRight}>
                    <div className={styles.actionsGroup}>
                      <button
                        onClick={() => onSelectAttendee(item.id)}
                        className={styles.iconBtn}
                        title="View Details"
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.paginationText}>
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)}{" "}
            of {total} attendees
          </span>
          <div className={styles.paginationBtns}>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className={styles.pageBtn}
              aria-label="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className={styles.currentPageText}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className={styles.pageBtn}
              aria-label="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
