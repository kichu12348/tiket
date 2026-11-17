/* eslint-disable @typescript-eslint/no-require-imports */
import { describe, it, expect, spyOn, beforeEach, afterEach } from "bun:test";
import path from "path";

const rtl = require.resolve("@testing-library/react");
const rtlReactDomPath = require.resolve("react-dom", { paths: [path.dirname(rtl)] });
const rtlReactPath = require.resolve("react", { paths: [path.dirname(rtlReactDomPath)] });
const localReactPath = require.resolve("react", { paths: [path.resolve(__dirname, "../../..")] });

const rtlReact = require(rtlReactPath);
const localReact = require(localReactPath);

if (rtlReact && localReact && rtlReact !== localReact) {
  const rtlInternals = rtlReact.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const localInternals = localReact.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

  if (rtlInternals && localInternals) {
    Object.defineProperty(localInternals, "H", {
      get() {
        return rtlInternals.H;
      },
      set(val) {
        rtlInternals.H = val;
      },
      configurable: true,
    });
    Object.defineProperty(localInternals, "A", {
      get() {
        return rtlInternals.A;
      },
      set(val) {
        rtlInternals.A = val;
      },
      configurable: true,
    });
  }
}

import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import Home from "@/app/home/page";
import * as eventsApi from "@/app/home/api/events";
import * as ticketsApi from "@/api/tickets";
import * as useTokenModule from "@/hooks/useToken";
import type { Event } from "@/types/event";
import type {
  UserTicketSummary,
  IncomingTransfer,
  AcceptTransferResponse,
} from "@/types/ticket";
import {
  buildGoogleCalendarUrl,
  buildIcsContent,
  downloadIcsFile,
} from "@/lib/calendar";

describe("Home Dashboard & Calendar Integration", () => {
  let getMyEventsSpy: ReturnType<typeof spyOn>;
  let getMyTicketsSpy: ReturnType<typeof spyOn>;
  let acceptTransferSpy: ReturnType<typeof spyOn>;
  let useTokenSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    useTokenSpy = spyOn(useTokenModule, "useToken").mockReturnValue({
      logout: async () => {},
      getAuthToken: async () => "mock-token",
    });

    const mockEvents: Event[] = [
      {
        id: "evt-1",
        title: "Web3 Summit 2026",
        description: "Join us for Web3",
        coverImage: null,
        color: null,
        startDate: "2026-11-20T10:00:00Z",
        endDate: "2026-11-20T18:00:00Z",
        registrationStart: "2026-11-01T00:00:00Z",
        registrationEnd: "2026-11-20T10:00:00Z",
        capacity: 500,
        locationType: "offline",
        locationDetails: { name: "Grand Hall", city: "San Francisco" },
        organizationId: "org-1",
        status: "published",
        createdAt: "2026-11-01T00:00:00Z",
        updatedAt: "2026-11-01T00:00:00Z",
        timezone: "UTC",
        slug: "web3-summit",
        fontFamily: "Inter",
        requireApproval: false,
      },
    ];

    getMyEventsSpy = spyOn(eventsApi, "getMyEvents").mockResolvedValue(mockEvents);

    const mockTicketItems: UserTicketSummary[] = [
      {
        id: "tkt-123",
        status: "active",
        createdAt: "2026-11-01T00:00:00Z",
        event: {
          id: "evt-2",
          title: "AI Developers Conference",
          slug: "ai-dev-conf",
          startDate: "2026-12-05T09:00:00Z",
          endDate: "2026-12-05T17:00:00Z",
          locationType: "offline",
          timezone: "UTC",
        },
        ticketType: {
          id: "type-vip",
          name: "VIP All-Access",
          price: "199.00",
          isTransferable: true,
          isRefundable: true,
        },
      },
    ];

    const mockTransfers: IncomingTransfer[] = [
      {
        id: "trf-999",
        ticketId: "tkt-456",
        status: "pending",
        createdAt: "2026-11-03T12:00:00Z",
        senderEmail: "friend@example.com",
        senderName: "Alice",
        event: {
          id: "evt-3",
          title: "Design Systems Workshop",
        },
        ticketType: {
          id: "type-ga",
          name: "General Admission",
        },
      },
    ];

    getMyTicketsSpy = spyOn(eventsApi, "getMyTickets").mockResolvedValue({
      tickets: mockTicketItems,
      incomingTransfers: mockTransfers,
    });

    const mockAcceptResponse: AcceptTransferResponse = {
      message: "Transfer accepted",
      transfer: {
        id: "trf-999",
        ticketId: "tkt-456",
        fromUserId: "user-alice",
        toUserId: "user-current",
        status: "completed",
        createdAt: "2026-11-03T12:00:00Z",
      },
    };

    acceptTransferSpy = spyOn(ticketsApi, "acceptTicketTransfer").mockResolvedValue(mockAcceptResponse);
  });

  afterEach(() => {
    cleanup();
    getMyEventsSpy?.mockRestore();
    getMyTicketsSpy?.mockRestore();
    acceptTransferSpy?.mockRestore();
    useTokenSpy?.mockRestore();
  });

  it("1. Switches between 'My Events' and 'My Tickets' tabs on /home", async () => {
    render(<Home />);

    // Initially loads "My Events"
    expect(screen.getByTestId("tab-my-events")).toBeDefined();
    expect(screen.getByTestId("tab-my-tickets")).toBeDefined();

    await waitFor(() => {
      expect(getMyEventsSpy).toHaveBeenCalled();
    });

    // Switch to "My Tickets"
    const ticketsTabBtn = screen.getByTestId("tab-my-tickets");
    fireEvent.click(ticketsTabBtn);

    await waitFor(() => {
      expect(getMyTicketsSpy).toHaveBeenCalled();
    });

    // Verifies incoming transfers banner and tickets grid rendered
    expect(
      screen.getByTestId("incoming-transfers-banner"),
    ).toBeDefined();
    expect(
      screen.getByText(/Incoming Ticket Transfers/i),
    ).toBeDefined();
    expect(screen.getByText("Design Systems Workshop • General Admission")).toBeDefined();
    expect(screen.getByText(/Sent from Alice/i)).toBeDefined();

    // Verifies ticket pass item rendered
    expect(screen.getByTestId("ticket-card-tkt-123")).toBeDefined();
    expect(screen.getByText("AI Developers Conference")).toBeDefined();
    expect(screen.getByText("VIP All-Access")).toBeDefined();
    expect(screen.getByTestId("ticket-status-active")).toBeDefined();

    // Switch back to "My Events"
    const eventsTabBtn = screen.getByTestId("tab-my-events");
    fireEvent.click(eventsTabBtn);

    await waitFor(() => {
      expect(
        screen.queryByTestId("incoming-transfers-banner"),
      ).toBeNull();
    });
  });

  it("2. Accepts an incoming ticket transfer on 'My Tickets' tab", async () => {
    render(<Home />);

    // Switch to "My Tickets"
    const ticketsTabBtn = screen.getByTestId("tab-my-tickets");
    fireEvent.click(ticketsTabBtn);

    await waitFor(() => {
      expect(screen.getByTestId("accept-transfer-trf-999")).toBeDefined();
    });

    const acceptBtn = screen.getByTestId("accept-transfer-trf-999");
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(acceptTransferSpy).toHaveBeenCalledWith("trf-999");
    });
  });

  it("3. Generates valid Google Calendar URL in lib/calendar.ts", () => {
    const event = {
      title: "Tech Expo 2026",
      startDate: "2026-11-15T10:00:00Z",
      endDate: "2026-11-15T12:00:00Z",
      description: "Join us at <p>Tech Expo</p> for innovations!",
      locationType: "offline",
      locationDetails: {
        name: "Convention Center",
        city: "San Francisco",
        state: "CA",
      },
    };

    const url = buildGoogleCalendarUrl(event);
    expect(url).toContain("calendar.google.com/calendar/render");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("text=Tech+Expo+2026");
    expect(url).toContain("20261115T100000Z%2F20261115T120000Z");
    expect(url).toContain("Convention+Center");
    expect(url).not.toContain("<p>");
  });

  it("4. Generates valid .ics iCalendar file content in lib/calendar.ts", () => {
    const event = {
      title: "Design Jam",
      startDate: "2026-11-18T14:00:00Z",
      endDate: "2026-11-18T16:00:00Z",
      description: "Collaborative design workshop",
      locationType: "online",
      locationDetails: { link: "https://meet.google.com/xyz-abc" },
    };

    const icsContent = buildIcsContent(event);
    expect(icsContent).toContain("BEGIN:VCALENDAR");
    expect(icsContent).toContain("VERSION:2.0");
    expect(icsContent).toContain("BEGIN:VEVENT");
    expect(icsContent).toContain("SUMMARY:Design Jam");
    expect(icsContent).toContain("DTSTART:20261118T140000Z");
    expect(icsContent).toContain("DTEND:20261118T160000Z");
    expect(icsContent).toContain("LOCATION:https://meet.google.com/xyz-abc");
    expect(icsContent).toContain("STATUS:CONFIRMED");
    expect(icsContent).toContain("END:VEVENT");
    expect(icsContent).toContain("END:VCALENDAR");
  });

  it("5. Triggers .ics file download without error in browser mock", () => {
    const event = {
      title: "Design Jam",
      startDate: "2026-11-18T14:00:00Z",
      endDate: "2026-11-18T16:00:00Z",
    };

    const originalCreateObjectURL = window.URL.createObjectURL;
    const originalRevokeObjectURL = window.URL.revokeObjectURL;

    const mockCreateObjectURL = spyOn(window.URL, "createObjectURL").mockReturnValue("blob:mock-url");
    const mockRevokeObjectURL = spyOn(window.URL, "revokeObjectURL").mockImplementation(() => {});

    let clicked = false;
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = (tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === "a") {
        el.click = () => {
          clicked = true;
        };
      }
      return el;
    };

    try {
      downloadIcsFile(event);
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(clicked).toBe(true);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    } finally {
      mockCreateObjectURL.mockRestore();
      mockRevokeObjectURL.mockRestore();
      window.URL.createObjectURL = originalCreateObjectURL;
      window.URL.revokeObjectURL = originalRevokeObjectURL;
      document.createElement = originalCreateElement;
    }
  });
});
