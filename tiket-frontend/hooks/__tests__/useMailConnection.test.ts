import { describe, expect, test, mock, beforeEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

try {
  GlobalRegistrator.register();
} catch {
  // Already registered
}

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

import { renderHook, act } from "@testing-library/react";
import { useMailConnection } from "../useMailConnection";
import { useEmailStore } from "@/store/useEmailStore";
import type { SmtpMailPayload } from "@/types/commerce";

// Mock @/api/emails
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
  custom: true,
  defaultProvider: "smtp",
}));

mock.module("@/api/emails", () => ({
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

describe("useMailConnection Hook", () => {
  beforeEach(() => {
    fnSaveMailConnection.mockClear();
    fnTestMailConnection.mockClear();
    fnDeleteMailConnection.mockClear();
    fnGetMailConnection.mockClear();
    fnToastSuccess.mockClear();
    fnToastError.mockClear();
    useEmailStore.getState().resetStore();
  });

  test("1. Initializes with initial config values", () => {
    const { result } = renderHook(() =>
      useMailConnection({
        eventId: "evt-123",
        initialConfig: {
          host: "smtp.mailgun.org",
          port: 465,
          secure: true,
          username: "user@mailgun.org",
          fromEmail: "sender@example.com",
          fromName: "Tiket Team",
          hasPassword: true,
        },
        onClose: () => {},
      }),
    );

    expect(result.current.host).toBe("smtp.mailgun.org");
    expect(result.current.port).toBe("465");
    expect(result.current.secure).toBe(true);
    expect(result.current.username).toBe("user@mailgun.org");
    expect(result.current.fromEmail).toBe("sender@example.com");
    expect(result.current.fromName).toBe("Tiket Team");
    expect(result.current.password).toBe("");
  });

  test("2. Validates fields on save and warns when empty", async () => {
    const { result } = renderHook(() =>
      useMailConnection({
        eventId: "evt-123",
        onClose: () => {},
      }),
    );

    await act(async () => {
      await result.current.handleSave();
    });

    expect(fnSaveMailConnection).not.toHaveBeenCalled();
    expect(fnToastError).toHaveBeenCalledWith("SMTP Host is required.");
  });

  test("3. Saves successfully and updates email store", async () => {
    const onClose = mock(() => {});
    const onStatusChange = mock(() => {});

    const { result } = renderHook(() =>
      useMailConnection({
        eventId: "evt-123",
        onStatusChange,
        onClose,
      }),
    );

    act(() => {
      result.current.setHost("smtp.postmarkapp.com");
      result.current.setPort("587");
      result.current.setUsername("apikey123");
      result.current.setPassword("secretpass");
      result.current.setFromName("Tiket Organizer");
      result.current.setFromEmail("organizer@example.com");
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(fnSaveMailConnection).toHaveBeenCalledTimes(1);
    expect(fnSaveMailConnection).toHaveBeenCalledWith("evt-123", {
      host: "smtp.postmarkapp.com",
      port: 587,
      secure: false,
      username: "apikey123",
      password: "secretpass",
      fromEmail: "organizer@example.com",
      fromName: "Tiket Organizer",
    });

    expect(onStatusChange).toHaveBeenCalledWith(true);
    expect(onClose).toHaveBeenCalled();
    expect(useEmailStore.getState().smtpStatus).toBeDefined();
  });

  test("4. Sends test email successfully", async () => {
    const { result } = renderHook(() =>
      useMailConnection({
        eventId: "evt-123",
        onClose: () => {},
      }),
    );

    act(() => {
      result.current.setFromEmail("mailer@example.com");
      result.current.setTestRecipient("tester@example.com");
    });

    await act(async () => {
      await result.current.handleSendTest();
    });

    expect(fnTestMailConnection).toHaveBeenCalledWith(
      "evt-123",
      "tester@example.com",
    );
    expect(fnToastSuccess).toHaveBeenCalledWith(
      "Test email sent successfully to tester@example.com!",
    );
  });

  test("5. Removes custom SMTP and resets store status", async () => {
    const onClose = mock(() => {});
    const onStatusChange = mock(() => {});

    const { result } = renderHook(() =>
      useMailConnection({
        eventId: "evt-123",
        onStatusChange,
        onClose,
      }),
    );

    await act(async () => {
      await result.current.handleRemove();
    });

    expect(fnDeleteMailConnection).toHaveBeenCalledWith("evt-123");
    expect(onStatusChange).toHaveBeenCalledWith(false);
    expect(onClose).toHaveBeenCalled();
    expect(useEmailStore.getState().smtpStatus).toEqual({
      custom: false,
      defaultProvider: "smtp",
    });
  });

  test("6. Closes on Escape key press", () => {
    const onClose = mock(() => {});

    renderHook(() =>
      useMailConnection({
        eventId: "evt-123",
        onClose,
      }),
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(onClose).toHaveBeenCalled();
  });
});
