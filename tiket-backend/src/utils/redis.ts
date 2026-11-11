import { RedisClient } from "bun";

let persistentClient: RedisClient | null = null;

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

export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  try {
    await client.connect();
  } catch (err) {
    console.error("[ERROR] Failed to connect to REDIS ");
  }
}

export function isRedisConfigured(): boolean {
  return Boolean(persistentClient || process.env.REDIS_URL);
}

export function setTestRedisClient(client: RedisClient | null): void {
  persistentClient = client;
}

export async function closeRedisClient(): Promise<void> {
  if (persistentClient) {
    const client = persistentClient;
    persistentClient = null;
    try {
      await client.close();
    } catch {
      // Ignore errors on close
    }
  }
}
