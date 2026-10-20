import websocket from "@fastify/websocket";
import commerceRoutes from "./routes/commerce.routes";
import connectionsRoutes from "./routes/connections.routes";
import realtimeRoutes from "./routes/realtime.routes";
import Fastify from "fastify";
import type { FastifyError } from "fastify";
import fastifyJwt from "@fastify/jwt";
import cors from "@fastify/cors";
import authRoutes from "@routes/auth";
import eventRoutes from "@routes/event";
import teamRoutes from "@routes/team";
import ticketTypeRoutes from "./routes/ticket-type.routes";
import formRoutes from "./routes/form.routes";
import orderRoutes from "./routes/order.routes";
import ticketRoutes from "./routes/ticket.routes";
import checkInRoutes from "./routes/check-in.routes";
import templateRoutes from "./routes/template.routes";
import paymentRoutes from "./routes/payment.routes";
import attendeeRoutes from "./routes/attendee.routes";
import emailRoutes from "./routes/email.routes";
import { serveImage } from "./controllers/cdn.controller";

export function buildApp() {
  const __dev__ = process.env.DEBUG === "true";

  const fastify = Fastify({
    logger: __dev__,
    ajv: {
      customOptions: {
        allowUnionTypes: true,
      },
    },
  });

  fastify.register(cors, {
    origin: (process.env.FRONTEND_URL || "http://localhost:3000").split(","),
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  });

  fastify.register(fastifyJwt, {
    secret:
      process.env.JWT_SECRET ||
      (() => {
        throw new Error("JWT_SECRET is required");
      })(),
  });

  fastify.get("/", async () => {
    return { message: "Hellow tiket" };
  });

  fastify.get("/image/*", serveImage);

  fastify.register(websocket, { options: { maxPayload: 2048 } });
  fastify.register(commerceRoutes, { prefix: "/api/commerce" });
  fastify.register(connectionsRoutes, { prefix: "/api/connections" });
  fastify.register(realtimeRoutes, { prefix: "/api/realtime" });
  fastify.register(authRoutes, { prefix: "/api/auth" });
  fastify.register(eventRoutes, { prefix: "/api/events" });
  fastify.register(teamRoutes, { prefix: "/api/teams" });
  fastify.register(ticketTypeRoutes, { prefix: "/api/ticket-types" });
  fastify.register(formRoutes, { prefix: "/api/forms" });
  fastify.register(orderRoutes, { prefix: "/api/orders" });
  fastify.register(ticketRoutes, { prefix: "/api/tickets" });
  fastify.register(checkInRoutes, { prefix: "/api/check-ins" });
  fastify.register(templateRoutes, { prefix: "/api/templates" });
  fastify.register(paymentRoutes, { prefix: "/api/payments" });
  fastify.register(attendeeRoutes, { prefix: "/api/attendees" });
  fastify.register(emailRoutes, { prefix: "/api/emails" });

  fastify.setErrorHandler<FastifyError>((error, request, reply) => {
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) request.log.error(error);
    reply.status(statusCode).send({
      error: statusCode >= 500 ? "Internal Server Error" : error.message,
    });
  });
  return fastify;
}
