import { verifyEventPermission } from "../utils/permissions";
import { sanitizeEmailHtml } from "../utils/html";
import { handleControllerError } from "../utils/errors";
import type { FastifyRequest, FastifyReply } from "fastify";
import db from "@db";
import {
  emailTemplates,
  emailLogs,
  events,
  tickets,
  users,
  checkIns,
  formFields,
  ticketTypes,
} from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { deliverMail } from "../services/mail.service";
import {
  sendEmail,
  DEFAULT_TEMPLATES,
  type InterpolationData,
} from "../utils/emailService";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TRANSPARENT_1X1_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export const getEmailTemplates = async (
  request: FastifyRequest<{ Params: { eventId: string } }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId } = request.params;

    const isOwner = await verifyEventPermission(
      eventId,
      user.id,
      "manage_emails",
    );
    if (!isOwner) {
      return reply
        .status(403)
        .send({ error: "Unauthorized access to event templates." });
    }

    const templateHeaders = await db
      .select({
        id: emailTemplates.id,
        eventId: emailTemplates.eventId,
        name: emailTemplates.name,
        type: emailTemplates.type,
        isActive: emailTemplates.isActive,
        createdAt: emailTemplates.createdAt,
        updatedAt: emailTemplates.updatedAt,
      })
      .from(emailTemplates)
      .where(eq(emailTemplates.eventId, eventId));

    return reply.send(templateHeaders);
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const getEmailTemplateById = async (
  request: FastifyRequest<{ Params: { eventId: string; templateId: string } }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId, templateId } = request.params;

    const isOwner = await verifyEventPermission(
      eventId,
      user.id,
      "manage_emails",
    );
    if (!isOwner) {
      return reply
        .status(403)
        .send({ error: "Unauthorized access to event template." });
    }

    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, templateId),
          eq(emailTemplates.eventId, eventId),
        ),
      );

    if (!template) {
      return reply.status(404).send({ error: "Email template not found." });
    }

    return reply.send(template);
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const createEmailTemplate = async (
  request: FastifyRequest<{
    Params: { eventId: string };
    Body: {
      name: string;
      type?:
        | "invitation"
        | "confirmation"
        | "checkin"
        | "thank_you"
        | "sorry"
        | "custom";
      subject: string;
      body: string;
      isActive?: boolean;
    };
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId } = request.params;
    const body = request.body;

    const isOwner = await verifyEventPermission(
      eventId,
      user.id,
      "manage_emails",
    );
    if (!isOwner) {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const [created] = await db
      .insert(emailTemplates)
      .values({
        eventId,
        name: body.name,
        type: body.type || "custom",
        subject: body.subject,
        body: sanitizeEmailHtml(body.body),
        isActive: body.isActive !== undefined ? body.isActive : true,
      })
      .returning();

    return reply.status(201).send(created);
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const updateEmailTemplate = async (
  request: FastifyRequest<{
    Params: { eventId: string; templateId: string };
    Body: {
      name?: string;
      type?:
        | "invitation"
        | "confirmation"
        | "checkin"
        | "thank_you"
        | "sorry"
        | "custom";
      subject?: string;
      body?: string;
      isActive?: boolean;
    };
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId, templateId } = request.params;
    const body = request.body;

    const isOwner = await verifyEventPermission(
      eventId,
      user.id,
      "manage_emails",
    );
    if (!isOwner) {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const payload: Partial<typeof emailTemplates.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (body.name !== undefined) payload.name = body.name;
    if (body.type !== undefined) payload.type = body.type;
    if (body.subject !== undefined) payload.subject = body.subject;
    if (body.body !== undefined) payload.body = sanitizeEmailHtml(body.body);
    if (body.isActive !== undefined) payload.isActive = body.isActive;

    const [updated] = await db
      .update(emailTemplates)
      .set(payload)
      .where(
        and(
          eq(emailTemplates.id, templateId),
          eq(emailTemplates.eventId, eventId),
        ),
      )
      .returning();

    if (!updated) {
      return reply.status(404).send({ error: "Email template not found." });
    }

    return reply.send(updated);
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const deleteEmailTemplate = async (
  request: FastifyRequest<{
    Params: { eventId: string; templateId: string };
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId, templateId } = request.params;

    const isOwner = await verifyEventPermission(
      eventId,
      user.id,
      "manage_emails",
    );
    if (!isOwner) {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const deletedList = await db
      .delete(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, templateId),
          eq(emailTemplates.eventId, eventId),
        ),
      )
      .returning();

    if (deletedList.length === 0) {
      return reply.status(404).send({ error: "Email template not found." });
    }

    return reply.send({ message: "Email template deleted successfully." });
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const resetEmailTemplate = async (
  request: FastifyRequest<{
    Params: { eventId: string; templateId: string };
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId, templateId } = request.params;

    const isOwner = await verifyEventPermission(
      eventId,
      user.id,
      "manage_emails",
    );
    if (!isOwner) {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const [existing] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, templateId),
          eq(emailTemplates.eventId, eventId),
        ),
      );

    if (!existing) {
      return reply.status(404).send({ error: "Email template not found." });
    }

    const defaultMatch = DEFAULT_TEMPLATES.find(
      (t) => t.type === existing.type,
    );
    if (!defaultMatch) {
      return reply
        .status(400)
        .send({ error: "No system default for custom template type." });
    }

    const [resetted] = await db
      .update(emailTemplates)
      .set({
        subject: defaultMatch.subject,
        body: defaultMatch.body,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, templateId))
      .returning();

    return reply.send(resetted);
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const getAvailableVariables = async (
  request: FastifyRequest<{ Params: { eventId: string } }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId } = request.params;

    const isOwner = await verifyEventPermission(
      eventId,
      user.id,
      "manage_emails",
    );
    if (!isOwner) {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const [eventObj] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId));
    const fields = await db
      .select()
      .from(formFields)
      .where(eq(formFields.eventId, eventId));

    const eventVariables = [
      {
        key: "{{event.title}}",
        label: "Event Title",
        sample: eventObj?.title || "Tech Summit 2026",
      },
      {
        key: "{{event.startDate}}",
        label: "Start Date",
        sample: eventObj?.startDate
          ? new Date(eventObj.startDate).toLocaleString()
          : "Oct 24, 2026 10:00 AM",
      },
      {
        key: "{{event.endDate}}",
        label: "End Date",
        sample: eventObj?.endDate
          ? new Date(eventObj.endDate).toLocaleString()
          : "Oct 24, 2026 05:00 PM",
      },
      {
        key: "{{event.location}}",
        label: "Location / Venue",
        sample:
          eventObj?.locationType === "online"
            ? "Online Stream Link"
            : "Grand Convention Center",
      },
      {
        key: "{{event.url}}",
        label: "Public Event URL",
        sample: `${(process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0]}/${eventObj?.slug || "event-slug"}`,
      },
      {
        key: "{{event.passUrl}}",
        label: "Attendee Pass URL",
        sample: `${(process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0]}/passes/sample-pass-id`,
      },
    ];

    const attendeeVariables = [
      {
        key: "{{attendee.name}}",
        label: "Attendee Full Name",
        sample: "Alex Morgan",
      },
      {
        key: "{{attendee.email}}",
        label: "Attendee Email",
        sample: "alex@example.com",
      },
    ];

    const ticketVariables = [
      {
        key: "{{ticket.type}}",
        label: "Ticket Type Name",
        sample: "VIP Access Pass",
      },
      {
        key: "{{ticket.qrCode}}",
        label: "QR Code String",
        sample: "TKT-884920-XYZ",
      },
      {
        key: "{{ticket.qrCodeUrl}}",
        label: "Ticket QR Image URL",
        sample:
          "https://quickchart.io/qr?text=TKT-884920-XYZ&size=300&margin=1",
      },
    ];

    const formVariables = fields.map((f) => ({
      key: `{{form.${f.label}}}`,
      label: f.label,
      sample: `Sample ${f.label}`,
    }));

    return reply.send({
      eventVariables,
      attendeeVariables,
      ticketVariables,
      formVariables,
    });
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const sendTestEmail = async (
  request: FastifyRequest<{
    Params: { eventId: string };
    Body: {
      recipientEmail: string;
      recipientName?: string;
      subject: string;
      body: string;
      templateId?: string;
    };
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId } = request.params;
    const { recipientEmail, recipientName, subject, body, templateId } =
      request.body;

    const isOwner = await verifyEventPermission(
      eventId,
      user.id,
      "manage_emails",
    );
    if (!isOwner) {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const [eventObj] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId));

    const sampleData: InterpolationData = {
      event: {
        title: eventObj?.title || "Sample Event",
        startDate: eventObj?.startDate
          ? new Date(eventObj.startDate).toLocaleString()
          : "Oct 24, 2026, 10:00 AM",
        endDate: eventObj?.endDate
          ? new Date(eventObj.endDate).toLocaleString()
          : "Oct 24, 2026, 05:00 PM",
        location:
          eventObj?.locationType === "online"
            ? "Online Stream"
            : "Main Auditorium",
        url: `${(process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0]}/${eventObj?.slug || "sample-event"}`,
        passUrl: `${(process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0]}/passes/sample-pass-id`,
      },
      attendee: {
        name: recipientName || "Test Recipient",
        email: recipientEmail,
      },
      ticket: {
        type: "General Admission (Test)",
        qrCode: "TEST-QR-123456",
      },
    };

    const result = await sendEmail({
      eventId,
      templateId,
      recipientEmail,
      recipientName: recipientName || "Test Recipient",
      subject,
      body,
      data: sampleData,
    });

    if (!result.success) {
      return reply
        .status(500)
        .send({ error: result.error || "Failed to send test email" });
    }

    return reply.send({
      message: `Test email successfully dispatched to ${recipientEmail}`,
      log: result.log,
    });
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const sendBatchEmail = async (
  request: FastifyRequest<{
    Params: { eventId: string };
    Body: {
      targetGroup: "all" | "checked_in" | "not_checked_in" | "custom";
      customEmails?: string[];
      subject: string;
      body: string;
      templateId?: string;
    };
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId } = request.params;
    const { targetGroup, customEmails, subject, body, templateId } =
      request.body;

    const isOwner = await verifyEventPermission(
      eventId,
      user.id,
      "manage_emails",
    );
    if (!isOwner) {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const [eventObj] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId));

    let recipients: {
      email: string;
      name?: string;
      ticketType?: string;
      passId?: string;
      qrCode?: string;
    }[] = [];

    if (targetGroup === "custom" && customEmails && customEmails.length > 0) {
      recipients = customEmails.map((e) => ({
        email: e,
        name: e.split("@")[0] || e,
      }));
    } else {
      // Query ticket holders for the event
      const ticketRecords = await db
        .select({
          ticketId: tickets.id,
          qrCode: tickets.qrCode,
          userEmail: users.email,
          userName: users.name,
          ticketTypeName: ticketTypes.name,
        })
        .from(tickets)
        .innerJoin(users, eq(tickets.userId, users.id))
        .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
        .where(eq(tickets.eventId, eventId));

      if (targetGroup === "all") {
        recipients = ticketRecords.map((t) => ({
          email: t.userEmail,
          name: t.userName,
          ticketType: t.ticketTypeName,
          passId: t.ticketId,
          qrCode: t.qrCode,
        }));
      } else {
        // Query check-ins
        const checkInRecords = await db
          .select({ ticketId: checkIns.ticketId })
          .from(checkIns)
          .where(eq(checkIns.eventId, eventId));

        const checkedInTicketIds = new Set(
          checkInRecords.map((c) => c.ticketId),
        );

        if (targetGroup === "checked_in") {
          recipients = ticketRecords
            .filter((t) => checkedInTicketIds.has(t.ticketId))
            .map((t) => ({
              email: t.userEmail,
              name: t.userName,
              ticketType: t.ticketTypeName,
              passId: t.ticketId,
              qrCode: t.qrCode,
            }));
        } else if (targetGroup === "not_checked_in") {
          recipients = ticketRecords
            .filter((t) => !checkedInTicketIds.has(t.ticketId))
            .map((t) => ({
              email: t.userEmail,
              name: t.userName,
              ticketType: t.ticketTypeName,
              passId: t.ticketId,
              qrCode: t.qrCode,
            }));
        }
      }
    }

    let sentCount = 0;

    for (const r of recipients) {
      const data: InterpolationData = {
        event: {
          title: eventObj?.title || "Event",
          startDate: eventObj?.startDate
            ? new Date(eventObj.startDate).toLocaleString()
            : "",
          endDate: eventObj?.endDate
            ? new Date(eventObj.endDate).toLocaleString()
            : "",
          location:
            eventObj?.locationType === "online" ? "Online Stream" : "Venue",
          url: `${(process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0]}/${eventObj?.slug || ""}`,
          passUrl: r.passId
            ? `${(process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0]}/passes/${r.passId}`
            : "",
        },
        attendee: {
          name: r.name,
          email: r.email,
        },
        ticket: {
          type: r.ticketType || "Pass",
          id: r.passId,
          qrCode: r.qrCode,
        },
      };

      const result = await sendEmail({
        eventId,
        templateId,
        recipientEmail: r.email,
        recipientName: r.name,
        subject,
        body,
        data,
      });

      if (result.success) sentCount++;
    }

    return reply.send({
      message: `Batch email successfully dispatched to ${sentCount} recipients.`,
      sentCount,
    });
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export function calculateEmailAnalytics(
  logs: {
    templateType?: string | null;
    status: string;
    openedAt?: Date | string | null;
    openCount?: number | null;
    sentAt: Date | string;
  }[],
) {
  const totalSent = logs.filter((l) => l.status === "sent").length;
  const totalFailed = logs.filter((l) => l.status === "failed").length;
  const totalOpened = logs.filter(
    (l) =>
      (l.openCount !== null && l.openCount !== undefined && l.openCount > 0) ||
      (l.openedAt !== null && l.openedAt !== undefined),
  ).length;
  const totalUnopened = logs.filter(
    (l) =>
      l.status === "sent" &&
      (!l.openCount || l.openCount === 0) &&
      !l.openedAt,
  ).length;
  const openRatePercent =
    totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

  const standardTypes = [
    "confirmation",
    "checkin",
    "invitation",
    "thank_you",
    "sorry",
    "custom",
  ];
  const allTypesSet = new Set(standardTypes);
  for (const log of logs) {
    if (log.templateType) {
      allTypesSet.add(log.templateType);
    }
  }

  const byType = Array.from(allTypesSet).map((type) => {
    const typeLogs = logs.filter(
      (l) => (l.templateType || "custom") === type,
    );
    const sent = typeLogs.filter((l) => l.status === "sent").length;
    const opened = typeLogs.filter(
      (l) =>
        (l.openCount !== null && l.openCount !== undefined && l.openCount > 0) ||
        (l.openedAt !== null && l.openedAt !== undefined),
    ).length;
    const unopened = Math.max(0, sent - opened);
    const failed = typeLogs.filter((l) => l.status === "failed").length;
    const rate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
    return {
      templateType: type,
      sent,
      opened,
      unopened,
      failed,
      openRatePercent: rate,
    };
  });

  const timelineMap = new Map<
    string,
    { bucket: string; sent: number; opened: number }
  >();
  for (const log of logs) {
    if (log.sentAt) {
      const bucket = new Date(log.sentAt).toISOString().slice(0, 10);
      const entry = timelineMap.get(bucket) || { bucket, sent: 0, opened: 0 };
      if (log.status === "sent") {
        entry.sent += 1;
      }
      timelineMap.set(bucket, entry);
    }
    if (log.openedAt) {
      const bucket = new Date(log.openedAt).toISOString().slice(0, 10);
      const entry = timelineMap.get(bucket) || { bucket, sent: 0, opened: 0 };
      entry.opened += 1;
      timelineMap.set(bucket, entry);
    }
  }

  const timeline = Array.from(timelineMap.values()).sort((a, b) =>
    a.bucket.localeCompare(b.bucket),
  );

  return {
    totalSent,
    totalFailed,
    totalOpened,
    totalUnopened,
    openRatePercent,
    byType,
    timeline,
  };
}

export const getEmailLogs = async (
  request: FastifyRequest<{ Params: { eventId: string } }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId } = request.params;

    const isOwner = await verifyEventPermission(
      eventId,
      user.id,
      "manage_emails",
    );
    if (!isOwner) {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const logs = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.eventId, eventId))
      .orderBy(desc(emailLogs.sentAt));

    const analytics = calculateEmailAnalytics(logs);

    return reply.send({ logs, analytics });
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const trackEmailOpen = async (
  request: FastifyRequest<{ Params: { logId: string } }>,
  reply: FastifyReply,
) => {
  try {
    const rawLogId = request.params.logId || "";
    const logId = rawLogId.replace(/\.gif$/i, "").trim();

    if (UUID_REGEX.test(logId)) {
      await db
        .update(emailLogs)
        .set({
          openedAt: sql`coalesce(${emailLogs.openedAt}, now())`,
          openCount: sql`${emailLogs.openCount} + 1`,
        })
        .where(eq(emailLogs.id, logId));
    }

    return reply
      .header("Content-Type", "image/gif")
      .header(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      )
      .send(TRANSPARENT_1X1_GIF);
  } catch {
    return reply
      .header("Content-Type", "image/gif")
      .header(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      )
      .send(TRANSPARENT_1X1_GIF);
  }
};

export const resendEmailLog = async (
  request: FastifyRequest<{ Params: { eventId: string; logId: string } }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId, logId } = request.params;

    const isOwner = await verifyEventPermission(
      eventId,
      user.id,
      "manage_emails",
    );
    if (!isOwner) {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const [log] = await db
      .select()
      .from(emailLogs)
      .where(and(eq(emailLogs.id, logId), eq(emailLogs.eventId, eventId)));

    if (!log) {
      return reply.status(404).send({ error: "Email log not found." });
    }

    const trackingPixel = `<img src="${process.env.CDN_URL || "http://localhost:3001"}/api/emails/track/${log.id}.gif" width="1" height="1" alt="" style="display:none;width:1px;height:1px;" />`;
    const emailBody = `${log.renderedBody || log.subject}${trackingPixel}`;

    try {
      await deliverMail(
        {
          recipientEmail: log.recipientEmail,
          recipientName: log.recipientName || undefined,
          subject: log.subject,
          body: emailBody,
        },
        eventId,
      );

      const [updatedLog] = await db
        .update(emailLogs)
        .set({
          status: "sent",
          resentCount: sql`${emailLogs.resentCount} + 1`,
          lastResentAt: new Date(),
          errorMessage: null,
        })
        .where(and(eq(emailLogs.id, logId), eq(emailLogs.eventId, eventId)))
        .returning();

      return reply.send(updatedLog);
    } catch (deliverError) {
      const errorMsg =
        deliverError instanceof Error
          ? deliverError.message
          : "Resend delivery failed";

      const [failedLog] = await db
        .update(emailLogs)
        .set({
          status: "failed",
          resentCount: sql`${emailLogs.resentCount} + 1`,
          lastResentAt: new Date(),
          errorMessage: errorMsg,
        })
        .where(and(eq(emailLogs.id, logId), eq(emailLogs.eventId, eventId)))
        .returning();

      return reply.status(500).send({
        error: errorMsg,
        log: failedLog,
      });
    }
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};
