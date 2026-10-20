"use client";
import { useEffect, useState } from "react";
import { getAvailability } from "@/api/commerce";
import type { Availability } from "@/types/commerce";
import { useEventRevision } from "./useLiveEvent";
export function useAvailability(eventId: string, code = "") {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const revision = useEventRevision(eventId);
  useEffect(() => {
    if (!eventId) return;
    let active = true;
    const refresh = () => { void getAvailability(eventId, code).then(data => { if (active) setAvailability(data); }).catch(() => {}); };
    refresh(); const timer = setInterval(refresh, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [eventId, code, revision]);
  return availability;
}
