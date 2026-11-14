import type { FastifyRequest } from "fastify";
import db from "@db";
import { emailConnections, events, uploads } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { HttpError } from "../utils/errors";
import { verifyEventPermission } from "../utils/permissions";
import {
  deliverMail,
  saveMailConfig,
  type MailConfig,
} from "../services/mail.service";
import { downloadUpload, finalizeUpload } from "../services/storage.service";

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
  return { custom: Boolean(connection), defaultProvider: "smtp" };
}
export async function putMailConnection(
  request: FastifyRequest<{ Params: { eventId: string }; Body: MailConfig }>,
) {
  const actor = await owner(request, request.params.eventId);
  const config = {
    ...request.body,
    provider: "smtp" as const,
  };
  await saveMailConfig(actor, config);
  return { custom: true };
}
export async function testMailConnection(
  request: FastifyRequest<{
    Params: { eventId: string };
    Body: { testRecipient: string };
  }>,
) {
  await owner(request, request.params.eventId);
  const { eventId } = request.params;
  const { testRecipient } = request.body;
  await deliverMail(
    {
      recipientEmail: testRecipient,
      recipientName: "Test Recipient",
      subject: "Test Email from Tiket SMTP Connection",
      body: "<p>Your custom SMTP connection has been verified successfully!</p>",
    },
    eventId,
  );
  return { success: true, message: "Test email delivered successfully." };
}
export async function deleteMailConnection(
  request: FastifyRequest<{ Params: { eventId: string } }>,
) {
  const actor = await owner(request, request.params.eventId);
  await db.delete(emailConnections).where(eq(emailConnections.userId, actor));
  return { custom: false };
}
export async function beginUpload(
  _request: FastifyRequest<{
    Body: {
      eventId: string;
      fieldId: string;
      filename: string;
      contentType: string;
      size: number;
    };
  }>,
) {
  throw new HttpError(404, "Registration upload field not found.");
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
