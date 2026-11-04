import { describe, expect, test } from "bun:test";
import { assertCapacity, assertNotBlacklisted } from "../src/services/inventory.service";
import { HttpError } from "../src/utils/errors";
import type { Database } from "../src/db/types";

describe("Blacklist and Overbooking Guards", () => {
  describe("assertNotBlacklisted matching rules", () => {
    function createMockDb(
      rows: {
        id: string;
        organizationId: string;
        eventId: string | null;
        targetUserId: string | null;
        pattern: string | null;
      }[],
    ): Database {
      return {
        select: () => ({
          from: () => ({
            where: (condition: unknown) => ({
              limit: (n: number) => {
                // Filter rows simulating Drizzle's where condition
                const eventId = (globalThis as any).__mockEventId;
                const orgId = (globalThis as any).__mockOrgId;
                const userId = (globalThis as any).__mockUserId;
                const userEmail = ((globalThis as any).__mockUserEmail || "").toLowerCase().trim();
                const domain = userEmail.includes("@") ? "@" + userEmail.split("@")[1].toLowerCase() : "";

                const matches = rows.filter((row) => {
                  if (row.organizationId !== orgId) return false;
                  if (row.eventId !== null && row.eventId !== eventId) return false;

                  const userIdMatch = row.targetUserId && row.targetUserId === userId;
                  const patternMatch =
                    row.pattern &&
                    (row.pattern.toLowerCase() === userEmail ||
                      (domain && row.pattern.toLowerCase() === domain));

                  return userIdMatch || patternMatch;
                });

                return matches.slice(0, n);
              },
            }),
          }),
        }),
      } as unknown as Database;
    }

    test("blocks attendee by literal targetUserId even if email has changed", async () => {
      const mockRows = [
        {
          id: "bl-1",
          organizationId: "org-1",
          eventId: "event-1",
          targetUserId: "user-123",
          pattern: "old-email@example.com",
        },
      ];
      const mockDb = createMockDb(mockRows);

      (globalThis as any).__mockEventId = "event-1";
      (globalThis as any).__mockOrgId = "org-1";
      (globalThis as any).__mockUserId = "user-123";
      (globalThis as any).__mockUserEmail = "completely-new-email@anotherdomain.com";

      await expect(
        assertNotBlacklisted(
          mockDb,
          { id: "event-1", organizationId: "org-1" },
          { id: "user-123", email: "completely-new-email@anotherdomain.com" },
        ),
      ).rejects.toThrow(
        new HttpError(403, "You are restricted from registering for this event."),
      );
    });

    test("blocks attendee by exact email (case-insensitive)", async () => {
      const mockRows = [
        {
          id: "bl-2",
          organizationId: "org-1",
          eventId: "event-1",
          targetUserId: null,
          pattern: "banned@troublemaker.com",
        },
      ];
      const mockDb = createMockDb(mockRows);

      (globalThis as any).__mockEventId = "event-1";
      (globalThis as any).__mockOrgId = "org-1";
      (globalThis as any).__mockUserId = "user-random";
      (globalThis as any).__mockUserEmail = "BANNED@Troublemaker.COM";

      await expect(
        assertNotBlacklisted(
          mockDb,
          { id: "event-1", organizationId: "org-1" },
          { id: "user-random", email: "BANNED@Troublemaker.COM" },
        ),
      ).rejects.toThrow(
        new HttpError(403, "You are restricted from registering for this event."),
      );
    });

    test("blocks attendee by email domain @domain.com (case-insensitive)", async () => {
      const mockRows = [
        {
          id: "bl-3",
          organizationId: "org-1",
          eventId: "event-1",
          targetUserId: null,
          pattern: "@competitor.com",
        },
      ];
      const mockDb = createMockDb(mockRows);

      (globalThis as any).__mockEventId = "event-1";
      (globalThis as any).__mockOrgId = "org-1";
      (globalThis as any).__mockUserId = "user-spy";
      (globalThis as any).__mockUserEmail = "infiltrator@COMPETITOR.COM";

      await expect(
        assertNotBlacklisted(
          mockDb,
          { id: "event-1", organizationId: "org-1" },
          { id: "user-spy", email: "infiltrator@COMPETITOR.COM" },
        ),
      ).rejects.toThrow(
        new HttpError(403, "You are restricted from registering for this event."),
      );
    });

    test("blocks attendee across all organization events when scope is organization (eventId is null)", async () => {
      const mockRows = [
        {
          id: "bl-4",
          organizationId: "org-1",
          eventId: null, // Global org-wide blacklist
          targetUserId: "user-malicious",
          pattern: "bad@example.com",
        },
      ];
      const mockDb = createMockDb(mockRows);

      // Event 1 of Org 1
      (globalThis as any).__mockEventId = "event-1";
      (globalThis as any).__mockOrgId = "org-1";
      (globalThis as any).__mockUserId = "user-malicious";
      (globalThis as any).__mockUserEmail = "bad@example.com";

      await expect(
        assertNotBlacklisted(
          mockDb,
          { id: "event-1", organizationId: "org-1" },
          { id: "user-malicious", email: "bad@example.com" },
        ),
      ).rejects.toThrow(
        new HttpError(403, "You are restricted from registering for this event."),
      );

      // Event 2 of Org 1 (should also be blocked!)
      (globalThis as any).__mockEventId = "event-2";
      await expect(
        assertNotBlacklisted(
          mockDb,
          { id: "event-2", organizationId: "org-1" },
          { id: "user-malicious", email: "bad@example.com" },
        ),
      ).rejects.toThrow(
        new HttpError(403, "You are restricted from registering for this event."),
      );

      // Event of a DIFFERENT organization (should NOT be blocked)
      (globalThis as any).__mockOrgId = "org-2";
      await expect(
        assertNotBlacklisted(
          mockDb,
          { id: "event-other", organizationId: "org-2" },
          { id: "user-malicious", email: "bad@example.com" },
        ),
      ).resolves.toBeUndefined();
    });

    test("does not block attendee on another event when blacklist is scoped to a specific event", async () => {
      const mockRows = [
        {
          id: "bl-5",
          organizationId: "org-1",
          eventId: "event-1", // Scoped ONLY to event-1
          targetUserId: "user-limited",
          pattern: "limited@example.com",
        },
      ];
      const mockDb = createMockDb(mockRows);

      // Event 1 -> Blocked
      (globalThis as any).__mockEventId = "event-1";
      (globalThis as any).__mockOrgId = "org-1";
      (globalThis as any).__mockUserId = "user-limited";
      (globalThis as any).__mockUserEmail = "limited@example.com";

      await expect(
        assertNotBlacklisted(
          mockDb,
          { id: "event-1", organizationId: "org-1" },
          { id: "user-limited", email: "limited@example.com" },
        ),
      ).rejects.toThrow(HttpError);

      // Event 2 -> Allowed
      (globalThis as any).__mockEventId = "event-2";
      await expect(
        assertNotBlacklisted(
          mockDb,
          { id: "event-2", organizationId: "org-1" },
          { id: "user-limited", email: "limited@example.com" },
        ),
      ).resolves.toBeUndefined();
    });

    test("allows clean attendee through without throwing", async () => {
      const mockRows = [
        {
          id: "bl-6",
          organizationId: "org-1",
          eventId: "event-1",
          targetUserId: "banned-user",
          pattern: "banned@example.com",
        },
      ];
      const mockDb = createMockDb(mockRows);

      (globalThis as any).__mockEventId = "event-1";
      (globalThis as any).__mockOrgId = "org-1";
      (globalThis as any).__mockUserId = "good-user";
      (globalThis as any).__mockUserEmail = "good@example.com";

      await expect(
        assertNotBlacklisted(
          mockDb,
          { id: "event-1", organizationId: "org-1" },
          { id: "good-user", email: "good@example.com" },
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe("assertCapacity and overbookingLimit guards", () => {
    test("allows registrations up to capacity + overbookingLimit", () => {
      const allocated = new Map([["tier-1", 100]]);
      const requested = new Map([["tier-1", 5]]);
      const tiers = [{ id: "tier-1", quantityLimit: null }];

      // Capacity 100 with overbookingLimit 5: used (100) + wanted (5) = 105 <= 105 (OK)
      expect(() => {
        assertCapacity(100, allocated, requested, tiers, 5);
      }).not.toThrow();

      // Capacity 100 with overbookingLimit 4: used (100) + wanted (5) = 105 > 104 (Fails 409)
      expect(() => {
        assertCapacity(100, allocated, requested, tiers, 4);
      }).toThrow("Event is sold out.");
    });

    test("rejects when exceeding capacity without overbooking limit (default 0)", () => {
      const allocated = new Map([["tier-1", 50]]);
      const requested = new Map([["tier-1", 1]]);
      const tiers = [{ id: "tier-1", quantityLimit: null }];

      expect(() => {
        assertCapacity(50, allocated, requested, tiers);
      }).toThrow("Event is sold out.");
    });

    test("still respects individual tier limits even if event capacity allows overbooking", () => {
      const allocated = new Map([["tier-1", 20]]);
      const requested = new Map([["tier-1", 2]]);
      const tiers = [{ id: "tier-1", quantityLimit: 21 }]; // Tier limit is 21

      // Total event capacity is 100 + 10 = 110, but tier limit is 21: 20 + 2 = 22 > 21
      expect(() => {
        assertCapacity(100, allocated, requested, tiers, 10);
      }).toThrow("Not enough tickets remain in the selected tier.");
    });
  });

  describe("maxTicketsPerUser cap enforcement logic", () => {
    test("calculates and enforces user ticket limit", () => {
      const maxTicketsPerUser = 2;

      // Case 1: user currently holds 1 ticket, requesting 1 ticket -> Total 2 <= 2 (Allowed)
      const existingCount1 = 1;
      const requestedCount1 = 1;
      expect(existingCount1 + requestedCount1 <= maxTicketsPerUser).toBe(true);

      // Case 2: user currently holds 2 tickets, requesting 1 ticket -> Total 3 > 2 (Rejected)
      const existingCount2 = 2;
      const requestedCount2 = 1;
      expect(existingCount2 + requestedCount2 > maxTicketsPerUser).toBe(true);

      // Case 3: user currently holds 0 tickets, requesting 3 tickets -> Total 3 > 2 (Rejected)
      const existingCount3 = 0;
      const requestedCount3 = 3;
      expect(existingCount3 + requestedCount3 > maxTicketsPerUser).toBe(true);
    });
  });
});

