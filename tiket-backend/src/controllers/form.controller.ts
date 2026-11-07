import { verifyEventPermission } from "../utils/permissions";
import { handleControllerError } from "../utils/errors";
import type { FastifyRequest, FastifyReply } from "fastify";
import db from "@db";
import { forms } from "@db/schema";
import type {
  FormFieldDefinition,
  FormFieldType,
  FormFieldOptionsConfig,
  VisibilityConditionRule,
} from "@db/schema";
import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { lockEvent } from "../services/inventory.service";

interface CreateFieldBody {
  name: string;
  label: string;
  fieldType: FormFieldType;
  isRequired?: boolean;
  options?: string[] | FormFieldOptionsConfig | null;
  conditions?: VisibilityConditionRule[];
  sortOrder?: number;
  page?: number;
}

type UpdateFieldBody = Partial<CreateFieldBody>;

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

    const isOwner = await verifyEventPermission(
      eventId,
      user.id,
      "manage_forms",
    );
    if (!isOwner) {
      return reply
        .status(403)
        .send({ error: "Only the event creator can configure custom forms." });
    }

    const body = request.body;
    const createdField: FormFieldDefinition = {
      id: uuidv7(),
      eventId,
      name: body.name,
      label: body.label,
      fieldType: body.fieldType,
      isRequired: body.isRequired ?? true,
      options: body.options ?? null,
      conditions: body.conditions,
      sortOrder: body.sortOrder ?? 0,
      page: body.page ?? 1,
      createdAt: new Date().toISOString(),
    };

    await db.transaction(async (tx) => {
      await lockEvent(tx, eventId);
      const [existingForm] = await tx
        .select()
        .from(forms)
        .where(eq(forms.eventId, eventId))
        .for("update");

      if (existingForm) {
        const updatedFields = [...(existingForm.fields || []), createdField];
        await tx
          .update(forms)
          .set({
            fields: updatedFields,
            updatedAt: new Date(),
          })
          .where(eq(forms.id, existingForm.id));
      } else {
        await tx.insert(forms).values({
          eventId,
          fields: [createdField],
        });
      }
    });

    return reply.status(201).send(createdField);
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const getFields = async (
  request: FastifyRequest<{ Params: { eventId: string } }>,
  reply: FastifyReply,
) => {
  try {
    const { eventId } = request.params;

    const [formRow] = await db
      .select({ fields: forms.fields })
      .from(forms)
      .where(eq(forms.eventId, eventId));

    const fieldsList = [...(formRow?.fields || [])].sort((a, b) => {
      const pageDiff = (a.page ?? 1) - (b.page ?? 1);
      if (pageDiff !== 0) return pageDiff;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });

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

    const isOwner = await verifyEventPermission(
      eventId,
      user.id,
      "manage_forms",
    );
    if (!isOwner) {
      return reply
        .status(403)
        .send({ error: "Only the event creator can modify form fields." });
    }

    let updatedField: FormFieldDefinition | null = null;

    await db.transaction(async (tx) => {
      await lockEvent(tx, eventId);
      const [existingForm] = await tx
        .select()
        .from(forms)
        .where(eq(forms.eventId, eventId))
        .for("update");

      if (!existingForm) {
        return;
      }

      const currentFields = existingForm.fields || [];
      const fieldIndex = currentFields.findIndex((f) => f.id === fieldId);
      if (fieldIndex === -1) {
        return;
      }

      const existing = currentFields[fieldIndex]!;
      updatedField = {
        ...existing,
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.label !== undefined ? { label: body.label } : {}),
        ...(body.fieldType !== undefined ? { fieldType: body.fieldType } : {}),
        ...(body.isRequired !== undefined ? { isRequired: body.isRequired } : {}),
        ...(body.options !== undefined ? { options: body.options } : {}),
        ...(body.conditions !== undefined ? { conditions: body.conditions } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.page !== undefined ? { page: body.page } : {}),
      };

      const updatedFields = [...currentFields];
      updatedFields[fieldIndex] = updatedField;

      await tx
        .update(forms)
        .set({
          fields: updatedFields,
          updatedAt: new Date(),
        })
        .where(eq(forms.id, existingForm.id));
    });

    if (!updatedField) {
      return reply.status(404).send({ error: "Form field not found" });
    }

    return reply.send(updatedField);
  } catch (error) {
    return handleControllerError(request, reply, error);
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

    const isOwner = await verifyEventPermission(
      eventId,
      user.id,
      "manage_forms",
    );
    if (!isOwner) {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    let found = false;
    await db.transaction(async (tx) => {
      await lockEvent(tx, eventId);
      const [existingForm] = await tx
        .select()
        .from(forms)
        .where(eq(forms.eventId, eventId))
        .for("update");

      if (!existingForm) {
        return;
      }

      const currentFields = existingForm.fields || [];
      const fieldIndex = currentFields.findIndex((f) => f.id === fieldId);
      if (fieldIndex === -1) {
        return;
      }
      found = true;
      const updatedFields = currentFields.filter((f) => f.id !== fieldId);

      await tx
        .update(forms)
        .set({
          fields: updatedFields,
          updatedAt: new Date(),
        })
        .where(eq(forms.id, existingForm.id));
    });

    if (!found) {
      return reply.status(404).send({ error: "Form field not found" });
    }

    return reply.send({ message: "Form field successfully deleted." });
  } catch (error) {
    return handleControllerError(request, reply, error);
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

    const isOwner = await verifyEventPermission(
      eventId,
      user.id,
      "manage_forms",
    );
    if (!isOwner) {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const pageInt = Number(pageNum);

    await db.transaction(async (tx) => {
      await lockEvent(tx, eventId);
      const [existingForm] = await tx
        .select()
        .from(forms)
        .where(eq(forms.eventId, eventId))
        .for("update");

      if (!existingForm) {
        return;
      }

      const currentFields = existingForm.fields || [];
      const updatedFields = currentFields
        .filter((f) => f.page !== pageInt)
        .map((f) => (f.page > pageInt ? { ...f, page: f.page - 1 } : f));

      await tx
        .update(forms)
        .set({
          fields: updatedFields,
          updatedAt: new Date(),
        })
        .where(eq(forms.id, existingForm.id));
    });

    return reply.send({
      message: `Page ${pageNum} successfully deleted and subsequent pages shifted.`,
    });
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};

export const replaceFormFields = async (
  request: FastifyRequest<{
    Params: { eventId: string };
    Body: FormFieldDefinition[] | { fields: FormFieldDefinition[] };
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId } = request.params;

    const isOwner = await verifyEventPermission(
      eventId,
      user.id,
      "manage_forms",
    );
    if (!isOwner) {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const rawList = Array.isArray(request.body)
      ? request.body
      : request.body.fields || [];

    const normalizedFields: FormFieldDefinition[] = rawList.map((f, idx) => ({
      id: f.id || uuidv7(),
      eventId,
      name: f.name,
      label: f.label,
      fieldType: f.fieldType,
      isRequired: f.isRequired ?? true,
      options: f.options ?? null,
      conditions: f.conditions,
      sortOrder: f.sortOrder ?? idx,
      page: f.page ?? 1,
      createdAt: f.createdAt || new Date().toISOString(),
    }));

    await db.transaction(async (tx) => {
      await lockEvent(tx, eventId);
      const [existingForm] = await tx
        .select()
        .from(forms)
        .where(eq(forms.eventId, eventId))
        .for("update");

      if (existingForm) {
        await tx
          .update(forms)
          .set({
            fields: normalizedFields,
            updatedAt: new Date(),
          })
          .where(eq(forms.id, existingForm.id));
      } else {
        await tx.insert(forms).values({
          eventId,
          fields: normalizedFields,
        });
      }
    });

    return reply.send(normalizedFields);
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};
