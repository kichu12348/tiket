import type { FastifyRequest } from "fastify";
import db from "@db";
import { emailConnections, events, formFields, uploads } from "@db/schema";
import { and, eq, sql } from "drizzle-orm";
import { HttpError } from "../utils/errors";
import { verifyEventPermission } from "../utils/permissions";
import { saveMailConfig, type MailConfig } from "../services/mail.service";
import {
  ALLOWED_FILES,
  downloadUpload,
  finalizeUpload,
  presignUpload,
} from "../services/storage.service";

async function owner(request: FastifyRequest, eventId: string) {
  await request.jwtVerify();
  const actor = (request.user as { id: string }).id;
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (event?.organizationId !== actor)
    throw new HttpError(
      403,
      "Only the organizer can configure delivery credentials.",
    );
  return actor;
}
export async function getMailConnection(
  request: FastifyRequest<{ Params: { eventId: string } }>,
) {
  const actor = await owner(request, request.params.eventId);
  const [connection] = await db
    .select({ id: emailConnections.userId })
    .from(emailConnections)
    .where(eq(emailConnections.userId, actor));
  return { custom: Boolean(connection), defaultProvider: "brevo" };
}
export async function putMailConnection(
  request: FastifyRequest<{ Params: { eventId: string }; Body: MailConfig }>,
) {
  const actor = await owner(request, request.params.eventId);
  await saveMailConfig(actor, request.body);
  return { custom: true };
}
export async function deleteMailConnection(
  request: FastifyRequest<{ Params: { eventId: string } }>,
) {
  const actor = await owner(request, request.params.eventId);
  await db.delete(emailConnections).where(eq(emailConnections.userId, actor));
  return { custom: false };
}
export async function beginUpload(
  request: FastifyRequest<{
    Body: {
      eventId: string;
      fieldId: string;
      filename: string;
      contentType: string;
      size: number;
    };
  }>,
) {
  await request.jwtVerify();
  const userId = (request.user as { id: string }).id;
  const body = request.body;
  if (!ALLOWED_FILES.includes(body.contentType))
    throw new HttpError(400, "Use a PDF, PNG, JPEG or plain text file.");
  const [field] = await db
    .select()
    .from(formFields)
    .innerJoin(events, eq(events.id, formFields.eventId))
    .where(
      and(
        eq(formFields.id, body.fieldId),
        eq(formFields.eventId, body.eventId),
      ),
    );
  if (
    !field ||
    field.form_fields.fieldType !== "file" ||
    field.events.status !== "published"
  )
    throw new HttpError(404, "Registration upload field not found.");
  const id = crypto.randomUUID();
  const objectKey = `staging/${body.eventId}/${userId}/${id}`;
  const url = await presignUpload(objectKey, body.contentType, body.size);
  await db.insert(uploads).values({ ...body, id, userId, objectKey });
  return { id, url, expiresIn: 300 };
}
export async function completeUpload(
  request: FastifyRequest<{ Params: { uploadId: string } }>,
) {
  await request.jwtVerify();
  const actor = (request.user as { id: string }).id;
  return db.transaction(async (tx) => {
    const [upload] = await tx
      .select()
      .from(uploads)
      .where(
        and(eq(uploads.id, request.params.uploadId), eq(uploads.userId, actor)),
      )
      .for("update");
    if (!upload) throw new HttpError(404, "File not found.");
    if (!upload.completedAt) {
      const objectKey = await finalizeUpload(
        upload.objectKey,
        upload.contentType,
        upload.size,
      );
      await tx
        .update(uploads)
        .set({ objectKey, completedAt: new Date() })
        .where(eq(uploads.id, upload.id));
    }
    return { value: `file:${upload.id}` };
  });
}
export async function getUpload(
  request: FastifyRequest<{ Params: { uploadId: string } }>,
) {
  await request.jwtVerify();
  const actor = (request.user as { id: string }).id;
  const [upload] = await db
    .select()
    .from(uploads)
    .where(eq(uploads.id, request.params.uploadId));
  if (
    !upload?.completedAt ||
    (upload.userId !== actor &&
      !(await verifyEventPermission(upload.eventId, actor, "view_guests")))
  )
    throw new HttpError(404, "File not found.");
  return {
    url: await downloadUpload(upload.objectKey),
    filename: upload.filename,
  };
}
