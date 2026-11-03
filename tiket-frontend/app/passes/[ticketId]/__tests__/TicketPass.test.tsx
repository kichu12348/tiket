import { describe, expect, test, mock, beforeEach } from "bun:test";
import React from "react";
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

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { TicketPassData } from "@/types/ticket";
import { formatLocation } from "../utils/formatLocation";
import { PassQRCode } from "../components/PassQRCode";
import { PassDetails } from "../components/PassDetails";
import { PassActions } from "../components/PassActions";
import { PassError } from "../components/PassError";
import TicketPassPage from "../page";

// Mock next/navigation
let mockParams = { ticketId: "ticket-active-1" };
mock.module("next/navigation", () => ({
  useParams: () => mockParams,
  useRouter: () => ({
    push: mock(),
    replace: mock(),
  }),
}));

// Mock framer-motion to simplify DOM testing
mock.module("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      ...props
    }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock api/tickets
const mockGetTicketPass = mock();
const mockInitiateTicketTransfer = mock();

mock.module("@/api/tickets", () => ({
  getTicketPass: mockGetTicketPass,
  initiateTicketTransfer: mockInitiateTicketTransfer,
  transferTicket: mockInitiateTicketTransfer,
  acceptTicketTransfer: mock(),
  acceptTransfer: mock(),
}));

const mockActiveTicket: TicketPassData = {
  id: "ticket-active-1",
  qrCode: "TIKET_ENTRY_QR_ABC123",
  status: "active",
  createdAt: "2026-11-01T10:00:00Z",
  event: {
    id: "event-1",
    title: "Global Tech Summit 2026",
    slug: "global-tech-summit-2026",
    startDate: "2026-12-15T09:30:00Z",
    endDate: "2026-12-15T18:00:00Z",
    locationType: "offline",
    locationDetails: {
      name: "Grand Ballroom",
      address: "100 Innovation Way, Suite 400",
      city: "San Francisco",
      state: "CA",
      country: "USA",
    },
    timezone: "America/Los_Angeles",
    coverImage: null,
  },
  ticketType: {
    id: "tt-vip-1",
    name: "VIP All-Access",
    price: "15000",
    description: "Includes keynote and workshop access",
    isTransferable: true,
    isRefundable: true,
  },
  attendee: {
    id: "user-1",
    name: "Alex Morgan",
    email: "alex.morgan@example.com",
  },
  order: {
    id: "order-1",
    totalAmount: "15000",
    paymentStatus: "paid",
    createdAt: "2026-11-01T10:00:00Z",
  },
  responses: [
    { label: "Company", value: "Antigravity Labs" },
    { label: "T-Shirt Size", value: "Large" },
  ],
};

const mockPendingApprovalTicket: TicketPassData = {
  ...mockActiveTicket,
  id: "ticket-pending-1",
  status: "pending_approval",
  qrCode: "TIKET_ENTRY_QR_PENDING",
  ticketType: {
    ...mockActiveTicket.ticketType,
    isTransferable: true,
  },
};

describe("formatLocation utility", () => {
  test("formats online events correctly", () => {
    expect(formatLocation("online")).toBe("Online Event");
  });

  test("formats offline events with place name, city, and state", () => {
    const loc = {
      name: "Grand Palace",
      city: "Bengaluru",
      state: "Karnataka",
    };
    expect(formatLocation("offline", loc)).toBe("Grand Palace, Bengaluru, Karnataka");
  });

  test("formats hybrid events by appending (Hybrid)", () => {
    const loc = {
      name: "Convention Center",
      city: "Austin",
      state: "TX",
    };
    expect(formatLocation("hybrid", loc)).toBe("Convention Center, Austin, TX (Hybrid)");
  });

  test("falls back to Venue TBA when details are empty", () => {
    expect(formatLocation("offline", null)).toBe("Venue TBA");
  });
});

describe("PassQRCode component", () => {
  test("renders scannable QR container and instructions for active ticket", () => {
    render(
      <PassQRCode
        ticketId="ticket-active-1"
        qrCode="TIKET_ENTRY_QR_ABC123"
        status="active"
      />,
    );

    expect(screen.getByTestId("qr-container")).toBeInTheDocument();
    expect(screen.getByText("Present this code at venue entrance")).toBeInTheDocument();
    expect(screen.queryByTestId("status-badge-container")).toBeNull();
  });

  test("hides QR code and displays prominent status badge for pending_approval ticket", () => {
    render(
      <PassQRCode
        ticketId="ticket-pending-1"
        qrCode="TIKET_ENTRY_QR_PENDING"
        status="pending_approval"
      />,
    );

    // QR container must NOT be rendered so it cannot be mistaken for active pass
    expect(screen.queryByTestId("qr-container")).toBeNull();
    const statusBadge = screen.getByTestId("ticket-status-badge");
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge.textContent).toContain("PENDING APPROVAL");
    expect(
      screen.getByText(/Registration awaiting organizer approval/i),
    ).toBeInTheDocument();
  });

  test("hides QR code and displays status badge for cancelled and refunded passes", () => {
    const { unmount } = render(
      <PassQRCode ticketId="t-cancelled" qrCode="QR" status="cancelled" />,
    );
    expect(screen.queryByTestId("qr-container")).toBeNull();
    expect(screen.getByText("CANCELLED")).toBeInTheDocument();
    unmount();

    render(<PassQRCode ticketId="t-refunded" qrCode="QR" status="refunded" />);
    expect(screen.queryByTestId("qr-container")).toBeNull();
    expect(screen.getByText("REFUNDED")).toBeInTheDocument();
  });
});

describe("PassDetails component", () => {
  test("renders attendee name, email, event location, and custom form responses", () => {
    render(
      <PassDetails
        attendee={mockActiveTicket.attendee}
        event={mockActiveTicket.event}
        responses={mockActiveTicket.responses}
      />,
    );

    expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    expect(screen.getByText("alex.morgan@example.com")).toBeInTheDocument();
    expect(
      screen.getByText("Grand Ballroom, San Francisco, CA"),
    ).toBeInTheDocument();

    expect(screen.getByTestId("pass-custom-responses")).toBeInTheDocument();
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("Antigravity Labs")).toBeInTheDocument();
    expect(screen.getByText("T-Shirt Size")).toBeInTheDocument();
    expect(screen.getByText("Large")).toBeInTheDocument();
  });
});

describe("PassActions & Ticket Transfer", () => {
  beforeEach(() => {
    mockInitiateTicketTransfer.mockReset();
  });

  test("renders download pass button and triggers download action", () => {
    const handleDownload = mock();
    render(
      <PassActions
        handleDownload={handleDownload}
        ticketId="ticket-1"
        isTransferable={false}
        status="active"
      />,
    );

    const downloadBtn = screen.getByTestId("download-pass-btn");
    expect(downloadBtn).toBeInTheDocument();
    fireEvent.click(downloadBtn);
    expect(handleDownload).toHaveBeenCalledTimes(1);

    // Transfer button must not exist when isTransferable is false
    expect(screen.queryByTestId("transfer-ticket-btn")).toBeNull();
  });

  test("does not render transfer button when ticket is pending_approval even if isTransferable is true", () => {
    render(
      <PassActions
        handleDownload={mock()}
        ticketId="ticket-pending-1"
        isTransferable={true}
        status="pending_approval"
      />,
    );

    expect(screen.queryByTestId("transfer-ticket-btn")).toBeNull();
  });

  test("renders transfer button for active transferable pass and submits transfer cleanly", async () => {
    mockInitiateTicketTransfer.mockResolvedValueOnce({
      id: "transfer-123",
      ticketId: "ticket-active-1",
      fromUserId: "user-1",
      toUserId: "user-2",
      status: "pending",
      createdAt: "2026-11-04T00:00:00Z",
    });

    const onTransferSuccess = mock();

    render(
      <PassActions
        handleDownload={mock()}
        ticketId="ticket-active-1"
        isTransferable={true}
        status="active"
        onTransferSuccess={onTransferSuccess}
      />,
    );

    const transferBtn = screen.getByTestId("transfer-ticket-btn");
    expect(transferBtn).toBeInTheDocument();

    // Open transfer modal
    fireEvent.click(transferBtn);
    expect(screen.getByTestId("transfer-modal")).toBeInTheDocument();

    const emailInput = screen.getByTestId("transfer-email-input");
    const form = screen.getByTestId("transfer-form");

    // Invalid email triggers validation error
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.submit(form);
    expect(screen.getByTestId("transfer-error")).toBeInTheDocument();
    expect(mockInitiateTicketTransfer).not.toHaveBeenCalled();

    // Enter valid email and submit
    fireEvent.change(emailInput, { target: { value: "recipient@example.com" } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockInitiateTicketTransfer).toHaveBeenCalledWith(
        "ticket-active-1",
        { targetEmail: "recipient@example.com" },
      );
    });

    await waitFor(() => {
      expect(onTransferSuccess).toHaveBeenCalledWith("recipient@example.com");
      expect(screen.getByTestId("transfer-success-message")).toBeInTheDocument();
    });
  });
});

describe("PassError component", () => {
  test("renders 401 unauthenticated error with sign-in link", () => {
    render(
      <PassError
        statusCode={401}
        message="Please sign in to view this ticket pass."
      />,
    );

    expect(screen.getByText("Authentication Required")).toBeInTheDocument();
    expect(screen.getByText("Sign In to Tiket")).toBeInTheDocument();
  });

  test("renders 403 access restricted error cleanly", () => {
    render(
      <PassError
        statusCode={403}
        message="You do not have permission to view this ticket pass."
      />,
    );

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(
      screen.getByText("You do not have permission to view this ticket pass."),
    ).toBeInTheDocument();
  });

  test("renders 404 ticket not found error cleanly", () => {
    render(<PassError statusCode={404} message="Ticket pass not found." />);

    expect(screen.getByText("Ticket Not Found")).toBeInTheDocument();
    expect(screen.getByText("Ticket pass not found.")).toBeInTheDocument();
  });
});

describe("TicketPassPage Integration", () => {
  beforeEach(() => {
    mockGetTicketPass.mockReset();
  });

  test("renders active ticket pass with QR code, attendee details, location, and responses", async () => {
    mockParams = { ticketId: "ticket-active-1" };
    mockGetTicketPass.mockResolvedValueOnce(mockActiveTicket);

    render(<TicketPassPage />);

    // Should fetch and render event details
    await waitFor(() => {
      expect(screen.getByText("Global Tech Summit 2026")).toBeInTheDocument();
      expect(screen.getByText("VIP All-Access")).toBeInTheDocument();
      expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
      expect(screen.getByText("alex.morgan@example.com")).toBeInTheDocument();
      expect(
        screen.getByText("Grand Ballroom, San Francisco, CA"),
      ).toBeInTheDocument();
      expect(screen.getByText("Antigravity Labs")).toBeInTheDocument();
    });

    // QR container should be present for active ticket
    expect(screen.getByTestId("qr-container")).toBeInTheDocument();

    // Both download and transfer buttons should be available
    expect(screen.getByTestId("download-pass-btn")).toBeInTheDocument();
    expect(screen.getByTestId("transfer-ticket-btn")).toBeInTheDocument();
  });

  test("renders pending_approval ticket pass without entry QR code", async () => {
    mockParams = { ticketId: "ticket-pending-1" };
    mockGetTicketPass.mockResolvedValueOnce(mockPendingApprovalTicket);

    render(<TicketPassPage />);

    await waitFor(() => {
      expect(screen.getByText("Global Tech Summit 2026")).toBeInTheDocument();
      expect(screen.getByTestId("ticket-status-badge")).toBeInTheDocument();
      expect(screen.getByText("PENDING APPROVAL")).toBeInTheDocument();
    });

    // Scannable QR code must be hidden
    expect(screen.queryByTestId("qr-container")).toBeNull();

    // Transfer button must not be shown for pending pass
    expect(screen.queryByTestId("transfer-ticket-btn")).toBeNull();
  });
});
