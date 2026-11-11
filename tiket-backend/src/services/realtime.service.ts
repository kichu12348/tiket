import db from "@db";
import { events } from "@db/schema";
import { eq, inArray } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import { verifyEventPermission } from "../utils/permissions";
import { HttpError } from "../utils/errors";
import { getRedisClient, isRedisConfigured } from "../utils/redis";

const MAX_FALLBACK_ENTRIES = 500;
const memoryTickets = new Map<
  string,
  { userId: string; eventId: string; expiresAt: number }
>();

export function getRealtimeMemoryTicketsCount(): number {
  return memoryTickets.size;
}

export function clearRealtimeMemoryTickets(): void {
  memoryTickets.clear();
}

function pruneMemoryTickets(): void {
  const now = Date.now();
  for (const [key, entry] of memoryTickets) {
    if (entry.expiresAt <= now) {
      memoryTickets.delete(key);
    }
  }
  while (memoryTickets.size >= MAX_FALLBACK_ENTRIES) {
    const oldestKey = memoryTickets.keys().next().value;
    if (oldestKey) {
      memoryTickets.delete(oldestKey);
    } else {
      break;
    }
  }
}

export async function canSubscribe(
  eventId: string,
  userId: string,
): Promise<boolean> {
  for (const permission of [
    "view_guests",
    "manage_guests",
    "manage_tickets",
    "view_analytics",
    "view_payments",
    "scan_tickets",
  ] as const)
    if (await verifyEventPermission(eventId, userId, permission)) return true;
  return false;
}

export async function issueConnectionTicket(
  userId: string,
  eventId: string,
): Promise<{ ticket: string; expiresIn: number }> {
  if (!(await canSubscribe(eventId, userId)))
    throw new HttpError(403, "Dashboard permission is required.");

  const ticket = randomBytes(32).toString("hex");
  const payload = JSON.stringify({ userId, eventId });

  if (isRedisConfigured()) {
    const redis = getRedisClient();
    await redis.set(`ws_ticket:${ticket}`, payload, "EX", 30);
  } else {
    pruneMemoryTickets();
    memoryTickets.set(`ws_ticket:${ticket}`, {
      userId,
      eventId,
      expiresAt: Date.now() + 30000,
    });
  }

  console.log(memoryTickets);

  return { ticket, expiresIn: 30 };
}

export async function consumeConnectionTicket(
  ticket: string,
): Promise<{ userId: string; eventId: string } | null> {
  if (!ticket || typeof ticket !== "string") {
    return null;
  }

  const key = `ws_ticket:${ticket}`;

  if (isRedisConfigured()) {
    const redis = getRedisClient();
    try {
      const val = await redis.getdel(key);
      if (!val) return null;
      return JSON.parse(val) as { userId: string; eventId: string };
    } catch {
      const lua =
        'local v = redis.call("GET", KEYS[1]); if v then redis.call("DEL", KEYS[1]); end; return v;';
      const val = (await redis.send("EVAL", [lua, "1", key])) as string | null;
      if (!val) return null;
      return JSON.parse(val) as { userId: string; eventId: string };
    }
  }

  const entry = memoryTickets.get(key);
  if (!entry) {
    return null;
  }
  memoryTickets.delete(key);
  if (Date.now() >= entry.expiresAt) {
    return null;
  }
  return { userId: entry.userId, eventId: entry.eventId };
}

interface Subscription {
  eventId: string;
  userId: string;
  version: number;
  pong: boolean;
  authenticatedAt: number;
}

export function realtimeHandler(app: FastifyInstance) {
  const subscriptions = new Map<WebSocket, Subscription>();
  const unauthenticated = new Set<WebSocket>();
  let busy = false;
  const timer = setInterval(() => {
    void poll().catch((error) => app.log.error(error));
  }, 1000);
  const heartbeat = setInterval(() => {
    for (const [socket, subscription] of subscriptions) {
      if (
        !subscription.pong ||
        Date.now() - subscription.authenticatedAt > 30 * 60_000
      ) {
        socket.close(4001, "Reconnect to renew authorization");
        continue;
      }
      subscription.pong = false;
      socket.ping();
    }
  }, 20000);
  timer.unref();
  heartbeat.unref();
  async function poll() {
    if (busy || !subscriptions.size) return;
    busy = true;
    try {
      const ids = [
        ...new Set([...subscriptions.values()].map((sub) => sub.eventId)),
      ];
      const rows = await db
        .select({ id: events.id, version: events.version })
        .from(events)
        .where(inArray(events.id, ids));
      for (const [socket, subscription] of subscriptions) {
        const version = rows.find(
          (row) => row.id === subscription.eventId,
        )?.version;
        if (
          version === undefined ||
          !(await canSubscribe(subscription.eventId, subscription.userId))
        ) {
          socket.close(4003, "Access revoked");
          continue;
        }
        if (version !== subscription.version) {
          subscription.version = version;
          if (socket.bufferedAmount > 65536) {
            socket.close(1013, "Refresh required");
            continue;
          }
          socket.send(
            JSON.stringify({
              type: "event.changed",
              eventId: subscription.eventId,
              version,
            }),
          );
        }
      }
    } finally {
      busy = false;
    }
  }
  app.addHook("onClose", async () => {
    clearInterval(timer);
    clearInterval(heartbeat);
    for (const socket of [...subscriptions.keys(), ...unauthenticated])
      socket.terminate();
  });
  return (socket: WebSocket) => {
    if (unauthenticated.size >= 100 || subscriptions.size >= 1000) {
      socket.close(1013, "Connection limit reached");
      return;
    }
    unauthenticated.add(socket);
    let authenticating = false;
    const timeout = setTimeout(() => {
      if (!subscriptions.has(socket))
        socket.close(4001, "Authentication required");
    }, 5000);
    timeout.unref();
    socket.on("pong", () => {
      const sub = subscriptions.get(socket);
      if (sub) sub.pong = true;
    });
    socket.on("message", (data) => {
      if (authenticating || subscriptions.has(socket)) return;
      authenticating = true;
      void (async () => {
        const payload: unknown = JSON.parse(data.toString());
        if (
          !payload ||
          typeof payload !== "object" ||
          !("ticket" in payload) ||
          typeof payload.ticket !== "string"
        )
          throw new Error("Invalid connection ticket");
        const ticket = await consumeConnectionTicket(payload.ticket);
        if (!ticket || !(await canSubscribe(ticket.eventId, ticket.userId)))
          throw new Error("Invalid connection ticket");
        if (socket.readyState !== 1) return;
        const [event] = await db
          .select({ version: events.version })
          .from(events)
          .where(eq(events.id, ticket.eventId));
        subscriptions.set(socket, {
          eventId: ticket.eventId,
          userId: ticket.userId,
          version: event!.version,
          pong: true,
          authenticatedAt: Date.now(),
        });
        unauthenticated.delete(socket);
        clearTimeout(timeout);
        socket.send(
          JSON.stringify({
            type: "ready",
            eventId: ticket.eventId,
            version: event!.version,
          }),
        );
      })().catch(() => socket.close(4001, "Authentication failed"));
    });
    socket.on("close", () => {
      clearTimeout(timeout);
      subscriptions.delete(socket);
      unauthenticated.delete(socket);
    });
    socket.on("error", () => {
      socket.terminate();
    });
  };
}
