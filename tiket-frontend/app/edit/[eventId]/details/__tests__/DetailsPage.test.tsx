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
import type { Event } from "@/types/event";
import { useEventStore } from "@/store/useEventStore";
import EditDetailsPage from "../page";

const mockEvent: Event = {
  id: "evt-test-details-101",
  title: "Tech Summit 2026",
  description: "<p>The premier technology conference.</p>",
  coverImage: "https://example.com/banner.jpg",
  startDate: "2026-06-01T10:00:00.000Z",
  endDate: "2026-06-01T18:00:00.000Z",
  timezone: "UTC",
  registrationStart: "2026-05-01T00:00:00.000Z",
  registrationEnd: "2026-05-31T23:59:59.000Z",
  locationType: "offline",
  locationDetails: {
    address: "123 Innovation Way, San Francisco, CA",
  },
  capacity: 250,
  requireApproval: false,
  color: "#1e1e24",
  fontFamily: "Inter",
  socialLinks: {
    website: "https://techsummit2026.example.com",
    twitter: "https://x.com/techsummit",
  },
  slug: "tech-summit-2026",
  organizationId: "org-101",
  status: "published",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockUpdateEvent = mock((_id: string, payload: unknown) =>
  Promise.resolve({ ...mockEvent, ...(payload as Record<string, unknown>) }),
);

const mockToast = {
  success: mock((_msg: string) => {}),
  error: mock((_msg: string) => {}),
  info: mock((_msg: string) => {}),
};

mock.module("@/components/LocationPicker", () => ({
  default: () => <div data-testid="mock-location-picker" />,
}));

mock.module("@/components/FontPicker", () => ({
  default: () => <div data-testid="mock-font-picker" />,
}));

mock.module("@/api/events", () => ({
  getSignedUrl: mock(() =>
    Promise.resolve({
      url: "https://upload.example.com",
      max_size: 5,
      filename: "test.jpg",
    }),
  ),
  uploadToCDN: mock(() => Promise.resolve({ filename: "cdn-test.jpg" })),
  updateEvent: mockUpdateEvent,
}));

mock.module("sonner", () => ({
  toast: mockToast,
}));

describe("EditDetailsPage Component", () => {
  beforeEach(() => {
    useEventStore.setState({
      event: mockEvent,
      isLoading: false,
    });
    mockUpdateEvent.mockClear();
    mockToast.success.mockClear();
    mockToast.error.mockClear();
  });

  test("1. Renders event title and DateTimePicker triggers for dates & times", () => {
    render(<EditDetailsPage />);

    expect(screen.getByPlaceholderText("Event Name")).toHaveValue("Tech Summit 2026");
    expect(screen.getByText("Event Start Date & Time")).toBeInTheDocument();
    expect(screen.getByText("Event End Date & Time")).toBeInTheDocument();
    expect(screen.getByText("Registration Opens")).toBeInTheDocument();
    expect(screen.getByText("Registration Deadline")).toBeInTheDocument();
    expect(screen.getByText("Timezone")).toBeInTheDocument();
  });

  test("2. Successfully saves details when dates are valid", async () => {
    render(<EditDetailsPage />);

    const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateEvent).toHaveBeenCalledWith(
        "evt-test-details-101",
        expect.objectContaining({
          title: "Tech Summit 2026",
          startDate: "2026-06-01T10:00:00.000Z",
          endDate: "2026-06-01T18:00:00.000Z",
          timezone: "UTC",
        }),
      );
      expect(mockToast.success).toHaveBeenCalledWith("Event updated successfully!");
    });
  });

  test("3. Blocks save and shows error toast when endDate is before startDate", async () => {
    render(<EditDetailsPage />);

    // Clear event-end-date via its clear button or manually trigger onChange to an earlier date
    const clearBtns = screen.getAllByLabelText("Clear date");
    // Clear the end date (second date picker)
    fireEvent.click(clearBtns[1]);

    const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
    });

    expect(mockUpdateEvent).not.toHaveBeenCalled();
  });
});
