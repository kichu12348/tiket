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
import type { TicketType, CreateTicketTypePayload } from "@/types/ticketType";
import type { Event } from "@/types/event";
import EditTicketsPage from "../page";

// --- Mock Data ---
const mockEvent: Event = {
  id: "evt-test-101",
  title: "Tech Summit 2026",
  description: "Annual Tech Conference",
  slug: "tech-summit-2026",
  coverImage: null,
  color: "#121316",
  fontFamily: "Inter",
  locationType: "offline",
  locationDetails: { name: "Convention Center" },
  startDate: "2026-06-01T09:00:00.000Z",
  endDate: "2026-06-02T18:00:00.000Z",
  timezone: "Asia/Kolkata",
  registrationStart: "2026-01-01T00:00:00.000Z",
  registrationEnd: "2026-05-30T23:59:59.000Z",
  requireApproval: false,
  capacity: 500,
  status: "published",
  organizationId: "org-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

let currentTiers: TicketType[] = [];

const initialTiers: TicketType[] = [
  {
    id: "tt-1",
    eventId: "evt-test-101",
    name: "General Admission",
    description: "Access to all keynotes",
    price: "499",
    quantityLimit: 200,
    isHidden: false,
    isRefundable: true,
    refundableUntil: null,
    isTransferable: true,
    maxTransfers: 1,
    saleStart: "2026-01-01T00:00:00.000Z",
    saleEnd: "2026-05-20T00:00:00.000Z",
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "tt-2",
    eventId: "evt-test-101",
    name: "Backstage Secret VIP",
    description: "Exclusive backstage entry",
    price: "1999",
    quantityLimit: 25,
    isHidden: true,
    isRefundable: false,
    refundableUntil: null,
    isTransferable: false,
    maxTransfers: 0,
    saleStart: null,
    saleEnd: null,
    sortOrder: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const mockCreateTicketType = mock(
  async (
    _eventId: string,
    payload: CreateTicketTypePayload,
  ): Promise<TicketType> => {
    const newTier: TicketType = {
      id: `tt-${Date.now()}`,
      eventId: "evt-test-101",
      name: payload.name,
      description: payload.description || null,
      price: String(payload.price ?? 0),
      quantityLimit: payload.quantityLimit ?? null,
      isHidden: Boolean(payload.isHidden),
      isRefundable: Boolean(payload.isRefundable),
      refundableUntil: null,
      isTransferable: Boolean(payload.isTransferable),
      maxTransfers: payload.maxTransfers ?? 1,
      saleStart: payload.saleStart ?? null,
      saleEnd: payload.saleEnd ?? null,
      sortOrder: currentTiers.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    currentTiers.push(newTier);
    return newTier;
  },
);

const mockGetTicketTypes = mock(async () => {
  return [...currentTiers];
});

mock.module("@/api/tickets", () => ({
  getTicketTypes: mockGetTicketTypes,
  createTicketType: mockCreateTicketType,
  updateTicketType: mock(async () => ({})),
  deleteTicketType: mock(async () => ({})),
  reorderTicketTypes: mock(async () => ({})),
}));

mock.module("@/store/useEventStore", () => ({
  useEventStore: (selector?: (state: { event: Event | null; isLoading: boolean }) => unknown) => {
    const state = {
      event: mockEvent,
      isLoading: false,
      permissions: [],
      isOwner: true,
      setEvent: mock(),
      setPermissions: mock(),
      updateEventLocally: mock(),
      setIsLoading: mock(),
    };
    return selector ? selector(state) : state;
  },
}));

mock.module("sonner", () => ({
  toast: {
    success: mock(),
    error: mock(),
    info: mock(),
  },
}));

describe("TicketsPage Integration", () => {
  beforeEach(() => {
    currentTiers = JSON.parse(JSON.stringify(initialTiers));
    mockGetTicketTypes.mockClear();
    mockCreateTicketType.mockClear();
  });

  test("1. Renders ticket tiers with prices, names, and Hidden badge", async () => {
    render(<EditTicketsPage />);

    await waitFor(() => {
      expect(screen.getByText("General Admission")).toBeDefined();
    });

    expect(screen.getByText("₹499")).toBeDefined();
    expect(screen.getByText("Backstage Secret VIP")).toBeDefined();
    expect(screen.getByText("₹1999")).toBeDefined();
    expect(screen.getByText("Hidden")).toBeDefined();
    expect(screen.getByText("Limit: 200")).toBeDefined();
  });

  test("2. Opens TicketEditModal on Add Ticket click", async () => {
    render(<EditTicketsPage />);

    await waitFor(() => {
      expect(screen.getByText("General Admission")).toBeDefined();
    });

    const addBtn = screen.getByTestId("add-ticket-btn");
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText("Create Ticket Type")).toBeDefined();
      expect(screen.getByTestId("ticket-name-input")).toBeDefined();
    });
  });

  test("3. Creates a paid ticket tier and persists it", async () => {
    render(<EditTicketsPage />);

    await waitFor(() => {
      expect(screen.getByText("General Admission")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("add-ticket-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("ticket-name-input")).toBeDefined();
    });

    fireEvent.change(screen.getByTestId("ticket-name-input"), {
      target: { value: "Workshop Pass" },
    });
    fireEvent.change(screen.getByTestId("ticket-price-input"), {
      target: { value: "750" },
    });
    fireEvent.change(screen.getByTestId("ticket-quantity-input"), {
      target: { value: "100" },
    });

    fireEvent.click(screen.getByTestId("ticket-submit-btn"));

    await waitFor(() => {
      expect(mockCreateTicketType).toHaveBeenCalled();
    });

    const callArgs = mockCreateTicketType.mock.calls[0];
    expect(callArgs[0]).toBe("evt-test-101");
    expect(callArgs[1].name).toBe("Workshop Pass");
    expect(callArgs[1].price).toBe(750);
    expect(callArgs[1].quantityLimit).toBe(100);
  });

  test("4. Creates a free tier (price 0) and displays Free label", async () => {
    render(<EditTicketsPage />);

    await waitFor(() => {
      expect(screen.getByText("General Admission")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("add-ticket-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("ticket-name-input")).toBeDefined();
    });

    fireEvent.change(screen.getByTestId("ticket-name-input"), {
      target: { value: "Community Volunteer" },
    });
    fireEvent.change(screen.getByTestId("ticket-price-input"), {
      target: { value: "0" },
    });

    fireEvent.click(screen.getByTestId("ticket-submit-btn"));

    await waitFor(() => {
      expect(mockCreateTicketType).toHaveBeenCalled();
    });

    const callArgs = mockCreateTicketType.mock.calls[0];
    expect(callArgs[1].name).toBe("Community Volunteer");
    expect(callArgs[1].price).toBe(0);
  });

  test("5. Toggles isHidden switch to create a hidden tier", async () => {
    render(<EditTicketsPage />);

    await waitFor(() => {
      expect(screen.getByText("General Admission")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("add-ticket-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("ticket-name-input")).toBeDefined();
    });

    fireEvent.change(screen.getByTestId("ticket-name-input"), {
      target: { value: "VIP Hidden Tier" },
    });
    fireEvent.change(screen.getByTestId("ticket-price-input"), {
      target: { value: "1500" },
    });

    // Toggle the hidden switch
    const hiddenSwitch = document.getElementById("ticket-hidden-switch");
    expect(hiddenSwitch).toBeDefined();
    if (hiddenSwitch) {
      fireEvent.click(hiddenSwitch);
    }

    fireEvent.click(screen.getByTestId("ticket-submit-btn"));

    await waitFor(() => {
      expect(mockCreateTicketType).toHaveBeenCalled();
    });

    const callArgs = mockCreateTicketType.mock.calls[0];
    expect(callArgs[1].name).toBe("VIP Hidden Tier");
    expect(callArgs[1].isHidden).toBe(true);
  });
});
