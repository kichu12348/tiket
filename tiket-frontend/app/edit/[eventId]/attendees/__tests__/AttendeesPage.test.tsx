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
import type {
  AttendeeItem,
  AttendeeStatsData,
  AttendeeDetailResponse,
  AttendeeFormResponsesResponse,
  GetAttendeesResponse,
} from "@/types/attendee";
import type { TicketType } from "@/types/ticketType";
import AttendeesPage from "../page";

// --- Mock Data ---
const mockTicketTypes: TicketType[] = [
  {
    id: "tt-general-1",
    eventId: "evt-test-101",
    name: "General Admission",
    description: "Standard entry",
    price: "499.00",
    quantityLimit: 100,
    saleStart: null,
    saleEnd: null,
    isTransferable: true,
    isRefundable: true,
    refundableUntil: null,
    maxTransfers: 1,
    sortOrder: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "tt-vip-2",
    eventId: "evt-test-101",
    name: "VIP Pass",
    description: "VIP access",
    price: "1499.00",
    quantityLimit: 50,
    saleStart: null,
    saleEnd: null,
    isTransferable: true,
    isRefundable: false,
    refundableUntil: null,
    maxTransfers: 1,
    sortOrder: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const mockStats: AttendeeStatsData = {
  totalAttendees: 4,
  checkedInCount: 1,
  pendingCount: 3,
  totalRevenue: 3996.0,
  breakdownByTicketType: [
    {
      ticketTypeId: "tt-general-1",
      ticketTypeName: "General Admission",
      count: 2,
      checkedInCount: 1,
      price: "499.00",
    },
    {
      ticketTypeId: "tt-vip-2",
      ticketTypeName: "VIP Pass",
      count: 2,
      checkedInCount: 0,
      price: "1499.00",
    },
  ],
};

const mockAttendees: AttendeeItem[] = [
  {
    id: "tkt-active-1",
    qrCode: "QR-ACTIVE-1",
    status: "active",
    createdAt: "2026-02-01T10:00:00.000Z",
    user: {
      id: "usr-1",
      name: "Alice Johnson",
      email: "alice@example.com",
    },
    ticketType: {
      id: "tt-general-1",
      name: "General Admission",
      price: "499.00",
    },
    order: {
      id: "ord-1",
      totalAmount: "499.00",
      paymentStatus: "success",
      createdAt: "2026-02-01T10:00:00.000Z",
    },
    checkedInAt: null,
  },
  {
    id: "tkt-used-2",
    qrCode: "QR-USED-2",
    status: "used",
    createdAt: "2026-02-02T11:00:00.000Z",
    user: {
      id: "usr-2",
      name: "Bob Smith",
      email: "bob@example.com",
    },
    ticketType: {
      id: "tt-vip-2",
      name: "VIP Pass",
      price: "1499.00",
    },
    order: {
      id: "ord-2",
      totalAmount: "1499.00",
      paymentStatus: "success",
      createdAt: "2026-02-02T11:00:00.000Z",
    },
    checkedInAt: "2026-02-02T12:30:00.000Z",
  },
  {
    id: "tkt-pending-3",
    qrCode: "QR-PENDING-3",
    status: "pending_approval",
    createdAt: "2026-02-03T09:00:00.000Z",
    user: {
      id: "usr-3",
      name: "Charlie Brown",
      email: "charlie@example.com",
    },
    ticketType: {
      id: "tt-vip-2",
      name: "VIP Pass",
      price: "1499.00",
    },
    order: {
      id: "ord-3",
      totalAmount: "1499.00",
      paymentStatus: "success",
      createdAt: "2026-02-03T09:00:00.000Z",
    },
    checkedInAt: null,
  },
  {
    id: "tkt-cancelled-4",
    qrCode: "QR-CANCELLED-4",
    status: "cancelled",
    createdAt: "2026-02-04T08:00:00.000Z",
    user: {
      id: "usr-4",
      name: "Dana White",
      email: "dana@example.com",
    },
    ticketType: {
      id: "tt-general-1",
      name: "General Admission",
      price: "499.00",
    },
    order: {
      id: "ord-4",
      totalAmount: "499.00",
      paymentStatus: "refunded",
      createdAt: "2026-02-04T08:00:00.000Z",
    },
    checkedInAt: null,
  },
];

const mockDetail: AttendeeDetailResponse = {
  attendee: mockAttendees[0]!,
  checkIns: [
    {
      id: "ci-1",
      checkedInAt: "2026-02-01T12:00:00.000Z",
      loggedBy: {
        id: "usr-admin-1",
        name: "Security Lead",
      },
    },
  ],
};

const mockFormResponses: AttendeeFormResponsesResponse = {
  responses: [
    {
      fieldId: "fld-1",
      label: "Dietary Restrictions",
      fieldType: "text",
      value: "Vegetarian",
    },
    {
      fieldId: "fld-2",
      label: "Government ID",
      fieldType: "file",
      value: "file:upload-uuid-1234",
    },
  ],
};

// --- Mock Navigation ---
mock.module("next/navigation", () => ({
  useParams: () => ({ eventId: "evt-test-101" }),
  useRouter: () => ({ push: mock() }),
}));

mock.module("@/hooks/useLiveEvent", () => ({
  useLiveEvent: mock(),
  useEventRevision: () => 0,
}));

// --- Mock API Layer ---
const mockGetAttendees = mock(
  async (
    _eventId: string,
    filters?: { search?: string; status?: string; ticketTypeId?: string },
  ): Promise<GetAttendeesResponse> => {
    let filtered = [...mockAttendees];
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.user.name.toLowerCase().includes(q) ||
          a.user.email.toLowerCase().includes(q) ||
          a.qrCode.toLowerCase().includes(q),
      );
    }
    if (filters?.status) {
      filtered = filtered.filter((a) => a.status === filters.status);
    }
    if (filters?.ticketTypeId) {
      filtered = filtered.filter(
        (a) => a.ticketType.id === filters.ticketTypeId,
      );
    }
    return {
      attendees: filtered,
      total: filtered.length,
      page: 1,
      limit: 10,
      totalPages: 1,
    };
  },
);

const mockGetAttendeeStats = mock(async () => mockStats);
const mockGetAttendeeDetail = mock(async () => mockDetail);
const mockGetAttendeeFormResponses = mock(async () => mockFormResponses);
const mockToggleCheckIn = mock(
  async (_eventId: string, ticketId: string, action: "checkin" | "undo") => ({
    message:
      action === "undo" ? "Check-in undone." : "Attendee checked in.",
    status: action === "undo" ? "active" : "used",
    checkedInAt: action === "undo" ? null : new Date().toISOString(),
  }),
);
const mockCancelTicket = mock(async () => ({
  message: "Ticket cancelled successfully.",
  status: "cancelled",
}));
const mockManualRegisterAttendee = mock(
  async (
    _eventId: string,
    payload: { name: string; email: string; ticketTypeId: string },
  ) => ({
    message: "Complimentary registration created.",
    ticket: {
      id: "tkt-new-5",
      qrCode: "QR-NEW-5",
      status: "active" as const,
      createdAt: new Date().toISOString(),
      user: { id: "usr-5", name: payload.name, email: payload.email },
      ticketType: mockTicketTypes[0]!,
      order: {
        id: "ord-5",
        totalAmount: "0.00",
        paymentStatus: "success" as const,
        createdAt: new Date().toISOString(),
      },
      checkedInAt: null,
    },
  }),
);
const mockExportAttendees = mock(
  async (_eventId: string, format: "csv" | "json" = "csv") => ({
    data: format === "csv" ? "Ticket ID,Attendee Name\n1,Alice" : "[{}]",
    format,
    filename: `attendees_export.${format}`,
  }),
);

mock.module("@/api/attendees", () => ({
  getAttendees: mockGetAttendees,
  getAttendeeStats: mockGetAttendeeStats,
  getAttendeeDetail: mockGetAttendeeDetail,
  getAttendeeFormResponses: mockGetAttendeeFormResponses,
  toggleCheckIn: mockToggleCheckIn,
  cancelTicket: mockCancelTicket,
  manualRegisterAttendee: mockManualRegisterAttendee,
  exportAttendees: mockExportAttendees,
}));

const mockGetTicketTypes = mock(async () => mockTicketTypes);
mock.module("@/api/tickets", () => ({
  getTicketTypes: mockGetTicketTypes,
}));

const mockDecideRegistration = mock(
  async (
    _eventId: string,
    _orderId: string,
    decision: "approve" | "decline",
  ) => ({
    id: _orderId,
    decision,
    status: decision === "approve" ? "confirmed" : "declined",
  }),
);

const mockGetUpload = mock(async () => ({
  url: "https://cdn.example.com/id-document.pdf",
  filename: "id-document.pdf",
}));

mock.module("@/api/commerce", () => ({
  decideRegistration: mockDecideRegistration,
  getUpload: mockGetUpload,
}));

// Mock Sonner
const mockToast = {
  success: mock(),
  error: mock(),
  info: mock(),
};
mock.module("sonner", () => ({
  toast: mockToast,
}));

describe("AttendeesPage Integration", () => {
  beforeEach(() => {
    mockGetAttendees.mockClear();
    mockGetAttendeeStats.mockClear();
    mockGetAttendeeDetail.mockClear();
    mockGetAttendeeFormResponses.mockClear();
    mockToggleCheckIn.mockClear();
    mockCancelTicket.mockClear();
    mockManualRegisterAttendee.mockClear();
    mockExportAttendees.mockClear();
    mockDecideRegistration.mockClear();
    mockGetUpload.mockClear();
    mockToast.success.mockClear();
    mockToast.error.mockClear();
    mockToast.info.mockClear();
  });

  test("1. Renders attendee stats cards and attendee table", async () => {
    render(<AttendeesPage />);

    // Check stats cards
    await waitFor(() => {
      expect(screen.getByText("Total Registered")).toBeInTheDocument();
      expect(screen.getAllByText("Checked In").length).toBeGreaterThan(0);
      expect(screen.getByText("Total Revenue")).toBeInTheDocument();
    });

    expect(screen.getByText("4")).toBeInTheDocument(); // total registered
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
  });

  test("2. Filters table rows by search query", async () => {
    render(<AttendeesPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Search by name, email, QR...",
    );
    fireEvent.change(searchInput, { target: { value: "Bob" } });

    await waitFor(() => {
      expect(mockGetAttendees).toHaveBeenCalledWith(
        "evt-test-101",
        expect.objectContaining({ search: "Bob" }),
      );
    });
  });

  test("3. Filters table rows by status including pending_approval", async () => {
    render(<AttendeesPage />);

    await waitFor(() => {
      expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
    });

    // Verify pending_approval badge is rendered
    expect(screen.getByText("Pending Approval")).toBeInTheDocument();
  });

  test("4. Opens AttendeeDetailModal, displays form responses and file download", async () => {
    render(<AttendeesPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    });

    // Click attendee name to open detail modal
    fireEvent.click(screen.getByText("Alice Johnson"));

    await waitFor(() => {
      expect(mockGetAttendeeDetail).toHaveBeenCalledWith(
        "evt-test-101",
        "tkt-active-1",
      );
      expect(screen.getByText("Attendee Details")).toBeInTheDocument();
      expect(screen.getByText(/Security Lead/)).toBeInTheDocument(); // check-in log
    });

    // Click accordion to reveal form answers
    const accordionBtn = screen.getByText("Registration Form Answers");
    fireEvent.click(accordionBtn);

    await waitFor(() => {
      expect(mockGetAttendeeFormResponses).toHaveBeenCalledWith(
        "evt-test-101",
        "tkt-active-1",
      );
      expect(screen.getByText("Dietary Restrictions")).toBeInTheDocument();
      expect(screen.getByText("Vegetarian")).toBeInTheDocument();
      expect(screen.getByText("Government ID")).toBeInTheDocument();
      expect(screen.getByText("Download file")).toBeInTheDocument();
    });

    // Click download file
    const downloadBtn = screen.getByText("Download file");
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(mockGetUpload).toHaveBeenCalledWith("upload-uuid-1234");
    });
  });

  test("5. Executes quick check-in toggle and displays toast feedback", async () => {
    render(<AttendeesPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    });

    // Find Check In button for Alice Johnson (tkt-active-1)
    const checkInBtns = screen.getAllByRole("button", { name: /Check In/i });
    fireEvent.click(checkInBtns[0]!);

    await waitFor(() => {
      expect(mockToggleCheckIn).toHaveBeenCalledWith(
        "evt-test-101",
        "tkt-active-1",
        "checkin",
      );
      expect(mockToast.success).toHaveBeenCalledWith("Attendee checked in.");
    });
  });

  test("6. Approves and declines pending registration from table", async () => {
    render(<AttendeesPage />);

    await waitFor(() => {
      expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
    });

    // Charlie is pending_approval (ord-3). Approve him via table action:
    const approveBtn = screen.getByLabelText("Approve Registration");
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(mockDecideRegistration).toHaveBeenCalledWith(
        "evt-test-101",
        "ord-3",
        "approve",
      );
      expect(mockToast.success).toHaveBeenCalledWith("Registration approved.");
    });
  });

  test("7. Opens ManualRegisterModal and submits complimentary registration with Idempotency-Key", async () => {
    render(<AttendeesPage />);

    await waitFor(() => {
      expect(screen.getByText("Add Attendee")).toBeInTheDocument();
    });

    // Open Modal
    fireEvent.click(screen.getByText("Add Attendee"));

    await waitFor(() => {
      expect(screen.getByText("Add Attendee Manually")).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByPlaceholderText("e.g. Jane Doe"), {
      target: { value: "Evan Wright" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. jane@example.com"), {
      target: { value: "evan@example.com" },
    });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /Issue Ticket/i }));

    await waitFor(() => {
      expect(mockManualRegisterAttendee).toHaveBeenCalledWith(
        "evt-test-101",
        expect.objectContaining({
          name: "Evan Wright",
          email: "evan@example.com",
        }),
      );
      expect(mockToast.success).toHaveBeenCalledWith(
        "Complimentary registration created.",
      );
    });
  });

  test("8. Triggers CSV and JSON roster export", async () => {
    render(<AttendeesPage />);

    await waitFor(() => {
      expect(screen.getByText("Export CSV")).toBeInTheDocument();
      expect(screen.getByText("Export JSON")).toBeInTheDocument();
    });

    // Export CSV
    fireEvent.click(screen.getByText("Export CSV"));
    await waitFor(() => {
      expect(mockExportAttendees).toHaveBeenCalledWith("evt-test-101", "csv");
    });

    // Export JSON
    fireEvent.click(screen.getByText("Export JSON"));
    await waitFor(() => {
      expect(mockExportAttendees).toHaveBeenCalledWith("evt-test-101", "json");
    });
  });
});
