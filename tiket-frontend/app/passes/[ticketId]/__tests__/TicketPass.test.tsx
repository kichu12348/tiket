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
import {
  CustomTicketCanvas,
  resolveTicketLayer,
  getElementText,
} from "../components/CustomTicketCanvas";
import type { TicketCanvasElement } from "@/app/edit/[eventId]/tickets/components/TicketDesignStudio/types";
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

const mockCustomTemplate = {
  id: "template-figma-1",
  name: "Figma VIP Gold Badge",
  backgroundImageUrl: "https://cdn.example.com/tickets/figma-badge-bg.png",
  elementsJson: {
    canvasWidth: 600,
    canvasHeight: 300,
    elements: [
      {
        id: "el-attendee-name",
        type: "variable" as const,
        x: 48,
        y: 110,
        width: 240,
        height: 36,
        rotation: 12,
        variableKey: "attendee.name",
        content: "{{attendee.name}}",
        style: {
          fontSize: 22,
          fontWeight: 700,
          color: "#ffffff",
          autoFitText: true,
        },
      },
      {
        id: "el-ticket-type",
        type: "text" as const,
        x: 48,
        y: 160,
        width: 180,
        height: 28,
        rotation: 0,
        variableKey: "ticket.type",
        content: "TIER: {{ticket.type}}",
        style: {
          fontSize: 16,
          fontWeight: 600,
          color: "#28a745",
        },
      },
      {
        id: "el-qr-code",
        type: "qr" as const,
        x: 420,
        y: 80,
        width: 140,
        height: 140,
        rotation: 45,
        style: {
          qrFgColor: "#000000",
          qrBgColor: "#ffffff",
        },
      },
    ],
  },
};

const mockCustomActiveTicket: TicketPassData = {
  ...mockActiveTicket,
  id: "ticket-custom-active-1",
  template: mockCustomTemplate,
};

const mockCustomPendingTicket: TicketPassData = {
  ...mockPendingApprovalTicket,
  id: "ticket-custom-pending-1",
  template: mockCustomTemplate,
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

  test("renders custom ticket canvas when pass.template is present on the ticket payload", async () => {
    mockParams = { ticketId: "ticket-custom-active-1" };
    mockGetTicketPass.mockResolvedValueOnce(mockCustomActiveTicket);

    render(<TicketPassPage />);

    await waitFor(() => {
      expect(
        screen.getByTestId("custom-ticket-artboard"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("custom-ticket-bg")).toHaveAttribute(
        "src",
        mockCustomTemplate.backgroundImageUrl,
      );
      expect(
        screen.getByTestId("custom-element-el-attendee-name"),
      ).toHaveTextContent("Alex Morgan");
      expect(screen.getByText("TIER: VIP All-Access")).toBeInTheDocument();
    });

    expect(screen.getByTestId("qr-container")).toBeInTheDocument();
    expect(screen.getByTestId("download-pass-btn")).toBeInTheDocument();
  });

  test("renders custom ticket canvas with locked QR badge when pending approval", async () => {
    mockParams = { ticketId: "ticket-custom-pending-1" };
    mockGetTicketPass.mockResolvedValueOnce(mockCustomPendingTicket);

    render(<TicketPassPage />);

    await waitFor(() => {
      expect(
        screen.getByTestId("custom-ticket-artboard"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("locked-qr-badge")).toBeInTheDocument();
      expect(screen.getByText("PENDING APPROVAL")).toBeInTheDocument();
    });

    // Scannable live QR code must be hidden
    expect(screen.queryByTestId("qr-container")).toBeNull();
    expect(screen.queryByText("TIKET_ENTRY_QR_PENDING")).toBeNull();
  });
});

describe("CustomTicketCanvas component", () => {
  test("renders background image, canonical artboard dimensions and container", () => {
    render(
      <CustomTicketCanvas
        pass={mockCustomActiveTicket}
        template={mockCustomTemplate}
      />,
    );

    const bg = screen.getByTestId("custom-ticket-bg");
    expect(bg).toBeInTheDocument();
    expect(bg).toHaveAttribute(
      "src",
      "https://cdn.example.com/tickets/figma-badge-bg.png",
    );

    const artboard = screen.getByTestId("custom-ticket-artboard");
    expect(artboard).toBeInTheDocument();
    expect(artboard.style.width).toBe("600px");
    expect(artboard.style.height).toBe("300px");
  });

  test("interpolates {{attendee.name}} and {{ticket.type}} at exact canonical x, y, rotation coordinates", () => {
    render(
      <CustomTicketCanvas
        pass={mockCustomActiveTicket}
        template={mockCustomTemplate}
      />,
    );

    const nameEl = screen.getByTestId("custom-element-el-attendee-name");
    expect(nameEl).toBeInTheDocument();
    expect(nameEl).toHaveTextContent("Alex Morgan");
    expect(nameEl.style.left).toBe("48px");
    expect(nameEl.style.top).toBe("110px");
    expect(nameEl.style.width).toBe("240px");
    expect(nameEl.style.height).toBe("36px");
    expect(nameEl.style.transform).toBe("rotate(12deg)");

    const typeEl = screen.getByTestId("custom-element-el-ticket-type");
    expect(typeEl).toBeInTheDocument();
    expect(typeEl).toHaveTextContent("TIER: VIP All-Access");
    expect(typeEl.style.left).toBe("48px");
    expect(typeEl.style.top).toBe("160px");
    expect(typeEl.style.width).toBe("180px");
    expect(typeEl.style.height).toBe("28px");
    expect(typeEl.style.transform).toBe("rotate(0deg)");
  });

  test("renders live scannable QR code at exact canonical coordinates and rotation when status is active", () => {
    render(
      <CustomTicketCanvas
        pass={mockCustomActiveTicket}
        template={mockCustomTemplate}
      />,
    );

    const qrContainer = screen.getByTestId("qr-container");
    expect(qrContainer).toBeInTheDocument();
    expect(qrContainer.style.left).toBe("420px");
    expect(qrContainer.style.top).toBe("80px");
    expect(qrContainer.style.width).toBe("140px");
    expect(qrContainer.style.height).toBe("140px");
    expect(qrContainer.style.transform).toBe("rotate(45deg)");

    expect(screen.queryByTestId("locked-qr-badge")).toBeNull();
  });

  test("hides live QR code and renders locked placeholder badge when status is pending_approval", () => {
    render(
      <CustomTicketCanvas
        pass={mockCustomPendingTicket}
        template={mockCustomTemplate}
      />,
    );

    // Live QR container must NOT exist
    expect(screen.queryByTestId("qr-container")).toBeNull();

    // Locked badge must exist
    const lockedBadge = screen.getByTestId("locked-qr-badge");
    expect(lockedBadge).toBeInTheDocument();
    expect(lockedBadge).toHaveTextContent("PENDING APPROVAL");
    expect(lockedBadge.style.left).toBe("420px");
    expect(lockedBadge.style.top).toBe("80px");
    expect(lockedBadge.style.width).toBe("140px");
    expect(lockedBadge.style.height).toBe("140px");
    expect(lockedBadge.style.transform).toBe("rotate(45deg)");

    // Raw QR text must not be exposed
    expect(screen.queryByText("TIKET_ENTRY_QR_PENDING")).toBeNull();
  });
});

describe("resolveTicketLayer condition evaluator & form field bindings", () => {
  const vipPass: TicketPassData = {
    ...mockActiveTicket,
    ticketType: {
      id: "tt-early-bird",
      name: "Early Bird VIP",
      price: "12000",
      isTransferable: true,
      isRefundable: true,
    },
    responses: [
      { label: "Food", value: "Veg" },
      { label: "Track", value: "AI & Systems" },
    ],
  };

  const regularPass: TicketPassData = {
    ...mockActiveTicket,
    ticketType: {
      id: "tt-regular",
      name: "General Admission",
      price: "5000",
      isTransferable: true,
      isRefundable: false,
    },
    responses: [
      { label: "Food", value: "Non-Veg" },
      { label: "Track", value: "Product Design" },
    ],
  };

  test("IF ticketType == 'Early Bird VIP' THEN show 'EARLY BIRD VIP' in Gold ELSE show 'REGULAR'", () => {
    const layerElement: TicketCanvasElement = {
      id: "el-tier-banner",
      type: "variable",
      label: "Tier Banner",
      variableKey: "{{ticket.type}}",
      x: 20,
      y: 20,
      width: 200,
      height: 40,
      rotation: 0,
      zIndex: 1,
      style: {
        color: "#ffffff",
      },
      conditionalRules: [
        {
          id: "r1",
          sourceType: "ticketType",
          sourceKey: "ticketType.name",
          operator: "equals",
          value: "Early Bird VIP",
          thenEffect: {
            visible: true,
            textOverride: "EARLY BIRD VIP",
            colorOverride: "#FFD700", // Gold
          },
        },
      ],
      elseBehavior: {
        visible: true,
        textOverride: "REGULAR",
        colorOverride: "#CCCCCC",
      },
    };

    // When pass is Early Bird VIP
    const vipResult = resolveTicketLayer(layerElement, vipPass);
    expect(vipResult.visible).toBe(true);
    expect(vipResult.text).toBe("EARLY BIRD VIP");
    expect(vipResult.color).toBe("#FFD700");

    // When pass is General Admission (fallback to ELSE)
    const regularResult = resolveTicketLayer(layerElement, regularPass);
    expect(regularResult.visible).toBe(true);
    expect(regularResult.text).toBe("REGULAR");
    expect(regularResult.color).toBe("#CCCCCC");
  });

  test("IF form.Food == 'Veg' THEN show green badge ELSE hide", () => {
    const vegBadgeElement: TicketCanvasElement = {
      id: "el-veg-badge",
      type: "badge",
      label: "Dietary Badge",
      customText: "VEG GUEST",
      x: 100,
      y: 100,
      width: 120,
      height: 32,
      rotation: 0,
      zIndex: 2,
      style: {
        color: "#ffffff",
        backgroundColor: "#28a745",
      },
      conditionalRules: [
        {
          id: "r-veg",
          sourceType: "formField",
          sourceKey: "Food",
          operator: "equals",
          value: "Veg",
          thenEffect: {
            visible: true,
            bgColorOverride: "#28a745", // Green
            colorOverride: "#ffffff",
          },
        },
      ],
      elseBehavior: {
        visible: false,
      },
    };

    // When Food == Veg -> Show green badge
    const vegResult = resolveTicketLayer(vegBadgeElement, vipPass);
    expect(vegResult.visible).toBe(true);
    expect(vegResult.bgColor).toBe("#28a745");

    // When Food == Non-Veg -> Hide
    const nonVegResult = resolveTicketLayer(vegBadgeElement, regularPass);
    expect(nonVegResult.visible).toBe(false);
  });

  test("evaluates 'contains' and 'not_equals' operators accurately", () => {
    const trackElement: TicketCanvasElement = {
      id: "el-track-cond",
      type: "text",
      label: "Track Notice",
      customText: "Standard Track",
      x: 10,
      y: 10,
      width: 150,
      height: 30,
      rotation: 0,
      zIndex: 1,
      style: {},
      conditionalRules: [
        {
          id: "r-contains",
          sourceType: "formField",
          sourceKey: "Track",
          operator: "contains",
          value: "Systems",
          thenEffect: {
            visible: true,
            textOverride: "SYSTEMS ENGINEER PASS",
          },
        },
      ],
    };

    const result = resolveTicketLayer(trackElement, vipPass);
    expect(result.visible).toBe(true);
    expect(result.text).toBe("SYSTEMS ENGINEER PASS");

    const notEqualsElement: TicketCanvasElement = {
      ...trackElement,
      conditionalRules: [
        {
          id: "r-not-equals",
          sourceType: "formField",
          sourceKey: "Track",
          operator: "not_equals",
          value: "Product Design",
          thenEffect: {
            visible: true,
            textOverride: "NON-DESIGN TRACK",
          },
        },
      ],
    };

    expect(resolveTicketLayer(notEqualsElement, vipPass).text).toBe(
      "NON-DESIGN TRACK",
    );
    expect(resolveTicketLayer(notEqualsElement, regularPass).text).toBe(
      "Standard Track",
    );
  });

  test("resolves form_field element with fallbackText when response is empty", () => {
    const blankResponsePass: TicketPassData = {
      ...mockActiveTicket,
      responses: [],
    };

    const formFieldElement: TicketCanvasElement = {
      id: "el-dietary-field",
      type: "form_field",
      label: "Dietary Preference",
      fieldLabel: "Dietary Preference",
      fallbackText: "No dietary restrictions",
      x: 50,
      y: 50,
      width: 250,
      height: 35,
      rotation: 0,
      zIndex: 1,
      style: {},
    };

    expect(getElementText(formFieldElement, blankResponsePass)).toBe(
      "No dietary restrictions",
    );

    const answeredPass: TicketPassData = {
      ...mockActiveTicket,
      responses: [{ label: "Dietary Preference", value: "Gluten-Free" }],
    };

    expect(getElementText(formFieldElement, answeredPass)).toBe("Gluten-Free");
  });

  test("CustomTicketCanvas suppresses elements that resolve to visible: false", () => {
    const templateWithConditionalLayer = {
      id: "tpl-cond-1",
      name: "Conditional Template",
      backgroundImageUrl: "https://cdn.example.com/bg.png",
      elementsJson: {
        canvasWidth: 600,
        canvasHeight: 300,
        elements: [
          {
            id: "vip-exclusive-badge",
            type: "badge" as const,
            label: "VIP Badge",
            customText: "VIP ACCESS ONLY",
            x: 50,
            y: 50,
            width: 160,
            height: 36,
            rotation: 0,
            zIndex: 1,
            style: { color: "#FFD700" },
            conditionalRules: [
              {
                id: "r1",
                sourceType: "ticketType" as const,
                sourceKey: "ticketType.name",
                operator: "contains" as const,
                value: "VIP",
                thenEffect: { visible: true },
              },
            ],
            elseBehavior: { visible: false },
          },
        ],
      },
    };

    // Render with VIP pass -> Element should be present
    const { unmount } = render(
      <CustomTicketCanvas
        pass={vipPass}
        template={templateWithConditionalLayer}
      />,
    );
    expect(screen.getByTestId("custom-element-vip-exclusive-badge")).toBeInTheDocument();
    expect(screen.getByText("VIP ACCESS ONLY")).toBeInTheDocument();
    unmount();

    // Render with Regular pass -> Element should NOT be rendered
    render(
      <CustomTicketCanvas
        pass={regularPass}
        template={templateWithConditionalLayer}
      />,
    );
    expect(screen.queryByTestId("custom-element-vip-exclusive-badge")).toBeNull();
    expect(screen.queryByText("VIP ACCESS ONLY")).toBeNull();
  });
});
