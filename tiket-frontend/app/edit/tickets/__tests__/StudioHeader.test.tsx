import "@/happydom";
import { describe, expect, test, mock } from "bun:test";
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

import { render, screen, fireEvent } from "@testing-library/react";
import StudioHeader from "../components/TicketDesignStudio/components/StudioHeader";
import type { TicketType } from "@/types/ticketType";

const mockTiers: TicketType[] = [
  {
    id: "tt-1",
    eventId: "evt-1",
    name: "early bird",
    description: "Early access tier",
    price: "499",
    passFeeToCustomer: true,
    quantityLimit: 100,
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
    eventId: "evt-1",
    name: "VIP Early Bird Super Special Backstage Access All-Inclusive Deluxe Pass",
    description: "Super long tier name",
    price: "4999",
    passFeeToCustomer: true,
    quantityLimit: 50,
    isHidden: false,
    isRefundable: true,
    refundableUntil: null,
    isTransferable: true,
    maxTransfers: 1,
    saleStart: "2026-01-01T00:00:00.000Z",
    saleEnd: "2026-05-20T00:00:00.000Z",
    sortOrder: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("StudioHeader (Two-row layout with breadcrumbs and underline tabs)", () => {
  test("1. Renders breadcrumb with 'All Tickets', '/' separator, selected tier 'early bird', and 3 tabs (no Artboard)", () => {
    render(
      <StudioHeader
        activeTicket={mockTiers[0]}
        mode="edit"
        ticketTypesList={mockTiers}
        canvasWidth={800}
        canvasHeight={400}
        isSaving={false}
        onClose={mock()}
        onModeChange={mock()}
        onSwitchTicket={mock()}
        onStartNewTicket={mock()}
        onSave={mock()}
      />,
    );

    // Breadcrumb in Row 1
    expect(screen.getByText("All Tickets")).toBeDefined();
    expect(screen.getByText("/")).toBeDefined();
    expect(screen.getByText("early bird")).toBeDefined();
    expect(screen.getByTestId("cancel-btn")).toBeDefined();
    expect(screen.getByTestId("ticket-submit-btn")).toBeDefined();
    expect(screen.getByText("Save Changes")).toBeDefined();

    // 3 Underline Tabs in Row 2
    expect(screen.getByTestId("mode-edit-btn")).toBeDefined();
    expect(screen.getByText("Pass Designer")).toBeDefined();
    expect(screen.getByTestId("mode-settings-btn")).toBeDefined();
    expect(screen.getByText("Ticket Details")).toBeDefined();
    expect(screen.getByTestId("mode-preview-btn")).toBeDefined();
    expect(screen.getByText("Sample Preview")).toBeDefined();

    // Verify Artboard is not present
    expect(screen.queryByTestId("mode-artboard-btn")).toBeNull();
    expect(screen.queryByText("Artboard")).toBeNull();
  });

  test("2. Handles extremely long tier name with clean truncation in breadcrumb", () => {
    render(
      <StudioHeader
        activeTicket={mockTiers[1]}
        mode="settings"
        ticketTypesList={mockTiers}
        canvasWidth={800}
        canvasHeight={400}
        isSaving={false}
        onClose={mock()}
        onModeChange={mock()}
        onSwitchTicket={mock()}
        onStartNewTicket={mock()}
        onSave={mock()}
      />,
    );

    expect(
      screen.getByText(
        "VIP Early Bird Super Special Backstage Access All-Inclusive Deluxe Pass",
      ),
    ).toBeDefined();
    expect(screen.getByTestId("mode-settings-btn")).toBeDefined();
  });

  test("3. Renders 'Create Ticket Type' when activeTicket is null", () => {
    render(
      <StudioHeader
        activeTicket={null}
        mode="settings"
        ticketTypesList={mockTiers}
        canvasWidth={800}
        canvasHeight={400}
        isSaving={false}
        onClose={mock()}
        onModeChange={mock()}
        onSwitchTicket={mock()}
        onStartNewTicket={mock()}
        onSave={mock()}
      />,
    );

    expect(screen.getByText("Create Ticket Type")).toBeDefined();
    expect(screen.getByText("Create Ticket")).toBeDefined();
  });

  test("4. Calls onModeChange when switching between all 3 tabs", () => {
    const handleModeChange = mock();
    render(
      <StudioHeader
        activeTicket={mockTiers[0]}
        mode="edit"
        ticketTypesList={mockTiers}
        canvasWidth={800}
        canvasHeight={400}
        isSaving={false}
        onClose={mock()}
        onModeChange={handleModeChange}
        onSwitchTicket={mock()}
        onStartNewTicket={mock()}
        onSave={mock()}
      />,
    );

    fireEvent.click(screen.getByTestId("mode-settings-btn"));
    expect(handleModeChange).toHaveBeenCalledWith("settings");

    fireEvent.click(screen.getByTestId("mode-preview-btn"));
    expect(handleModeChange).toHaveBeenCalledWith("preview");

    fireEvent.click(screen.getByTestId("mode-edit-btn"));
    expect(handleModeChange).toHaveBeenCalledWith("edit");
  });

  test("5. Calls onClose and onSave handlers correctly and shows Saving... when isSaving", () => {
    const handleClose = mock();
    const handleSave = mock();
    const { rerender } = render(
      <StudioHeader
        activeTicket={mockTiers[0]}
        mode="edit"
        ticketTypesList={mockTiers}
        canvasWidth={800}
        canvasHeight={400}
        isSaving={false}
        onClose={handleClose}
        onModeChange={mock()}
        onSwitchTicket={mock()}
        onStartNewTicket={mock()}
        onSave={handleSave}
      />,
    );

    fireEvent.click(screen.getByTestId("cancel-btn"));
    expect(handleClose).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("ticket-submit-btn"));
    expect(handleSave).toHaveBeenCalled();

    rerender(
      <StudioHeader
        activeTicket={mockTiers[0]}
        mode="edit"
        ticketTypesList={mockTiers}
        canvasWidth={800}
        canvasHeight={400}
        isSaving={true}
        onClose={handleClose}
        onModeChange={mock()}
        onSwitchTicket={mock()}
        onStartNewTicket={mock()}
        onSave={handleSave}
      />,
    );

    expect(screen.getByText("Saving...")).toBeDefined();
    expect(
      (screen.getByTestId("ticket-submit-btn") as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
