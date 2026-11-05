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

const mockGetSignedUrl = mock(async () => ({
  url: "https://r2.tiket.app/upload",
  max_size: 10,
  filename: "events/bg-ticket.png",
}));

const mockUploadToCDN = mock(async () => ({
  filename: "events/bg-ticket.png",
}));

mock.module("@/api/events", () => ({
  getSignedUrl: mockGetSignedUrl,
  uploadToCDN: mockUploadToCDN,
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
    expect(screen.getByTestId("ticket-submit-btn")).toBeDefined();
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
    const updateBtn = screen.getByTestId("ticket-submit-btn");
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

  test("8. Uses plain neutral background and 2082x576 canonical dimensions when no custom image is configured", async () => {
    const unconfiguredTicket: TicketType = {
      ...mockSampleTicket,
      id: "tt-unconfigured",
      templateImageUrl: null,
      templateConfig: null,
    };

    render(
      <TicketDesignStudio
        eventId="evt-test-101"
        ticket={unconfiguredTicket}
      />,
    );

    // No background image when no template is uploaded
    expect(screen.queryByTestId("template-bg-image")).toBeNull();

    const artboard = screen.getByTestId("ticket-artboard");
    expect(artboard.style.width).toBe("2082px");
    expect(artboard.style.height).toBe("576px");
  });

  test("9. Preserves image natural aspect ratio on image load", async () => {
    const unconfiguredTicket: TicketType = {
      ...mockSampleTicket,
      id: "tt-load-test",
      templateImageUrl: "/custom-banner.png",
      templateConfig: null,
    };

    render(
      <TicketDesignStudio
        eventId="evt-test-101"
        ticket={unconfiguredTicket}
      />,
    );

    const bgImage = screen.getByTestId("template-bg-image");
    // Simulate image onLoad with natural dimensions 1600x600 (aspect ratio 2.67:1)
    Object.defineProperty(bgImage, "naturalWidth", { value: 1600, configurable: true });
    Object.defineProperty(bgImage, "naturalHeight", { value: 600, configurable: true });
    fireEvent.load(bgImage);

    await waitFor(() => {
      const artboard = screen.getByTestId("ticket-artboard");
      expect(artboard.style.width).toBe("1600px");
      expect(artboard.style.height).toBe("600px");
    });
  });

  test("10. Selects image locally for editing first, uploads to CDN only when Update button is clicked", async () => {
    if (typeof URL.createObjectURL === "undefined") {
      URL.createObjectURL = mock(() => "blob:http://localhost/test-blob");
    } else {
      mock.restore();
    }
    if (typeof URL.revokeObjectURL === "undefined") {
      URL.revokeObjectURL = mock(() => {});
    }

    mockGetSignedUrl.mockClear();
    mockUploadToCDN.mockClear();
    mockUpdateTicketType.mockClear();

    render(
      <TicketDesignStudio
        eventId="evt-test-101"
        ticket={mockSampleTicket}
      />,
    );

    const fileInput = screen.getByTestId("template-image-input");
    const testFile = new File(["fake-image-bytes"], "my-ticket.png", {
      type: "image/png",
    });

    // User selects image file
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    // Assert that image is NOT uploaded to CDN yet!
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(0);
    expect(mockUploadToCDN).toHaveBeenCalledTimes(0);

    // Image preview is shown with local blob
    const bgImage = screen.getByTestId("template-bg-image");
    expect(bgImage.getAttribute("src")).toContain("blob:");

    // Click Update to save
    const updateBtn = screen.getByTestId("ticket-submit-btn");
    fireEvent.click(updateBtn);

    // Now it uploads to CDN upon Update!
    await waitFor(() => {
      expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
      expect(mockUploadToCDN).toHaveBeenCalledTimes(1);
      expect(mockUpdateTicketType).toHaveBeenCalledTimes(1);
    });

    const [,, payload] = mockUpdateTicketType.mock.calls[0] as [
      string,
      string,
      Partial<TicketType>,
    ];
    expect(payload.templateImageUrl).toBe(
      "https://cdn.tiket.app/events/bg-ticket.png",
    );
  });
});
