import type { FastifyInstance } from "fastify";
import { connectDashboard } from "../controllers/realtime.controller";
import { eventSchema } from "../_schemas/commerce.schema";
import { realtimeHandler } from "../services/realtime.service";
import { HttpError } from "../utils/errors";
export default async function realtimeRoutes(app: FastifyInstance) {
  app.post("/events/:eventId/connect", eventSchema, connectDashboard);
  app.get(
    "/ws",
    {
      websocket: true,
      preValidation: async (request) => {
        const origin = request.headers.origin;
        if (
          !origin ||
          !(process.env.FRONTEND_URL || "http://localhost:3000")
            .split(",")
            .includes(origin)
        )
          throw new HttpError(403, "Origin is not allowed.");
      },
    },
    realtimeHandler(app),
  );
}
