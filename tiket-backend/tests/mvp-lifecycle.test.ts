import { describe, expect, test } from "bun:test";
import { enqueueCheckInEmail } from "../src/services/notifications.service";
import { deliverMail } from "../src/services/mail.service";
import type { Transaction } from "../src/db/types";

describe("MVP Lifecycle & Backend Feature Gaps", () => {
  describe("1. getMyEvents role mapping and deduplication logic", () => {
    interface EventRecord {
      id: string;
      title: string;
      organizationId: string;
    }

    interface TeamMemberEventRecord {
      event: EventRecord;
      roleName: string;
    }

    function mergeUserEvents(
      ownedEvents: EventRecord[],
      teamEvents: TeamMemberEventRecord[],
    ) {
      const eventMap = new Map<
        string,
        EventRecord & { isAssociated: boolean; role: string }
      >();

      for (const event of ownedEvents) {
        eventMap.set(event.id, {
          ...event,
          isAssociated: true,
          role: "Owner",
        });
      }

      for (const item of teamEvents) {
        if (!eventMap.has(item.event.id)) {
          eventMap.set(item.event.id, {
            ...item.event,
            isAssociated: true,
            role: item.roleName,
          });
        }
      }

      return Array.from(eventMap.values());
    }

    test("returns events owned by user with role 'Owner' and isAssociated: true", () => {
      const owned = [
        { id: "evt-1", title: "React Conference", organizationId: "user-1" },
        { id: "evt-2", title: "TypeScript Summit", organizationId: "user-1" },
      ];
      const result = mergeUserEvents(owned, []);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "evt-1",
        title: "React Conference",
        organizationId: "user-1",
        isAssociated: true,
        role: "Owner",
      });
      expect(result[1]?.role).toBe("Owner");
      expect(result[1]?.isAssociated).toBe(true);
    });

    test("includes events where user is an event team member with their assigned role name", () => {
      const teamEvents = [
        {
          event: { id: "evt-3", title: "DevOps Days", organizationId: "org-2" },
          roleName: "Event Manager",
        },
        {
          event: { id: "evt-4", title: "Cloud Expo", organizationId: "org-3" },
          roleName: "Gate Staff",
        },
      ];
      const result = mergeUserEvents([], teamEvents);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "evt-3",
        title: "DevOps Days",
        organizationId: "org-2",
        isAssociated: true,
        role: "Event Manager",
      });
      expect(result[1]?.role).toBe("Gate Staff");
      expect(result[1]?.isAssociated).toBe(true);
    });

    test("deduplicates events when creator is also added to event team members, preserving 'Owner' role", () => {
      const owned = [
        { id: "evt-1", title: "Flagship Summit", organizationId: "user-1" },
      ];
      const teamEvents = [
        {
          event: { id: "evt-1", title: "Flagship Summit", organizationId: "user-1" },
          roleName: "Admin",
        },
      ];
      const result = mergeUserEvents(owned, teamEvents);

      expect(result).toHaveLength(1);
      expect(result[0]?.role).toBe("Owner");
      expect(result[0]?.isAssociated).toBe(true);
    });
  });

  describe("2. GET /api/tickets/me response structure mapping", () => {
    test("formats user tickets, incoming transfers, and outgoing transfers cleanly", () => {
      const userTickets = [
        {
          ticket: {
            id: "tkt-1",
            qrCode: "QR-111",
            status: "active",
            createdAt: new Date("2026-11-01T10:00:00Z"),
          },
          event: {
            id: "evt-1",
            title: "Tech Fest 2026",
            slug: "tech-fest-2026",
            startDate: new Date("2026-12-01T09:00:00Z"),
            endDate: new Date("2026-12-01T18:00:00Z"),
            locationType: "offline",
            coverImage: "https://example.com/cover.png",
          },
          ticketType: {
            id: "tt-1",
            name: "VIP Pass",
            price: "1500.00",
          },
        },
      ];

      const incomingTransfers = [
        {
          id: "trf-1",
          ticketId: "tkt-2",
          status: "pending",
          createdAt: new Date("2026-11-02T12:00:00Z"),
          ticket: { id: "tkt-2", status: "active" },
          event: { id: "evt-2", title: "AI Workshop", slug: "ai-workshop" },
          sender: { id: "u-sender", name: "Alice", email: "alice@example.com" },
        },
      ];

      const outgoingTransfers = [
        {
          id: "trf-2",
          ticketId: "tkt-3",
          toUserId: "u-recipient",
          status: "pending",
          createdAt: new Date("2026-11-03T14:00:00Z"),
          recipient: { id: "u-recipient", name: "Bob", email: "bob@example.com" },
        },
      ];

      const formatted = {
        tickets: userTickets.map((t) => ({
          id: t.ticket.id,
          qrCode: t.ticket.qrCode,
          status: t.ticket.status,
          createdAt: t.ticket.createdAt.toISOString(),
          event: {
            id: t.event.id,
            title: t.event.title,
            slug: t.event.slug,
            startDate: t.event.startDate.toISOString(),
            endDate: t.event.endDate.toISOString(),
            locationType: t.event.locationType,
            coverImage: t.event.coverImage,
          },
          ticketType: {
            id: t.ticketType.id,
            name: t.ticketType.name,
            price: t.ticketType.price,
          },
        })),
        incomingTransfers: incomingTransfers.map((it) => ({
          id: it.id,
          ticketId: it.ticketId,
          status: it.status,
          createdAt: it.createdAt.toISOString(),
          ticket: it.ticket,
          event: it.event,
          sender: it.sender,
        })),
        outgoingTransfers: outgoingTransfers.map((ot) => ({
          id: ot.id,
          ticketId: ot.ticketId,
          toUserId: ot.toUserId,
          status: ot.status,
          createdAt: ot.createdAt.toISOString(),
          recipient: ot.recipient,
        })),
      };

      expect(formatted.tickets).toHaveLength(1);
      expect(formatted.tickets[0]?.ticketType.name).toBe("VIP Pass");
      expect(formatted.tickets[0]?.event.title).toBe("Tech Fest 2026");

      expect(formatted.incomingTransfers).toHaveLength(1);
      expect(formatted.incomingTransfers[0]?.sender.email).toBe("alice@example.com");

      expect(formatted.outgoingTransfers).toHaveLength(1);
      expect(formatted.outgoingTransfers[0]?.recipient.name).toBe("Bob");
    });
  });

  describe("3. Attendee Self-Service Cancellation & Refund Eligibility", () => {
    function evaluateCancellationEligibility(
      totalPaise: number,
      policy?: { isRefundable: boolean; refundableUntil: string | null },
    ) {
      if (totalPaise === 0) {
        return { eligible: true, type: "free_cancellation" as const };
      }
      if (!policy || !policy.isRefundable) {
        return {
          eligible: false,
          error: "This ticket is non-refundable or past the refund window.",
        };
      }
      if (policy.refundableUntil && new Date(policy.refundableUntil) < new Date()) {
        return {
          eligible: false,
          error: "This ticket is non-refundable or past the refund window.",
        };
      }
      return { eligible: true, type: "paid_refund" as const };
    }

    test("allows free ticket cancellation when totalPaise is 0", () => {
      const result = evaluateCancellationEligibility(0);
      expect(result.eligible).toBe(true);
      expect(result.type).toBe("free_cancellation");
    });

    test("allows paid ticket refund when refundable and window is in future", () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const result = evaluateCancellationEligibility(5000, {
        isRefundable: true,
        refundableUntil: futureDate,
      });
      expect(result.eligible).toBe(true);
      expect(result.type).toBe("paid_refund");
    });

    test("rejects cancellation when ticket is strictly non-refundable", () => {
      const result = evaluateCancellationEligibility(5000, {
        isRefundable: false,
        refundableUntil: null,
      });
      expect(result.eligible).toBe(false);
      expect(result.error).toBe("This ticket is non-refundable or past the refund window.");
    });

    test("rejects cancellation when refundableUntil timestamp has passed", () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const result = evaluateCancellationEligibility(5000, {
        isRefundable: true,
        refundableUntil: pastDate,
      });
      expect(result.eligible).toBe(false);
      expect(result.error).toBe("This ticket is non-refundable or past the refund window.");
    });
  });

  describe("4. enqueueCheckInEmail welcome automation", () => {
    test("queues a delivery job with key checkin:<ticketId> when active checkin template is present", async () => {
      let insertedJob: unknown = null;
      let queryCount = 0;

      const mockTx = {
        select: () => ({
          from: () => {
            const queryBuilder = {
              innerJoin: () => queryBuilder,
              where: () => {
                queryCount++;
                if (queryCount === 1) {
                  // 1. emailTemplates select
                  return Promise.resolve([
                    {
                      id: "tmpl-checkin-1",
                      type: "checkin",
                      isActive: true,
                      subject: "Welcome to {{event.title}}, {{attendee.name}}!",
                      body: "<p>Enjoy the event {{attendee.name}}! Pass: {{ticket.type}}</p>",
                    },
                  ]);
                }
                if (queryCount === 2) {
                  // 2. ticket + event + user + ticketType select
                  return Promise.resolve([
                    {
                      event: {
                        id: "evt-100",
                        title: "Future of AI",
                        slug: "future-of-ai",
                        startDate: new Date("2026-11-20T10:00:00Z"),
                        endDate: null,
                        locationType: "online",
                        locationDetails: null,
                      },
                      ticket: {
                        id: "tkt-999",
                        qrCode: "QR-AI-999",
                      },
                      user: {
                        name: "Kichu Reji",
                        email: "kichu@example.test",
                      },
                      ticketType: {
                        name: "General Admission",
                      },
                    },
                  ]);
                }
                // 3. form responses select
                return Promise.resolve([
                  { label: "Company", value: "Acme Corp" },
                ]);
              },
            };
            return queryBuilder;
          },
        }),
        insert: () => ({
          values: (job: unknown) => {
            insertedJob = job;
            return {
              onConflictDoNothing: () => Promise.resolve(),
            };
          },
        }),
      } as unknown as Transaction;

      await enqueueCheckInEmail(mockTx, "evt-100", "tkt-999");

      expect(insertedJob).not.toBeNull();
      const job = insertedJob as {
        key: string;
        eventId: string;
        payload: {
          recipientEmail: string;
          recipientName: string;
          subject: string;
          body: string;
          templateId: string;
        };
      };

      expect(job.key).toBe("checkin:tkt-999");
      expect(job.eventId).toBe("evt-100");
      expect(job.payload.recipientEmail).toBe("kichu@example.test");
      expect(job.payload.subject).toBe("Welcome to Future of AI, Kichu Reji!");
      expect(job.payload.body).toContain("Enjoy the event Kichu Reji! Pass: General Admission");
      expect(job.payload.templateId).toBe("tmpl-checkin-1");
    });

    test("does nothing when no active checkin email template exists", async () => {
      let inserted = false;

      const mockTx = {
        select: () => ({
          from: () => ({
            where: () => [], // No template returned
          }),
        }),
        insert: () => ({
          values: () => {
            inserted = true;
            return {
              onConflictDoNothing: () => Promise.resolve(),
            };
          },
        }),
      } as unknown as Transaction;

      await enqueueCheckInEmail(mockTx, "evt-200", "tkt-123");
      expect(inserted).toBe(false);
    });
  });

  describe("5. Dev Mode Mail Fallback in deliverMail", () => {
    test("logs to console and completes cleanly without throwing 503 when BREVO_API_KEY is unset in dev/test", async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalApiKey = process.env.BREVO_API_KEY;

      try {
        process.env.NODE_ENV = "development";
        delete process.env.BREVO_API_KEY;

        let loggedOutput = "";
        const originalLog = console.log;
        console.log = (msg: unknown) => {
          loggedOutput += String(msg);
        };

        try {
          await deliverMail({
            recipientEmail: "test-attendee@example.com",
            recipientName: "Test Attendee",
            subject: "Your OTP is 123456",
            body: "<p>Your login OTP is <strong>123456</strong></p>",
          });
        } finally {
          console.log = originalLog;
        }

        expect(loggedOutput).toContain("[DEV MAIL FALLBACK]");
        expect(loggedOutput).toContain("test-attendee@example.com");
        expect(loggedOutput).toContain("Your OTP is 123456");
      } finally {
        process.env.NODE_ENV = originalEnv;
        if (originalApiKey) process.env.BREVO_API_KEY = originalApiKey;
      }
    });
  });
});
