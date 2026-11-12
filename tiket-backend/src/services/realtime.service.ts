import db from "@db";
import { events } from "@db/schema";
import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { WebSocket } from "ws";
import { verifyEventPermission } from "../utils/permissions";
import { getRedisClient, getRedisSubClient } from "../utils/redis";

export interface RealtimeAuthContext {
  userId: string;
  eventId: string;
}

export interface SocketMetadata {
  eventId: string;
  userId: string;
  pong: boolean;
  authenticatedAt: number;
}

// In-memory rooms and socket metadata registry
const rooms = new Map<string, Set<WebSocket>>();
const socketMetadata = new Map<WebSocket, SocketMetadata>();
const activeSubscriptions = new Set<string>();

export function getRoomSocketCount(eventId: string): number {
  return rooms.get(eventId)?.size ?? 0;
}

export function isChannelSubscribed(eventId: string): boolean {
  return activeSubscriptions.has(`event:${eventId}`);
}

export function clearAllRooms(): void {
  for (const socket of Array.from(socketMetadata.keys())) {
    unsubscribeSocket(socket);
  }
  rooms.clear();
  socketMetadata.clear();
  activeSubscriptions.clear();
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
  ] as const) {
    if (await verifyEventPermission(eventId, userId, permission)) return true;
  }
  return false;
}

function broadcastToRoom(eventId: string, rawPayload: string): void {
  const sockets = rooms.get(eventId);
  if (!sockets) return;
  for (const socket of sockets) {
    if (socket.readyState === 1 /* OPEN */) {
      if (socket.bufferedAmount > 65536) {
        socket.close(1013, "Refresh required");
        continue;
      }
      socket.send(rawPayload);
    }
  }
}

async function ensureRedisSubscribed(eventId: string): Promise<void> {
  const channel = `event:${eventId}`;
  if (activeSubscriptions.has(channel)) return;
  activeSubscriptions.add(channel);

  const sub = getRedisSubClient();
  await sub.subscribe(channel, (message: string) => {
    broadcastToRoom(eventId, message);
  });
}

async function cleanupRedisSubscribed(eventId: string): Promise<void> {
  const channel = `event:${eventId}`;
  if (!activeSubscriptions.has(channel)) return;
  activeSubscriptions.delete(channel);

  const sub = getRedisSubClient();
  await sub.unsubscribe(channel);
}

export async function subscribeSocket(
  eventId: string,
  userId: string,
  socket: WebSocket,
): Promise<void> {
  let room = rooms.get(eventId);
  if (!room) {
    room = new Set();
    rooms.set(eventId, room);
    await ensureRedisSubscribed(eventId);
  }
  room.add(socket);

  socketMetadata.set(socket, {
    eventId,
    userId,
    pong: true,
    authenticatedAt: Date.now(),
  });

  // Query DB once upon initial connection for the baseline version
  let baselineVersion = 0;
  try {
    const [eventRecord] = await db
      .select({ version: events.version })
      .from(events)
      .where(eq(events.id, eventId));
    baselineVersion = eventRecord?.version ?? 0;
  } catch {
    baselineVersion = 0;
  }

  if (socket.readyState === 1 /* OPEN */) {
    socket.send(
      JSON.stringify({
        type: "ready",
        eventId,
        version: baselineVersion,
        serverTime: new Date().toISOString(),
      }),
    );
  }

  socket.on("pong", () => {
    const meta = socketMetadata.get(socket);
    if (meta) meta.pong = true;
  });

  socket.on("close", () => {
    unsubscribeSocket(socket);
  });

  socket.on("error", () => {
    socket.terminate();
    unsubscribeSocket(socket);
  });
}

export function unsubscribeSocket(socket: WebSocket): void {
  const meta = socketMetadata.get(socket);
  if (!meta) return;
  socketMetadata.delete(socket);

  const room = rooms.get(meta.eventId);
  if (room) {
    room.delete(socket);
    if (room.size === 0) {
      rooms.delete(meta.eventId);
      void cleanupRedisSubscribed(meta.eventId);
    }
  }
}

export async function publishEventChange(
  eventId: string,
  version?: number,
): Promise<void> {
  let resolvedVersion = version;
  if (resolvedVersion === undefined) {
    try {
      const [eventRow] = await db
        .select({ version: events.version })
        .from(events)
        .where(eq(events.id, eventId));
      resolvedVersion = eventRow?.version ?? 0;
    } catch {
      resolvedVersion = 0;
    }
  }

  const payload = JSON.stringify({
    type: "event.changed",
    eventId,
    version: resolvedVersion,
    serverTime: new Date().toISOString(),
  });

  const pub = getRedisClient();
  await pub.publish(`event:${eventId}`, payload);
}

// Lightweight ping/pong connection liveness timer (zero DB queries)
const heartbeat = setInterval(() => {
  for (const [socket, meta] of socketMetadata) {
    if (!meta.pong || Date.now() - meta.authenticatedAt > 30 * 60_000) {
      socket.close(4001, "Reconnect to renew authorization");
      continue;
    }
    meta.pong = false;
    socket.ping();
  }
}, 20000);
heartbeat.unref();

export function realtimeHandler(app: FastifyInstance) {
  app.addHook("onClose", async () => {
    clearInterval(heartbeat);
    for (const socket of socketMetadata.keys()) {
      socket.terminate();
    }
    clearAllRooms();
  });

  return (socket: WebSocket, req: FastifyRequest) => {
    const auth = (
      req as FastifyRequest & {
        realtimeAuth?: RealtimeAuthContext;
      }
    ).realtimeAuth;

    if (!auth) {
      socket.close(4001, "Authentication failed");
      return;
    }

    void subscribeSocket(auth.eventId, auth.userId, socket).catch((err) => {
      app.log.error(err);
      socket.close(1011, "Internal server error");
    });
  };
}
