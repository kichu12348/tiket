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
import DoorScanner from "../index";
import ScanResultCard from "../ScanResultCard";
import type { ScanResultItem } from "../types";

// Mock API layer
const mockScanTicketCode = mock();
const mockToggleManualCheckIn = mock();

mock.module("@/api/operations", () => ({
  scanTicketCode: mockScanTicketCode,
  toggleManualCheckIn: mockToggleManualCheckIn,
}));

describe("DoorScanner Component", () => {
  const eventId = "evt-12345";
  const onScanChange = mock();

  beforeEach(() => {
    mockScanTicketCode.mockClear();
    mockToggleManualCheckIn.mockClear();
    onScanChange.mockClear();
  });

  test("1. Renders title, scanner badge, mode selector, and manual input", () => {
    render(<DoorScanner eventId={eventId} onScanChange={onScanChange} />);

    expect(screen.getByText("Door Check-in")).toBeInTheDocument();
    expect(screen.getByText("Scanner Active")).toBeInTheDocument();
    expect(screen.getByText("Manual Code Entry")).toBeInTheDocument();
    expect(screen.getByText("Camera QR Scanner")).toBeInTheDocument();

    const input = screen.getByPlaceholderText("Scan pass or paste ticket QR code...");
    expect(input).toBeInTheDocument();
  });

  test("2. Submits manual code, calls scanTicketCode, and displays ScanResultCard success state", async () => {
    mockScanTicketCode.mockResolvedValueOnce({
      status: "used",
      message: "Attendee checked in successfully.",
      checkInDate: "2026-11-14",
      todayCheckInCount: 3,
      totalCheckIns: 5,
      checkedInAt: "2026-11-14T10:00:00.000Z",
      ticket: {
        id: "tkt-999",
        ticketName: "VIP Pass",
        user: {
          name: "Jane Doe",
          email: "jane@example.com",
        },
      },
    });

    render(<DoorScanner eventId={eventId} onScanChange={onScanChange} />);

    const input = screen.getByPlaceholderText("Scan pass or paste ticket QR code...");
    fireEvent.change(input, { target: { value: "EXO-482910" } });

    const checkInBtn = screen.getByRole("button", { name: "Check In" });
    fireEvent.click(checkInBtn);

    await waitFor(() => {
      expect(mockScanTicketCode).toHaveBeenCalledWith(eventId, "EXO-482910");
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
      expect(screen.getByText("VIP Pass")).toBeInTheDocument();
      expect(screen.getAllByText("EXO-482910").length).toBeGreaterThan(0);
      expect(screen.getByText("#3 today · 5 total on 2026-11-14")).toBeInTheDocument();
      expect(screen.getByText("Undo Check-In")).toBeInTheDocument();
      expect(onScanChange).toHaveBeenCalledTimes(1);
    });

    // Also verify it appeared in Recent Session Scans
    expect(screen.getByText("Recent Session Scans")).toBeInTheDocument();
    expect(screen.getByText("1 scans")).toBeInTheDocument();
  });

  test("3. Handles 409 error state and displays exact backend message in Alert", async () => {
    mockScanTicketCode.mockRejectedValueOnce({
      response: {
        data: {
          error: "Ticket has already been checked in.",
        },
      },
    });

    render(<DoorScanner eventId={eventId} onScanChange={onScanChange} />);

    const input = screen.getByPlaceholderText("Scan pass or paste ticket QR code...");
    fireEvent.change(input, { target: { value: "EXO-ALREADY-USED" } });

    const checkInBtn = screen.getByRole("button", { name: "Check In" });
    fireEvent.click(checkInBtn);

    await waitFor(() => {
      expect(mockScanTicketCode).toHaveBeenCalledWith(eventId, "EXO-ALREADY-USED");
      expect(
        screen.getAllByText("Ticket has already been checked in.").length,
      ).toBeGreaterThan(0);
    });
  });

  test("4. Executes Undo Check-In calling toggleManualCheckIn with undo=true", async () => {
    mockScanTicketCode.mockResolvedValueOnce({
      status: "used",
      message: "Attendee checked in successfully.",
      checkInDate: "2026-11-14",
      todayCheckInCount: 1,
      totalCheckIns: 1,
      checkedInAt: "2026-11-14T10:00:00.000Z",
      ticket: {
        id: "tkt-undo-test",
        ticketName: "General Admission",
        user: { name: "Bob Smith", email: "bob@example.com" },
      },
    });

    mockToggleManualCheckIn.mockResolvedValueOnce({
      message: "Check-in undone.",
      status: "active",
      checkedInAt: null,
    });

    render(<DoorScanner eventId={eventId} onScanChange={onScanChange} />);

    const input = screen.getByPlaceholderText("Scan pass or paste ticket QR code...");
    fireEvent.change(input, { target: { value: "EXO-UNDO-101" } });
    fireEvent.click(screen.getByRole("button", { name: "Check In" }));

    await waitFor(() => {
      expect(screen.getByText("Undo Check-In")).toBeInTheDocument();
    });

    // Click Undo Check-In
    fireEvent.click(screen.getByText("Undo Check-In"));

    await waitFor(() => {
      expect(mockToggleManualCheckIn).toHaveBeenCalledWith(
        eventId,
        "tkt-undo-test",
        true,
      );
      expect(screen.getByText(/Check-in undone for pass/i)).toBeInTheDocument();
      expect(onScanChange).toHaveBeenCalledTimes(2); // 1 scan + 1 undo
    });
  });

  test("5. Switches to Camera QR Scanner mode and toggles camera start/pause", async () => {
    render(<DoorScanner eventId={eventId} onScanChange={onScanChange} />);

    // Click Camera QR Scanner tab
    fireEvent.click(screen.getByText("Camera QR Scanner"));

    expect(screen.getByText("Start Camera")).toBeInTheDocument();
    expect(screen.getByText(/Camera is in standby/i)).toBeInTheDocument();
  });

  test("6. Ignores duplicate scan code when triggered within 3 seconds", async () => {
    mockScanTicketCode.mockResolvedValue({
      status: "used",
      message: "Attendee checked in.",
      checkInDate: "2026-11-14",
      todayCheckInCount: 1,
      totalCheckIns: 1,
      checkedInAt: "2026-11-14T10:00:00.000Z",
      ticket: { id: "tkt-deb", ticketName: "General", user: { name: "Sam" } },
    });

    render(<DoorScanner eventId={eventId} onScanChange={onScanChange} />);

    // Switch to camera
    fireEvent.click(screen.getByText("Camera QR Scanner"));

    const input = screen.getByPlaceholderText("Scan pass or paste ticket QR code...");
    fireEvent.change(input, { target: { value: "EXO-DEBOUNCE" } });
    fireEvent.click(screen.getByRole("button", { name: "Check In" }));

    await waitFor(() => {
      expect(mockScanTicketCode).toHaveBeenCalledTimes(1);
    });

    // Try scanning the exact same code immediately
    fireEvent.change(input, { target: { value: "EXO-DEBOUNCE" } });
    fireEvent.click(screen.getByRole("button", { name: "Check In" }));

    // Still only 1 call
    expect(mockScanTicketCode).toHaveBeenCalledTimes(1);
  });
});

describe("ScanResultCard Component", () => {
  const eventId = "evt-12345";
  const onUndo = mock();

  beforeEach(() => {
    onUndo.mockClear();
  });

  test("1. Renders error alert for error status", () => {
    const errorResult: ScanResultItem = {
      id: "scan-err-1",
      code: "EXO-ERR-1",
      status: "error",
      message: "Ticket is not eligible for this admission change.",
      timestamp: "12:00:00",
    };

    render(<ScanResultCard eventId={eventId} result={errorResult} onUndo={onUndo} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Admission Notice")).toBeInTheDocument();
    expect(
      screen.getByText("Ticket is not eligible for this admission change."),
    ).toBeInTheDocument();
  });

  test("2. Renders success card with attendee, tier badge, code, counts, and triggers onUndo", async () => {
    const successResult: ScanResultItem = {
      id: "scan-succ-1",
      ticketId: "tkt-card-1",
      code: "EXO-CARD-1",
      status: "success",
      message: "Attendee checked in.",
      attendeeName: "Alice Wonderland",
      attendeeEmail: "alice@wonder.land",
      ticketTier: "VIP Early Access",
      todayCheckInCount: 2,
      totalCheckIns: 4,
      checkInDate: "2026-11-14",
      timestamp: "12:05:00",
    };

    render(<ScanResultCard eventId={eventId} result={successResult} onUndo={onUndo} />);

    expect(screen.getByText("Alice Wonderland")).toBeInTheDocument();
    expect(screen.getByText("alice@wonder.land")).toBeInTheDocument();
    expect(screen.getByText("VIP Early Access")).toBeInTheDocument();
    expect(screen.getByText("EXO-CARD-1")).toBeInTheDocument();
    expect(screen.getByText("#2 today · 4 total on 2026-11-14")).toBeInTheDocument();

    const undoBtn = screen.getByText("Undo Check-In");
    fireEvent.click(undoBtn);

    expect(onUndo).toHaveBeenCalledWith("tkt-card-1");
  });
});
