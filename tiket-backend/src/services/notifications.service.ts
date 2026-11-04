import db from "@db";
import {
  deliveryJobs,
  emailLogs,
  emailTemplates,
  events,
  formFields,
  orders,
  ticketFormResponses,
  tickets,
  ticketTypes,
  users,
} from "@db/schema";
import { and, eq, inArray } from "drizzle-orm";
import type { Transaction } from "../db/types";
import { deliverMail } from "./mail.service";
import { sanitizeEmailHtml } from "../utils/html";
import {
  DEFAULT_TEMPLATES,
  interpolateTemplate,
  type InterpolationData,
} from "../utils/emailService";

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

  const orderTickets = await tx
    .select({
      id: tickets.id,
      qrCode: tickets.qrCode,
      ticketTypeName: ticketTypes.name,
    })
    .from(tickets)
    .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
    .where(eq(tickets.orderId, orderId));

  const ticketIds = orderTickets.map((t) => t.id);
  const responses =
    ticketIds.length > 0
      ? await tx
          .select({
            label: formFields.label,
            value: ticketFormResponses.responseValue,
          })
          .from(ticketFormResponses)
          .innerJoin(formFields, eq(ticketFormResponses.fieldId, formFields.id))
          .where(inArray(ticketFormResponses.ticketId, ticketIds))
      : [];

  const formMap: Record<string, string> = {};
  for (const resp of responses) {
    if (resp.label && resp.value !== null && resp.value !== undefined) {
      formMap[resp.label] = resp.value;
    }
  }

  const origin = (process.env.FRONTEND_URL || "http://localhost:3000").split(
    ",",
  )[0]!;
  const primaryTicket = orderTickets[0];
  const passUrl = primaryTicket ? `${origin}/passes/${primaryTicket.id}` : "";
  const qrCode = primaryTicket?.qrCode || "";
  const qrCodeUrl = qrCode
    ? `https://quickchart.io/qr?text=${encodeURIComponent(qrCode)}&size=300&margin=1`
    : "";

  let subject: string;
  let body: string;
  let templateId: string | undefined = undefined;

  if (kind === "confirmation") {
    const [activeTemplate] = await tx
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.eventId, data.event.id),
          eq(emailTemplates.type, "confirmation"),
          eq(emailTemplates.isActive, true),
        ),
      );

    const defaultConfirmation = DEFAULT_TEMPLATES.find(
      (t) => t.type === "confirmation",
    );
    const template = activeTemplate || defaultConfirmation;
    templateId = activeTemplate?.id;

    let locationStr = "Venue";
    if (data.event.locationType === "online") {
      locationStr = "Online Stream";
    } else if (
      data.event.locationDetails &&
      typeof data.event.locationDetails === "object" &&
      "address" in data.event.locationDetails &&
      typeof data.event.locationDetails.address === "string"
    ) {
      locationStr = data.event.locationDetails.address;
    }

    const interpolationData: InterpolationData = {
      event: {
        title: data.event.title,
        startDate: data.event.startDate
          ? new Date(data.event.startDate).toLocaleString()
          : "",
        endDate: data.event.endDate
          ? new Date(data.event.endDate).toLocaleString()
          : "",
        location: locationStr,
        url: `${origin}/${data.event.slug}`,
        passUrl,
      },
      attendee: {
        name: data.user.name,
        email: data.user.email,
      },
      ticket: {
        id: primaryTicket?.id,
        type: primaryTicket?.ticketTypeName || "Pass",
        qrCode,
        qrCodeUrl,
      },
      form: formMap,
    };

    const rawSubject =
      template?.subject || `Registration confirmation: ${data.event.title}`;
    const rawBody =
      template?.body || `<p>Your registration is confirmed.</p>`;

    subject = interpolateTemplate(rawSubject, interpolationData);
    body = sanitizeEmailHtml(interpolateTemplate(rawBody, interpolationData));
  } else {
    const status =
      kind === "pending"
        ? "Your registration is awaiting organizer approval. This is not an entry pass."
        : "Your registration was declined. Any captured payment is being refunded.";
    subject = `Registration ${kind}: ${data.event.title}`;
    body = sanitizeEmailHtml(
      `<h2>${status}</h2><p>${data.event.title}</p>${orderTickets.map((pass) => `<p><a href="${origin}/passes/${pass.id}">View registration</a></p>`).join("")}`,
    );
  }

  await tx
    .insert(deliveryJobs)
    .values({
      key: `order:${orderId}:${kind}`,
      eventId: data.event.id,
      payload: {
        recipientEmail: data.user.email,
        recipientName: data.user.name,
        subject,
        body,
        templateId,
      },
    })
    .onConflictDoNothing();
}

export async function enqueueCheckInEmail(
  tx: Transaction,
  eventId: string,
  ticketId: string,
) {
  const [activeTemplate] = await tx
    .select()
    .from(emailTemplates)
    .where(
      and(
        eq(emailTemplates.eventId, eventId),
        eq(emailTemplates.type, "checkin"),
        eq(emailTemplates.isActive, true),
      ),
    );

  if (!activeTemplate) return;

  const [data] = await tx
    .select({
      event: events,
      ticket: tickets,
      user: users,
      ticketType: ticketTypes,
    })
    .from(tickets)
    .innerJoin(events, eq(events.id, tickets.eventId))
    .innerJoin(users, eq(users.id, tickets.userId))
    .innerJoin(ticketTypes, eq(ticketTypes.id, tickets.ticketTypeId))
    .where(eq(tickets.id, ticketId));

  if (!data) return;

  const responses = await tx
    .select({
      label: formFields.label,
      value: ticketFormResponses.responseValue,
    })
    .from(ticketFormResponses)
    .innerJoin(formFields, eq(ticketFormResponses.fieldId, formFields.id))
    .where(eq(ticketFormResponses.ticketId, ticketId));

  const formMap: Record<string, string> = {};
  for (const resp of responses) {
    if (resp.label && resp.value !== null && resp.value !== undefined) {
      formMap[resp.label] = resp.value;
    }
  }

  const origin = (process.env.FRONTEND_URL || "http://localhost:3000").split(
    ",",
  )[0]!;
  const passUrl = `${origin}/passes/${ticketId}`;
  const qrCode = data.ticket.qrCode || "";
  const qrCodeUrl = qrCode
    ? `https://quickchart.io/qr?text=${encodeURIComponent(qrCode)}&size=300&margin=1`
    : "";

  let locationStr = "Venue";
  if (data.event.locationType === "online") {
    locationStr = "Online Stream";
  } else if (
    data.event.locationDetails &&
    typeof data.event.locationDetails === "object" &&
    "address" in data.event.locationDetails &&
    typeof data.event.locationDetails.address === "string"
  ) {
    locationStr = data.event.locationDetails.address;
  }

  const interpolationData: InterpolationData = {
    event: {
      title: data.event.title,
      startDate: data.event.startDate
        ? new Date(data.event.startDate).toLocaleString()
        : "",
      endDate: data.event.endDate
        ? new Date(data.event.endDate).toLocaleString()
        : "",
      location: locationStr,
      url: `${origin}/${data.event.slug}`,
      passUrl,
    },
    attendee: {
      name: data.user.name,
      email: data.user.email,
    },
    ticket: {
      id: data.ticket.id,
      type: data.ticketType.name || "Pass",
      qrCode,
      qrCodeUrl,
    },
    form: formMap,
  };

  const rawSubject =
    activeTemplate.subject || `Welcome to ${data.event.title}!`;
  const rawBody =
    activeTemplate.body || `<p>Welcome! You have been checked in.</p>`;

  const subject = interpolateTemplate(rawSubject, interpolationData);
  const body = sanitizeEmailHtml(interpolateTemplate(rawBody, interpolationData));

  await tx
    .insert(deliveryJobs)
    .values({
      key: `checkin:${ticketId}`,
      eventId: data.event.id,
      payload: {
        recipientEmail: data.user.email,
        recipientName: data.user.name,
        subject,
        body,
        templateId: activeTemplate.id,
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
