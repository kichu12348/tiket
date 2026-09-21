import type { FastifyRequest, FastifyReply } from "fastify";
import db from "@db";
import { checkIns, tickets, events, eventTeamMembers, emailTemplates, users } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "../utils/emailService";

interface ScanTicketBody {
  qrCode: string;
}

export const scanTicket = async (
  request: FastifyRequest<{ Body: ScanTicketBody }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { qrCode } = request.body;

    const ticketList = await db
      .select()
      .from(tickets)
      .where(eq(tickets.qrCode, qrCode));
    const ticket = ticketList[0];

    if (!ticket) {
      return reply.status(404).send({
        error: "Invalid QR Code. Cryptographic sequence natively unmapped.",
      });
    }

    if (ticket.status !== "active") {
      return reply.status(400).send({
        error: `Ticket scan strictly rejected. Current structural condition relies explicitly bounded as: ${ticket.status.toUpperCase()}`,
      });
    }

    const targetEventId = ticket.eventId;

    // Verify Scanner Authoritative Bound Mapping limits globally
    const eventList = await db
      .select()
      .from(events)
      .where(eq(events.id, targetEventId));
    const eventObj = eventList[0];

    if (!eventObj) {
      return reply.status(500).send({
        error:
          "Ticketing database natively fails to match parent event mapping limit.",
      });
    }

    let hasAccess = eventObj.organizationId === user.id;

    if (!hasAccess) {
      const teamList = await db
        .select()
        .from(eventTeamMembers)
        .where(
          and(
            eq(eventTeamMembers.eventId, targetEventId),
            eq(eventTeamMembers.userId, user.id),
          ),
        );

      if (teamList.length > 0) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return reply.status(403).send({
        error:
          "You are absolutely not an authorized scanner or native event team member configured.",
      });
    }

    return await db.transaction(async (tx) => {
      // Enforce native double-lock checking ensuring atomic security from dual scanners executing same interval
      const atomicTicketList = await tx
        .select()
        .from(tickets)
        .where(eq(tickets.id, ticket.id));
      const atomicTicket = atomicTicketList[0];

      if (!atomicTicket || atomicTicket.status !== "active") {
        tx.rollback();
        return reply.status(400).send({
          error:
            "Execution block prevented. Ticket limit invalidated during transaction loop.",
        });
      }

      const logList = await tx
        .insert(checkIns)
        .values({
          eventId: targetEventId,
          ticketId: ticket.id,
          loggedByUserId: user.id,
        })
        .returning();

      const log = logList[0];

      const updatedTicketList = await tx
        .update(tickets)
        .set({ status: "used", updatedAt: new Date() })
        .where(eq(tickets.id, ticket.id))
        .returning();

      const updatedTicket = updatedTicketList[0];

      // Async email trigger (non-blocking)
      (async () => {
        try {
          const [tpl] = await db
            .select()
            .from(emailTemplates)
            .where(
              and(
                eq(emailTemplates.eventId, targetEventId),
                eq(emailTemplates.type, "checkin"),
                eq(emailTemplates.isActive, true),
              ),
            );

          if (tpl) {
            const [attendeeUser] = await db
              .select()
              .from(users)
              .where(eq(users.id, ticket.userId));

            if (attendeeUser) {
              await sendEmail({
                eventId: targetEventId,
                templateId: tpl.id,
                recipientEmail: attendeeUser.email,
                recipientName: attendeeUser.name,
                subject: tpl.subject,
                body: tpl.body,
                data: {
                  event: {
                    title: eventObj.title,
                    startDate: eventObj.startDate ? new Date(eventObj.startDate).toLocaleString() : "",
                    location: eventObj.locationType === "online" ? "Online Stream" : "Venue",
                  },
                  attendee: {
                    name: attendeeUser.name,
                    email: attendeeUser.email,
                  },
                  ticket: {
                    qrCode: ticket.qrCode,
                  },
                },
              });
            }
          }
        } catch (e) {
          console.error("Checkin email trigger error:", e);
        }
      })();

      return reply.status(201).send({
        message:
          "Ticket scanned and uniquely validated strictly successfully! Entry inherently authorized.",
        checkIn: log,
        ticket: updatedTicket,
      });
    });
  } catch (error) {
    if ((error as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized bound access." });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};
