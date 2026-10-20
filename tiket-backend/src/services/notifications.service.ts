import db from "@db";
import {
  deliveryJobs,
  emailLogs,
  events,
  orders,
  tickets,
  users,
} from "@db/schema";
import { and, eq } from "drizzle-orm";
import type { Transaction } from "../db/types";
import { deliverMail } from "./mail.service";
import { sanitizeRichText } from "../utils/html";

export async function enqueueOrderEmail(
  tx: Transaction,
  orderId: string,
  kind: "pending" | "confirmation" | "declined",
) {
  const [data] = await tx
    .select({ event: events, user: users })
    .from(orders)
    .innerJoin(events, eq(events.id, orders.eventId))
    .innerJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.id, orderId));
  if (!data) return;
  const passes = await tx
    .select({ id: tickets.id })
    .from(tickets)
    .where(eq(tickets.orderId, orderId));
  const status =
    kind === "pending"
      ? "Your registration is awaiting organizer approval. This is not an entry pass."
      : kind === "declined"
        ? "Your registration was declined. Any captured payment is being refunded."
        : "Your registration is confirmed.";
  const origin = (process.env.FRONTEND_URL || "http://localhost:3000").split(
    ",",
  )[0]!;
  const body = sanitizeRichText(
    `<h2>${status}</h2><p>${data.event.title}</p>${passes.map((pass) => `<p><a href="${origin}/passes/${pass.id}">View registration</a></p>`).join("")}`,
  );
  await tx
    .insert(deliveryJobs)
    .values({
      key: `order:${orderId}:${kind}`,
      eventId: data.event.id,
      payload: {
        recipientEmail: data.user.email,
        recipientName: data.user.name,
        subject: `Registration ${kind}: ${data.event.title}`,
        body,
      },
    })
    .onConflictDoNothing();
}
export async function processDeliveries() {
  const pending = await db
    .select()
    .from(deliveryJobs)
    .where(eq(deliveryJobs.status, "queued"))
    .limit(50);
  for (const job of pending) {
    const [claim] = await db
      .update(deliveryJobs)
      .set({ status: "processing", updatedAt: new Date() })
      .where(
        and(eq(deliveryJobs.key, job.key), eq(deliveryJobs.status, "queued")),
      )
      .returning();
    if (!claim) continue;
    try {
      await deliverMail(job.payload, job.eventId, job.key);
      await db.transaction(async (tx) => {
        await tx
          .update(deliveryJobs)
          .set({ status: "sent", updatedAt: new Date() })
          .where(eq(deliveryJobs.key, job.key));
        await tx
          .insert(emailLogs)
          .values({ ...job.payload, eventId: job.eventId, status: "sent" });
      });
    } catch (error) {
      // Delivery may have succeeded before a timeout. Do not automatically duplicate SMTP messages.
      await db
        .update(deliveryJobs)
        .set({
          status: "uncertain",
          error:
            error instanceof Error
              ? error.message
              : "Delivery requires review.",
          updatedAt: new Date(),
        })
        .where(eq(deliveryJobs.key, job.key));
    }
  }
}
