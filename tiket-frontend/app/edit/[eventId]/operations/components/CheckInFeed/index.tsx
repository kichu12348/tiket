"use client";

import { useState, useEffect, useMemo } from "react";
import type { OperationsAttendee } from "@/types/operations";
import { fetchOperationsAttendees, toggleManualCheckIn } from "@/api/operations";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Check, RotateCcw, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  isCheckedInToday,
  getCheckInCount,
  getTierName,
  filterAttendees,
  type StatusFilterType,
} from "./functions/checkInHelpers";
import styles from "./CheckInFeed.module.css";

export interface CheckInFeedProps {
  eventId: string;
  refreshKey: number;
  onCheckInUpdated?: () => void;
}

export default function CheckInFeed({
  eventId,
  refreshKey,
  onCheckInUpdated,
}: CheckInFeedProps) {
  const [attendees, setAttendees] = useState<OperationsAttendee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    void fetchOperationsAttendees(eventId, { limit: 100 })
      .then((res) => {
        if (isMounted) {
          setAttendees(res.attendees || []);
        }
      })
      .catch(() => {
        if (isMounted) {
          toast.error("Failed to load attendees feed");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [eventId, refreshKey]);

  const handleToggleCheckIn = async (attendee: OperationsAttendee) => {
    const isCurrentlyCheckedInToday = isCheckedInToday(attendee);
    const undoAction = isCurrentlyCheckedInToday;

    setTogglingId(attendee.id);
    try {
      const res = await toggleManualCheckIn(eventId, attendee.id, undoAction);
      toast.success(
        res.message ||
          (undoAction ? "Check-in undone successfully" : "Checked in attendee successfully"),
      );

      // Optimistically update the attendee in local state
      setAttendees((prev) =>
        prev.map((item) => {
          if (item.id === attendee.id) {
            const newCheckedInToday = !undoAction;
            const currentCount = getCheckInCount(item);
            const newCount = undoAction
              ? Math.max(0, currentCount - 1)
              : currentCount + 1;

            return {
              ...item,
              checkedInToday: newCheckedInToday,
              checkInCount: newCount,
              status: newCheckedInToday ? "used" : item.status,
              checkedInAt: newCheckedInToday
                ? new Date().toISOString()
                : null,
            };
          }
          return item;
        }),
      );

      onCheckInUpdated?.();
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      const errorMsg =
        errorObj.response?.data?.error ||
        errorObj.message ||
        "Failed to update check-in";
      toast.error(errorMsg);
    } finally {
      setTogglingId(null);
    }
  };

  const displayedAttendees = useMemo(() => {
    return filterAttendees(attendees, search, statusFilter);
  }, [attendees, search, statusFilter]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>Attendee Check-In Feed</h3>
          <Badge variant="secondary" className="text-xs">
            {attendees.length} Total Attendees
          </Badge>
        </div>
        <p className={styles.subtitle}>
          Search and manage manual gate check-ins in real time.
        </p>
      </div>

      {/* Search & Status Filters */}
      <div className={styles.controlsRow}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <Input
            placeholder="Search by name, email, or EXO-... code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterWrapper}>
          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val as StatusFilterType)}
          >
            <SelectTrigger className="h-[38px] text-xs">
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="checked_in">Checked In</SelectItem>
              <SelectItem value="checked_in_today">Checked In Today</SelectItem>
              <SelectItem value="not_checked_in">Not Checked In</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Attendees Table */}
      <div className={styles.tableWrapper}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Attendee</TableHead>
              <TableHead>Ticket Code</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Check-In Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-28 mb-1" />
                    <Skeleton className="h-3 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-24 rounded-md" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-md" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24 rounded-md" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-20 ml-auto rounded-md" />
                  </TableCell>
                </TableRow>
              ))
            ) : displayedAttendees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className={styles.emptyState}>
                    <Users size={28} className="text-muted-foreground mb-1" />
                    <p className={styles.emptyTitle}>No attendees found</p>
                    <p className={styles.emptySubtitle}>
                      {search || statusFilter !== "all"
                        ? "Try clearing your search query or filter"
                        : "No attendees registered for this event yet"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              displayedAttendees.map((attendee) => {
                const todayChecked = isCheckedInToday(attendee);
                const count = getCheckInCount(attendee);
                const tier = getTierName(attendee);
                const isToggling = togglingId === attendee.id;

                return (
                  <TableRow key={attendee.id}>
                    {/* Attendee Name & Email */}
                    <TableCell>
                      <div className={styles.attendeeCell}>
                        <span className={styles.attendeeName}>
                          {attendee.user?.name || "Guest Attendee"}
                        </span>
                        <span className={styles.attendeeEmail}>
                          {attendee.user?.email || "—"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Monospace Ticket Code */}
                    <TableCell>
                      <span className={styles.ticketCode}>
                        {attendee.qrCode || attendee.id}
                      </span>
                    </TableCell>

                    {/* Ticket Tier */}
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {tier}
                      </Badge>
                    </TableCell>

                    {/* Check-In Status */}
                    <TableCell>
                      {todayChecked ? (
                        <Badge className={styles.statusBadgeSuccess}>
                          <Check size={12} />
                          Checked In Today
                          {count > 1 ? ` (#${count})` : ""}
                        </Badge>
                      ) : count > 0 ? (
                        <Badge className={styles.statusBadgePrior}>
                          Prior Check-In ({count})
                        </Badge>
                      ) : (
                        <Badge className={styles.statusBadgeMuted}>
                          Not Checked In
                        </Badge>
                      )}
                    </TableCell>

                    {/* Action Button */}
                    <TableCell className="text-right">
                      {todayChecked ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className={styles.btnUndo}
                          onClick={() => handleToggleCheckIn(attendee)}
                          disabled={isToggling}
                        >
                          {isToggling ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <RotateCcw size={13} />
                          )}
                          Undo
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className={styles.btnCheckIn}
                          onClick={() => handleToggleCheckIn(attendee)}
                          disabled={isToggling}
                        >
                          {isToggling ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Check size={13} />
                          )}
                          Check In
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
