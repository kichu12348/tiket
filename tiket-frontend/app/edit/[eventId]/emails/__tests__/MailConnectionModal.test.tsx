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
import MailConnectionModal from "../components/MailConnectionModal";
import type { SmtpMailPayload } from "@/types/commerce";

// Mock @/api/commerce
const fnSaveMailConnection = mock(
  async (_eventId: string, _config: SmtpMailPayload) => ({ custom: true }),
);
const fnTestMailConnection = mock(
  async (_eventId: string, _recipient: string) => ({
    success: true,
    message: "Test email delivered successfully.",
  }),
);
const fnDeleteMailConnection = mock(async (_eventId: string) => ({
  custom: false,
}));
const fnGetMailConnection = mock(async (_eventId: string) => ({
  custom: false,
  defaultProvider: "brevo",
}));

mock.module("@/api/commerce", () => ({
  saveMailConnection: fnSaveMailConnection,
  testMailConnection: fnTestMailConnection,
  deleteMailConnection: fnDeleteMailConnection,
  getMailConnection: fnGetMailConnection,
}));

// Mock sonner toast
const fnToastSuccess = mock(() => {});
const fnToastError = mock(() => {});
mock.module("sonner", () => ({
  toast: {
    success: fnToastSuccess,
    error: fnToastError,
  },
}));

describe("MailConnectionModal Component", () => {
  beforeEach(() => {
    fnSaveMailConnection.mockClear();
    fnTestMailConnection.mockClear();
    fnDeleteMailConnection.mockClear();
    fnGetMailConnection.mockClear();
    fnToastSuccess.mockClear();
    fnToastError.mockClear();
  });

  test("1. Does not render when isOpen is false", () => {
    const { container } = render(
      <MailConnectionModal
        isOpen={false}
        onClose={() => {}}
        eventId="evt-123"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  test("2. Renders all 7 SMTP fields and buttons when isOpen is true", () => {
    render(
      <MailConnectionModal
        isOpen={true}
        onClose={() => {}}
        eventId="evt-123"
        isCustom={false}
      />,
    );

    // Modal title
    expect(screen.getByText("Custom SMTP Connection")).toBeDefined();

    // 1) Host
    expect(screen.getByLabelText("SMTP Host")).toBeDefined();
    // 2) Port
    expect(screen.getByLabelText("SMTP Port")).toBeDefined();
    // 3) Username
    expect(screen.getByLabelText("Username")).toBeDefined();
    // 4) Password
    expect(screen.getByLabelText("Password / API Key")).toBeDefined();
    // 5) From Name
    expect(screen.getByLabelText("From Name")).toBeDefined();
    // 6) From Email
    expect(screen.getByLabelText("From Email")).toBeDefined();
    // 7) TLS/SSL Switch
    expect(screen.getByLabelText("Use TLS / SSL Encryption")).toBeDefined();

    // Footer buttons
    expect(screen.getByText("Send Test Email")).toBeDefined();
    expect(screen.getByText("Save SMTP Details")).toBeDefined();
    // Remove button should not be present when isCustom is false
    expect(screen.queryByText("Remove Custom SMTP")).toBeNull();
  });

  test("3. Validates required fields before calling saveMailConnection", async () => {
    render(
      <MailConnectionModal
        isOpen={true}
        onClose={() => {}}
        eventId="evt-123"
      />,
    );

    const saveBtn = screen.getByText("Save SMTP Details");
    fireEvent.click(saveBtn);

    expect(fnSaveMailConnection).not.toHaveBeenCalled();
    expect(fnToastError).toHaveBeenCalledWith("SMTP Host is required.");
  });

  test("4. Saves valid SMTP details, invokes callback, and closes modal", async () => {
    const onClose = mock(() => {});
    const onStatusChange = mock(() => {});

    render(
      <MailConnectionModal
        isOpen={true}
        onClose={onClose}
        eventId="evt-123"
        onStatusChange={onStatusChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("SMTP Host"), {
      target: { value: "smtp.example.com" },
    });
    fireEvent.change(screen.getByLabelText("SMTP Port"), {
      target: { value: "587" },
    });
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "apikey" },
    });
    fireEvent.change(screen.getByLabelText("Password / API Key"), {
      target: { value: "supersecret123" },
    });
    fireEvent.change(screen.getByLabelText("From Name"), {
      target: { value: "Tiket Events" },
    });
    fireEvent.change(screen.getByLabelText("From Email"), {
      target: { value: "noreply@example.com" },
    });

    const saveBtn = screen.getByText("Save SMTP Details");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(fnSaveMailConnection).toHaveBeenCalledTimes(1);
    });

    expect(fnSaveMailConnection).toHaveBeenCalledWith("evt-123", {
      host: "smtp.example.com",
      port: 587,
      secure: false,
      username: "apikey",
      password: "supersecret123",
      fromEmail: "noreply@example.com",
      fromName: "Tiket Events",
    });

    expect(onStatusChange).toHaveBeenCalledWith(true);
    expect(onClose).toHaveBeenCalled();
  });

  test("5. Sends a test email to the recipient", async () => {
    render(
      <MailConnectionModal
        isOpen={true}
        onClose={() => {}}
        eventId="evt-123"
      />,
    );

    fireEvent.change(screen.getByLabelText("From Email"), {
      target: { value: "sender@example.com" },
    });
    fireEvent.change(
      screen.getByLabelText("Test Recipient Email (Optional)"),
      {
        target: { value: "tester@example.com" },
      },
    );

    const testBtn = screen.getByText("Send Test Email");
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(fnTestMailConnection).toHaveBeenCalledTimes(1);
    });

    expect(fnTestMailConnection).toHaveBeenCalledWith(
      "evt-123",
      "tester@example.com",
    );
    expect(fnToastSuccess).toHaveBeenCalledWith(
      "Test email sent successfully to tester@example.com!",
    );
  });

  test("6. Removes custom SMTP when configured", async () => {
    const onClose = mock(() => {});
    const onStatusChange = mock(() => {});

    render(
      <MailConnectionModal
        isOpen={true}
        onClose={onClose}
        eventId="evt-123"
        isCustom={true}
        onStatusChange={onStatusChange}
      />,
    );

    const removeBtn = screen.getByText("Remove Custom SMTP");
    expect(removeBtn).toBeDefined();

    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(fnDeleteMailConnection).toHaveBeenCalledTimes(1);
    });

    expect(fnDeleteMailConnection).toHaveBeenCalledWith("evt-123");
    expect(onStatusChange).toHaveBeenCalledWith(false);
    expect(onClose).toHaveBeenCalled();
  });
});
