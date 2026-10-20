import { useEventRevision } from "./useLiveEvent";
import { getErrorMessage } from "@/lib/errors";


import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type {
  AttendeeItem,
  AttendeeStatsData,
  AttendeeDetailResponse,
  AttendeeFiltersState,
  ManualRegisterPayload,
} from "@/types/attendee";
import type { TicketType } from "@/types/ticketType";
import {
  getAttendees,
  getAttendeeStats,
  getAttendeeDetail,
  toggleCheckIn,
  cancelTicket,
  manualRegisterAttendee,
  exportAttendees,
} from "@/api/attendees";
import { getTicketTypes } from "@/api/tickets";
import { validateManualRegisterPayload } from "@/lib/validators/attendee";

export function useAttendees(eventId: string) {
  const revision = useEventRevision(eventId);
  const [filters, setFilters] = useState<AttendeeFiltersState>({
    search: "",
    ticketTypeId: "",
    status: "",
    paymentStatus: "",
    page: 1,
    limit: 10,
  });

  const [attendees, setAttendees] = useState<AttendeeItem[]>([]);
  const [stats, setStats] = useState<AttendeeStatsData | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Detail Modal State
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [attendeeDetail, setAttendeeDetail] =
    useState<AttendeeDetailResponse | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Register Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Fetch Stats & Ticket Types once
  const fetchMetadata = useCallback(async () => {
    if (!eventId) return;
    return (Promise.all([
        getAttendeeStats(eventId),
        getTicketTypes(eventId),
      ])).then(async ([statsData, typesData]) => {
      setStats(statsData);
      setTicketTypes(typesData);
    }).catch((err: unknown) => {
      console.error("Failed to load metadata stats:", err);
    }).finally(() => {
      setIsStatsLoading(false);
    });
  }, [eventId]);

  // Fetch Attendees List
  const fetchAttendeesList = useCallback(async () => {
    if (!eventId) return;
    return (getAttendees(eventId, filters)).then(async (res) => {
      setAttendees(res.attendees);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    }).catch((err: unknown) => {
      console.error("Failed to fetch attendees:", err);
      toast.error(getErrorMessage(err) || "Failed to load attendees.");
    }).finally(() => {
      setIsLoading(false);
    });
  }, [eventId, filters]);

  useEffect(() => {
    void fetchMetadata();
  }, [fetchMetadata, revision]);

  useEffect(() => {
    void fetchAttendeesList();
  }, [fetchAttendeesList, revision]);

  // Fetch Attendee Detail
  const openAttendeeDetail = async (ticketId: string) => {
    setSelectedTicketId(ticketId);
    try {
      setIsDetailLoading(true);
      const data = await getAttendeeDetail(eventId, ticketId);
      setAttendeeDetail(data);
    } catch (err: unknown) {
      toast.error(
        getErrorMessage(err) || "Failed to load attendee details.",
      );
      setSelectedTicketId(null);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeAttendeeDetail = () => {
    setSelectedTicketId(null);
    setAttendeeDetail(null);
  };

  // Check In Toggle Handler
  const handleToggleCheckIn = async (ticketId: string) => {
    try {
      const res = await toggleCheckIn(eventId, ticketId, (attendees.find(att => att.id === ticketId)?.status === "used" ? "undo" : "checkin"));
      toast.success(res.message);

      // Optimistic update in list
      setAttendees((prev) =>
        prev.map((att) => {
          if (att.id === ticketId) {
            return {
              ...att,
              status: res.status,
              checkedInAt: res.checkedInAt,
            };
          }
          return att;
        }),
      );

      // Update detail view if open
      if (selectedTicketId === ticketId && attendeeDetail) {
        setAttendeeDetail({
          ...attendeeDetail,
          attendee: {
            ...attendeeDetail.attendee,
            status: res.status,
            checkedInAt: res.checkedInAt,
          },
        });
      }

      // Refresh stats
      fetchMetadata();
    } catch (err: unknown) {
      toast.error(
        getErrorMessage(err) || "Failed to update check-in status.",
      );
    }
  };

  // Cancel Ticket Handler
  const handleCancelTicket = async (ticketId: string) => {
    if (
      !confirm(
        "Are you sure you want to cancel this ticket? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const res = await cancelTicket(eventId, ticketId);
      toast.success(res.message);

      setAttendees((prev) =>
        prev.map((att) => {
          if (att.id === ticketId) {
            return { ...att, status: "cancelled" };
          }
          return att;
        }),
      );

      if (selectedTicketId === ticketId && attendeeDetail) {
        setAttendeeDetail({
          ...attendeeDetail,
          attendee: {
            ...attendeeDetail.attendee,
            status: "cancelled",
          },
        });
      }

      fetchMetadata();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to cancel ticket.");
    }
  };

  // Manual Register Handler
  const handleManualRegister = async (payload: ManualRegisterPayload) => {
    const validation = validateManualRegisterPayload(payload);
    if (!validation.isValid) {
      toast.error(validation.error);
      return false;
    }

    try {
      setIsRegistering(true);
      const res = await manualRegisterAttendee(eventId, payload);
      toast.success(res.message);

      setIsRegisterOpen(false);
      fetchAttendeesList();
      fetchMetadata();
      return true;
    } catch (err: unknown) {
      toast.error(
        getErrorMessage(err) || "Failed to manually register attendee.",
      );
      return false;
    } finally {
      setIsRegistering(false);
    }
  };

  // Export Roster Handler
  const handleExport = async (format: "csv" | "json" = "csv") => {
    try {
      toast.info("Preparing export file...");
      const res = await exportAttendees(eventId, format);

      const blob = new Blob([res.data], {
        type: format === "csv" ? "text/csv" : "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Exported roster as ${format.toUpperCase()}`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to export roster.");
    }
  };

  return {
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
    refetch: fetchAttendeesList,
  };
}
