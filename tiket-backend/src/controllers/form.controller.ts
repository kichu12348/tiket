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
  isLocked?: boolean;
  options?: string[] | FormFieldOptionsConfig | null;
  conditions?: VisibilityConditionRule[];
  sortOrder?: number;
  page?: number;
}

type UpdateFieldBody = Partial<CreateFieldBody>;

export const DEFAULT_STANDARD_LOCKED_FIELDS = [
  {
    name: "name",
    label: "Full Name",
    fieldType: "text" as FormFieldType,
    isRequired: true,
    isLocked: true,
    options: null,
    sortOrder: 0,
    page: 1,
  },
  {
    name: "email",
    label: "Email",
    fieldType: "email" as FormFieldType,
    isRequired: true,
    isLocked: true,
    options: null,
    sortOrder: 1,
    page: 1,
  },
];

export async function seedDefaultFormForEvent(
  eventId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any,
): Promise<void> {
  const runner = tx || db;
  const [existingForm] = await runner
    .select()
    .from(forms)
    .where(eq(forms.eventId, eventId));

  const now = new Date().toISOString();

  if (!existingForm) {
    const defaultFields: FormFieldDefinition[] =
      DEFAULT_STANDARD_LOCKED_FIELDS.map((f, idx) => ({
        id: uuidv7(),
        eventId,
        name: f.name,
        label: f.label,
        fieldType: f.fieldType,
        isRequired: true,
        isLocked: true,
        options: null,
        conditions: null,
        sortOrder: idx,
        page: 1,
        createdAt: now,
      }));

    await runner.insert(forms).values({
      eventId,
      fields: defaultFields,
    });
    return;
  }

  const currentFields: FormFieldDefinition[] = existingForm.fields || [];
  let modified = false;
  const updatedFields = [...currentFields];

  for (const def of DEFAULT_STANDARD_LOCKED_FIELDS) {
    const foundIdx = updatedFields.findIndex((f) => f.name === def.name);
    if (foundIdx === -1) {
      updatedFields.push({
        id: uuidv7(),
        eventId,
        name: def.name,
        label: def.label,
        fieldType: def.fieldType,
        isRequired: true,
        isLocked: true,
        options: null,
        conditions: null,
        sortOrder: def.sortOrder,
        page: 1,
        createdAt: now,
      });
      modified = true;
    } else {
      if (!updatedFields[foundIdx]!.isLocked) {
        updatedFields[foundIdx] = {
          ...updatedFields[foundIdx]!,
          isLocked: true,
          isRequired: true,
        };
        modified = true;
      }
    }
  }

  if (modified) {
    await runner
      .update(forms)
      .set({
        fields: updatedFields,
        updatedAt: new Date(),
      })
      .where(eq(forms.id, existingForm.id));
  }
}

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
      isLocked: body.isLocked ?? false,
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

    let [formRow] = await db
      .select({ fields: forms.fields })
      .from(forms)
      .where(eq(forms.eventId, eventId));

    const hasName = formRow?.fields?.some((f) => f.name === "name");
    const hasEmail = formRow?.fields?.some((f) => f.name === "email");

    if (!formRow || !hasName || !hasEmail) {
      await seedDefaultFormForEvent(eventId);
      [formRow] = await db
        .select({ fields: forms.fields })
        .from(forms)
        .where(eq(forms.eventId, eventId));
    }

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
      const isLockedField =
        existing.isLocked ||
        existing.name === "name" ||
        existing.name === "email";

      if (isLockedField) {
        updatedField = {
          ...existing,
          ...(body.label !== undefined ? { label: body.label } : {}),
          ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
          ...(body.page !== undefined ? { page: body.page } : {}),
          isLocked: true,
          isRequired: true,
        };
      } else {
        updatedField = {
          ...existing,
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.label !== undefined ? { label: body.label } : {}),
          ...(body.fieldType !== undefined ? { fieldType: body.fieldType } : {}),
          ...(body.isRequired !== undefined ? { isRequired: body.isRequired } : {}),
          ...(body.isLocked !== undefined ? { isLocked: body.isLocked } : {}),
          ...(body.options !== undefined ? { options: body.options } : {}),
          ...(body.conditions !== undefined ? { conditions: body.conditions } : {}),
          ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
          ...(body.page !== undefined ? { page: body.page } : {}),
        };
      }

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
    let isLocked = false;
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
      const targetField = currentFields[fieldIndex]!;
      if (
        targetField.isLocked ||
        targetField.name === "name" ||
        targetField.name === "email"
      ) {
        isLocked = true;
        return;
      }
      const updatedFields = currentFields.filter((f) => f.id !== fieldId);

      await tx
        .update(forms)
        .set({
          fields: updatedFields,
          updatedAt: new Date(),
        })
        .where(eq(forms.id, existingForm.id));
    });

    if (isLocked) {
      return reply
        .status(400)
        .send({ error: "Locked form fields cannot be removed." });
    }

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
    let isLockedPage = false;

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
      const hasLockedOnPage = currentFields.some(
        (f) =>
          f.page === pageInt &&
          (f.isLocked || f.name === "name" || f.name === "email"),
      );

      if (hasLockedOnPage) {
        isLockedPage = true;
        return;
      }

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

    if (isLockedPage) {
      return reply
        .status(400)
        .send({ error: "Cannot delete a page containing locked form fields." });
    }

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
      isLocked: f.isLocked ?? false,
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

      const currentFields = existingForm?.fields || [];
      const lockedFields = currentFields.filter(
        (f) => f.isLocked || f.name === "name" || f.name === "email",
      );

      const finalFields = [...normalizedFields];
      for (const lf of lockedFields) {
        const alreadyExists = finalFields.some(
          (f) => f.id === lf.id || f.name === lf.name,
        );
        if (!alreadyExists) {
          finalFields.unshift({ ...lf, isLocked: true, isRequired: true });
        }
      }

      if (existingForm) {
        await tx
          .update(forms)
          .set({
            fields: finalFields,
            updatedAt: new Date(),
          })
          .where(eq(forms.id, existingForm.id));
      } else {
        await tx.insert(forms).values({
          eventId,
          fields: finalFields,
        });
      }
    });

    return reply.send(normalizedFields);
  } catch (error) {
    return handleControllerError(request, reply, error);
  }
};
