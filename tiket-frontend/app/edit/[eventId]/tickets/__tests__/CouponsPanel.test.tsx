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
import type { Coupon } from "@/types/commerce";
import CouponsPanel from "../components/CouponsPanel";
import EditTicketsPage from "../page";

const mockCoupons: Coupon[] = [
  {
    id: "cpn-1",
    code: "EARLYBIRD20",
    kind: "percent",
    value: 2000, // 20%
    ticketTypeIds: [],
    maxUses: 100,
    startsAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2026-06-01T00:00:00.000Z",
    isActive: true,
  },
  {
    id: "cpn-2",
    code: "FLAT100",
    kind: "fixed",
    value: 10000, // ₹100
    ticketTypeIds: [],
    maxUses: 50,
    startsAt: null,
    endsAt: null,
    isActive: false,
  },
];

let currentCoupons: Coupon[] = [];

const mockGetCoupons = mock(async () => [...currentCoupons]);
const mockCreateCoupon = mock(async (_eventId: string, data: Coupon) => {
  const created: Coupon = { ...data, id: `cpn-${Date.now()}` };
  currentCoupons.push(created);
  return created;
});
const mockUpdateCoupon = mock(
  async (_eventId: string, couponId: string, data: Coupon) => {
    currentCoupons = currentCoupons.map((c) =>
      c.id === couponId || c.code === couponId ? { ...c, ...data } : c,
    );
    return data;
  },
);
const mockDeleteCoupon = mock(async (_eventId: string, couponId: string) => {
  currentCoupons = currentCoupons.filter(
    (c) => c.id !== couponId && c.code !== couponId,
  );
  return { success: true };
});

const mockEvent = {
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
  platformFeeBps: 400,
  status: "published",
  organizationId: "org-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

mock.module("@/api/tickets", () => ({
  getTicketTypes: mock(async () => []),
  createTicketType: mock(async () => ({})),
  updateTicketType: mock(async () => ({})),
  deleteTicketType: mock(async () => ({})),
  reorderTicketTypes: mock(async () => ({})),
}));

mock.module("@/api/commerce", () => ({
  getCoupons: mockGetCoupons,
  createCoupon: mockCreateCoupon,
  updateCoupon: mockUpdateCoupon,
  deleteCoupon: mockDeleteCoupon,
  getBankAccount: mock(async () => ({
    bankAccount: {
      userId: "u-1",
      accountHolderName: "Organizer",
      accountNumber: "1234567890",
      ifscCode: "HDFC0001234",
      bankName: "HDFC Bank",
      gatewayAccountId: "acc_123456",
      updatedAt: new Date().toISOString(),
    },
  })),
}));

mock.module("@/store/useEventStore", () => ({
  useEventStore: (selector?: (state: { event: typeof mockEvent | null }) => unknown) => {
    const state = {
      event: mockEvent,
      isLoading: false,
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

describe("CouponsPanel & Tickets Tabs Component", () => {
  beforeEach(() => {
    currentCoupons = JSON.parse(JSON.stringify(mockCoupons));
    mockGetCoupons.mockClear();
    mockCreateCoupon.mockClear();
    mockUpdateCoupon.mockClear();
    mockDeleteCoupon.mockClear();
  });

  test("1. Renders coupons table with code badges, percentage and fixed discounts", async () => {
    render(<CouponsPanel eventId="evt-test-101" />);

    await waitFor(() => {
      expect(screen.getByText("EARLYBIRD20")).toBeDefined();
    });

    expect(screen.getByText("20% OFF")).toBeDefined();
    expect(screen.getByText("FLAT100")).toBeDefined();
    expect(screen.getByText("₹100 OFF")).toBeDefined();
    expect(screen.getByText("/ 100")).toBeDefined();
    expect(screen.getByText("No Expiry")).toBeDefined();
  });

  test("2. Opens Create Coupon modal and saves a new percentage coupon", async () => {
    render(<CouponsPanel eventId="evt-test-101" />);

    await waitFor(() => {
      expect(screen.getByText("EARLYBIRD20")).toBeDefined();
    });

    const addBtn = screen.getByTestId("add-coupon-btn");
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Create Coupon" })).toBeDefined();
    });

    const codeInput = screen.getByTestId("coupon-code-input");
    const valueInput = screen.getByTestId("coupon-value-input");

    fireEvent.change(codeInput, { target: { value: "SUMMER30" } });
    fireEvent.change(valueInput, { target: { value: "30" } });

    const saveBtn = screen.getByTestId("coupon-save-btn");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockCreateCoupon).toHaveBeenCalled();
    });

    const callArgs = mockCreateCoupon.mock.calls[0];
    expect(callArgs[0]).toBe("evt-test-101");
    expect(callArgs[1].code).toBe("SUMMER30");
    expect(callArgs[1].kind).toBe("percent");
    expect(callArgs[1].value).toBe(3000); // 30% in basis points
  });

  test("3. Toggles active state of a coupon calling updateCoupon", async () => {
    render(<CouponsPanel eventId="evt-test-101" />);

    await waitFor(() => {
      expect(screen.getByText("EARLYBIRD20")).toBeDefined();
    });

    const switchBtn = screen.getByLabelText("Toggle active for EARLYBIRD20");
    fireEvent.click(switchBtn);

    await waitFor(() => {
      expect(mockUpdateCoupon).toHaveBeenCalled();
    });

    const callArgs = mockUpdateCoupon.mock.calls[0];
    expect(callArgs[0]).toBe("evt-test-101");
    expect(callArgs[2].isActive).toBe(false);
  });

  test("4. Deletes a coupon calling deleteCoupon", async () => {
    render(<CouponsPanel eventId="evt-test-101" />);

    await waitFor(() => {
      expect(screen.getByText("EARLYBIRD20")).toBeDefined();
    });

    const deleteBtn = screen.getByTestId("delete-coupon-EARLYBIRD20");
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockDeleteCoupon).toHaveBeenCalledWith("evt-test-101", "cpn-1");
    });
  });

  test("5. Top Tabs switches to Coupons tab and shows count badge", async () => {
    render(<EditTicketsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("tab-coupons")).toBeDefined();
    });

    // Verify count badge shows initial mock coupon count (2)
    await waitFor(() => {
      const badge = screen.getByTestId("coupons-count-badge");
      expect(badge.textContent).toBe("2");
    });

    // Switch to Coupons tab
    fireEvent.click(screen.getByTestId("tab-coupons"));

    await waitFor(() => {
      expect(screen.getByText("Coupons & Discounts")).toBeDefined();
      expect(screen.getByText("EARLYBIRD20")).toBeDefined();
    });

    // Switch back to Ticket Tiers
    fireEvent.click(screen.getByTestId("tab-ticket-tiers"));

    await waitFor(() => {
      expect(screen.getByTestId("add-ticket-btn")).toBeDefined();
    });
  });
});
