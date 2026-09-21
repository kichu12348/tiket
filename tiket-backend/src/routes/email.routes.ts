import type { FastifyInstance } from "fastify";
import {
  getEmailTemplates,
  getEmailTemplateById,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  resetEmailTemplate,
  getAvailableVariables,
  sendTestEmail,
  sendBatchEmail,
  getEmailLogs,
} from "@controllers/email";
import {
  getEmailTemplatesSchema,
  getEmailTemplateByIdSchema,
  createEmailTemplateSchema,
  updateEmailTemplateSchema,
  deleteEmailTemplateSchema,
  resetEmailTemplateSchema,
  getVariablesSchema,
  sendTestEmailSchema,
  sendBatchEmailSchema,
  getEmailLogsSchema,
} from "@schemas/email";

export default async function emailRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/events/:eventId/templates",
    getEmailTemplatesSchema,
    getEmailTemplates,
  );
  fastify.get(
    "/events/:eventId/templates/:templateId",
    getEmailTemplateByIdSchema,
    getEmailTemplateById,
  );

  fastify.post(
    "/events/:eventId/templates",
    createEmailTemplateSchema,
    createEmailTemplate,
  );
  fastify.put(
    "/events/:eventId/templates/:templateId",
    updateEmailTemplateSchema,
    updateEmailTemplate,
  );
  fastify.delete(
    "/events/:eventId/templates/:templateId",
    deleteEmailTemplateSchema,
    deleteEmailTemplate,
  );
  fastify.post(
    "/events/:eventId/templates/:templateId/reset",
    resetEmailTemplateSchema,
    resetEmailTemplate,
  );
  fastify.get(
    "/events/:eventId/variables",
    getVariablesSchema,
    getAvailableVariables,
  );
  fastify.post(
    "/events/:eventId/send-test",
    sendTestEmailSchema,
    sendTestEmail,
  );
  fastify.post(
    "/events/:eventId/send-batch",
    sendBatchEmailSchema,
    sendBatchEmail,
  );
  fastify.get("/events/:eventId/logs", getEmailLogsSchema, getEmailLogs);
}
