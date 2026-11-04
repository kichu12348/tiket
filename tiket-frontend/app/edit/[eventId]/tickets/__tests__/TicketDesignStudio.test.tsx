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
import TicketDesignStudio from "../components/TicketDesignStudio";
import type {
  DocumentTemplate,
  CreateTemplatePayload,
  UpdateTemplatePayload,
  TicketCanvasConfig,
} from "../components/TicketDesignStudio/types";

let savedTemplates: DocumentTemplate[] = [];

const mockGetTemplates = mock(async (_eventId: string): Promise<DocumentTemplate[]> => {
  return [...savedTemplates];
});

const mockCreateTemplate = mock(
  async (eventId: string, payload: CreateTemplatePayload): Promise<DocumentTemplate> => {
    const newDoc: DocumentTemplate = {
      id: "tpl-101",
      eventId,
      type: payload.type,
      name: payload.name,
      backgroundImageUrl: payload.backgroundImageUrl || null,
      elementsJson: payload.elementsJson,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    savedTemplates.push(newDoc);
    return newDoc;
  },
);

const mockUpdateTemplate = mock(
  async (templateId: string, payload: UpdateTemplatePayload): Promise<DocumentTemplate> => {
    const existingIndex = savedTemplates.findIndex((t) => t.id === templateId);
    if (existingIndex >= 0) {
      savedTemplates[existingIndex] = {
        ...savedTemplates[existingIndex],
        ...payload,
        updatedAt: new Date().toISOString(),
      };
      return savedTemplates[existingIndex];
    }
    const updated: DocumentTemplate = {
      id: templateId,
      eventId: "evt-test-101",
      type: "ticket",
      name: payload.name || "Ticket Template",
      backgroundImageUrl: payload.backgroundImageUrl || null,
      elementsJson: payload.elementsJson,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    savedTemplates.push(updated);
    return updated;
  },
);

mock.module("@/api/tickets", () => ({
  getTemplates: mockGetTemplates,
  createTemplate: mockCreateTemplate,
  updateTemplate: mockUpdateTemplate,
  deleteTemplate: mock(async () => ({ message: "Deleted" })),
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
  API_ENDPOINTS: {
    TEMPLATES: {
      GET_ALL: (id: string) => `/api/templates/events/${id}`,
      CREATE: (id: string) => `/api/templates/events/${id}`,
      UPDATE: (id: string) => `/api/templates/${id}`,
      DELETE: (id: string) => `/api/templates/${id}`,
    },
  },
}));

mock.module("sonner", () => ({
  toast: {
    success: mock(),
    error: mock(),
    info: mock(),
  },
}));

describe("TicketDesignStudio Integration", () => {
  beforeEach(() => {
    savedTemplates = [];
    mockGetTemplates.mockClear();
    mockCreateTemplate.mockClear();
    mockUpdateTemplate.mockClear();
  });

  test("1. Renders TicketDesignStudio toolbar, presets, and artboard canvas", async () => {
    render(<TicketDesignStudio eventId="evt-test-101" />);

    expect(screen.getByTestId("ticket-design-studio")).toBeDefined();
    expect(screen.getByText("Upload Background")).toBeDefined();
    expect(screen.getByText("Landscape (1200x600)")).toBeDefined();
    expect(screen.getByText("Vertical (750x1200)")).toBeDefined();
    expect(screen.getByText("Badge (800x1000)")).toBeDefined();
    expect(screen.getByText("Save Template")).toBeDefined();
  });

  test("2. Adds an Attendee Name placeholder and QR Code to the canvas", async () => {
    render(<TicketDesignStudio eventId="evt-test-101" />);

    // Add Name element
    const nameBtn = screen.getByText("Name");
    fireEvent.click(nameBtn);

    // Verify name element on canvas
    await waitFor(() => {
      expect(screen.getByText("Alex Johnson")).toBeDefined();
    });

    // Add QR Code
    const qrBtn = screen.getByText("QR Code");
    fireEvent.click(qrBtn);

    // Verify 2 layers are listed
    await waitFor(() => {
      expect(screen.getByText("Layers (2)")).toBeDefined();
    });
  });

  test("3. Updates X, Y, and Rotation properties in the inspector", async () => {
    render(<TicketDesignStudio eventId="evt-test-101" />);

    // Add Name placeholder
    fireEvent.click(screen.getByText("Name"));

    await waitFor(() => {
      expect(screen.getByText("Inspector: Attendee Name")).toBeDefined();
    });

    // Inspect inputs: X, Y, Rotation
    const xInput = screen.getByLabelText("X (px)");
    const yInput = screen.getByLabelText("Y (px)");
    const rotInput = screen.getByLabelText("Rotation (°)");

    fireEvent.change(xInput, { target: { value: "140" } });
    fireEvent.change(yInput, { target: { value: "95" } });
    fireEvent.change(rotInput, { target: { value: "45" } });

    expect((xInput as HTMLInputElement).value).toBe("140");
    expect((yInput as HTMLInputElement).value).toBe("95");
    expect((rotInput as HTMLInputElement).value).toBe("45");
  });

  test("4. Persists the TicketCanvasConfig payload on Save Template", async () => {
    render(<TicketDesignStudio eventId="evt-test-101" />);

    // Add Name & QR
    fireEvent.click(screen.getByText("Name"));
    fireEvent.click(screen.getByText("QR Code"));

    // Click Save Template
    const saveBtn = screen.getByText("Save Template");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockCreateTemplate).toHaveBeenCalledTimes(1);
    });

    const [eventId, payload] = mockCreateTemplate.mock.calls[0] as [
      string,
      CreateTemplatePayload,
    ];
    expect(eventId).toBe("evt-test-101");
    expect(payload.type).toBe("ticket");
    expect(payload.name).toBe("Ticket Template");

    const config = payload.elementsJson as TicketCanvasConfig;
    expect(config.canvasWidth).toBe(1200);
    expect(config.canvasHeight).toBe(600);
    expect(config.elements).toHaveLength(2);
    expect(config.elements.some((el) => el.type === "variable" && el.variableKey === "{{attendee.name}}")).toBe(true);
    expect(config.elements.some((el) => el.type === "qr")).toBe(true);
  });
});

