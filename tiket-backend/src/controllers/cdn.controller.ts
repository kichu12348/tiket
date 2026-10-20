import type { FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "node:crypto";
import { presignUpload, getImageObject } from "../services/storage.service";

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  avif: "image/avif",
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "image/svg+xml": "image/svg+xml",
  "image/x-icon": "image/x-icon",
  "image/avif": "image/avif",
};

export async function getSignedUrl(
  request: FastifyRequest<{ Body: { filename: string; contentType: string } }>,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
    const { filename, contentType } = request.body;

    const normalizedMime =
      MIME_MAP[contentType.toLowerCase()] ||
      (contentType.startsWith("image/") ? contentType : null);

    if (!normalizedMime) {
      return reply.status(400).send({ error: "Invalid content type" });
    }

    const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueKey = `events/${randomUUID()}-${cleanName}`;

    // 10MB limit; generate 5-minute presigned PUT URL directly to S3 / Cloudflare R2
    const presignedUrl = await presignUpload(uniqueKey, normalizedMime);

    return reply.status(200).send({
      url: presignedUrl,
      max_size: 10,
      filename: uniqueKey,
    });
  } catch (err) {
    if ((err as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized bound access." });
    }
    request.log.error(err);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
}

export async function serveImage(
  request: FastifyRequest<{ Params: { "*": string } }>,
  reply: FastifyReply,
) {
  try {
    const rawKey = request.params["*"] || "";
    const key = decodeURIComponent(rawKey).replace(/^\/+/, "");

    if (!key) {
      return reply.status(400).send({ error: "Missing image key" });
    }

    // If an external public CDN / R2 URL is configured, redirect directly to it
    if (process.env.R2_PUBLIC_URL) {
      const publicBase = process.env.R2_PUBLIC_URL.replace(/\/$/, "");
      return reply.redirect(`${publicBase}/${key}`, 302);
    }

    const keysToTry = [key];
    if (
      !key.startsWith("events/") &&
      !key.startsWith("registrations/") &&
      !key.startsWith("staging/")
    ) {
      keysToTry.push(`events/${key}`);
    }

    let objectResponse = null;
    for (const tryKey of keysToTry) {
      try {
        objectResponse = await getImageObject(tryKey);
        if (objectResponse) break;
      } catch (err: unknown) {
        const error = err as { name?: string; $metadata?: { httpStatusCode?: number } };
        if (
          error.name !== "NoSuchKey" &&
          error.$metadata?.httpStatusCode !== 404
        ) {
          throw err;
        }
      }
    }

    if (!objectResponse || !objectResponse.Body) {
      return reply.status(404).send({ error: "Image not found" });
    }

    const contentType = objectResponse.ContentType || "image/jpeg";
    reply.header("Content-Type", contentType);
    if (objectResponse.ContentLength) {
      reply.header("Content-Length", objectResponse.ContentLength);
    }
    reply.header("Cache-Control", "public, max-age=31536000, immutable");

    return reply.send(objectResponse.Body);
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: "Failed to retrieve image" });
  }
}
