import { handleControllerError } from "../utils/errors";
import { verifyEventPermission } from "../utils/permissions";
import type { FastifyRequest, FastifyReply } from "fastify";
import db from "@db";
import { documentTemplates } from "@db/schema";
import { eq } from "drizzle-orm";

interface CreateTemplateBody {
  name: string;
  type: "ticket" | "certificate";
  backgroundImageUrl?: string;
  elementsJson?: unknown;
}

interface UpdateTemplateBody {
  name?: string;
  backgroundImageUrl?: string;
  elementsJson?: unknown;
}

export const createTemplate = async (
  request: FastifyRequest<{
    Params: { eventId: string };
    Body: CreateTemplateBody;
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId } = request.params;
    const body = request.body;

    const hasPermission = await verifyEventPermission(
      eventId,
      user.id,
      "manage_tickets",
    );
    if (!hasPermission) {
      return reply.status(403).send({
        error:
          "Only the event creator or team members with manage_tickets permission can configure Document visual boundaries.",
      });
    }

    const newTemplateList = await db
      .insert(documentTemplates)
      .values({
        eventId,
        name: body.name,
        type: body.type,
        backgroundImageUrl: body.backgroundImageUrl || null,
        elementsJson: body.elementsJson || [],
      })
      .returning();

    return reply.status(201).send(newTemplateList[0]);
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const getTemplates = async (
  request: FastifyRequest<{ Params: { eventId: string } }>,
  reply: FastifyReply,
) => {
  try {
    const { eventId } = request.params;

    const templatesList = await db
      .select()
      .from(documentTemplates)
      .where(eq(documentTemplates.eventId, eventId));

    return reply.send(templatesList);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const updateTemplate = async (
  request: FastifyRequest<{
    Params: { templateId: string };
    Body: UpdateTemplateBody;
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { templateId } = request.params;
    const body = request.body;

    const [existingTemplate] = await db
      .select()
      .from(documentTemplates)
      .where(eq(documentTemplates.id, templateId));

    if (!existingTemplate) {
      return reply.status(404).send({ error: "Document Template missing." });
    }

    const hasPermission = await verifyEventPermission(
      existingTemplate.eventId,
      user.id,
      "manage_tickets",
    );
    if (!hasPermission) {
      return reply.status(403).send({
        error: "Unauthorized. Template boundaries natively restricted.",
      });
    }

    const payload: Partial<typeof documentTemplates.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (body.name !== undefined) payload.name = body.name;
    if (body.backgroundImageUrl !== undefined)
      payload.backgroundImageUrl = body.backgroundImageUrl;
    if (body.elementsJson !== undefined)
      payload.elementsJson = body.elementsJson;

    const updatedTemplateList = await db
      .update(documentTemplates)
      .set(payload)
      .where(eq(documentTemplates.id, templateId))
      .returning();

    return reply.send(updatedTemplateList[0]);
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const deleteTemplate = async (
  request: FastifyRequest<{ Params: { templateId: string } }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { templateId } = request.params;

    const [existingTemplate] = await db
      .select()
      .from(documentTemplates)
      .where(eq(documentTemplates.id, templateId));

    if (!existingTemplate) {
      return reply.status(404).send({ error: "Document Template missing." });
    }

    const hasPermission = await verifyEventPermission(
      existingTemplate.eventId,
      user.id,
      "manage_tickets",
    );
    if (!hasPermission) {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    await db
      .delete(documentTemplates)
      .where(eq(documentTemplates.id, templateId));

    return reply.send({
      message: "Document Canvas logically destroyed from database.",
    });
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};
