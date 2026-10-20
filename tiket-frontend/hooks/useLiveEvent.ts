"use client";
import { useEffect } from "react";
import { connectDashboard } from "@/api/commerce";
import { API_ENDPOINTS, API_URL } from "@/constants/config";
import { useLiveStore } from "@/store/useLiveStore";
export function useLiveEvent(eventId: string) {
  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const { changed, setStatus } = useLiveStore.getState();
    const connect = async () => {
      setStatus("connecting");
      try {
        const { ticket } = await connectDashboard(eventId);
        if (disposed) return;
        const url = new URL(API_ENDPOINTS.REALTIME.SOCKET, API_URL);
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        socket = new WebSocket(url);
        socket.onopen = () => socket?.send(JSON.stringify({ ticket }));
        socket.onmessage = (message) => {
          try {
            const data: unknown = JSON.parse(String(message.data));
            if (
              data &&
              typeof data === "object" &&
              "type" in data &&
              "eventId" in data &&
              data.eventId === eventId
            ) {
              if (data.type === "ready") {
                attempts = 0;
                setStatus("live");
                changed(eventId);
              } else if (data.type === "event.changed") changed(eventId);
            }
          } catch {
            /* Ignore malformed notifications and keep HTTP fallback. */
          }
        };
        socket.onclose = () => reconnect();
        socket.onerror = () => socket?.close();
      } catch {
        reconnect();
      }
    };
    const reconnect = () => {
      if (disposed) return;
      setStatus("polling");
      retry = setTimeout(
        () => {
          void connect();
        },
        Math.min(30000, 1000 * 2 ** Math.min(attempts++, 5)) +
          Math.random() * 500,
      );
    };
    // Periodic snapshots also recover missed notifications and background-tab suspension.
    const fallback = setInterval(() => changed(eventId), 15000);
    const refresh = () => changed(eventId);
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    void connect();
    return () => {
      disposed = true;
      clearInterval(fallback);
      clearTimeout(retry);
      socket?.close();
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [eventId]);
}
export function useEventRevision(eventId: string) {
  return useLiveStore((state) => state.revisions[eventId] || 0);
}
