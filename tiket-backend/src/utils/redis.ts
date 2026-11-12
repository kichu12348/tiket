import { RedisClient } from "bun";

let persistentClient: RedisClient | null = null;
let persistentSubClient: RedisClient | null = null;

export function getRedisClient(): RedisClient {
  if (!persistentClient) {
    persistentClient = new RedisClient(
      process.env.REDIS_URL || "redis://127.0.0.1:6379",
      {
        autoReconnect: true,
        enableOfflineQueue: true,
      },
    );
  }
  return persistentClient;
}

export function getRedisSubClient(): RedisClient {
  if (!persistentSubClient) {
    persistentSubClient = new RedisClient(
      process.env.REDIS_URL || "redis://127.0.0.1:6379",
      {
        autoReconnect: true,
        enableOfflineQueue: true,
      },
    );
  }
  return persistentSubClient;
}

export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  const subClient = getRedisSubClient();
  try {
    await Promise.all([client.connect(), subClient.connect()]);
  } catch {
    console.error("[ERROR] Failed to connect to REDIS ");
  }
}

export function isRedisConfigured(): boolean {
  return Boolean(persistentClient || process.env.REDIS_URL);
}

export function setTestRedisClient(client: RedisClient | null): void {
  persistentClient = client;
}

export function setTestRedisSubClient(client: RedisClient | null): void {
  persistentSubClient = client;
}

export async function closeRedisClient(): Promise<void> {
  if (persistentClient) {
    const client = persistentClient;
    persistentClient = null;
    try {
      if (typeof client.close === "function") {
        await client.close();
      }
    } catch {
      // Ignore already closed
    }
  }
  if (persistentSubClient) {
    const sub = persistentSubClient;
    persistentSubClient = null;
    try {
      if (typeof sub.close === "function") {
        await sub.close();
      }
    } catch {
      // Ignore already closed
    }
  }
}
