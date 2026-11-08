import type { FastifyRequest, FastifyReply } from "fastify";
import {
  presignUpload,
  buildStorageKey,
  buildFullCdnUrl,
  type StorageObjectType,
} from "../services/storage.service";

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
  request: FastifyRequest<{
    Body: {
      filename: string;
      contentType: string;
      eventId?: string;
      objType?: StorageObjectType;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
    const {
      filename,
      contentType,
      eventId,
      objType = "banner",
    } = request.body;

    const normalizedMime =
      MIME_MAP[contentType.toLowerCase()] ||
      (contentType.startsWith("image/") ? contentType : null);

    if (!normalizedMime) {
      return reply.status(400).send({ error: "Invalid content type" });
    }

    const uniqueKey = buildStorageKey({
      eventId,
      objType,
      filename,
    });

    // 10MB limit; generate 5-minute presigned PUT URL directly to S3 / Cloudflare R2
    const presignedUrl = await presignUpload(uniqueKey, normalizedMime);
    const fullCdnUrl = buildFullCdnUrl(uniqueKey);

    return reply.status(200).send({
      url: presignedUrl,
      max_size: 10,
      filename: fullCdnUrl,
      fileUrl: fullCdnUrl,
      key: uniqueKey,
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

    const destination = buildFullCdnUrl(key);
    return reply.redirect(destination, 301);
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: "Failed to retrieve image" });
  }
}
