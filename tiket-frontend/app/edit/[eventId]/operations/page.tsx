"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useLiveEvent, useEventRevision } from "@/hooks/useLiveEvent";
import { useLiveStore } from "@/store/useLiveStore";
import { useAvailability } from "@/hooks/useAvailability";
import { getAttendeeStats } from "@/api/attendees";
import { fetchOperationsAttendees } from "@/api/operations";
import type { OperationsSummary, TierCheckInStat } from "@/types/operations";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw, QrCode, Clock } from "lucide-react";
import OperationsStats from "./components/OperationsStats";
import DoorScanner from "./components/DoorScanner";
import CheckInFeed from "./components/CheckInFeed";
import ApprovalsPanel from "./components/ApprovalsPanel";
import styles from "./Operations.module.css";

export default function OperationsPage() {
  const params = useParams();
  const eventId = (params?.eventId as string) || "";

  // Connect live WebSocket event listener
  useLiveEvent(eventId);
  const liveRevision = useEventRevision(eventId);
  const liveConnected = useLiveStore(
    (state) => state.connected || state.status === "live",
  );

  // Manual refresh counter
  const [manualRefreshKey, setManualRefreshKey] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>("gate");

  // Availability tiers metadata for check-in rules (e.g. multi-day)
  const availability = useAvailability(eventId);

  // Derived OperationsSummary
  const [summary, setSummary] = useState<OperationsSummary>({
    totalTickets: 0,
    checkedInTotal: 0,
    checkedInToday: 0,
    pendingApprovals: 0,
    tiers: [],
  });
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(true);

  // Combined refreshKey increments on websocket events and manual clicks
  const refreshKey = manualRefreshKey + liveRevision;

  const handleRefresh = useCallback(() => {
    setManualRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!eventId) return;

    void Promise.allSettled([
      getAttendeeStats(eventId),
      fetchOperationsAttendees(eventId, {
        status: "pending_approval",
        limit: 1,
      }),
      fetchOperationsAttendees(eventId, { limit: 100 }),
    ])
      .then(([statsResult, pendingResult, attendeesResult]) => {
        if (!isMounted) return;
        const stats =
          statsResult.status === "fulfilled" ? statsResult.value : null;
        const pending =
          pendingResult.status === "fulfilled" ? pendingResult.value : null;
        const attendees =
          attendeesResult.status === "fulfilled"
            ? attendeesResult.value.attendees
            : [];

        const todayCheckedInCount = attendees.filter(
          (a) => a.checkedInToday,
        ).length;

        const tierStats: TierCheckInStat[] = (
          stats?.breakdownByTicketType || []
        ).map((t) => {
          const matchingTier = availability?.tiers?.find(
            (at) => at.id === t.ticketTypeId,
          );
          return {
            ticketTypeId: t.ticketTypeId,
            name: t.ticketTypeName,
            total: t.count,
            checkedIn: t.checkedInCount,
            checkedInToday: t.checkedInCount,
            multiDayCheckIn: matchingTier?.multiDayCheckIn ?? false,
            maxCheckInsPerDay: matchingTier?.maxCheckInsPerDay ?? undefined,
          };
        });

        setSummary({
          totalTickets: stats?.totalAttendees ?? 0,
          checkedInTotal: stats?.checkedInCount ?? 0,
          checkedInToday: Math.max(
            todayCheckedInCount,
            stats?.checkedInCount ?? 0,
          ),
          pendingApprovals: pending?.total ?? stats?.pendingCount ?? 0,
          tiers: tierStats,
        });
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingSummary(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [eventId, refreshKey, availability?.tiers]);

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleArea}>
            <h1 className={styles.title}>Event Operations</h1>
            <p className={styles.subtitle}>
              Real-time door check-in scanning, guest registration approvals, and live attendance metrics.
            </p>
          </div>

          <div className={styles.headerActions}>
            <Badge
              variant="outline"
              className={styles.liveBadge}
              data-status={liveConnected ? "live" : "polling"}
            >
              <span
                className={
                  liveConnected ? styles.pulseDot : styles.pollingDot
                }
              />
              <span>
                {liveConnected ? "Live Sync Connected" : "Polling every 15s"}
              </span>
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className={styles.refreshBtn}
            >
              <RotateCcw
                size={14}
                className={isLoadingSummary ? "animate-spin" : ""}
              />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Operations Summary KPI Grid & Tier Progress */}
      <OperationsStats summary={summary} loading={isLoadingSummary} />

      {/* Main Tabs: Gate Check-in & Approvals */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className={styles.tabsRoot}
      >
        <TabsList className={styles.tabsList}>
          <TabsTrigger
            value="gate"
            onClick={() => setActiveTab("gate")}
            className={styles.tabTrigger}
          >
            <QrCode size={15} />
            <span>Gate & Check-Ins</span>
          </TabsTrigger>
          <TabsTrigger
            value="approvals"
            onClick={() => setActiveTab("approvals")}
            className={styles.tabTrigger}
          >
            <Clock size={15} />
            <span>Approvals</span>
            {summary.pendingApprovals > 0 && (
              <Badge variant="secondary" className={styles.pendingBadge}>
                {summary.pendingApprovals}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gate" className={styles.tabContent}>
          <div className={styles.gateGrid}>
            <div className={styles.scannerColumn}>
              <DoorScanner eventId={eventId} onScanChange={handleRefresh} />
            </div>
            <div className={styles.feedColumn}>
              <CheckInFeed
                eventId={eventId}
                refreshKey={refreshKey}
                onCheckInUpdated={handleRefresh}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="approvals" className={styles.tabContent}>
          <ApprovalsPanel
            eventId={eventId}
            refreshKey={refreshKey}
            onDecisionComplete={handleRefresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
