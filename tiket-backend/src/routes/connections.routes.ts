import type { FastifyInstance } from "fastify";
import {
  getMailConnection,
  putMailConnection,
  deleteMailConnection,
  beginUpload,
  completeUpload,
  getUpload,
} from "../controllers/connections.controller";
import { eventSchema } from "../_schemas/commerce.schema";
import {
  mailConfigSchema,
  uploadParamsSchema,
  uploadSchema,
} from "../_schemas/connections.schema";
export default async function connectionsRoutes(app: FastifyInstance) {
  app.get("/events/:eventId/mail", eventSchema, getMailConnection);
  app.put("/events/:eventId/mail", mailConfigSchema, putMailConnection);
  app.delete("/events/:eventId/mail", eventSchema, deleteMailConnection);
  app.post("/uploads", uploadSchema, beginUpload);
  app.post("/uploads/:uploadId/complete", uploadParamsSchema, completeUpload);
  app.get("/uploads/:uploadId", uploadParamsSchema, getUpload);
}
