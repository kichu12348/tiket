import { randomUUID } from "node:crypto";
import { HttpError } from "../utils/errors";
import {
  getRedisClient,
  setTestRedisClient,
  closeRedisClient,
} from "../utils/redis";

export { getRedisClient, setTestRedisClient, closeRedisClient };

const RELEASE_LUA =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

export interface LockHandle {
  acquired: boolean;
  release: () => Promise<void>;
}

export async function acquireLock(
  key: string,
  ttlMs: number,
  waitTimeoutMs = 0,
): Promise<LockHandle> {
  const redis = getRedisClient();
  const token = randomUUID();
  const startTime = Date.now();

  while (true) {
    const result = await redis.send("SET", [
      key,
      token,
      "NX",
      "PX",
      String(ttlMs),
    ]);

    if (result === "OK") {
      let released = false;
      return {
        acquired: true,
        release: async () => {
          if (released) return;
          released = true;
          try {
            await redis.send("EVAL", [RELEASE_LUA, "1", key, token]);
          } catch {
            // Ignore release network errors
          }
        },
      };
    }

    const elapsed = Date.now() - startTime;
    if (waitTimeoutMs <= 0 || elapsed >= waitTimeoutMs) {
      return {
        acquired: false,
        release: async () => {},
      };
    }

    const remaining = waitTimeoutMs - elapsed;
    const backoff = Math.min(
      Math.floor(15 + Math.random() * 25),
      Math.max(1, remaining),
    );
    await new Promise((resolve) => setTimeout(resolve, backoff));
  }
}

export interface RedisLockOptions {
  waitTimeoutMs?: number;
  conflictMessage?: string;
}

export async function withRedisLock<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
  options?: RedisLockOptions,
): Promise<T> {
  const { acquired, release } = await acquireLock(
    key,
    ttlMs,
    options?.waitTimeoutMs ?? 0,
  );

  if (!acquired) {
    throw new HttpError(
      409,
      options?.conflictMessage ??
        "Another checkout request is currently in progress. Please try again.",
    );
  }

  try {
    return await fn();
  } finally {
    await release();
  }
}

