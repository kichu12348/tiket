import type { FastifyInstance } from "fastify";
import {
  createField,
  getFields,
  updateField,
  deleteField,
  deletePage,
  replaceFormFields,
} from "@controllers/form";
import {
  createFieldSchema,
  getFieldsSchema,
  updateFieldSchema,
  deleteFieldSchema,
  deletePageSchema,
  replaceFormFieldsSchema,
} from "@schemas/form";

export default async function formRoutes(fastify: FastifyInstance) {
  fastify.post("/:eventId", createFieldSchema, createField);
  fastify.get("/:eventId", getFieldsSchema, getFields);
  fastify.put("/:eventId", replaceFormFieldsSchema, replaceFormFields);
  fastify.patch("/:eventId/:fieldId", updateFieldSchema, updateField);
  fastify.delete("/:eventId/:fieldId", deleteFieldSchema, deleteField);
  fastify.delete("/:eventId/pages/:pageNum", deletePageSchema, deletePage);
}
