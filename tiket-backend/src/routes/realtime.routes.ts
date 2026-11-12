import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  canSubscribe,
  realtimeHandler,
  type RealtimeAuthContext,
} from "../services/realtime.service";
import { HttpError } from "../utils/errors";

declare module "fastify" {
  interface FastifyRequest {
    realtimeAuth?: RealtimeAuthContext;
  }
}

interface WsQuery {
  eventId?: string;
}

export default async function realtimeRoutes(app: FastifyInstance) {
  app.get<{ Querystring: WsQuery }>(
    "/ws",
    {
      websocket: true,
      preValidation: async (
        request: FastifyRequest<{ Querystring: WsQuery }>,
        reply: FastifyReply,
      ) => {
        const origin = request.headers.origin;
        const allowedOrigins = (
          process.env.FRONTEND_URL || "http://localhost:3000"
        )
          .split(",")
          .map((o) => o.trim());

        if (origin && !allowedOrigins.includes(origin)) {
          throw new HttpError(403, "Origin is not allowed.");
        }

        const eventId = request.query?.eventId;
        if (!eventId) {
          throw new HttpError(400, "Missing eventId query parameter.");
        }

        // Validate Sec-WebSocket-Protocol: ["bearer", "<jwt>"]
        const rawProtocols = request.headers["sec-websocket-protocol"];
        const protocols = rawProtocols
          ? rawProtocols.split(",").map((p) => p.trim())
          : [];

        if (
          protocols.length < 2 ||
          protocols[0] !== "bearer" ||
          !protocols[1]
        ) {
          throw new HttpError(
            401,
            "Missing bearer token in Sec-WebSocket-Protocol",
          );
        }

        const token = protocols[1];
        let decoded: { id?: string; sub?: string };
        try {
          decoded = await app.jwt.verify<{ id?: string; sub?: string }>(token);
        } catch {
          throw new HttpError(
            401,
            "Invalid bearer token in Sec-WebSocket-Protocol",
          );
        }

        const userId = decoded.id || decoded.sub;
        if (!userId) {
          throw new HttpError(401, "Invalid token payload");
        }

        if (!(await canSubscribe(eventId, userId))) {
          throw new HttpError(403, "Dashboard permission is required.");
        }

        // Echo "bearer" so browser completes the WebSocket handshake
        reply.header("Sec-WebSocket-Protocol", "bearer");

        request.realtimeAuth = {
          userId,
          eventId,
        };
      },
    },
    realtimeHandler(app),
  );
}
