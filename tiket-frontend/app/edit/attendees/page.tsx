import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { Users, ShieldAlert } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAttendees } from "@/hooks/useAttendees";
import AttendeeStats from "@/app/edit/attendees/components/AttendeeStats";
import AttendeeFilters from "@/app/edit/attendees/components/AttendeeFilters";
import AttendeeTable from "@/app/edit/attendees/components/AttendeeTable";
import AttendeeDetailModal from "@/app/edit/attendees/components/AttendeeDetailModal";
import ManualRegisterModal from "@/app/edit/attendees/components/ManualRegisterModal";
import AttendeeSkeletonLoader from "@/app/edit/attendees/components/SkeletonLoader";
import BlacklistPanel from "@/app/edit/attendees/components/BlacklistPanel";
import styles from "@/app/edit/attendees/AttendeesPage.module.css";

export default function AttendeesPage() {
  const params = useParams({ strict: false });
  const eventId = params.eventId as string;
  const [activeTab, setActiveTab] = useState<string>("attendees");

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
    handleDecide,
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
          Track live check-ins, view registered attendees, manage blocked
          guests, inspect custom registration answers, and issue manual passes.
        </p>
      </div>

      {/* Top Sliding Tabs Menu */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className={styles.tabsRoot}
      >
        <TabsList className={styles.tabsList}>
          <TabsTrigger value="attendees" className={styles.tabTrigger}>
            <Users size={15} />
            <span>Attendees</span>
          </TabsTrigger>
          <TabsTrigger value="blacklist" className={styles.tabTrigger}>
            <ShieldAlert size={15} />
            <span>Blacklist</span>
          </TabsTrigger>
        </TabsList>

        {/* Attendees View */}
        <TabsContent value="attendees" className={styles.tabContent}>
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
            onDecide={handleDecide}
            isLoading={isLoading}
          />
        </TabsContent>

        {/* Blacklist View */}
        <TabsContent value="blacklist" className={styles.tabContent}>
          <BlacklistPanel eventId={eventId} />
        </TabsContent>
      </Tabs>

      {/* Attendee Detail Modal */}
      {selectedTicketId && (
        <AttendeeDetailModal
          key={selectedTicketId}
          eventId={eventId}
          detail={attendeeDetail}
          isLoading={isDetailLoading}
          onClose={closeAttendeeDetail}
          onToggleCheckIn={handleToggleCheckIn}
          onCancelTicket={handleCancelTicket}
          onDecide={handleDecide}
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
