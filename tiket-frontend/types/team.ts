export interface EventRole {
  id: string;
  eventId: string;
  name: string;
  permissions: string[];
  createdAt: string;
}

export interface TeamMember {
  id: string;
  eventId: string;
  userId: string;
  roleId: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: {
    id: string;
    name: string;
  };
}

export interface CreateRolePayload {
  name: string;
  permissions: string[];
}

export interface UpdateRolePayload {
  name?: string;
  permissions?: string[];
}

export interface AddMemberPayload {
  email: string; // The user they selected to invite
  roleId: string;
}
