import type { FastifyInstance } from "fastify";
import {
  createEvent,
  getPublicEvents,
  getMyEvents,
  getEventById,
  updateEvent,
  updateEventSlug,
  deleteEvent,
  getEventBySlug,
  getEventHosts,
} from "@controllers/event";
import {
  createEventSchema,
  updateEventSchema,
  updateEventSlugSchema,
  getEventsSchema,
  getEventByIdSchema,
  deleteEventSchema,
  getEventBySlugSchema,
  getEventHostsSchema,
} from "@schemas/event";
import { cdnGenerateUrlSchema } from "@schemas/cdn";
import { getSignedUrl } from "@controllers/cdn";

export default async function eventRoutes(fastify: FastifyInstance) {
  fastify.post("/", createEventSchema, createEvent);
  fastify.get("/", getEventsSchema, getPublicEvents);
  fastify.get("/me", getEventsSchema, getMyEvents);
  fastify.post("/upload/signed-url", cdnGenerateUrlSchema, getSignedUrl);
  fastify.get("/slug/:slug", getEventBySlugSchema, getEventBySlug);
  fastify.get("/:id", getEventByIdSchema, getEventById);
  fastify.patch("/:id", updateEventSchema, updateEvent);
  fastify.patch("/:id/slug", updateEventSlugSchema, updateEventSlug);
  fastify.delete("/:id", deleteEventSchema, deleteEvent);
  fastify.get("/:id/hosts", getEventHostsSchema, getEventHosts);
}
