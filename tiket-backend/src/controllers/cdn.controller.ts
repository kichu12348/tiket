import type { FastifyRequest, FastifyReply } from "fastify";

const CND_URL = process.env.CDN_URL!;

const MIME_TYPES_IMAGES = new Set<string>(["jpeg", "png", "webp", "jpg"]);

export async function getSignedUrl(
  request: FastifyRequest<{ Body: { filename: string; contentType: string } }>,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
    const { filename, contentType } = request.body;

    if (!MIME_TYPES_IMAGES.has(contentType)) {
      return reply.status(400).send({ error: "Invalid content type" });
    }

    const res = await fetch(`${CND_URL}/generate-url`, {
      method: "POST",
      body: JSON.stringify({ filename }),
      headers: { "Content-Type": "application/json" },
    });
    const data = (await res.json()) as { url: string; max_size: number };
    if (!res.ok) {
      throw new Error("Failed to generate signed URL");
    }

    return reply.status(200).send({
      url: data.url,
      max_size: data.max_size,
    });
  } catch (err) {
    if ((err as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized bound access." });
    }
    request.log.error(err);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
}
