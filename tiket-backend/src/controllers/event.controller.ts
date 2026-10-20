import {
  allocatedByTier,
  emitEvent,
  expireHolds,
  lockEvent,
} from "../services/inventory.service";
import { verifyEventPermission } from "../utils/permissions";
import { handleControllerError } from "../utils/errors";
import { sanitizeRichText } from "../utils/html";
import { HttpError } from "../utils/errors";
import type { FastifyRequest, FastifyReply } from "fastify";
import db from "@db";
import {
  events,
  users,
  eventRoles,
  eventTeamMembers,
  orders,
  domainEvents,
  connectionTickets,
  uploads,
} from "@db/schema";
import { generateSlug } from "@utils";
import { seedDefaultTemplatesForEvent } from "../utils/emailService";
import { eq, and, ne } from "drizzle-orm";

interface CreateEventBody {
  title: string;
  description?: string;
  coverImage?: string;
  color?: string;
  locationType?: "online" | "offline" | "hybrid";
  locationDetails?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    placeId?: string;
    lat?: number;
    lng?: number;
    link?: string;
  };
  startDate: string;
  endDate: string;
  timezone: string;
  registrationStart?: string;
  registrationEnd?: string;
  fontFamily?: string;
  requireApproval?: boolean;
  capacity?: number | null;
  status?: "draft" | "published";
  slug?: string;
}

interface UpdateEventBody extends Partial<Omit<CreateEventBody, "status">> {
  status?: "draft" | "published" | "completed" | "cancelled";
}

export const createEvent = async (
  request: FastifyRequest<{ Body: CreateEventBody }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string; type: string };

    // if (user.type !== "organization") {
    //   return reply
    //     .status(403)
    //     .send({ error: "Only organizations can create events." });
    // }

    const body = request.body;
    if (
      body.startDate &&
      body.endDate &&
      new Date(body.endDate) <= new Date(body.startDate)
    )
      throw new HttpError(400, "Event end must follow start.");
    if (
      body.capacity !== undefined &&
      body.capacity !== null &&
      body.capacity <= 0
    )
      throw new HttpError(400, "Capacity must be positive.");

    const slug = generateSlug(8);

    const existingSlugList = await db
      .select({ slug: events.slug })
      .from(events)
      .where(eq(events.slug, slug));

    if (existingSlugList.length > 0) {
      // if slug already exists return an error
      return reply
        .status(400)
        .send({ error: "An event with a similar slug already exists" });
    }

    const newEventList = await db
      .insert(events)
      .values({
        title: body.title,
        description: body.description
          ? sanitizeRichText(body.description)
          : null,
        coverImage: body.coverImage,
        color: body.color,
        locationType: body.locationType || "offline",
        locationDetails: body.locationDetails,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        timezone: body.timezone || "UTC",
        registrationStart: body.registrationStart
          ? new Date(body.registrationStart)
          : null,
        registrationEnd: body.registrationEnd
          ? new Date(body.registrationEnd)
          : null,
        fontFamily: body.fontFamily || "'Inter', sans-serif",
        requireApproval: body.requireApproval || false,
        capacity: body.capacity || null,
        status: "draft",
        organizationId: user.id,
        slug: slug,
      })
      .returning();

    const createdEvent = newEventList[0];
    if (!createdEvent) {
      throw new Error("Failed to create event");
    }

    // Seed default email templates once at event creation
    await seedDefaultTemplatesForEvent(createdEvent.id);

    return reply.status(201).send(createdEvent);
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const getPublicEvents = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const publishedEvents = await db
      .select()
      .from(events)
      .where(eq(events.status, "published"));

    return reply.send(publishedEvents);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const getMyEvents = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };

    const myEventsList = await db
      .select()
      .from(events)
      .where(eq(events.organizationId, user.id));

    return reply.send(myEventsList);
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const getEventById = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) => {
  try {
    const eventId = request.params.id;

    const eventList = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId));

    const event = eventList[0];
    if (!event) {
      return reply.status(404).send({ error: "Event not found" });
    }

    if (event.status !== "published") {
      try {
        await request.jwtVerify();
        const user = request.user as { id: string };
        if (
          event.organizationId !== user.id &&
          !(
            await db
              .select({ id: eventTeamMembers.id })
              .from(eventTeamMembers)
              .where(
                and(
                  eq(eventTeamMembers.eventId, event.id),
                  eq(eventTeamMembers.userId, user.id),
                ),
              )
              .limit(1)
          ).length
        ) {
          return reply.status(404).send({ error: "Event not found" });
        }
      } catch (err) {
        return reply.status(404).send({ error: "Event not found" });
      }
    }

    return reply.send(event);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const getEventBySlug = async (
  request: FastifyRequest<{ Params: { slug: string } }>,
  reply: FastifyReply,
) => {
  try {
    const eventSlug = request.params.slug;
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.slug, eventSlug));

    if (!event) {
      return reply.status(404).send({ error: "Event not found" });
    }

    let isAssociated = false;

    try {
      await request.jwtVerify();
      const user = request.user as { id: string };
      if (user && user.id) {
        if (event.organizationId === user.id) {
          isAssociated = true;
        } else {
          const teamCheck = await db
            .select({ id: eventTeamMembers.id })
            .from(eventTeamMembers)
            .where(
              and(
                eq(eventTeamMembers.eventId, event.id),
                eq(eventTeamMembers.userId, user.id),
              ),
            );
          isAssociated = teamCheck.length > 0;
        }
      }
    } catch (err) {
      // Unauthenticated
    }

    if (event.status !== "published" && !isAssociated) {
      return reply.status(404).send({ error: "Event not found" });
    }

    return reply.send({
      ...event,
      isAssociated,
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const updateEvent = async (
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateEventBody }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const eventId = request.params.id;
    const body = request.body;

    const eventList = await db
      .select({ organizationId: events.organizationId })
      .from(events)
      .where(eq(events.id, eventId));

    const eventToUpdate = eventList[0];
    if (!eventToUpdate) {
      return reply.status(404).send({ error: "Event not found" });
    }

    if (!(await verifyEventPermission(eventId, user.id, "manage_settings"))) {
      return reply
        .status(403)
        .send({ error: "Unauthorized to modify this event" });
    }

    const {
      startDate,
      endDate,
      registrationStart,
      registrationEnd,
      ...details
    } = body;
    const payload: Partial<typeof events.$inferInsert> = {
      ...details,
      updatedAt: new Date(),
    };
    if (body.description !== undefined)
      payload.description = sanitizeRichText(body.description);
    if (body.startDate) payload.startDate = new Date(body.startDate);
    if (body.endDate) payload.endDate = new Date(body.endDate);
    if (body.timezone) payload.timezone = body.timezone;
    if (body.registrationStart)
      payload.registrationStart = new Date(body.registrationStart);
    if (body.registrationEnd)
      payload.registrationEnd = new Date(body.registrationEnd);
    if (body.requireApproval !== undefined)
      payload.requireApproval = body.requireApproval;
    if (body.capacity !== undefined) payload.capacity = body.capacity;
    if (body.status !== undefined) payload.status = body.status;

    const updatedEventList = await db.transaction(async (tx) => {
      const current = await lockEvent(tx, eventId);
      await expireHolds(tx, eventId);
      const start = payload.startDate ?? current.startDate;
      const end = payload.endDate ?? current.endDate;
      const registrationStart =
        payload.registrationStart ?? current.registrationStart;
      const registrationEnd =
        payload.registrationEnd ?? current.registrationEnd;
      if (
        end <= start ||
        (registrationStart &&
          registrationEnd &&
          registrationEnd <= registrationStart) ||
        (registrationEnd && registrationEnd > end)
      )
        throw new HttpError(400, "Invalid event or registration window.");
      if (
        body.capacity !== undefined &&
        body.capacity !== null &&
        (body.capacity <= 0 ||
          body.capacity <
            [...(await allocatedByTier(tx, eventId)).values()].reduce(
              (a, b) => a + b,
              0,
            ))
      )
        throw new HttpError(
          409,
          "Capacity cannot be lower than allocated tickets.",
        );
      const result = await tx
        .update(events)
        .set(payload)
        .where(eq(events.id, eventId))
        .returning();
      await emitEvent(tx, eventId, "event.changed");
      return result;
    });
    const updatedEvent = updatedEventList[0];
    if (!updatedEvent) {
      return reply
        .status(500)
        .send({ error: "Failed to update event details" });
    }

    return reply.send(updatedEvent);
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const deleteEvent = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const eventId = request.params.id;

    const eventList = await db
      .select({ organizationId: events.organizationId })
      .from(events)
      .where(eq(events.id, eventId));

    const eventToDelete = eventList[0];
    if (!eventToDelete) {
      return reply.status(404).send({ error: "Event not found" });
    }

    if (eventToDelete.organizationId !== user.id) {
      return reply
        .status(403)
        .send({ error: "Unauthorized to delete this event" });
    }

    await db.transaction(async (tx) => {
      await lockEvent(tx, eventId);
      const [sale] = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.eventId, eventId))
        .limit(1);
      const [file] = await tx
        .select({ id: uploads.id })
        .from(uploads)
        .where(eq(uploads.eventId, eventId))
        .limit(1);
      if (sale || file)
        throw new HttpError(
          409,
          "Events with orders or registration files must be cancelled, not deleted.",
        );
      await tx
        .delete(connectionTickets)
        .where(eq(connectionTickets.eventId, eventId));
      await tx.delete(domainEvents).where(eq(domainEvents.eventId, eventId));
      await tx.delete(events).where(eq(events.id, eventId));
    });

    return reply.send({ message: "Event deleted successfully" });
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const updateEventSlug = async (
  request: FastifyRequest<{ Params: { id: string }; Body: { slug: string } }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const eventId = request.params.id;
    const { slug } = request.body;

    const eventList = await db
      .select({ organizationId: events.organizationId })
      .from(events)
      .where(eq(events.id, eventId));

    const eventToUpdate = eventList[0];
    if (!eventToUpdate) {
      return reply.status(404).send({ error: "Event not found" });
    }

    if (eventToUpdate.organizationId !== user.id) {
      return reply
        .status(403)
        .send({ error: "Unauthorized to modify this event" });
    }

    const existingSlugList = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.slug, slug), ne(events.id, eventId)));

    if (existingSlugList.length > 0) {
      return reply
        .status(400)
        .send({ error: "An event with this slug already exists" });
    }

    const updatedEventList = await db
      .update(events)
      .set({ slug, updatedAt: new Date() })
      .where(eq(events.id, eventId))
      .returning({ slug: events.slug, id: events.id });

    const updatedEvent = updatedEventList[0];

    if (!updatedEvent) {
      return reply
        .status(500)
        .send({ error: "Failed to update event slug, try again" });
    }

    return reply.send({
      message: "Slug updated successfully",
      slug: updatedEvent.slug,
      id: updatedEvent.id,
    });
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const getEventHosts = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const eventId = request.params.id;

    const eventList = await db
      .select({ organizationId: events.organizationId })
      .from(events)
      .where(eq(events.id, eventId));

    const eventInfo = eventList[0];
    if (!eventInfo) {
      return reply.status(404).send({ error: "Event not found" });
    }

    const creatorList = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, eventInfo.organizationId));

    const creator = creatorList[0];

    const teamMembersList = await db
      .select({
        id: eventTeamMembers.id,
        user: { id: users.id, name: users.name, email: users.email },
        role: { name: eventRoles.name },
      })
      .from(eventTeamMembers)
      .innerJoin(users, eq(eventTeamMembers.userId, users.id))
      .innerJoin(eventRoles, eq(eventTeamMembers.roleId, eventRoles.id))
      .where(eq(eventTeamMembers.eventId, eventId))
      .limit(20);

    const hosts = [];
    if (creator) {
      hosts.push({
        id: creator.id,
        name: creator.name,
        email: creator.email,
        role: "Creator",
        isCreator: true,
      });
    }

    for (const member of teamMembersList) {
      if (member.user.id !== creator?.id) {
        hosts.push({
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          role: member.role.name,
          isCreator: false,
        });
      }
    }

    return reply.send(hosts);
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};
