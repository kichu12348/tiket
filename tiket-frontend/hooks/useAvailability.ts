import { useCallback, useEffect, useState } from "react";
import { getAvailability } from "@/api/commerce";
import type { Availability } from "@/types/commerce";
import type { TicketType } from "@/types/ticketType";
import { useEventRevision } from "./useLiveEvent";

export interface UseAvailabilityResult {
  availability: Availability | null;
  refreshAvailability: (couponCode?: string) => Promise<Availability | null>;
  remaining: number | null;
  version: number;
  tiers: (TicketType & { remaining: number | null })[];
  serverTime: string;
}

export function useAvailability(
  eventId: string,
  initialCode = "",
): UseAvailabilityResult {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const version = useEventRevision(eventId);

  const fetchAvailability = useCallback(
    async (codeToUse?: string): Promise<Availability | null> => {
      if (!eventId) return null;
      try {
        const cleanCode = (
          codeToUse !== undefined ? codeToUse : initialCode
        )?.trim();
        const data = await getAvailability(eventId, cleanCode || undefined);
        setAvailability(data);
        return data;
      } catch {
        return null;
      }
    },
    [eventId, initialCode],
  );

  useEffect(() => {
    void fetchAvailability();
  }, [fetchAvailability, version]);

  const refreshAvailability = useCallback(
    async (couponCode?: string): Promise<Availability | null> => {
      return fetchAvailability(couponCode);
    },
    [fetchAvailability],
  );

  return {
    availability,
    refreshAvailability,
    remaining: availability?.remaining ?? null,
    version: availability?.version ?? 0,
    tiers: availability?.tiers ?? [],
    serverTime: availability?.serverTime ?? "",
  };
}
