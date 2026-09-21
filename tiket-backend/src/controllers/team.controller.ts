import type { FastifyRequest, FastifyReply } from "fastify";
import db from "@db";
import { eventRoles, eventTeamMembers, users } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { verifyEventOwner } from "@utils";

interface CreateRoleBody {
  name: string;
  permissions: string[];
}

interface AddMemberBody {
  email: string;
  roleId: string;
}

export const createRole = async (
  request: FastifyRequest<{
    Params: { eventId: string };
    Body: CreateRoleBody;
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId } = request.params;

    const isOwner = await verifyEventOwner(eventId, user.id);
    if (!isOwner) {
      return reply
        .status(401)
        .send({ error: "Only the event creator can manage roles." });
    }

    const { name, permissions } = request.body;

    const newRoleList = await db
      .insert(eventRoles)
      .values({
        eventId,
        name,
        permissions: permissions as any,
      })
      .returning();

    const createdRole = newRoleList[0];
    if (!createdRole) {
      return reply.status(500).send({ error: "Failed to create role." });
    }

    return reply.status(201).send(createdRole);
  } catch (error) {
    if ((error as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const getRoles = async (
  request: FastifyRequest<{ Params: { eventId: string } }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId } = request.params;

    // We restrict roles fetching to the event creator
    const isOwner = await verifyEventOwner(eventId, user.id);
    if (!isOwner) {
      return reply.status(401).send({ error: "Unauthorized." });
    }

    const rolesList = await db
      .select()
      .from(eventRoles)
      .where(eq(eventRoles.eventId, eventId));

    return reply.send(rolesList);
  } catch (error) {
    if ((error as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const addTeamMember = async (
  request: FastifyRequest<{ Params: { eventId: string }; Body: AddMemberBody }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId } = request.params;

    const isOwner = await verifyEventOwner(eventId, user.id);
    if (!isOwner) {
      return reply
        .status(401)
        .send({ error: "Only the event creator can add members." });
    }

    const { email, roleId } = request.body;

    // Check if target user exists
    const userExists = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!userExists || userExists.length === 0) {
      return reply
        .status(404)
        .send({ error: "User with this email not found." });
    }
    const targetUserId = userExists[0]?.id;
    if (!targetUserId) {
      return reply
        .status(404)
        .send({ error: "User with this email not found." });
    }

    // Check if designated role successfully maps back to this specific event
    const roleExists = await db
      .select()
      .from(eventRoles)
      .where(and(eq(eventRoles.id, roleId), eq(eventRoles.eventId, eventId)));
    if (roleExists.length === 0) {
      return reply
        .status(404)
        .send({ error: "Role not found for this event." });
    }

    // Ensure member is not double-counted
    const memberExists = await db
      .select()
      .from(eventTeamMembers)
      .where(
        and(
          eq(eventTeamMembers.eventId, eventId),
          eq(eventTeamMembers.userId, targetUserId),
        ),
      );

    if (memberExists.length > 0) {
      return reply
        .status(400)
        .send({ error: "User is already a team member." });
    }

    const newMemberList = await db
      .insert(eventTeamMembers)
      .values({
        eventId,
        userId: targetUserId,
        roleId,
      })
      .returning();

    const createdMember = newMemberList[0];
    if (!createdMember) {
      return reply.status(500).send({ error: "Failed to add team member." });
    }

    return reply.status(201).send(createdMember);
  } catch (error) {
    if ((error as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const getTeamMembers = async (
  request: FastifyRequest<{ Params: { eventId: string } }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId } = request.params;

    const isOwner = await verifyEventOwner(eventId, user.id);
    if (!isOwner) {
      return reply.status(401).send({ error: "Unauthorized." });
    }

    // Highly optimized relational join utilizing Drizzle Postgres mapping rules
    const membersList = await db
      .select({
        id: eventTeamMembers.id,
        eventId: eventTeamMembers.eventId,
        userId: eventTeamMembers.userId,
        roleId: eventTeamMembers.roleId,
        createdAt: eventTeamMembers.createdAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        role: {
          id: eventRoles.id,
          name: eventRoles.name,
        },
      })
      .from(eventTeamMembers)
      .innerJoin(users, eq(eventTeamMembers.userId, users.id))
      .innerJoin(eventRoles, eq(eventTeamMembers.roleId, eventRoles.id))
      .where(eq(eventTeamMembers.eventId, eventId));

    return reply.send(membersList);
  } catch (error) {
    if ((error as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const updateRole = async (
  request: FastifyRequest<{
    Params: { eventId: string; roleId: string };
    Body: { name?: string; permissions?: string[] };
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId, roleId } = request.params;
    const body = request.body;

    const isOwner = await verifyEventOwner(eventId, user.id);
    if (!isOwner) {
      return reply.status(401).send({ error: "Unauthorized." });
    }

    const payload: any = {};
    if (body.name !== undefined) payload.name = body.name;
    if (body.permissions !== undefined)
      payload.permissions = body.permissions as any;

    const updatedRoleList = await db
      .update(eventRoles)
      .set(payload)
      .where(and(eq(eventRoles.id, roleId), eq(eventRoles.eventId, eventId)))
      .returning();

    const updatedRole = updatedRoleList[0];
    if (!updatedRole) {
      return reply.status(404).send({ error: "Role not found." });
    }

    return reply.send(updatedRole);
  } catch (error) {
    if ((error as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const deleteRole = async (
  request: FastifyRequest<{
    Params: { eventId: string; roleId: string };
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId, roleId } = request.params;

    const isOwner = await verifyEventOwner(eventId, user.id);
    if (!isOwner) {
      return reply.status(401).send({ error: "Unauthorized." });
    }

    // Check if role is in use
    const membersWithRole = await db
      .select()
      .from(eventTeamMembers)
      .where(eq(eventTeamMembers.roleId, roleId));

    if (membersWithRole.length > 0) {
      return reply
        .status(400)
        .send({ error: "Cannot delete a role that is assigned to members." });
    }

    const deletedRoleList = await db
      .delete(eventRoles)
      .where(and(eq(eventRoles.id, roleId), eq(eventRoles.eventId, eventId)))
      .returning();

    if (deletedRoleList.length === 0) {
      return reply.status(404).send({ error: "Role not found." });
    }

    return reply.send({ message: "Role deleted successfully." });
  } catch (error) {
    if ((error as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const removeTeamMember = async (
  request: FastifyRequest<{
    Params: { eventId: string; memberId: string };
  }>,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { eventId, memberId } = request.params;

    const isOwner = await verifyEventOwner(eventId, user.id);
    if (!isOwner) {
      return reply.status(401).send({ error: "Unauthorized." });
    }

    const deletedMemberList = await db
      .delete(eventTeamMembers)
      .where(
        and(
          eq(eventTeamMembers.id, memberId),
          eq(eventTeamMembers.eventId, eventId),
        ),
      )
      .returning();

    if (deletedMemberList.length === 0) {
      return reply.status(404).send({ error: "Team member not found." });
    }

    return reply.send({ message: "Team member removed successfully." });
  } catch (error) {
    if ((error as Error).message.includes("jwt")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};
