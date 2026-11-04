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
import type { EventInsightsData, CustomInsightWidget } from "@/types/attendee";
import type { EventHost } from "@/api/events";
import EditOverviewPage from "../page";

// --- Mock Data ---
const mockInsights: EventInsightsData = {
  summary: {
    totalRegistrations: 75,
    confirmedCount: 65,
    checkedInCount: 42,
    pendingApprovalCount: 10,
    cancelledOrDeclinedCount: 3,
    checkInRatePercent: 65,
    capacity: 100,
    remainingCapacity: 35,
    netRevenuePaise: 4990000, // ₹49,900
    totalRefundedPaise: 150000,
    couponOrdersCount: 5,
  },
  dailySeries: [
    { date: "2026-05-20", registrations: 10, revenuePaise: 500000 },
    { date: "2026-05-21", registrations: 15, revenuePaise: 900000 },
    { date: "2026-05-22", registrations: 20, revenuePaise: 1500000 },
    { date: "2026-05-23", registrations: 30, revenuePaise: 2090000 },
  ],
  hourlyCheckIns: [
    { hour: "09:00", count: 12 },
    { hour: "10:00", count: 24 },
    { hour: "11:00", count: 6 },
  ],
  tierBreakdown: [
    {
      ticketTypeId: "tt-early-1",
      name: "Early Bird VIP",
      sold: 40,
      capacity: 40,
      revenuePaise: 2000000,
      checkedIn: 28,
    },
    {
      ticketTypeId: "tt-gen-2",
      name: "General Admission",
      sold: 25,
      capacity: 60,
      revenuePaise: 2990000,
      checkedIn: 14,
    },
  ],
  recentActivity: [
    {
      id: "act-1",
      attendeeName: "Alice Wonderland",
      attendeeEmail: "alice@example.com",
      ticketTypeName: "Early Bird VIP",
      status: "used",
      timestamp: "2026-05-23T10:15:00.000Z",
    },
    {
      id: "act-2",
      attendeeName: "Bob Builder",
      attendeeEmail: "bob@example.com",
      ticketTypeName: "General Admission",
      status: "active",
      timestamp: "2026-05-23T09:40:00.000Z",
    },
  ],
  customInsightsConfig: [
    {
      id: "widget-diet",
      title: "Dietary Preferences",
      fieldId: "field-diet",
      chartType: "donut",
      filterStatus: "all",
      filterTicketTypeId: null,
    },
    {
      id: "widget-workshops",
      title: "Workshop Track Selection",
      fieldId: "field-workshops",
      chartType: "bar",
      filterStatus: "all",
      filterTicketTypeId: null,
    },
    {
      id: "widget-rating",
      title: "Attendee Rating",
      fieldId: "field-rating",
      chartType: "stat",
      filterStatus: "all",
      filterTicketTypeId: null,
    },
  ],
  formFieldAnalytics: [
    {
      fieldId: "field-diet",
      label: "Dietary Preference",
      fieldType: "single_select",
      totalResponses: 4,
      distribution: [
        { value: "Vegetarian", count: 3, percentage: 75 },
        { value: "Non-Vegetarian", count: 1, percentage: 25 },
      ],
      averageNumeric: null,
      rawResponses: [
        {
          ticketId: "t1",
          ticketTypeId: "tt-early-1",
          isCheckedIn: true,
          status: "used",
          values: ["Vegetarian"],
        },
        {
          ticketId: "t2",
          ticketTypeId: "tt-early-1",
          isCheckedIn: true,
          status: "used",
          values: ["Vegetarian"],
        },
        {
          ticketId: "t3",
          ticketTypeId: "tt-gen-2",
          isCheckedIn: false,
          status: "active",
          values: ["Vegetarian"],
        },
        {
          ticketId: "t4",
          ticketTypeId: "tt-gen-2",
          isCheckedIn: true,
          status: "used",
          values: ["Non-Vegetarian"],
        },
      ],
    },
    {
      fieldId: "field-workshops",
      label: "Workshop Track",
      fieldType: "multi_select",
      totalResponses: 2,
      distribution: [
        { value: "AI Agents", count: 2, percentage: 100 },
        { value: "Next.js 16", count: 1, percentage: 50 },
      ],
      averageNumeric: null,
      rawResponses: [
        {
          ticketId: "t1",
          ticketTypeId: "tt-early-1",
          isCheckedIn: true,
          status: "used",
          values: ["AI Agents", "Next.js 16"],
        },
        {
          ticketId: "t2",
          ticketTypeId: "tt-early-1",
          isCheckedIn: true,
          status: "used",
          values: ["AI Agents"],
        },
      ],
    },
    {
      fieldId: "field-rating",
      label: "Event Rating",
      fieldType: "rating",
      totalResponses: 2,
      distribution: [
        { value: "5", count: 1, percentage: 50 },
        { value: "4", count: 1, percentage: 50 },
      ],
      averageNumeric: 4.5,
      rawResponses: [
        {
          ticketId: "t1",
          ticketTypeId: "tt-early-1",
          isCheckedIn: true,
          status: "used",
          values: ["5"],
          numericValue: 5,
        },
        {
          ticketId: "t2",
          ticketTypeId: "tt-early-1",
          isCheckedIn: true,
          status: "used",
          values: ["4"],
          numericValue: 4,
        },
      ],
    },
  ],
};

const mockHosts: EventHost[] = [
  {
    id: "usr-creator",
    name: "Alex Organizer",
    email: "alex@tiket.io",
    role: "Admin",
    isCreator: true,
  },
];

const mockEvent = {
  id: "evt-test-101",
  title: "Global AI Summit 2026",
  slug: "global-ai-summit-2026",
  status: "published",
  startDate: "2026-06-01T09:00:00.000Z",
  endDate: "2026-06-01T18:00:00.000Z",
  locationType: "hybrid",
  locationDetails: JSON.stringify({
    name: "Palace Grounds",
    address: "Bengaluru, India",
  }),
  capacity: 100,
  requireApproval: true,
  customInsightsConfig: [
    {
      id: "widget-diet",
      title: "Dietary Preferences",
      fieldId: "field-diet",
      chartType: "donut",
      filterStatus: "all",
      filterTicketTypeId: null,
    },
    {
      id: "widget-workshops",
      title: "Workshop Track Selection",
      fieldId: "field-workshops",
      chartType: "bar",
      filterStatus: "all",
      filterTicketTypeId: null,
    },
    {
      id: "widget-rating",
      title: "Attendee Rating",
      fieldId: "field-rating",
      chartType: "stat",
      filterStatus: "all",
      filterTicketTypeId: null,
    },
  ],
  formFieldAnalytics: [
    {
      fieldId: "field-diet",
      label: "Dietary Preference",
      fieldType: "single_select",
      totalResponses: 4,
      distribution: [
        { value: "Vegetarian", count: 3, percentage: 75 },
        { value: "Non-Vegetarian", count: 1, percentage: 25 },
      ],
      averageNumeric: null,
      rawResponses: [
        {
          ticketId: "t1",
          ticketTypeId: "tt-early-1",
          isCheckedIn: true,
          status: "used",
          values: ["Vegetarian"],
        },
        {
          ticketId: "t2",
          ticketTypeId: "tt-early-1",
          isCheckedIn: true,
          status: "used",
          values: ["Vegetarian"],
        },
        {
          ticketId: "t3",
          ticketTypeId: "tt-gen-2",
          isCheckedIn: false,
          status: "active",
          values: ["Vegetarian"],
        },
        {
          ticketId: "t4",
          ticketTypeId: "tt-gen-2",
          isCheckedIn: true,
          status: "used",
          values: ["Non-Vegetarian"],
        },
      ],
    },
    {
      fieldId: "field-workshops",
      label: "Workshop Track",
      fieldType: "multi_select",
      totalResponses: 2,
      distribution: [
        { value: "AI Agents", count: 2, percentage: 100 },
        { value: "Next.js 16", count: 1, percentage: 50 },
      ],
      averageNumeric: null,
      rawResponses: [
        {
          ticketId: "t1",
          ticketTypeId: "tt-early-1",
          isCheckedIn: true,
          status: "used",
          values: ["AI Agents", "Next.js 16"],
        },
        {
          ticketId: "t2",
          ticketTypeId: "tt-early-1",
          isCheckedIn: true,
          status: "used",
          values: ["AI Agents"],
        },
      ],
    },
    {
      fieldId: "field-rating",
      label: "Event Rating",
      fieldType: "rating",
      totalResponses: 2,
      distribution: [
        { value: "5", count: 1, percentage: 50 },
        { value: "4", count: 1, percentage: 50 },
      ],
      averageNumeric: 4.5,
      rawResponses: [
        {
          ticketId: "t1",
          ticketTypeId: "tt-early-1",
          isCheckedIn: true,
          status: "used",
          values: ["5"],
          numericValue: 5,
        },
        {
          ticketId: "t2",
          ticketTypeId: "tt-early-1",
          isCheckedIn: true,
          status: "used",
          values: ["4"],
          numericValue: 4,
        },
      ],
    },
  ],
};

// --- Mocks ---
mock.module("next/navigation", () => ({
  useParams: () => ({ eventId: "evt-test-101" }),
  useRouter: () => ({ push: mock() }),
}));

mock.module("@/hooks/useLiveEvent", () => ({
  useLiveEvent: mock(),
  useEventRevision: () => 0,
}));

mock.module("@/hooks/useAvailability", () => ({
  useAvailability: () => ({ remaining: 35 }),
}));

mock.module("@/store/useEventStore", () => ({
  useEventStore: () => ({ event: mockEvent }),
}));

const mockGetEventInsights = mock(async () => mockInsights);
const mockGetEventHosts = mock(async () => mockHosts);
const mockUpdateCustomInsights = mock(
  async (_eventId: string, widgets: CustomInsightWidget[]) => ({
    message: "Custom insights saved successfully.",
    customInsightsConfig: widgets,
  }),
);

mock.module("@/api/attendees", () => ({
  getEventInsights: mockGetEventInsights,
  getAttendees: mock(async () => ({ attendees: [], total: 0 })),
  getAttendeeStats: mock(async () => ({})),
  updateCustomInsights: mockUpdateCustomInsights,
}));

mock.module("@/api/events", () => ({
  getEventHosts: mockGetEventHosts,
}));

mock.module("sonner", () => ({
  toast: {
    success: mock(),
    error: mock(),
  },
}));

describe("OverviewPage (Lu.ma / MakeMyPass caliber Dashboard)", () => {
  beforeEach(() => {
    mockGetEventInsights.mockClear();
    mockGetEventHosts.mockClear();
    mockUpdateCustomInsights.mockClear();
  });

  test("1. Renders event title, status, and all 4 KPI summary cards", async () => {
    render(<EditOverviewPage />);

    // Verify Title & Status
    expect(screen.getByText("Global AI Summit 2026")).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();

    // Wait for insights data to load
    await waitFor(() => {
      expect(screen.getAllByText("75").length).toBeGreaterThan(0);
    });

    // KPI 1: Total Registrations
    expect(screen.getByText("Total Registrations")).toBeInTheDocument();
    expect(
      screen.getByText("65 confirmed · 10 pending"),
    ).toBeInTheDocument();

    // KPI 2: Net Revenue
    expect(screen.getByText("Net Revenue")).toBeInTheDocument();
    expect(screen.getByText("₹49,900")).toBeInTheDocument();

    // KPI 3: Check-In Rate
    expect(screen.getByText("Check-In Rate")).toBeInTheDocument();
    expect(screen.getAllByText("65%").length).toBeGreaterThan(0);
    expect(screen.getByText("42 of 65 checked in")).toBeInTheDocument();

    // KPI 4: Remaining Capacity
    expect(screen.getByText("Remaining Capacity")).toBeInTheDocument();
    expect(screen.getAllByText("35").length).toBeGreaterThan(0);
    expect(
      screen.getByText("of 100 total allocated spots"),
    ).toBeInTheDocument();
  });

  test("2. Displays pending approvals alert banner with link to attendees", async () => {
    render(<EditOverviewPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Review Approvals").length).toBeGreaterThan(0);
    });

    const approvalLinks = screen.getAllByRole("link", {
      name: /Review Approvals/i,
    });
    expect(approvalLinks.length).toBeGreaterThan(0);
    expect(approvalLinks[0]?.getAttribute("href")).toBe(
      "/edit/evt-test-101/attendees?status=pending_approval",
    );
  });

  test("3. Switches chart metric between Registrations and Revenue", async () => {
    render(<EditOverviewPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Registrations/i }),
      ).toBeInTheDocument();
    });

    const revenueTab = screen.getByRole("button", { name: /Revenue/i });
    expect(revenueTab).toBeInTheDocument();

    // Click on Revenue tab
    fireEvent.click(revenueTab);

    // Headline metric changes to revenue
    await waitFor(() => {
      expect(screen.getByText(/total revenue \(last 30d\)/i)).toBeInTheDocument();
    });

    // Click back to Registrations tab
    const registrationsTab = screen.getByRole("button", {
      name: /Registrations/i,
    });
    fireEvent.click(registrationsTab);

    await waitFor(() => {
      expect(screen.getByText(/total registrations \(last 30d\)/i)).toBeInTheDocument();
    });
  });

  test("4. Toggles time-series chart range (7D / 30D / ALL)", async () => {
    render(<EditOverviewPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "7D" })).toBeInTheDocument();
    });

    const btn7d = screen.getByRole("button", { name: "7D" });
    const btnAll = screen.getByRole("button", { name: "ALL" });

    fireEvent.click(btn7d);
    await waitFor(() => {
      expect(screen.getByText(/last 7d/i)).toBeInTheDocument();
    });

    fireEvent.click(btnAll);
    await waitFor(() => {
      expect(screen.getByText(/all time/i)).toBeInTheDocument();
    });
  });

  test("5. Renders capacity meter and ticket tier breakdown with Sold Out badges", async () => {
    render(<EditOverviewPage />);

    await waitFor(() => {
      expect(screen.getByText("Capacity Utilization")).toBeInTheDocument();
    });

    // Overall capacity percentage
    expect(screen.getByText("65% filled")).toBeInTheDocument();

    // Tier 1: Early Bird VIP (sold out 40 / 40)
    expect(screen.getAllByText("Early Bird VIP").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sold Out").length).toBeGreaterThan(0);
    expect(screen.getAllByText("40").length).toBeGreaterThan(0);

    // Tier 2: General Admission (25 / 60)
    expect(screen.getAllByText("General Admission").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText("25").length).toBeGreaterThan(0);
  });

  test("6. Renders check-in velocity and peak velocity indicator", async () => {
    render(<EditOverviewPage />);

    await waitFor(() => {
      expect(screen.getByText("Check-In Velocity")).toBeInTheDocument();
    });

    // Peak badge
    expect(screen.getByText("Peak: 24 at 10:00")).toBeInTheDocument();

    // Hours
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
    expect(screen.getByText("11:00")).toBeInTheDocument();
  });

  test("7. Renders recent activity feed with attendee details", async () => {
    render(<EditOverviewPage />);

    await waitFor(() => {
      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    });

    expect(screen.getByText("Alice Wonderland")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Checked In")).toBeInTheDocument();

    expect(screen.getByText("Bob Builder")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
  });

  test("8. Copies event public link when clicking Copy Link button", async () => {
    const writeTextMock = mock(async () => {});
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(<EditOverviewPage />);

    const copyBtn = screen.getByRole("button", { name: /Copy Link/i });
    expect(copyBtn).toBeInTheDocument();

    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
    });
  });
});
