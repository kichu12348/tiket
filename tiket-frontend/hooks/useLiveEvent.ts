"use client";

import { useEffect } from "react";
import api from "@/lib/api";
import { API_ENDPOINTS, API_URL } from "@/constants/config";
import { useLiveStore } from "@/store/useLiveStore";

export function useLiveEvent(eventId: string) {
  useEffect(() => {
    if (!eventId) return;

    let disposed = false;
    let socket: WebSocket | undefined;
    let retryTimeout: ReturnType<typeof setTimeout> | undefined;
    let fallbackTimer: ReturnType<typeof setInterval> | undefined;
    let attempts = 0;

    const stopFallbackPolling = () => {
      if (fallbackTimer) {
        clearInterval(fallbackTimer);
        fallbackTimer = undefined;
      }
    };

    const pollVersion = async () => {
      if (disposed) return;
      try {
        const response = await api.get<{ version: number }>(
          API_ENDPOINTS.COMMERCE.AVAILABILITY(eventId),
        );
        if (disposed) return;
        const newVersion = response.data?.version;
        const currentVersion = useLiveStore.getState().version[eventId];
        if (typeof newVersion === "number" && newVersion !== currentVersion) {
          useLiveStore.getState().setVersion(eventId, newVersion);
        }
      } catch {
        /* Fallback polling error, ignore */
      }
    };

    const startFallbackPolling = () => {
      if (fallbackTimer || disposed) return;
      fallbackTimer = setInterval(() => {
        void pollVersion();
      }, 15000);
    };

    const connect = async () => {
      if (disposed) return;
      useLiveStore.getState().setStatus("connecting");

      try {
        const { data } = await api.post<{ ticket: string }>(
          API_ENDPOINTS.REALTIME_CONNECT(eventId),
        );
        if (disposed) return;

        if (typeof WebSocket === "undefined") {
          useLiveStore.getState().setConnected(false);
          startFallbackPolling();
          return;
        }

        const base =
          API_URL && API_URL !== "undefined"
            ? API_URL
            : typeof window !== "undefined" &&
                window.location.origin &&
                window.location.origin !== "null"
              ? window.location.origin
              : "http://localhost:3000";
        const url = new URL(API_ENDPOINTS.REALTIME.SOCKET, base);
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";

        socket = new WebSocket(url.toString());

        socket.onopen = () => {
          if (disposed) {
            socket?.close();
            return;
          }
          socket?.send(JSON.stringify({ ticket: data.ticket }));
        };

        socket.onmessage = (message) => {
          try {
            const payload: unknown = JSON.parse(String(message.data));
            if (
              payload &&
              typeof payload === "object" &&
              "type" in payload &&
              "eventId" in payload &&
              payload.eventId === eventId
            ) {
              if (payload.type === "ready") {
                attempts = 0;
                stopFallbackPolling();
                useLiveStore.getState().setConnected(true);
                if (
                  "version" in payload &&
                  typeof payload.version === "number"
                ) {
                  useLiveStore.getState().setVersion(eventId, payload.version);
                }
              } else if (payload.type === "event.changed") {
                stopFallbackPolling();
                useLiveStore.getState().setConnected(true);
                if (
                  "version" in payload &&
                  typeof payload.version === "number"
                ) {
                  useLiveStore.getState().setVersion(eventId, payload.version);
                } else {
                  useLiveStore.getState().changed(eventId);
                }
              }
            }
          } catch {
            /* Ignore malformed messages */
          }
        };

        socket.onclose = () => {
          if (disposed) return;
          useLiveStore.getState().setConnected(false);
          startFallbackPolling();
          reconnect();
        };

        socket.onerror = () => {
          if (disposed) return;
          useLiveStore.getState().setConnected(false);
          startFallbackPolling();
          reconnect();
        };
      } catch {
        if (disposed) return;
        useLiveStore.getState().setConnected(false);
        startFallbackPolling();
        reconnect();
      }
    };

    const reconnect = () => {
      if (disposed) return;
      if (retryTimeout) clearTimeout(retryTimeout);
      retryTimeout = setTimeout(
        () => {
          void connect();
        },
        Math.min(30000, 1000 * 2 ** Math.min(attempts++, 5)) +
          Math.random() * 500,
      );
    };

    const onOnlineOrFocus = () => {
      if (disposed) return;
      if (!useLiveStore.getState().connected) {
        void pollVersion();
        void connect();
      }
    };

    window.addEventListener("online", onOnlineOrFocus);
    window.addEventListener("focus", onOnlineOrFocus);

    void connect();

    return () => {
      disposed = true;
      stopFallbackPolling();
      if (retryTimeout) clearTimeout(retryTimeout);
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
      }
      window.removeEventListener("online", onOnlineOrFocus);
      window.removeEventListener("focus", onOnlineOrFocus);
    };
  }, [eventId]);
}

export function useEventRevision(eventId: string) {
  return useLiveStore(
    (state) => state.version[eventId] ?? state.revisions[eventId] ?? 0,
  );
}

export const useEventVersion = useEventRevision;
