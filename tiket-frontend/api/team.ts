import api from "@/lib/api";
import { API_ENDPOINTS } from "@/constants/config";
import {
  EventRole,
  TeamMember,
  CreateRolePayload,
  UpdateRolePayload,
  AddMemberPayload,
} from "@/types/team";

export const getRoles = async (eventId: string): Promise<EventRole[]> => {
  const response = await api.get(API_ENDPOINTS.TEAM.ROLES_GET(eventId));
  return response.data;
};

export const createRole = async (
  eventId: string,
  payload: CreateRolePayload
): Promise<EventRole> => {
  const response = await api.post(
    API_ENDPOINTS.TEAM.ROLES_CREATE(eventId),
    payload
  );
  return response.data;
};

export const updateRole = async (
  eventId: string,
  roleId: string,
  payload: UpdateRolePayload
): Promise<EventRole> => {
  const response = await api.patch(
    API_ENDPOINTS.TEAM.ROLES_UPDATE(eventId, roleId),
    payload
  );
  return response.data;
};

export const deleteRole = async (
  eventId: string,
  roleId: string
): Promise<{ message: string }> => {
  const response = await api.delete(
    API_ENDPOINTS.TEAM.ROLES_DELETE(eventId, roleId)
  );
  return response.data;
};

export const getTeamMembers = async (
  eventId: string
): Promise<TeamMember[]> => {
  const response = await api.get(API_ENDPOINTS.TEAM.MEMBERS_GET(eventId));
  return response.data;
};

export const addTeamMember = async (
  eventId: string,
  payload: AddMemberPayload
): Promise<TeamMember> => {
  const response = await api.post(
    API_ENDPOINTS.TEAM.MEMBERS_ADD(eventId),
    payload
  );
  return response.data;
};

export const removeTeamMember = async (
  eventId: string,
  memberId: string
): Promise<{ message: string }> => {
  const response = await api.delete(
    API_ENDPOINTS.TEAM.MEMBERS_DELETE(eventId, memberId)
  );
  return response.data;
};
