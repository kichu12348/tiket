import { describe, expect, test, mock } from "bun:test";
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
import type { EmailLog } from "@/types/email";
import EmailLogsTable from "../index";
import { computeEmailMetrics } from "../functions/computeEmailMetrics";
import { filterEmailLogs } from "../functions/filterEmailLogs";
import {
  getTemplateTypeLabel,
  formatDateTime,
  formatTimeOnly,
} from "../functions/formatLogValues";

const sampleLogs: EmailLog[] = [
  {
    id: "log-1",
    eventId: "evt-1",
    templateId: "tpl-1",
    templateType: "confirmation",
    recipientEmail: "alice@example.com",
    recipientName: "Alice Wonder",
    subject: "Order Confirmation #101",
    renderedBody: "<div><p>Your order is confirmed!</p></div>",
    status: "sent",
    errorMessage: null,
    openedAt: "2026-11-01T12:00:00.000Z",
    openCount: 2,
    resentCount: 0,
    lastResentAt: null,
    sentAt: "2026-11-01T10:00:00.000Z",
  },
  {
    id: "log-2",
    eventId: "evt-1",
    templateId: "tpl-2",
    templateType: "checkin",
    recipientEmail: "bob@example.com",
    recipientName: "Bob Smith",
    subject: "Check-in Pass",
    renderedBody: "<div><p>Welcome to the event!</p></div>",
    status: "sent",
    errorMessage: null,
    openedAt: null,
    openCount: 0,
    resentCount: 1,
    lastResentAt: "2026-11-01T14:00:00.000Z",
    sentAt: "2026-11-01T11:00:00.000Z",
  },
  {
    id: "log-3",
    eventId: "evt-1",
    templateId: "tpl-3",
    templateType: "invitation",
    recipientEmail: "charlie@example.com",
    recipientName: "Charlie Brown",
    subject: "VIP Invitation",
    renderedBody: "<div><p>Exclusive VIP Invite</p></div>",
    status: "failed",
    errorMessage: "SMTP Timeout",
    openedAt: null,
    openCount: 0,
    resentCount: 0,
    lastResentAt: null,
    sentAt: "2026-11-01T12:00:00.000Z",
  },
];

describe("EmailLogsTable Subsystem", () => {
  describe("Pure Functions", () => {
    test("computeEmailMetrics aggregates stats correctly", () => {
      const metrics = computeEmailMetrics(sampleLogs);
      expect(metrics.totalSent).toBe(2);
      expect(metrics.totalOpened).toBe(1);
      expect(metrics.totalUnopened).toBe(1);
      expect(metrics.totalFailed).toBe(1);
      expect(metrics.openRatePercent).toBe(50);
      expect(metrics.byType.length).toBeGreaterThanOrEqual(3);
      expect(metrics.timeline.length).toBeGreaterThanOrEqual(1);
    });

    test("filterEmailLogs filters by status correctly", () => {
      const opened = filterEmailLogs(sampleLogs, "opened", "all", "");
      expect(opened.length).toBe(1);
      expect(opened[0].id).toBe("log-1");

      const unopened = filterEmailLogs(sampleLogs, "unopened", "all", "");
      expect(unopened.length).toBe(1);
      expect(unopened[0].id).toBe("log-2");

      const failed = filterEmailLogs(sampleLogs, "failed", "all", "");
      expect(failed.length).toBe(1);
      expect(failed[0].id).toBe("log-3");
    });

    test("filterEmailLogs filters by template type correctly", () => {
      const checkinOnly = filterEmailLogs(sampleLogs, "all", "checkin", "");
      expect(checkinOnly.length).toBe(1);
      expect(checkinOnly[0].id).toBe("log-2");
    });

    test("filterEmailLogs searches case-insensitively across name, email, and subject", () => {
      const matchName = filterEmailLogs(sampleLogs, "all", "all", "alice");
      expect(matchName.length).toBe(1);
      expect(matchName[0].id).toBe("log-1");

      const matchEmail = filterEmailLogs(sampleLogs, "all", "all", "bob@example");
      expect(matchEmail.length).toBe(1);
      expect(matchEmail[0].id).toBe("log-2");

      const matchSubject = filterEmailLogs(sampleLogs, "all", "all", "vip");
      expect(matchSubject.length).toBe(1);
      expect(matchSubject[0].id).toBe("log-3");
    });

    test("formatLogValues formats labels and timestamps properly", () => {
      expect(getTemplateTypeLabel("confirmation")).toBe("Confirmation");
      expect(getTemplateTypeLabel("custom")).toBe("Custom");
      expect(getTemplateTypeLabel(null)).toBe("Custom");
      expect(formatDateTime("2026-11-01T12:00:00.000Z")).toContain("2026");
      expect(formatTimeOnly("2026-11-01T12:00:00.000Z")).toBeTruthy();
    });
  });

  describe("EmailLogsTable Component", () => {
    test("Renders loading state when isLoading is true", () => {
      render(
        <EmailLogsTable
          logs={[]}
          isLoading={true}
          eventId="evt-1"
        />,
      );
      expect(screen.getByText("Loading email delivery logs...")).toBeInTheDocument();
    });

    test("Renders header, KPI cards, charts, and table with records", () => {
      render(
        <EmailLogsTable
          logs={sampleLogs}
          isLoading={false}
          eventId="evt-1"
        />,
      );

      // Header
      expect(
        screen.getByText("Email Delivery History Logs (3)"),
      ).toBeInTheDocument();

      // KPI cards
      expect(screen.getByText("Total Sent")).toBeInTheDocument();
      expect(screen.getByText("50% Open Rate")).toBeInTheDocument();
      expect(screen.getAllByText("Unopened").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Failed").length).toBeGreaterThanOrEqual(1);

      // Chart titles
      expect(
        screen.getByText("Sent vs. Opened by Email Type"),
      ).toBeInTheDocument();
      expect(screen.getByText("Opens Timeline Chart")).toBeInTheDocument();

      // Table records
      expect(screen.getByText("Alice Wonder")).toBeInTheDocument();
      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
      expect(screen.getByText("Bob Smith")).toBeInTheDocument();
      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
      expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
      expect(screen.getByText("charlie@example.com")).toBeInTheDocument();
    });

    test("Filters rows when typing into search input", () => {
      render(
        <EmailLogsTable
          logs={sampleLogs}
          isLoading={false}
          eventId="evt-1"
        />,
      );

      const searchInput = screen.getByPlaceholderText(
        "Search recipient or subject...",
      );
      fireEvent.change(searchInput, { target: { value: "Charlie" } });

      expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
      expect(screen.queryByText("Alice Wonder")).not.toBeInTheDocument();
      expect(screen.queryByText("Bob Smith")).not.toBeInTheDocument();
    });

    test("Opens and closes sent email preview modal", async () => {
      render(
        <EmailLogsTable
          logs={sampleLogs}
          isLoading={false}
          eventId="evt-1"
        />,
      );

      const previewButtons = screen.getAllByRole("button", {
        name: /Preview Sent Email/i,
      });
      fireEvent.click(previewButtons[0]);

      expect(
        await screen.findByText("Sent Email HTML Preview"),
      ).toBeInTheDocument();
      expect(screen.getByTitle("Sent Email Preview")).toBeInTheDocument();

      const closeBtn = screen.getByText("Close Preview");
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(
          screen.queryByText("Sent Email HTML Preview"),
        ).not.toBeInTheDocument();
      });
    });

    test("Calls onResend when clicking Resend button", async () => {
      const mockResend = mock(async () => {});
      render(
        <EmailLogsTable
          logs={sampleLogs}
          isLoading={false}
          eventId="evt-1"
          onResend={mockResend}
        />,
      );

      const resendButtons = screen.getAllByRole("button", {
        name: /Resend Email/i,
      });
      fireEvent.click(resendButtons[0]);

      await waitFor(() => {
        expect(mockResend).toHaveBeenCalledWith("log-1");
      });
    });

    test("Displays empty state when no logs match", () => {
      render(
        <EmailLogsTable
          logs={sampleLogs}
          isLoading={false}
          eventId="evt-1"
        />,
      );

      const searchInput = screen.getByPlaceholderText(
        "Search recipient or subject...",
      );
      fireEvent.change(searchInput, { target: { value: "nonexistent query" } });

      expect(
        screen.getByText("No email logs match the selected filters."),
      ).toBeInTheDocument();
    });
  });
});
