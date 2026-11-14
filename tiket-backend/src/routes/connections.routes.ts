import type { FastifyInstance } from "fastify";
import {
  getMailConnection,
  putMailConnection,
  deleteMailConnection,
  testMailConnection,
  beginUpload,
  completeUpload,
  getUpload,
} from "../controllers/connections.controller";
import { eventSchema } from "../_schemas/commerce.schema";
import {
  mailConfigSchema,
  testMailSchema,
  uploadParamsSchema,
  uploadSchema,
} from "../_schemas/connections.schema";
export default async function connectionsRoutes(app: FastifyInstance) {
  // Direct mail & email alias routes
  app.get("/events/:eventId/mail", eventSchema, getMailConnection);
  app.put("/events/:eventId/mail", mailConfigSchema, putMailConnection);
  app.delete("/events/:eventId/mail", eventSchema, deleteMailConnection);
  app.post("/events/:eventId/mail/test", testMailSchema, testMailConnection);

  app.get("/events/:eventId/email", eventSchema, getMailConnection);
  app.put("/events/:eventId/email", mailConfigSchema, putMailConnection);
  app.delete("/events/:eventId/email", eventSchema, deleteMailConnection);
  app.post("/events/:eventId/email/test", testMailSchema, testMailConnection);

  app.post("/uploads", uploadSchema, beginUpload);
  app.post("/uploads/:uploadId/complete", uploadParamsSchema, completeUpload);
  app.get("/uploads/:uploadId", uploadParamsSchema, getUpload);
}
