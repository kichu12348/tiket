import { describe, expect, test, afterAll } from "bun:test";
import {
  withRedisLock,
  acquireLock,
  getRedisClient,
  closeRedisClient,
} from "../src/services/redis-lock.service";
import { HttpError } from "../src/utils/errors";

describe("Redis Distributed Lock Service", () => {
  afterAll(async () => {
    await closeRedisClient();
  });

  test("1. Reuses a persistent singleton RedisClient connection", () => {
    const client1 = getRedisClient();
    const client2 = getRedisClient();
    expect(client1).toBe(client2);
  });

  test("2. Rejects concurrent callers on the same key with waitTimeoutMs: 0 immediately (409 HttpError)", async () => {
    const lockKey = `test:lock:reject:${Date.now()}`;
    let task1Running = false;
    let task1Finished = false;

    // Start Task 1 which holds lock for 60ms
    const task1Promise = withRedisLock(
      lockKey,
      5000,
      async () => {
        task1Running = true;
        await new Promise((r) => setTimeout(r, 60));
        task1Finished = true;
        return "task1-result";
      },
      { waitTimeoutMs: 0 },
    );

    // Wait until Task 1 has acquired the lock
    while (!task1Running) {
      await new Promise((r) => setTimeout(r, 5));
    }

    // Task 2 attempts to acquire the same lock with waitTimeoutMs: 0
    let task2Error: unknown = null;
    try {
      await withRedisLock(
        lockKey,
        5000,
        async () => "task2-result",
        {
          waitTimeoutMs: 0,
          conflictMessage: "Concurrent hold detected",
        },
      );
    } catch (err) {
      task2Error = err;
    }

    expect(task2Error).toBeInstanceOf(HttpError);
    expect((task2Error as HttpError).statusCode).toBe(409);
    expect((task2Error as HttpError).message).toBe("Concurrent hold detected");

    // Await task 1 completion
    const result1 = await task1Promise;
    expect(result1).toBe("task1-result");
    expect(task1Finished).toBe(true);

    // After task 1 has released, a new task on the same key succeeds
    const task3Result = await withRedisLock(
      lockKey,
      5000,
      async () => "task3-success",
      { waitTimeoutMs: 0 },
    );
    expect(task3Result).toBe("task3-success");
  });

  test("3. Queues and serializes concurrent calls when waitTimeoutMs > 0", async () => {
    const lockKey = `test:lock:queue:${Date.now()}`;
    const order: string[] = [];

    const call1 = withRedisLock(
      lockKey,
      5000,
      async () => {
        await new Promise((r) => setTimeout(r, 60));
        order.push("first");
        return "first";
      },
      { waitTimeoutMs: 2000 },
    );

    // Small delay to ensure call1 acquires first
    await new Promise((r) => setTimeout(r, 10));

    const call2 = withRedisLock(
      lockKey,
      5000,
      async () => {
        order.push("second");
        return "second";
      },
      { waitTimeoutMs: 2000 },
    );

    const [res1, res2] = await Promise.all([call1, call2]);
    expect(res1).toBe("first");
    expect(res2).toBe("second");
    expect(order).toEqual(["first", "second"]);
  });

  test("4. Always releases the lock in finally even when fn() throws an error", async () => {
    const lockKey = `test:lock:error:${Date.now()}`;

    let threw = false;
    try {
      await withRedisLock(
        lockKey,
        5000,
        async () => {
          throw new Error("Simulated failure inside locked block");
        },
      );
    } catch (err: unknown) {
      threw = true;
      expect((err as Error).message).toBe(
        "Simulated failure inside locked block",
      );
    }
    expect(threw).toBe(true);

    // Immediately acquireable because release() ran in finally block
    const handle = await acquireLock(lockKey, 5000, 0);
    expect(handle.acquired).toBe(true);
    await handle.release();
  });

  test("5. Different keys do not block each other concurrently", async () => {
    const lockKeyA = `test:lock:diffA:${Date.now()}`;
    const lockKeyB = `test:lock:diffB:${Date.now()}`;

    const [resA, resB] = await Promise.all([
      withRedisLock(lockKeyA, 5000, async () => {
        await new Promise((r) => setTimeout(r, 40));
        return "A";
      }),
      withRedisLock(lockKeyB, 5000, async () => {
        await new Promise((r) => setTimeout(r, 40));
        return "B";
      }),
    ]);

    expect(resA).toBe("A");
    expect(resB).toBe("B");
  });
});

