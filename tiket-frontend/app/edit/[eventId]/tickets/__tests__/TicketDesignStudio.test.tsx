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
  getTicketTypes: mock(async () => [
    {
      id: "tt-1",
      name: "Early Bird VIP",
      price: "12000",
      isTransferable: true,
      isRefundable: true,
    },
    {
      id: "tt-2",
      name: "General Admission",
      price: "5000",
      isTransferable: true,
      isRefundable: false,
    },
  ]),
}));

mock.module("@/api/forms", () => ({
  getFormFields: mock(async () => [
    {
      id: "f-dietary",
      label: "Dietary Preference",
      type: "select",
      required: false,
    },
    {
      id: "f-tshirt",
      label: "T-Shirt Size",
      type: "text",
      required: true,
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

  test("5. Renders Form Elements and drops custom form field onto canvas", async () => {
    render(<TicketDesignStudio eventId="evt-test-101" />);

    // Wait for form fields from API to render under Form Elements
    await waitFor(() => {
      expect(screen.getByText("Dietary Preference")).toBeDefined();
      expect(screen.getByText("T-Shirt Size")).toBeDefined();
    });

    // Click Dietary Preference to drop as form_field layer
    fireEvent.click(screen.getByText("Dietary Preference"));

    // Verify canvas displays form field placeholder
    await waitFor(() => {
      expect(screen.getByText("[Dietary Preference]")).toBeDefined();
      expect(screen.getByText("Inspector: Dietary Preference")).toBeDefined();
    });

    // Inspect fallback text input
    const fallbackInput = screen.getByPlaceholderText("e.g. Not Specified");
    expect(fallbackInput).toBeDefined();
    fireEvent.change(fallbackInput, { target: { value: "Standard Meal" } });
    expect((fallbackInput as HTMLInputElement).value).toBe("Standard Meal");
  });

  test("6. Configures If / Else conditional rules and else fallback in the Inspector Sidebar", async () => {
    render(<TicketDesignStudio eventId="evt-test-101" />);

    // Add Name element
    fireEvent.click(screen.getByText("Name"));

    await waitFor(() => {
      expect(screen.getByText("Inspector: Attendee Name")).toBeDefined();
    });

    // Click Add Rule button
    const addRuleBtn = screen.getByTestId("add-condition-rule-btn");
    fireEvent.click(addRuleBtn);

    // Rule card and ELSE card should appear
    await waitFor(() => {
      expect(screen.getByText("IF Branch #1")).toBeDefined();
      expect(screen.getByTestId("else-card")).toBeDefined();
    });

    // Configure IF branch: text override "VIP GUEST", color override "#FFD700"
    const textOverrideInput = screen.getByPlaceholderText("e.g. EARLY BIRD VIP");
    fireEvent.change(textOverrideInput, { target: { value: "VIP GUEST" } });
    expect((textOverrideInput as HTMLInputElement).value).toBe("VIP GUEST");

    // Configure ELSE fallback: text override "REGULAR GUEST"
    const elseTextInput = screen.getByPlaceholderText("e.g. REGULAR");
    fireEvent.change(elseTextInput, { target: { value: "REGULAR GUEST" } });
    expect((elseTextInput as HTMLInputElement).value).toBe("REGULAR GUEST");
  });

  test("7. Preview As... Simulator Bar toggles and simulates conditional layer changes live", async () => {
    render(<TicketDesignStudio eventId="evt-test-101" />);

    // Add Name element and drop a form field
    fireEvent.click(screen.getByText("Name"));

    await waitFor(() => {
      expect(screen.getByText("Preview As (Simulator)")).toBeDefined();
    });

    // Toggle Simulator Mode ON
    const simToggleBtn = screen.getByTestId("toggle-simulator-btn");
    fireEvent.click(simToggleBtn);

    // Simulator bar controls should appear
    await waitFor(() => {
      expect(screen.getByText("Preview Active")).toBeDefined();
      expect(screen.getByTestId("sim-tier-select")).toBeDefined();
    });

    // Select tier Early Bird VIP
    const tierSelect = screen.getByTestId("sim-tier-select") as HTMLSelectElement;
    fireEvent.change(tierSelect, { target: { value: "tt-1" } });
    expect(tierSelect.value).toBe("tt-1");

    // Enter simulated Dietary Preference
    await waitFor(() => {
      expect(screen.getByTestId("sim-input-dietary-preference")).toBeDefined();
    });
    const dietaryInput = screen.getByTestId("sim-input-dietary-preference");
    fireEvent.change(dietaryInput, { target: { value: "Vegan" } });
    expect((dietaryInput as HTMLInputElement).value).toBe("Vegan");
  });

  test("8. Persists conditional rules and form field properties when saving template", async () => {
    render(<TicketDesignStudio eventId="evt-test-101" />);

    // Add form field Dietary Preference
    await waitFor(() => {
      expect(screen.getByText("Dietary Preference")).toBeDefined();
    });
    fireEvent.click(screen.getByText("Dietary Preference"));

    // Add condition rule
    const addRuleBtn = screen.getByTestId("add-condition-rule-btn");
    fireEvent.click(addRuleBtn);

    const textOverrideInput = screen.getByPlaceholderText("e.g. EARLY BIRD VIP");
    fireEvent.change(textOverrideInput, { target: { value: "VIP MEAL" } });

    // Save Template
    const saveBtn = screen.getByText("Save Template");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockCreateTemplate).toHaveBeenCalledTimes(1);
    });

    const [, payload] = mockCreateTemplate.mock.calls[0] as [
      string,
      CreateTemplatePayload,
    ];
    const config = payload.elementsJson as TicketCanvasConfig;
    const formElement = config.elements.find((el) => el.type === "form_field");
    expect(formElement).toBeDefined();
    expect(formElement?.fieldLabel).toBe("Dietary Preference");
    expect(formElement?.conditionalRules).toBeDefined();
    expect(formElement?.conditionalRules?.[0].thenEffect.textOverride).toBe("VIP MEAL");
    expect(formElement?.elseBehavior).toBeDefined();
  });
});

