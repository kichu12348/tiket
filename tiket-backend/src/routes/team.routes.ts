import type { FastifyInstance } from "fastify";
import {
  createRole,
  getRoles,
  addTeamMember,
  getTeamMembers,
  updateRole,
  deleteRole,
  removeTeamMember,
} from "@controllers/team";
import {
  createRoleSchema,
  getRolesSchema,
  addMemberSchema,
  getMembersSchema,
  updateRoleSchema,
  deleteRoleSchema,
  removeMemberSchema,
} from "@schemas/team";

export default async function teamRoutes(fastify: FastifyInstance) {
  fastify.post("/:eventId/roles", createRoleSchema, createRole);
  fastify.get("/:eventId/roles", getRolesSchema, getRoles);
  fastify.patch("/:eventId/roles/:roleId", updateRoleSchema, updateRole);
  fastify.delete("/:eventId/roles/:roleId", deleteRoleSchema, deleteRole);

  fastify.post("/:eventId/members", addMemberSchema, addTeamMember);
  fastify.get("/:eventId/members", getMembersSchema, getTeamMembers);
  fastify.delete("/:eventId/members/:memberId", removeMemberSchema, removeTeamMember);
}
