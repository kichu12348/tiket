"use client";

import { useEffect, useState } from "react";
import { getAvailability } from "@/api/commerce";
import type { Availability } from "@/types/commerce";
import { useLiveStore } from "@/store/useLiveStore";
import { useEventRevision } from "./useLiveEvent";

export function useAvailability(eventId: string, code = "") {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const version = useEventRevision(eventId);
  const connected = useLiveStore((state) => state.connected);

  useEffect(() => {
    if (!eventId) return;
    let active = true;

    const refresh = () => {
      void getAvailability(eventId, code)
        .then((data) => {
          if (!active) return;
          setAvailability((prev) => {
            if (!prev) return data;
            if (
              prev.version === data.version &&
              prev.remaining === data.remaining
            ) {
              return prev;
            }
            return data;
          });
        })
        .catch(() => {});
    };

    refresh();

    // When connected via WebSocket on the dashboard, rely strictly on version changes without interval polling
    if (connected) {
      return () => {
        active = false;
      };
    }

    // On public event pages without WebSocket, poll fallback every 15s
    const timer = setInterval(refresh, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [eventId, code, version, connected]);

  return availability;
}
