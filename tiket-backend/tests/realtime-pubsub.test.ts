import { describe, expect, test, beforeEach, afterEach, afterAll, spyOn } from "bun:test";
import fastify, { type FastifyInstance, type FastifyError } from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyWebsocket from "@fastify/websocket";
import {
  subscribeSocket,
  unsubscribeSocket,
  publishEventChange,
  getRoomSocketCount,
  isChannelSubscribed,
  clearAllRooms,
} from "../src/services/realtime.service";
import realtimeRoutes from "../src/routes/realtime.routes";
import * as permissionsModule from "../src/utils/permissions";
import {
  setTestRedisClient,
  setTestRedisSubClient,
  closeRedisClient,
} from "../src/utils/redis";
import type { RedisClient } from "bun";
import type { WebSocket } from "ws";

class MockWebSocket {
  readyState = 1; // 1 = OPEN
  bufferedAmount = 0;
  messages: string[] = [];
  listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  closed = false;
  closeCode?: number;
  closeReason?: string;

  send(data: string) {
    this.messages.push(data);
  }

  on(event: string, fn: (...args: unknown[]) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    for (const fn of this.listeners[event] || []) {
      fn(...args);
    }
  }

  ping() {
    this.emit("ping");
  }

  close(code?: number, reason?: string) {
    this.readyState = 3; // CLOSED
    this.closed = true;
    this.closeCode = code;
    this.closeReason = reason;
    this.emit("close", code, reason);
  }

  terminate() {
    this.close(1006, "Terminated");
  }
}

describe("Realtime Event-Driven Pub/Sub & WebSocket Authentication", () => {
  let permissionSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    clearAllRooms();
    setTestRedisClient(null);
    setTestRedisSubClient(null);
    permissionSpy = spyOn(
      permissionsModule,
      "verifyEventPermission",
    ).mockImplementation(async () => true);
  });

  afterEach(async () => {
    permissionSpy.mockRestore();
    clearAllRooms();
  });

  afterAll(async () => {
    await closeRedisClient();
  });

  describe("Event-Driven In-Memory Fanout Engine", () => {
    test("1. Subscribing mock sockets sends initial ready baseline version", async () => {
      const socket1 = new MockWebSocket() as unknown as WebSocket;
      const socket2 = new MockWebSocket() as unknown as WebSocket;

      await subscribeSocket("event-room-1", "user-1", socket1);
      await subscribeSocket("event-room-1", "user-2", socket2);

      expect(getRoomSocketCount("event-room-1")).toBe(2);

      const s1 = socket1 as unknown as MockWebSocket;
      const s2 = socket2 as unknown as MockWebSocket;

      expect(s1.messages.length).toBe(1);
      expect(s2.messages.length).toBe(1);

      const msg1 = JSON.parse(s1.messages[0]!);
      expect(msg1.type).toBe("ready");
      expect(msg1.eventId).toBe("event-room-1");
      expect(typeof msg1.version).toBe("number");
      expect(typeof msg1.serverTime).toBe("string");

      s1.close();
      s2.close();
    });

    test("2. Calling publishEventChange immediately broadcasts event.changed to all room sockets", async () => {
      const socket1 = new MockWebSocket() as unknown as WebSocket;
      const socket2 = new MockWebSocket() as unknown as WebSocket;
      const otherSocket = new MockWebSocket() as unknown as WebSocket;

      await subscribeSocket("event-fanout-1", "user-1", socket1);
      await subscribeSocket("event-fanout-1", "user-2", socket2);
      await subscribeSocket("event-fanout-2", "user-3", otherSocket);

      await publishEventChange("event-fanout-1", 42);
      await new Promise((r) => setTimeout(r, 30));

      const s1 = socket1 as unknown as MockWebSocket;
      const s2 = socket2 as unknown as MockWebSocket;
      const sOther = otherSocket as unknown as MockWebSocket;

      // Both sockets in room 1 receive ready + changed
      expect(s1.messages.length).toBe(2);
      expect(s2.messages.length).toBe(2);

      const changed1 = JSON.parse(s1.messages[1]!);
      expect(changed1).toMatchObject({
        type: "event.changed",
        eventId: "event-fanout-1",
        version: 42,
      });

      const changed2 = JSON.parse(s2.messages[1]!);
      expect(changed2).toMatchObject({
        type: "event.changed",
        eventId: "event-fanout-1",
        version: 42,
      });

      // Socket in room 2 only received its initial ready message, NOT the room 1 change
      expect(sOther.messages.length).toBe(1);
      const otherReady = JSON.parse(sOther.messages[0]!);
      expect(otherReady.eventId).toBe("event-fanout-2");

      s1.close();
      s2.close();
      sOther.close();
    });

    test("3. Closing socket cleans up room and removes room when empty", async () => {
      const socket1 = new MockWebSocket() as unknown as WebSocket;
      const socket2 = new MockWebSocket() as unknown as WebSocket;

      await subscribeSocket("event-cleanup", "user-1", socket1);
      await subscribeSocket("event-cleanup", "user-2", socket2);

      expect(getRoomSocketCount("event-cleanup")).toBe(2);

      (socket1 as unknown as MockWebSocket).close();
      expect(getRoomSocketCount("event-cleanup")).toBe(1);

      (socket2 as unknown as MockWebSocket).close();
      expect(getRoomSocketCount("event-cleanup")).toBe(0);
      expect(isChannelSubscribed("event-cleanup")).toBe(false);
    });

    test("4. unsubscribeSocket is idempotent and handles unregistered sockets gracefully", () => {
      const unknownSocket = new MockWebSocket() as unknown as WebSocket;
      expect(() => unsubscribeSocket(unknownSocket)).not.toThrow();
    });
  });

  describe("Redis Pub/Sub Multiplexing", () => {
    test("5. Publishes to Redis channel and subClient delivers to room sockets", async () => {
      const publishedChannels: string[] = [];
      const publishedPayloads: string[] = [];
      const subscribedChannels: string[] = [];
      const unsubscribedChannels: string[] = [];
      let subCallback: ((message: string) => void) | null = null;

      const mockPubClient = {
        publish: async (channel: string, payload: string) => {
          publishedChannels.push(channel);
          publishedPayloads.push(payload);
          // Simulate Redis delivery to subscriber
          if (subCallback) {
            subCallback(payload);
          }
          return 1;
        },
        close: () => {},
      } as unknown as RedisClient;

      const mockSubClient = {
        subscribe: async (
          channel: string,
          callback: (message: string) => void,
        ) => {
          subscribedChannels.push(channel);
          subCallback = callback;
        },
        unsubscribe: async (channel: string) => {
          unsubscribedChannels.push(channel);
          subCallback = null;
        },
        close: () => {},
      } as unknown as RedisClient;

      setTestRedisClient(mockPubClient);
      setTestRedisSubClient(mockSubClient);

      const socket = new MockWebSocket() as unknown as WebSocket;
      await subscribeSocket("event-redis-test", "user-redis", socket);

      expect(subscribedChannels).toContain("event:event-redis-test");
      expect(isChannelSubscribed("event-redis-test")).toBe(true);

      await publishEventChange("event-redis-test", 99);

      expect(publishedChannels).toContain("event:event-redis-test");
      const s = socket as unknown as MockWebSocket;
      expect(s.messages.length).toBe(2);

      const changeMsg = JSON.parse(s.messages[1]!);
      expect(changeMsg).toMatchObject({
        type: "event.changed",
        eventId: "event-redis-test",
        version: 99,
      });

      // Closing socket unsubscribes from Redis
      (socket as unknown as MockWebSocket).close();
      expect(unsubscribedChannels).toContain("event:event-redis-test");
      expect(isChannelSubscribed("event-redis-test")).toBe(false);
    });
  });

  describe("Strict Sec-WebSocket-Protocol Fastify Authentication", () => {
    let app: FastifyInstance;

    beforeEach(async () => {
      app = fastify({ logger: false });
      await app.register(fastifyJwt, { secret: "test-jwt-secret-key-123456" });
      await app.register(fastifyWebsocket);
      await app.register(realtimeRoutes, { prefix: "/api/realtime" });
      app.setErrorHandler((error: FastifyError, _request, reply) => {
        const statusCode = error.statusCode ?? 500;
        reply.status(statusCode).send({
          error: statusCode >= 500 ? "Internal Server Error" : error.message,
        });
      });
      await app.ready();
    });

    afterEach(async () => {
      await app.close();
    });

    test("6. Rejects connection with 400 when eventId query param is missing", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/realtime/ws",
        headers: {
          origin: "http://localhost:3000",
        },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.message || body.error).toBe("Missing eventId query parameter.");
    });

    test("7. Rejects connection with 401 when Sec-WebSocket-Protocol is missing", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/realtime/ws?eventId=evt-auth-1",
        headers: {
          origin: "http://localhost:3000",
        },
      });

      expect(res.statusCode).toBe(401);
      const body = res.json();
      expect(body.message || body.error).toBe(
        "Missing bearer token in Sec-WebSocket-Protocol",
      );
    });

    test("8. Rejects connection with 401 when subprotocol is malformed", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/realtime/ws?eventId=evt-auth-1",
        headers: {
          origin: "http://localhost:3000",
          "sec-websocket-protocol": "basic, some-token",
        },
      });

      expect(res.statusCode).toBe(401);
      const body = res.json();
      expect(body.message || body.error).toBe(
        "Missing bearer token in Sec-WebSocket-Protocol",
      );
    });

    test("9. Rejects connection with 401 when JWT token is invalid", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/realtime/ws?eventId=evt-auth-1",
        headers: {
          origin: "http://localhost:3000",
          "sec-websocket-protocol": "bearer, not-a-valid-jwt-token",
        },
      });

      expect(res.statusCode).toBe(401);
      const body = res.json();
      expect(body.message || body.error).toBe(
        "Invalid bearer token in Sec-WebSocket-Protocol",
      );
    });

    test("10. Rejects connection with 403 when user lacks event permissions", async () => {
      permissionSpy.mockImplementation(async () => false);

      const validToken = app.jwt.sign({ sub: "user-unauthorized" });
      const res = await app.inject({
        method: "GET",
        url: "/api/realtime/ws?eventId=evt-auth-1",
        headers: {
          origin: "http://localhost:3000",
          "sec-websocket-protocol": `bearer, ${validToken}`,
        },
      });

      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.message || body.error).toBe(
        "Dashboard permission is required.",
      );
    });

    test("11. Rejects connection with 403 when origin is untrusted", async () => {
      const validToken = app.jwt.sign({ sub: "user-allowed" });
      const res = await app.inject({
        method: "GET",
        url: "/api/realtime/ws?eventId=evt-auth-1",
        headers: {
          origin: "http://evil-attacker.example",
          "sec-websocket-protocol": `bearer, ${validToken}`,
        },
      });

      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.message || body.error).toBe("Origin is not allowed.");
    });

    test("12. Passes preValidation and echoes Sec-WebSocket-Protocol header with valid bearer token", async () => {
      const validToken = app.jwt.sign({ sub: "user-organizer" });
      const res = await app.inject({
        method: "GET",
        url: "/api/realtime/ws?eventId=evt-auth-1",
        headers: {
          origin: "http://localhost:3000",
          "sec-websocket-protocol": `bearer, ${validToken}`,
        },
      });

      // In Fastify HTTP inject, passing preValidation without raw WS handshake results in
      // 200 or Fastify websocket handler taking over, with Sec-WebSocket-Protocol: bearer header echoed
      expect(res.headers["sec-websocket-protocol"]).toBe("bearer");
    });
  });
});
