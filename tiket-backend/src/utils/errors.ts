import type { FastifyReply, FastifyRequest } from "fastify";

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function isAuthenticationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code =
    "code" in error && typeof error.code === "string" ? error.code : "";
  return (
    code.startsWith("FST_JWT_") ||
    code.startsWith("FAST_JWT_") ||
    ("statusCode" in error && error.statusCode === 401)
  );
}

export function handleControllerError(
  request: FastifyRequest,
  reply: FastifyReply,
  error: unknown,
) {
  if (isAuthenticationError(error))
    return reply.status(401).send({ error: "Unauthorized" });
  if (error instanceof HttpError)
    return reply.status(error.statusCode).send({ error: error.message });
  request.log.error(error);
  return reply.status(500).send({ error: "Internal Server Error" });
}
