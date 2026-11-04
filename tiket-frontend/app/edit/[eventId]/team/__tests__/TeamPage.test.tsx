import "@/happydom";
import { describe, expect, test, mock, beforeEach } from "bun:test";
import React from "react";

// Bridge duplicate React instances between root @testing-library/react and frontend node_modules/react
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rFrontend = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rTesting = require(
    require.resolve("react", {
      paths: [require.resolve("@testing-library/react")],
    }),
  );
  const i1 =
    rFrontend.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const i2 =
    rTesting.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  if (i1 && i2 && i1 !== i2) {
    Object.defineProperty(i1, "H", {
      get() {
        return i2.H;
      },
      set(v) {
        i2.H = v;
      },
    });
    Object.defineProperty(i1, "A", {
      get() {
        return i2.A;
      },
      set(v) {
        i2.A = v;
      },
    });
  }
} catch {
  // Ignore if already unified
}

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { TeamMember, EventRole } from "@/types/team";
import TeamPage from "../page";

// --- Mock Navigation ---
mock.module("next/navigation", () => ({
  useParams: () => ({ eventId: "evt-test-101" }),
  useRouter: () => ({ push: mock() }),
}));

// --- Mock API Layer ---
let mockRoles: EventRole[] = [];
let mockMembers: TeamMember[] = [];

const mockGetRoles = mock(async (_eventId: string): Promise<EventRole[]> => {
  return [...mockRoles];
});

const mockGetTeamMembers = mock(
  async (_eventId: string): Promise<TeamMember[]> => {
    return [...mockMembers];
  },
);

const mockCreateRole = mock(
  async (
    _eventId: string,
    payload: { name: string; permissions: string[] },
  ): Promise<EventRole> => {
    const newRole: EventRole = {
      id: `role-${Date.now()}`,
      eventId: "evt-test-101",
      name: payload.name,
      permissions: payload.permissions,
      createdAt: new Date().toISOString(),
    };
    mockRoles.push(newRole);
    return newRole;
  },
);

const mockAddTeamMember = mock(
  async (
    _eventId: string,
    payload: { email: string; roleId: string },
  ): Promise<TeamMember> => {
    const role = mockRoles.find((r) => r.id === payload.roleId) || {
      id: payload.roleId,
      eventId: "evt-test-101",
      name: "Assigned Role",
      permissions: [],
      createdAt: new Date().toISOString(),
    };
    const newMember: TeamMember = {
      id: `member-${Date.now()}`,
      eventId: "evt-test-101",
      userId: `user-${Date.now()}`,
      roleId: role.id,
      user: {
        id: `user-${Date.now()}`,
        name: payload.email.split("@")[0],
        email: payload.email,
      },
      role: {
        id: role.id,
        name: role.name,
      },
      createdAt: new Date().toISOString(),
    };
    mockMembers.push(newMember);
    return newMember;
  },
);

mock.module("@/api/team", () => ({
  getRoles: mockGetRoles,
  getTeamMembers: mockGetTeamMembers,
  createRole: mockCreateRole,
  updateRole: mock(async () => ({})),
  deleteRole: mock(async () => ({})),
  addTeamMember: mockAddTeamMember,
  removeTeamMember: mock(async () => ({})),
}));

mock.module("sonner", () => ({
  toast: {
    success: mock(),
    error: mock(),
    info: mock(),
  },
}));

describe("TeamPage Integration", () => {
  beforeEach(() => {
    mockRoles = [
      {
        id: "role-admin",
        eventId: "evt-test-101",
        name: "Admin Lead",
        permissions: ["manage_tickets", "manage_settings", "manage_team"],
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    mockMembers = [
      {
        id: "member-1",
        eventId: "evt-test-101",
        userId: "user-1",
        roleId: "role-admin",
        user: {
          id: "user-1",
          name: "Alice Walker",
          email: "alice@example.com",
        },
        role: {
          id: mockRoles[0].id,
          name: mockRoles[0].name,
        },
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    mockGetRoles.mockClear();
    mockGetTeamMembers.mockClear();
    mockCreateRole.mockClear();
    mockAddTeamMember.mockClear();
  });

  test("1. Renders team members list by default", async () => {
    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Walker")).toBeDefined();
      expect(screen.getByText("alice@example.com")).toBeDefined();
      expect(screen.getByText("Admin Lead")).toBeDefined();
    });
  });

  test("2. Adds a new team member by email", async () => {
    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Walker")).toBeDefined();
    });

    const inviteBtn = screen.getByTestId("invite-member-btn");
    fireEvent.click(inviteBtn);

    await waitFor(() => {
      expect(screen.getByTestId("member-email-input")).toBeDefined();
    });

    fireEvent.change(screen.getByTestId("member-email-input"), {
      target: { value: "bob@example.com" },
    });

    fireEvent.click(screen.getByTestId("member-submit-btn"));

    await waitFor(() => {
      expect(mockAddTeamMember).toHaveBeenCalled();
    });

    const args = mockAddTeamMember.mock.calls[0];
    expect(args[0]).toBe("evt-test-101");
    expect(args[1].email).toBe("bob@example.com");
    expect(args[1].roleId).toBe("role-admin");
  });

  test("3. Switches to Roles tab and creates a role with selected permissions", async () => {
    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByText("Roles & Permissions")).toBeDefined();
    });

    // Switch tab
    fireEvent.click(screen.getByText("Roles & Permissions"));

    await waitFor(() => {
      expect(screen.getByText("Admin Lead")).toBeDefined();
      expect(screen.getByTestId("create-role-btn")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("create-role-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("role-name-input")).toBeDefined();
    });

    fireEvent.change(screen.getByTestId("role-name-input"), {
      target: { value: "Door Scanner" },
    });

    // Select scan_tickets and view_guests checkboxes
    const scanCheckbox = screen.getByTestId("perm-checkbox-scan_tickets");
    const guestsCheckbox = screen.getByTestId("perm-checkbox-view_guests");
    expect(scanCheckbox).toBeDefined();
    expect(guestsCheckbox).toBeDefined();

    fireEvent.click(scanCheckbox);
    fireEvent.click(guestsCheckbox);

    fireEvent.click(screen.getByTestId("role-submit-btn"));

    await waitFor(() => {
      expect(mockCreateRole).toHaveBeenCalled();
    });

    const args = mockCreateRole.mock.calls[0];
    expect(args[0]).toBe("evt-test-101");
    expect(args[1].name).toBe("Door Scanner");
    expect(args[1].permissions).toContain("scan_tickets");
    expect(args[1].permissions).toContain("view_guests");
  });
});
