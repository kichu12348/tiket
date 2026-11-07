import "@/happydom";
import { describe, expect, test, beforeEach, afterEach, jest } from "bun:test";

// Bridge duplicate React instances between root @testing-library/react and frontend node_modules/react
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rFrontend = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rTesting = require(
    require.resolve("react", {
      paths: [require.resolve("@testing-library/react")],
    }),
  );
  const i1 =
    rFrontend.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const i2 =
    rTesting.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  if (i1 && i2 && i1 !== i2) {
    Object.defineProperty(i1, "H", {
      get() {
        return i2.H;
      },
      set(v) {
        i2.H = v;
      },
    });
    Object.defineProperty(i1, "A", {
      get() {
        return i2.A;
      },
      set(v) {
        i2.A = v;
      },
    });
  }
} catch {
  // Ignore if already unified
}

import { renderHook, act } from "@testing-library/react";
import api from "@/lib/api";
import { useLiveEvent } from "../useLiveEvent";
import { useLiveStore } from "@/store/useLiveStore";

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      this.readyState = 1;
      if (this.onopen) this.onopen();
    }, 0);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
    if (this.onclose) this.onclose();
  }

  triggerMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  triggerError() {
    this.readyState = 3;
    if (this.onerror) this.onerror();
  }
}

describe("useLiveEvent Hook & Realtime Flow", () => {
  let origWindowWs: typeof WebSocket | undefined;
  let origGlobalWs: typeof WebSocket | undefined;
  let postSpy: ReturnType<typeof jest.spyOn>;
  let getSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    jest.useFakeTimers();
    MockWebSocket.instances = [];

    // Save originals
    origWindowWs = window.WebSocket;
    origGlobalWs = globalThis.WebSocket;
    (window as unknown as { WebSocket: typeof MockWebSocket }).WebSocket = MockWebSocket;
    (globalThis as unknown as { WebSocket: typeof MockWebSocket }).WebSocket = MockWebSocket;

    // Spy on api methods without globally replacing @/lib/api module
    postSpy = jest.spyOn(api, "post").mockImplementation(async () => ({
      data: { ticket: "ticket-conn-abc" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any));

    getSpy = jest.spyOn(api, "get").mockImplementation(async () => ({
      data: { version: 10, remaining: 80 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any));

    useLiveStore.setState({
      connected: false,
      version: {},
      revisions: {},
      status: "connecting",
    });
  });

  afterEach(() => {
    postSpy.mockRestore();
    getSpy.mockRestore();
    if (origWindowWs) window.WebSocket = origWindowWs;
    if (origGlobalWs) globalThis.WebSocket = origGlobalWs;
    jest.useRealTimers();
  });

  test("1. When WebSocket connects and emits 'ready', zero fallback HTTP polling requests are fired over time", async () => {
    const eventId = "evt-test-100";
    const { unmount } = renderHook(() => useLiveEvent(eventId));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(10);
    });

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toBe(`/api/realtime/events/${eventId}/connect`);
    expect(MockWebSocket.instances.length).toBe(1);

    const ws = MockWebSocket.instances[0];

    // Emit 'ready' from WebSocket
    await act(async () => {
      ws.triggerMessage({ type: "ready", eventId, version: 1 });
    });

    expect(useLiveStore.getState().connected).toBe(true);
    expect(useLiveStore.getState().version[eventId]).toBe(1);

    // Advance time past several 15s intervals (45 seconds)
    await act(async () => {
      jest.advanceTimersByTime(45000);
    });

    // Zero fallback HTTP polling requests should be fired while connected!
    expect(getSpy).toHaveBeenCalledTimes(0);

    unmount();
  });

  test("2. When WebSocket emits 'event.changed' with a new version, useLiveStore updates version exactly once", async () => {
    const eventId = "evt-test-200";
    const { unmount } = renderHook(() => useLiveEvent(eventId));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(10);
    });

    const ws = MockWebSocket.instances[0];
    await act(async () => {
      ws.triggerMessage({ type: "ready", eventId, version: 1 });
    });

    expect(useLiveStore.getState().version[eventId]).toBe(1);

    let mutationCount = 0;
    const unsubscribe = useLiveStore.subscribe((state, prevState) => {
      if (state.version[eventId] !== prevState.version[eventId]) {
        mutationCount++;
      }
    });

    // Emit event.changed with version: 2
    await act(async () => {
      ws.triggerMessage({ type: "event.changed", eventId, version: 2 });
    });

    expect(useLiveStore.getState().version[eventId]).toBe(2);
    expect(mutationCount).toBe(1);

    // Re-emit event.changed with the SAME version: 2
    await act(async () => {
      ws.triggerMessage({ type: "event.changed", eventId, version: 2 });
    });

    // Should NOT bump again
    expect(useLiveStore.getState().version[eventId]).toBe(2);
    expect(mutationCount).toBe(1);

    unsubscribe();
    unmount();
  });

  test("3. Fallback polling only starts after WebSocket close/failure and stops as soon as the WebSocket reconnects", async () => {
    const eventId = "evt-test-300";
    const { unmount } = renderHook(() => useLiveEvent(eventId));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(10);
    });

    const ws1 = MockWebSocket.instances[0];
    await act(async () => {
      ws1.triggerMessage({ type: "ready", eventId, version: 1 });
    });

    expect(useLiveStore.getState().connected).toBe(true);
    expect(getSpy).toHaveBeenCalledTimes(0);

    // Simulate WebSocket close
    await act(async () => {
      ws1.close();
    });

    expect(useLiveStore.getState().connected).toBe(false);

    // Advance by 15s to trigger fallback interval
    await act(async () => {
      jest.advanceTimersByTime(15000);
    });

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy.mock.calls[0][0]).toBe(`/api/commerce/${eventId}/availability`);

    // Another 15s
    await act(async () => {
      jest.advanceTimersByTime(15000);
    });
    expect(getSpy).toHaveBeenCalledTimes(2);

    // Reconnect
    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(2);
    const ws2 = MockWebSocket.instances[MockWebSocket.instances.length - 1];

    await act(async () => {
      ws2.triggerMessage({ type: "ready", eventId, version: 5 });
    });

    expect(useLiveStore.getState().connected).toBe(true);
    const callsBeforeAdvance = getSpy.mock.calls.length;

    // Advance by another 45s while reconnected
    await act(async () => {
      jest.advanceTimersByTime(45000);
    });

    // Zero additional fallback calls
    expect(getSpy).toHaveBeenCalledTimes(callsBeforeAdvance);

    unmount();
  });
});
