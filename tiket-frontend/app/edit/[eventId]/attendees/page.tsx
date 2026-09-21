"use client";

import { useParams } from "next/navigation";
import { useAttendees } from "@/hooks/useAttendees";
import AttendeeStats from "./components/AttendeeStats";
import AttendeeFilters from "./components/AttendeeFilters";
import AttendeeTable from "./components/AttendeeTable";
import AttendeeDetailModal from "./components/AttendeeDetailModal";
import ManualRegisterModal from "./components/ManualRegisterModal";
import AttendeeSkeletonLoader from "./components/SkeletonLoader";
import styles from "./AttendeesPage.module.css";

export default function AttendeesPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const {
    filters,
    setFilters,
    attendees,
    stats,
    ticketTypes,
    total,
    totalPages,
    isLoading,
    isStatsLoading,

    // Detail modal
    selectedTicketId,
    attendeeDetail,
    isDetailLoading,
    openAttendeeDetail,
    closeAttendeeDetail,

    // Register modal
    isRegisterOpen,
    setIsRegisterOpen,
    isRegistering,
    handleManualRegister,

    // Actions
    handleToggleCheckIn,
    handleCancelTicket,
    handleExport,
  } = useAttendees(eventId);

  if (isLoading && attendees.length === 0 && !stats) {
    return (
      <div className={styles.page}>
        <AttendeeSkeletonLoader />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Attendees</h1>
        <p className={styles.subtitle}>
          Track live check-ins, view registered attendees, inspect custom registration answers, and issue manual passes.
        </p>
      </div>

      {/* Summary Stats */}
      <AttendeeStats stats={stats} isLoading={isStatsLoading} />

      {/* Filters & Actions */}
      <AttendeeFilters
        filters={filters}
        onFilterChange={(newFilters) =>
          setFilters((prev) => ({ ...prev, ...newFilters }))
        }
        ticketTypes={ticketTypes}
        onOpenRegisterModal={() => setIsRegisterOpen(true)}
        onExport={handleExport}
      />

      {/* Attendees Table / List */}
      <AttendeeTable
        attendees={attendees}
        total={total}
        page={filters.page}
        limit={filters.limit}
        totalPages={totalPages}
        onPageChange={(newPage) =>
          setFilters((prev) => ({ ...prev, page: newPage }))
        }
        onToggleCheckIn={handleToggleCheckIn}
        onSelectAttendee={openAttendeeDetail}
        onCancelTicket={handleCancelTicket}
        isLoading={isLoading}
      />

      {/* Attendee Detail Modal */}
      {selectedTicketId && (
        <AttendeeDetailModal
          eventId={eventId}
          detail={attendeeDetail}
          isLoading={isDetailLoading}
          onClose={closeAttendeeDetail}
          onToggleCheckIn={handleToggleCheckIn}
          onCancelTicket={handleCancelTicket}
        />
      )}

      {/* Manual Register Modal */}
      <ManualRegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        ticketTypes={ticketTypes}
        onSubmit={handleManualRegister}
        isSubmitting={isRegistering}
      />
    </div>
  );
}
