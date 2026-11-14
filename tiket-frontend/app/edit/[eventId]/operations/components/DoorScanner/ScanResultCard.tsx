"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toggleManualCheckIn } from "@/api/operations";
import type { ScanResultItem } from "./types";
import styles from "./DoorScanner.module.css";

export interface ScanResultCardProps {
  eventId?: string;
  result: ScanResultItem;
  onUndo?: (ticketId: string) => Promise<void>;
  isUndoing?: boolean;
}

export default function ScanResultCard({
  eventId = "",
  result,
  onUndo,
  isUndoing = false,
}: ScanResultCardProps) {
  const [internalUndoing, setInternalUndoing] = useState(false);
  const loading = isUndoing || internalUndoing;

  const handleUndo = async () => {
    if (!result.ticketId || loading) return;
    if (onUndo) {
      await onUndo(result.ticketId);
      return;
    }

    try {
      setInternalUndoing(true);
      await toggleManualCheckIn(eventId, result.ticketId, true);
    } finally {
      setInternalUndoing(false);
    }
  };

  // Error / 409 State: exact backend error message inside a destructive Alert
  if (result.status === "error") {
    return (
      <div className={styles.resultWrapper}>
        <Alert variant="destructive" className={styles.errorAlert}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          <AlertTitle>Admission Notice</AlertTitle>
          <AlertDescription className={styles.errorDescription}>
            {result.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Already undone notification state
  if (result.undone) {
    return (
      <div className={styles.resultWrapper}>
        <div className={styles.undoneCard}>
          <RotateCcw className="size-4 shrink-0" />
          <span>
            Check-in undone for pass{" "}
            <span className={styles.monospaceInline}>{result.code}</span>.
          </span>
        </div>
      </div>
    );
  }

  // Success State
  const formattedDate =
    result.checkInDate || new Date().toISOString().split("T")[0];
  const todayCount = result.todayCheckInCount ?? 1;
  const totalCount = result.totalCheckIns ?? 1;

  return (
    <div className={styles.resultWrapper}>
      <div className={styles.successCard}>
        <div className={styles.successTopRow}>
          <div className={styles.attendeeMeta}>
            <div className={styles.successIconBubble}>
              <CheckCircle2 className="size-5" />
            </div>
            <div className={styles.attendeeInfo}>
              <div className={styles.nameBadgeGroup}>
                <span className={styles.attendeeName}>
                  {result.attendeeName || "Attendee"}
                </span>
                <Badge variant="secondary" className={styles.tierBadge}>
                  {result.ticketTier || "General Pass"}
                </Badge>
              </div>
              {result.attendeeEmail && (
                <span className={styles.attendeeEmail}>
                  {result.attendeeEmail}
                </span>
              )}
            </div>
          </div>

          {result.ticketId && (
            <button
              type="button"
              className={styles.undoBtn}
              onClick={handleUndo}
              disabled={loading}
            >
              <RotateCcw
                size={14}
                className={loading ? styles.spinning : ""}
              />
              <span>{loading ? "Undoing..." : "Undo Check-In"}</span>
            </button>
          )}
        </div>

        <div className={styles.detailsRow}>
          <div className={styles.codeBadgeBlock}>
            <span className={styles.monospaceCode}>{result.code}</span>
          </div>

          <div className={styles.statBadgeBlock}>
            <span className={styles.statText}>
              #{todayCount} today · {totalCount} total on {formattedDate}
            </span>
          </div>
        </div>

        {result.message && (
          <div className={styles.feedbackMessage}>{result.message}</div>
        )}
      </div>
    </div>
  );
}
