import { describe, expect, test, beforeEach, afterEach, spyOn } from "bun:test";
import {
  issueConnectionTicket,
  consumeConnectionTicket,
  getRealtimeMemoryTicketsCount,
  clearRealtimeMemoryTickets,
} from "../src/services/realtime.service";
import { setTestRedisClient, closeRedisClient } from "../src/utils/redis";
import * as permissionsModule from "../src/utils/permissions";
import { HttpError } from "../src/utils/errors";
import type { RedisClient } from "bun";

describe("Redis Ephemeral Connection Tickets & Fallback", () => {
  let permissionSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    clearRealtimeMemoryTickets();
    setTestRedisClient(null);
    permissionSpy = spyOn(
      permissionsModule,
      "verifyEventPermission",
    ).mockImplementation(async () => true);
  });

  afterEach(async () => {
    permissionSpy.mockRestore();
    clearRealtimeMemoryTickets();
    await closeRedisClient();
  });

  describe("In-Memory Fallback Lifecycle", () => {
    test("1. Generates 64-hex token and consumes payload on first use", async () => {
      const issued = await issueConnectionTicket("user-1", "event-1");

      expect(issued.ticket).toMatch(/^[0-9a-f]{64}$/);
      expect(issued.expiresIn).toBe(30);

      const consumed = await consumeConnectionTicket(issued.ticket);
      expect(consumed).toEqual({
        userId: "user-1",
        eventId: "event-1",
      });
    });

    test("2. Strictly single-use: second consume returns null immediately", async () => {
      const issued = await issueConnectionTicket("user-2", "event-2");

      const firstConsume = await consumeConnectionTicket(issued.ticket);
      expect(firstConsume).not.toBeNull();

      const secondConsume = await consumeConnectionTicket(issued.ticket);
      expect(secondConsume).toBeNull();

      const thirdConsume = await consumeConnectionTicket(issued.ticket);
      expect(thirdConsume).toBeNull();
    });

    test("3. Unknown, empty, or malformed ticket returns null", async () => {
      expect(await consumeConnectionTicket("")).toBeNull();
      expect(await consumeConnectionTicket("not-a-real-ticket")).toBeNull();
      expect(
        await consumeConnectionTicket(
          "0000000000000000000000000000000000000000000000000000000000000000",
        ),
      ).toBeNull();
    });

    test("4. Expired ticket returns null and is not consumed", async () => {
      const realNow = Date.now;
      let currentTime = realNow();
      const dateSpy = spyOn(Date, "now").mockImplementation(() => currentTime);

      try {
        const issued = await issueConnectionTicket("user-exp", "event-exp");

        // Advance past 30 seconds
        currentTime += 31_000;

        const consumed = await consumeConnectionTicket(issued.ticket);
        expect(consumed).toBeNull();
      } finally {
        dateSpy.mockRestore();
      }
    });

    test("5. Enforces dashboard permission check before issuing ticket", async () => {
      permissionSpy.mockImplementation(async () => false);

      let thrownError: unknown = null;
      try {
        await issueConnectionTicket("unauthorized-user", "event-secret");
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(HttpError);
      expect((thrownError as HttpError).statusCode).toBe(403);
      expect((thrownError as HttpError).message).toBe(
        "Dashboard permission is required.",
      );
    });

    test("6. Bounds in-memory capacity to at most 500 entries", async () => {
      // Issue 520 tickets to trigger pruning
      for (let i = 0; i < 520; i++) {
        await issueConnectionTicket(`user-${i}`, `event-${i}`);
      }

      const count = getRealtimeMemoryTicketsCount();
      expect(count).toBeLessThanOrEqual(500);
      expect(count).toBe(500);
    });
  });

  describe("Redis Mode Lifecycle (Mocked Native RedisClient)", () => {
    test("7. Issues ticket using Redis SET with EX 30 and consumes via GETDEL", async () => {
      const redisStore = new Map<string, string>();
      let setCalled = false;
      let getdelCalled = false;

      const mockRedis = {
        set: async (key: string, value: string, mode?: string, ttl?: number) => {
          setCalled = true;
          expect(mode).toBe("EX");
          expect(ttl).toBe(30);
          redisStore.set(key, value);
          return "OK";
        },
        getdel: async (key: string) => {
          getdelCalled = true;
          const val = redisStore.get(key) ?? null;
          redisStore.delete(key);
          return val;
        },
        close: async () => {},
      } as unknown as RedisClient;

      setTestRedisClient(mockRedis);

      const issued = await issueConnectionTicket("redis-user", "redis-event");
      expect(setCalled).toBe(true);
      expect(issued.ticket).toMatch(/^[0-9a-f]{64}$/);

      // First consume fetches and deletes atomically via GETDEL
      const consumed = await consumeConnectionTicket(issued.ticket);
      expect(getdelCalled).toBe(true);
      expect(consumed).toEqual({
        userId: "redis-user",
        eventId: "redis-event",
      });

      // Second consume returns null because GETDEL already deleted the key
      const secondConsume = await consumeConnectionTicket(issued.ticket);
      expect(secondConsume).toBeNull();
    });

    test("8. Falls back to atomic Lua script when GETDEL is unsupported", async () => {
      const redisStore = new Map<string, string>();
      let luaCalled = false;

      const mockRedis = {
        set: async (key: string, value: string) => {
          redisStore.set(key, value);
          return "OK";
        },
        getdel: async () => {
          throw new Error("ERR unknown command 'GETDEL'");
        },
        send: async (cmd: string, args?: (string | number)[]) => {
          if (cmd === "EVAL" && args) {
            luaCalled = true;
            expect(args[1]).toBe("1");
            expect(String(args[0])).toContain("redis.call");
            const key = String(args[2]);
            const val = redisStore.get(key) ?? null;
            redisStore.delete(key);
            return val;
          }
          return null;
        },
        close: async () => {},
      } as unknown as RedisClient;

      setTestRedisClient(mockRedis);

      const issued = await issueConnectionTicket("lua-user", "lua-event");
      const consumed = await consumeConnectionTicket(issued.ticket);

      expect(luaCalled).toBe(true);
      expect(consumed).toEqual({
        userId: "lua-user",
        eventId: "lua-event",
      });
    });
  });
});
