import type { FastifyInstance } from "fastify";
import {
  createTemplate,
  getTemplates,
  updateTemplate,
  deleteTemplate,
} from "@controllers/template";
import {
  createTemplateSchema,
  getTemplatesSchema,
  updateTemplateSchema,
  deleteTemplateSchema,
} from "@schemas/template";

export default async function templateRoutes(fastify: FastifyInstance) {
  fastify.post("/events/:eventId", createTemplateSchema, createTemplate);
  fastify.get("/events/:eventId", getTemplatesSchema, getTemplates);
  fastify.patch("/:templateId", updateTemplateSchema, updateTemplate);
  fastify.delete("/:templateId", deleteTemplateSchema, deleteTemplate);
}
