import type { FastifyRequest, FastifyReply } from "fastify";
import db from "@db";
import { formFields } from "@db/schema";
import { eq, and, asc, gt, sql } from "drizzle-orm";
import { verifyEventOwner } from "@utils";

interface CreateFieldBody {
  name: string;
  label: string;
  fieldType: "text" | "long_text" | "email" | "phone" | "number" | "single_select" | "multi_select" | "radio" | "checkbox" | "date" | "datetime" | "time" | "rating" | "file" | "url" | "select";
  isRequired?: boolean;
  options?: string[];
  sortOrder?: number;
  page?: number;
}

interface UpdateFieldBody extends Partial<CreateFieldBody> {}

export const createField = async (
  request: FastifyRequest<{
    Params: { eventId: string };
    Body: CreateFieldBody;
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId } = request.params;

    const isOwner = await verifyEventOwner(eventId, user.id);
    if (!isOwner) {
      return reply
        .status(401)
        .send({ error: "Only the event creator can configure custom forms." });
    }

    const body = request.body;

    const newFieldList = await db
      .insert(formFields)
      .values({
        eventId,
        name: body.name,
        label: body.label,
        fieldType: body.fieldType,
        isRequired: body.isRequired ?? true,
        options: body.options ? body.options : null,
        sortOrder: body.sortOrder ?? 0,
        page: body.page ?? 1,
      })
      .returning();

    const createdField = newFieldList[0];
    if (!createdField) {
      return reply.status(500).send({ error: "Failed to create form field." });
    }

    return reply.status(201).send(createdField);
  } catch (error) {
    if ((error as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const getFields = async (
  request: FastifyRequest<{ Params: { eventId: string } }>,
  reply: FastifyReply,
) => {
  try {
    const { eventId } = request.params;

    // Sort order natively evaluated via Drizzle to pre-sort rendering flow directly from Postgres
    const fieldsList = await db
      .select()
      .from(formFields)
      .where(eq(formFields.eventId, eventId))
      .orderBy(asc(formFields.sortOrder));

    return reply.send(fieldsList);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const updateField = async (
  request: FastifyRequest<{
    Params: { eventId: string; fieldId: string };
    Body: UpdateFieldBody;
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId, fieldId } = request.params;
    const body = request.body;

    const isOwner = await verifyEventOwner(eventId, user.id);
    if (!isOwner) {
      return reply
        .status(401)
        .send({ error: "Only the event creator can modify form fields." });
    }

    const payload: any = {};
    if (body.name !== undefined) payload.name = body.name;
    if (body.label !== undefined) payload.label = body.label;
    if (body.fieldType !== undefined) payload.fieldType = body.fieldType;
    if (body.isRequired !== undefined) payload.isRequired = body.isRequired;
    if (body.options !== undefined) payload.options = body.options;
    if (body.sortOrder !== undefined) payload.sortOrder = body.sortOrder;
    if (body.page !== undefined) payload.page = body.page;

    const updatedFieldList = await db
      .update(formFields)
      .set(payload)
      .where(and(eq(formFields.id, fieldId), eq(formFields.eventId, eventId)))
      .returning();

    const updatedField = updatedFieldList[0];
    if (!updatedField) {
      return reply.status(404).send({ error: "Form field not found" });
    }

    return reply.send(updatedField);
  } catch (error) {
    if ((error as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const deleteField = async (
  request: FastifyRequest<{ Params: { eventId: string; fieldId: string } }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId, fieldId } = request.params;

    const isOwner = await verifyEventOwner(eventId, user.id);
    if (!isOwner) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const deletedFieldList = await db
      .delete(formFields)
      .where(and(eq(formFields.id, fieldId), eq(formFields.eventId, eventId)))
      .returning();

    if (deletedFieldList.length === 0) {
      return reply.status(404).send({ error: "Form field not found" });
    }

    return reply.send({ message: "Form field successfully deleted." });
  } catch (error) {
    if ((error as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const deletePage = async (
  request: FastifyRequest<{ Params: { eventId: string; pageNum: number } }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId, pageNum } = request.params;

    const isOwner = await verifyEventOwner(eventId, user.id);
    if (!isOwner) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    // Run transaction to ensure atomicity
    await db.transaction(async (tx) => {
      // 1. Delete all fields on this page
      await tx
        .delete(formFields)
        .where(and(eq(formFields.eventId, eventId), eq(formFields.page, pageNum)));

      // 2. Shift subsequent pages down by 1
      await tx
        .update(formFields)
        .set({ page: sql`${formFields.page} - 1` })
        .where(and(eq(formFields.eventId, eventId), gt(formFields.page, pageNum)));
    });

    return reply.send({ message: `Page ${pageNum} successfully deleted and subsequent pages shifted.` });
  } catch (error) {
    if ((error as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};
