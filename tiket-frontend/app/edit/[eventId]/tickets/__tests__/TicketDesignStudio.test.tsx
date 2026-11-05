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
import TicketDesignStudio, {
  interpolateSamplePreview,
} from "../components/TicketDesignStudio";
import type { TicketType } from "@/types/ticketType";

const mockSampleTicket: TicketType = {
  id: "tt-sample-1",
  eventId: "evt-test-101",
  name: "VIP All Access",
  description: "Access to all lounges and keynotes",
  price: "2499",
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
  templateImageUrl: null,
  templateConfig: {
    canvasWidth: 800,
    canvasHeight: 400,
    layers: [
      {
        id: "l-init-name",
        type: "text",
        name: "Delegate Name",
        tokenOrText: "{{name}}",
        x: 50,
        y: 60,
        width: 250,
        height: 50,
        fontSize: 32,
        maxLines: 1,
        lineSpacing: 0,
        fontColor: "#ffffff",
      },
    ],
  },
};

const mockUpdateTicketType = mock(
  async (
    _eventId: string,
    ticketTypeId: string,
    payload: Partial<TicketType>,
  ): Promise<TicketType> => {
    return {
      ...mockSampleTicket,
      id: ticketTypeId,
      ...payload,
      updatedAt: new Date().toISOString(),
    };
  },
);

mock.module("@/api/tickets", () => ({
  getTicketTypes: mock(async () => [mockSampleTicket]),
  updateTicketType: mockUpdateTicketType,
}));

mock.module("@/api/forms", () => ({
  getFormFields: mock(async () => [
    {
      id: "f-college",
      label: "College",
      fieldType: "text",
      isRequired: false,
      sortOrder: 0,
      page: 1,
    },
    {
      id: "f-tshirt",
      label: "T-Shirt Size",
      fieldType: "select",
      isRequired: true,
      sortOrder: 1,
      page: 1,
    },
  ]),
}));

mock.module("@/api/events", () => ({
  getSignedUrl: mock(async () => ({
    url: "https://r2.tiket.app/upload",
    max_size: 10,
    filename: "events/bg-ticket.png",
  })),
  uploadToCDN: mock(async () => ({
    filename: "events/bg-ticket.png",
  })),
}));

mock.module("@/constants/config", () => ({
  getImageUrl: (fn: string) => `https://cdn.tiket.app/${fn}`,
}));

mock.module("sonner", () => ({
  toast: {
    success: mock(),
    error: mock(),
    info: mock(),
  },
}));

describe("TicketDesignStudio (MakeMyPass Caliber)", () => {
  beforeEach(() => {
    mockUpdateTicketType.mockClear();
  });

  test("1. Renders toolbar, mode switcher, artboard, and layers card", async () => {
    render(
      <TicketDesignStudio
        eventId="evt-test-101"
        ticket={mockSampleTicket}
        onClose={mock()}
      />,
    );

    expect(screen.getByTestId("ticket-design-studio")).toBeDefined();
    expect(screen.getByTestId("mode-edit-btn")).toBeDefined();
    expect(screen.getByTestId("mode-preview-btn")).toBeDefined();
    expect(screen.getByTestId("ticket-artboard")).toBeDefined();
    expect(screen.getByTestId("layers-card")).toBeDefined();
    expect(screen.getByTestId("upload-template-btn")).toBeDefined();
    expect(screen.getByTestId("save-template-btn")).toBeDefined();
  });

  test("2. Toggles between Edit Layout and Sample Preview modes", async () => {
    render(
      <TicketDesignStudio
        eventId="evt-test-101"
        ticket={mockSampleTicket}
      />,
    );

    // Initial edit mode displays raw token "{{name}}"
    expect(screen.getAllByText("{{name}}").length).toBeGreaterThan(0);

    // Click Sample Preview mode
    const previewBtn = screen.getByTestId("mode-preview-btn");
    fireEvent.click(previewBtn);

    // Should interpolate {{name}} to "Alex Morgan"
    await waitFor(() => {
      expect(screen.getByText("Alex Morgan")).toBeDefined();
    });

    // Switch back to Edit Layout
    const editBtn = screen.getByTestId("mode-edit-btn");
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getAllByText("{{name}}").length).toBeGreaterThan(0);
    });
  });

  test("3. Adds a QR Layer and another Text Layer", async () => {
    render(
      <TicketDesignStudio
        eventId="evt-test-101"
        ticket={mockSampleTicket}
      />,
    );

    // Add QR Layer
    const addQrBtn = screen.getByTestId("add-qr-layer-btn");
    fireEvent.click(addQrBtn);

    // Verify QR placeholder on canvas
    await waitFor(() => {
      expect(screen.getByTestId("qr-placeholder")).toBeDefined();
    });

    // Add another Text Layer
    const addTextBtn = screen.getByTestId("add-text-layer-btn");
    fireEvent.click(addTextBtn);

    // Should now list 3 layers in inspector
    expect(screen.getByTestId("inspector-card")).toBeDefined();
  });

  test("4. Updates layer X, Y, and typography properties in Inspector", async () => {
    render(
      <TicketDesignStudio
        eventId="evt-test-101"
        ticket={mockSampleTicket}
      />,
    );

    // Layer 1 is initially selected
    expect(screen.getByTestId("inspector-card")).toBeDefined();

    const inputX = screen.getByTestId("input-x");
    const inputY = screen.getByTestId("input-y");
    const inputFontSize = screen.getByTestId("input-font-size");
    const inputMaxLines = screen.getByTestId("input-max-lines");

    fireEvent.change(inputX, { target: { value: "120" } });
    fireEvent.change(inputY, { target: { value: "85" } });
    fireEvent.change(inputFontSize, { target: { value: "48" } });
    fireEvent.change(inputMaxLines, { target: { value: "2" } });

    expect((inputX as HTMLInputElement).value).toBe("120");
    expect((inputY as HTMLInputElement).value).toBe("85");
    expect((inputFontSize as HTMLInputElement).value).toBe("48");
    expect((inputMaxLines as HTMLInputElement).value).toBe("2");
  });

  test("5. Opens token picker and inserts token into text layer", async () => {
    render(
      <TicketDesignStudio
        eventId="evt-test-101"
        ticket={mockSampleTicket}
      />,
    );

    const tokenTrigger = screen.getByTestId("token-picker-trigger");
    fireEvent.click(tokenTrigger);

    await waitFor(() => {
      expect(screen.getByText("Ticket Code")).toBeDefined();
    });

    // Click Ticket Code
    const ticketCodeBtn = screen.getByText("Ticket Code");
    fireEvent.click(ticketCodeBtn);

    const textTokenInput = screen.getByTestId("input-text-token");
    expect((textTokenInput as HTMLInputElement).value).toBe("{{ticket_code}}");
  });

  test("6. Persists template config via PATCH on Update button click", async () => {
    const handleSaved = mock();
    render(
      <TicketDesignStudio
        eventId="evt-test-101"
        ticket={mockSampleTicket}
        onSaved={handleSaved}
      />,
    );

    // Update X coordinate
    const inputX = screen.getByTestId("input-x");
    fireEvent.change(inputX, { target: { value: "180" } });

    // Click Update
    const updateBtn = screen.getByTestId("save-template-btn");
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(mockUpdateTicketType).toHaveBeenCalledTimes(1);
    });

    const [eventId, ticketTypeId, payload] =
      mockUpdateTicketType.mock.calls[0] as [
        string,
        string,
        Partial<TicketType>,
      ];
    expect(eventId).toBe("evt-test-101");
    expect(ticketTypeId).toBe("tt-sample-1");
    expect(payload.templateConfig).toBeDefined();
    expect(payload.templateConfig?.layers[0].x).toBe(180);
    expect(handleSaved).toHaveBeenCalledTimes(1);
  });

  test("7. Correctly interpolates preview strings", () => {
    const result = interpolateSamplePreview(
      "{{name}} - {{ticket_code}} at {{event_title}} ({{form.College}})",
      "VIP Pass",
      "Tiket Summit",
    );
    expect(result).toBe(
      "Alex Morgan - TIK-9842-X7 at Tiket Summit (Stanford University)",
    );
  });
});
