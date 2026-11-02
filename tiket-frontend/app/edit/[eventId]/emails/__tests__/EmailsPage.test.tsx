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
import type {
  EmailTemplate,
  AvailableVariables,
  EmailLog,
  SendTestEmailPayload,
  SendBatchEmailPayload,
} from "@/types/email";
import type { Event } from "@/types/event";
import { useEventStore } from "@/store/useEventStore";

// --- Mock API Layer ---
const mockTemplates: EmailTemplate[] = [
  {
    id: "tpl-confirm-1",
    eventId: "evt-test-101",
    name: "Order Confirmation",
    type: "confirmation",
    subject: "Confirmed: Your Ticket to {{event.title}}",
    body: `<div style="font-family: Arial, sans-serif; padding: 20px;"><p>Hello {{attendee.name}},</p><p>Your ticket for {{event.title}} is ready!</p><p>{{ticket.qrCodeUrl}}</p></div>`,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "tpl-checkin-1",
    eventId: "evt-test-101",
    name: "Check-in Pass",
    type: "checkin",
    subject: "Welcome to {{event.title}}! You are checked in.",
    body: `<div style="font-family: Arial, sans-serif; padding: 20px;"><p>Hi {{attendee.name}}, welcome to {{event.title}}!</p></div>`,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "tpl-invite-1",
    eventId: "evt-test-101",
    name: "VIP Invitation",
    type: "invitation",
    subject: "Special Invitation: {{event.title}}",
    body: `<div style="font-family: Arial, sans-serif; padding: 20px;"><p>Join us at {{event.title}}</p></div>`,
    isActive: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const mockVariables: AvailableVariables = {
  eventVariables: [
    {
      key: "{{event.title}}",
      label: "Event Title",
      sample: "Tech Innovation Summit 2026",
    },
    {
      key: "{{event.startDate}}",
      label: "Start Date",
      sample: "Dec 1, 2026, 10:00 AM",
    },
  ],
  attendeeVariables: [
    {
      key: "{{attendee.name}}",
      label: "Attendee Name",
      sample: "Sarah Connor",
    },
    {
      key: "{{attendee.email}}",
      label: "Attendee Email",
      sample: "sarah@example.com",
    },
  ],
  ticketVariables: [
    { key: "{{ticket.type}}", label: "Ticket Type", sample: "VIP All-Access" },
    {
      key: "{{ticket.qrCodeUrl}}",
      label: "QR Code URL",
      sample: "https://quickchart.io/qr?text=TKT-884920-XYZ&size=300&margin=1",
    },
  ],
  formVariables: [
    { key: "{{form.Company}}", label: "Company", sample: "Cyberdyne Systems" },
  ],
};

const mockLogs: EmailLog[] = [
  {
    id: "log-1",
    eventId: "evt-test-101",
    templateId: "tpl-confirm-1",
    recipientEmail: "attendee1@example.com",
    recipientName: "John Doe",
    subject: "Confirmed: Your Ticket to Tech Innovation Summit 2026",
    status: "sent",
    errorMessage: null,
    sentAt: "2026-11-01T12:00:00.000Z",
  },
];

const mockEvent: Event = {
  id: "evt-test-101",
  title: "Tech Innovation Summit 2026",
  slug: "tech-summit-2026",
  description: "Annual Tech Conference",
  coverImage: null,
  color: "#2563eb",
  organizationId: "org-1",
  startDate: "2026-12-01T10:00:00.000Z",
  endDate: "2026-12-02T18:00:00.000Z",
  registrationStart: "2026-10-01T10:00:00.000Z",
  registrationEnd: "2026-11-30T23:59:59.000Z",
  timezone: "UTC",
  locationType: "offline",
  locationDetails: { address: "Convention Center, Hall A" },
  status: "published",
  capacity: 500,
  requireApproval: false,
  fontFamily: "Inter",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const fnGetEmailTemplates = mock(async () => [...mockTemplates]);
const fnGetEmailTemplateById = mock(async (_evtId: string, tplId: string) => {
  const found = mockTemplates.find((t) => t.id === tplId);
  return found || mockTemplates[0];
});
const fnGetAvailableVariables = mock(async () => ({ ...mockVariables }));
const fnGetEmailLogs = mock(async () => [...mockLogs]);
const fnUpdateEmailTemplate = mock(
  async (_evtId: string, tplId: string, payload: Partial<EmailTemplate>) => {
    const original =
      mockTemplates.find((t) => t.id === tplId) || mockTemplates[0];
    return { ...original, ...payload, updatedAt: new Date().toISOString() };
  },
);
const fnResetEmailTemplate = mock(async (_evtId: string, tplId: string) => {
  const original =
    mockTemplates.find((t) => t.id === tplId) || mockTemplates[0];
  return {
    ...original,
    subject: "Reset Subject Default",
    body: "<p>Reset body default</p>",
    updatedAt: new Date().toISOString(),
  };
});
const fnSendTestEmail = mock(
  async (_evtId: string, payload: SendTestEmailPayload) => ({
    message: "Test email dispatched successfully!",
    log: {
      id: "log-test-new",
      eventId: "evt-test-101",
      templateId: payload.templateId || "tpl-confirm-1",
      recipientEmail: payload.recipientEmail,
      recipientName: payload.recipientName || null,
      subject: payload.subject,
      status: "sent" as const,
      errorMessage: null,
      sentAt: new Date().toISOString(),
    },
  }),
);
const fnSendBatchEmail = mock(
  async (_evtId: string, _payload: SendBatchEmailPayload) => ({
    message: "Batch broadcast dispatched to 1 recipients",
    sentCount: 1,
  }),
);
const fnCreateCustomEmailTemplate = mock(
  async (evtId: string, payload: Partial<EmailTemplate>) => ({
    id: "tpl-custom-new",
    eventId: evtId,
    name: payload.name || "Custom Template",
    type: "custom" as const,
    subject: payload.subject || "Custom Subject",
    body: payload.body || "<p>Custom Body</p>",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
);
const fnDeleteCustomEmailTemplate = mock(async () => ({
  message: "Deleted custom template",
}));

mock.module("@/api/emails", () => ({
  getEmailTemplates: fnGetEmailTemplates,
  getEmailTemplateById: fnGetEmailTemplateById,
  getAvailableVariables: fnGetAvailableVariables,
  getEmailLogs: fnGetEmailLogs,
  updateEmailTemplate: fnUpdateEmailTemplate,
  resetEmailTemplate: fnResetEmailTemplate,
  sendTestEmail: fnSendTestEmail,
  sendBatchEmail: fnSendBatchEmail,
  createCustomEmailTemplate: fnCreateCustomEmailTemplate,
  deleteCustomEmailTemplate: fnDeleteCustomEmailTemplate,
}));

// Import page under test
import EditEmailsPage from "../page";

describe("EditEmailsPage Component", () => {
  beforeEach(() => {
    // Reset Zustand store state
    useEventStore.setState({
      event: mockEvent,
      isLoading: false,
    });

    fnGetEmailTemplates.mockClear();
    fnGetEmailTemplateById.mockClear();
    fnGetAvailableVariables.mockClear();
    fnGetEmailLogs.mockClear();
    fnUpdateEmailTemplate.mockClear();
    fnResetEmailTemplate.mockClear();
    fnSendTestEmail.mockClear();
    fnSendBatchEmail.mockClear();
  });

  test("1. Renders the emails page with templates, variable picker, live preview and logs", async () => {
    render(<EditEmailsPage />);

    // Header title check
    expect(
      await screen.findByText("Event Email Management"),
    ).toBeInTheDocument();

    // Verify TemplateTypeSelector loaded
    expect(screen.getByText("Confirmation")).toBeInTheDocument();
    expect(screen.getByText("Check-in")).toBeInTheDocument();
    expect(screen.getByText("Invitation")).toBeInTheDocument();

    // Verify VariablePicker loaded
    expect(
      screen.getByText("Dynamic Variable Placeholders"),
    ).toBeInTheDocument();
    expect(screen.getByText("Event Title")).toBeInTheDocument();
    expect(screen.getByText("Attendee Name")).toBeInTheDocument();
    expect(screen.getByText("Ticket Type")).toBeInTheDocument();

    // Verify LivePreviewPane loaded
    expect(screen.getByText("Live Email Preview")).toBeInTheDocument();

    // Verify EmailLogsTable loaded with delivery history
    expect(
      screen.getByText("Email Delivery History Logs (1)"),
    ).toBeInTheDocument();
    expect(screen.getByText("attendee1@example.com")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("SENT")).toBeInTheDocument();
  });

  test("2. Selecting a template in TemplateTypeSelector fetches full template and updates view", async () => {
    render(<EditEmailsPage />);

    await screen.findByRole("button", { name: /Save Template/i });

    // Click "Check-in" category tab
    const checkinTab = screen.getByText("Check-in");
    fireEvent.click(checkinTab);

    await waitFor(() => {
      // Must call getEmailTemplateById for the check-in template
      expect(fnGetEmailTemplateById).toHaveBeenCalledWith(
        "evt-test-101",
        "tpl-checkin-1",
      );
    });

    // Check that current template name updated in the UI
    const matches = await screen.findAllByText("Check-in Pass");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  test("3. Interpolating sample variables in LivePreviewPane (subject, body, sample QR image)", async () => {
    render(<EditEmailsPage />);

    await screen.findByRole("button", { name: /Save Template/i });

    // The subject contains {{event.title}} which interpolates to "Tech Innovation Summit 2026"
    const matchingSubjects = await screen.findAllByText(
      "Confirmed: Your Ticket to Tech Innovation Summit 2026",
    );
    expect(matchingSubjects.length).toBeGreaterThanOrEqual(1);

    // The body contains {{attendee.name}} which interpolates to "Sarah Connor"
    expect(await screen.findByText(/Sarah Connor/)).toBeInTheDocument();

    // The body contains {{ticket.qrCodeUrl}} which should render as an <img> tag with quickchart.io URL
    const qrImg = document.querySelector(
      'img[src*="quickchart.io/qr?text=TKT-884920-XYZ"]',
    );
    expect(qrImg).toBeInTheDocument();
  });

  test("4. Saving template changes calls updateEmailTemplate", async () => {
    render(<EditEmailsPage />);

    const saveBtn = await screen.findByRole("button", {
      name: /Save Template/i,
    });
    expect(saveBtn).toBeInTheDocument();

    const form = saveBtn.closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(fnUpdateEmailTemplate).toHaveBeenCalled();
      const calls = fnUpdateEmailTemplate.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0][0]).toBe("evt-test-101");
      expect(calls[0][1]).toBe("tpl-confirm-1");
    });
  });

  test("5. Toggling isActive on a template persists via updateEmailTemplate", async () => {
    render(<EditEmailsPage />);

    await screen.findByRole("button", { name: /Save Template/i });

    // Find the Active toggle buttons and click one
    const toggleBtns = await screen.findAllByRole("button", {
      name: /Active/i,
    });
    expect(toggleBtns.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(toggleBtns[0]);

    await waitFor(() => {
      expect(fnUpdateEmailTemplate).toHaveBeenCalledWith(
        "evt-test-101",
        "tpl-confirm-1",
        { isActive: false },
      );
    });
  });

  test("6. Clicking Reset to Default calls resetEmailTemplate", async () => {
    render(<EditEmailsPage />);

    const resetBtn = await screen.findByRole("button", {
      name: /Reset Default/i,
    });
    expect(resetBtn).toBeInTheDocument();

    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(fnResetEmailTemplate).toHaveBeenCalledWith(
        "evt-test-101",
        "tpl-confirm-1",
      );
    });
  });

  test("7. Opening and submitting SendTestModal calls sendTestEmail and refreshes logs", async () => {
    render(<EditEmailsPage />);

    const sendTestTrigger = await screen.findByRole("button", {
      name: /Send Test/i,
    });
    fireEvent.click(sendTestTrigger);

    // Modal pops up
    expect(await screen.findByText("Send Test Email")).toBeInTheDocument();

    // Fill in recipient email & name
    const emailInput = screen.getByPlaceholderText("you@example.com");
    const nameInput = screen.getByPlaceholderText("e.g. Alex Morgan");

    fireEvent.change(emailInput, { target: { value: "developer@test.com" } });
    fireEvent.change(nameInput, { target: { value: "Dev Tester" } });

    // Submit test email form
    const dispatchBtn = screen.getByRole("button", {
      name: /Dispatch Test Email/i,
    });
    fireEvent.click(dispatchBtn);

    await waitFor(() => {
      expect(fnSendTestEmail).toHaveBeenCalledWith("evt-test-101", {
        recipientEmail: "developer@test.com",
        recipientName: "Dev Tester",
        subject: "Confirmed: Your Ticket to {{event.title}}",
        body: expect.any(String),
        templateId: "tpl-confirm-1",
      });
      // Verifies logs were reloaded
      expect(fnGetEmailLogs).toHaveBeenCalled();
    });
  });

  test("8. Opening and submitting SendBatchModal with target group", async () => {
    render(<EditEmailsPage />);

    const sendBatchTrigger = await screen.findByRole("button", {
      name: /Send Blast/i,
    });
    fireEvent.click(sendBatchTrigger);

    // Modal pops up
    expect(await screen.findByText("Broadcast Email Blast")).toBeInTheDocument();

    // Select "Checked-In Attendees Only"
    const checkedInOption = screen.getByText("Checked-In Attendees Only");
    fireEvent.click(checkedInOption);

    // Dispatch broadcast
    const dispatchBtn = screen.getByRole("button", {
      name: /Send Email Blast/i,
    });
    fireEvent.click(dispatchBtn);

    await waitFor(() => {
      expect(fnSendBatchEmail).toHaveBeenCalledWith("evt-test-101", {
        targetGroup: "checked_in",
        customEmails: [],
        subject: "Confirmed: Your Ticket to {{event.title}}",
        body: expect.any(String),
        templateId: "tpl-confirm-1",
      });
    });
  });
});
