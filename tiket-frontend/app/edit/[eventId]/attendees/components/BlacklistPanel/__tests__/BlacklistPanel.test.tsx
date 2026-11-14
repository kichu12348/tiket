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
  // Ignore
}

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { BlacklistEntry } from "@/types/commerce";
import BlacklistPanel from "../index";

const mockEntries: BlacklistEntry[] = [
  {
    id: "bl-1",
    organizationId: "org-1",
    eventId: "evt-123",
    targetUserId: null,
    pattern: "spammer@gmail.com",
    reason: "Chargeback abuse",
    createdBy: "usr-admin",
    createdAt: "2026-05-10T12:00:00.000Z",
    user: null,
  },
  {
    id: "bl-2",
    organizationId: "org-1",
    eventId: null,
    targetUserId: null,
    pattern: "@frauddomain.com",
    reason: "Temporary disposable emails",
    createdBy: "usr-admin",
    createdAt: "2026-05-12T14:30:00.000Z",
    user: null,
  },
];

const mockGetBlacklist = mock(() => Promise.resolve(mockEntries));
const mockAddBlacklistEntry = mock(
  (
    _eventId: string,
    payload: {
      pattern: string;
      reason?: string;
      scope?: "event" | "organization";
      cancelExistingTickets?: boolean;
    },
  ) =>
    Promise.resolve({
      id: "bl-3",
      organizationId: "org-1",
      eventId: payload.scope === "event" ? "evt-123" : null,
      targetUserId: null,
      pattern: payload.pattern,
      reason: payload.reason || null,
      createdBy: "usr-admin",
      createdAt: new Date().toISOString(),
      user: null,
    }),
);
const mockRemoveBlacklistEntry = mock(() =>
  Promise.resolve({ success: true }),
);
const mockToast = {
  success: mock((_msg: string) => {}),
  error: mock((_msg: string) => {}),
};

mock.module("@/api/commerce", () => ({
  getBlacklist: mockGetBlacklist,
  addBlacklistEntry: mockAddBlacklistEntry,
  removeBlacklistEntry: mockRemoveBlacklistEntry,
}));

mock.module("sonner", () => ({
  toast: mockToast,
}));

describe("BlacklistPanel Component", () => {
  beforeEach(() => {
    mockGetBlacklist.mockClear();
    mockAddBlacklistEntry.mockClear();
    mockRemoveBlacklistEntry.mockClear();
    mockToast.success.mockClear();
    mockToast.error.mockClear();
  });

  test("1. Renders blacklist table with pattern badges, reason, and scope", async () => {
    mockGetBlacklist.mockImplementationOnce(() => Promise.resolve(mockEntries));
    render(<BlacklistPanel eventId="evt-123" />);

    await waitFor(() => {
      expect(screen.getByText("spammer@gmail.com")).toBeInTheDocument();
      expect(screen.getByText("@frauddomain.com")).toBeInTheDocument();
    });

    expect(screen.getByText("Chargeback abuse")).toBeInTheDocument();
    expect(screen.getByText("Temporary disposable emails")).toBeInTheDocument();
    expect(screen.getByText("Event Only")).toBeInTheDocument();
    expect(screen.getByText("Organization")).toBeInTheDocument();
  });

  test("2. Filters table entries by search query", async () => {
    mockGetBlacklist.mockImplementationOnce(() => Promise.resolve(mockEntries));
    render(<BlacklistPanel eventId="evt-123" />);

    await waitFor(() => {
      expect(screen.getByText("spammer@gmail.com")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Search by email or pattern...",
    );
    fireEvent.change(searchInput, { target: { value: "frauddomain" } });

    expect(screen.queryByText("spammer@gmail.com")).toBeNull();
    expect(screen.getByText("@frauddomain.com")).toBeInTheDocument();
  });

  test("3. Renders empty state when no blacklisted entries exist", async () => {
    mockGetBlacklist.mockImplementationOnce(() => Promise.resolve([]));
    render(<BlacklistPanel eventId="evt-123" />);

    await waitFor(() => {
      expect(screen.getByText("No Blacklisted Entries")).toBeInTheDocument();
    });

    expect(screen.getByText("Block an Email or Domain")).toBeInTheDocument();
  });

  test("4. Opens AddBlacklistModal and submits valid pattern", async () => {
    mockGetBlacklist.mockImplementationOnce(() => Promise.resolve([]));
    render(<BlacklistPanel eventId="evt-123" />);

    await waitFor(() => {
      expect(screen.getByText("No Blacklisted Entries")).toBeInTheDocument();
    });

    const addBtn = screen.getByRole("button", { name: /Add to Blacklist/i });
    fireEvent.click(addBtn);

    expect(screen.getByText("Email or Domain Pattern *")).toBeInTheDocument();

    const patternInput = screen.getByPlaceholderText(
      "spammer@gmail.com or @example.com",
    );
    const reasonInput = screen.getByPlaceholderText(
      "e.g. Repeated chargebacks, fraudulent booking, spam",
    );

    fireEvent.change(patternInput, { target: { value: "badactor@domain.com" } });
    fireEvent.change(reasonInput, { target: { value: "Multiple chargebacks" } });

    const submitBtn = screen.getByRole("button", {
      name: /Block & Blacklist/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockAddBlacklistEntry).toHaveBeenCalledWith("evt-123", {
        pattern: "badactor@domain.com",
        reason: "Multiple chargebacks",
        scope: "event",
        cancelExistingTickets: false,
      });
      expect(mockToast.success).toHaveBeenCalled();
    });
  });

  test("5. Validates invalid pattern before submit", async () => {
    mockGetBlacklist.mockImplementationOnce(() => Promise.resolve([]));
    render(<BlacklistPanel eventId="evt-123" />);

    await waitFor(() => {
      expect(screen.getByText("No Blacklisted Entries")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Add to Blacklist/i }));

    const patternInput = screen.getByPlaceholderText(
      "spammer@gmail.com or @example.com",
    );
    fireEvent.change(patternInput, { target: { value: "notanemail" } });

    const submitBtn = screen.getByRole("button", {
      name: /Block & Blacklist/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Enter a valid email (user@example.com) or domain starting with @ (@example.com).",
        ),
      ).toBeInTheDocument();
    });

    expect(mockAddBlacklistEntry).not.toHaveBeenCalled();
  });

  test("6. Removes an entry with 1-click remove button", async () => {
    mockGetBlacklist.mockImplementationOnce(() => Promise.resolve(mockEntries));
    render(<BlacklistPanel eventId="evt-123" />);

    await waitFor(() => {
      expect(screen.getByText("spammer@gmail.com")).toBeInTheDocument();
    });

    const removeBtns = screen.getAllByRole("button", { name: /Remove/i });
    fireEvent.click(removeBtns[0]);

    await waitFor(() => {
      expect(mockRemoveBlacklistEntry).toHaveBeenCalledWith("evt-123", "bl-1");
      expect(mockToast.success).toHaveBeenCalledWith(
        "Removed 'spammer@gmail.com' from blacklist.",
      );
    });

    expect(screen.queryByText("spammer@gmail.com")).toBeNull();
  });
});
