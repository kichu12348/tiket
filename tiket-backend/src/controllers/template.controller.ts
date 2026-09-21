import type { FastifyRequest, FastifyReply } from "fastify";
import db from "@db";
import { documentTemplates } from "@db/schema";
import { eq } from "drizzle-orm";
import { verifyEventOwner, verifyOwnerByTemplateId } from "@utils";

interface CreateTemplateBody {
  name: string;
  type: "ticket" | "certificate";
  backgroundImageUrl?: string;
  elementsJson?: any;
}

interface UpdateTemplateBody {
  name?: string;
  backgroundImageUrl?: string;
  elementsJson?: any;
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

    const isOwner = await verifyEventOwner(eventId, user.id);
    if (!isOwner) {
      return reply.status(401).send({
        error:
          "Only the event creator can configure Document visual boundaries.",
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
    if ((error as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized access mapping." });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
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

    const isOwner = await verifyOwnerByTemplateId(templateId, user.id);
    if (!isOwner) {
      return reply.status(401).send({
        error: "Unauthorized. Template boundaries natively restricted.",
      });
    }

    const payload: any = { updatedAt: new Date() };
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
    if ((error as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized access mapping." });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
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

    const isOwner = await verifyOwnerByTemplateId(templateId, user.id);
    if (!isOwner) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const deletedTemplateList = await db
      .delete(documentTemplates)
      .where(eq(documentTemplates.id, templateId))
      .returning();

    if (deletedTemplateList.length === 0) {
      return reply.status(404).send({ error: "Document Template missing." });
    }

    return reply.send({
      message: "Document Canvas logically destroyed from database.",
    });
  } catch (error) {
    if ((error as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized access mapping." });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};
