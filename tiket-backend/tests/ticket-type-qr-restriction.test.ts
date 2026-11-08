import { describe, expect, test } from "bun:test";
import { HttpError } from "../src/utils/errors";

function validateTicketTemplateQrRestriction(templateConfig?: {
  layers?: Array<{ type: string }>;
} | null) {
  if (templateConfig?.layers) {
    const qrCount = templateConfig.layers.filter((l) => l.type === "qr").length;
    if (qrCount > 1) {
      throw new HttpError(400, "Only one QR code layer is allowed.");
    }
  }
}

describe("Ticket Type QR Layer Restriction", () => {
  test("1. Allows template with zero QR layers", () => {
    expect(() =>
      validateTicketTemplateQrRestriction({
        layers: [
          { type: "text" },
          { type: "text" },
        ],
      }),
    ).not.toThrow();
  });

  test("2. Allows template with exactly one QR layer", () => {
    expect(() =>
      validateTicketTemplateQrRestriction({
        layers: [
          { type: "text" },
          { type: "qr" },
        ],
      }),
    ).not.toThrow();
  });

  test("3. Throws 400 HttpError when more than one QR layer is present", () => {
    expect(() =>
      validateTicketTemplateQrRestriction({
        layers: [
          { type: "text" },
          { type: "qr" },
          { type: "qr" },
        ],
      }),
    ).toThrow(new HttpError(400, "Only one QR code layer is allowed."));
  });

  test("4. Allows null or undefined templateConfig without error", () => {
    expect(() => validateTicketTemplateQrRestriction(null)).not.toThrow();
    expect(() => validateTicketTemplateQrRestriction(undefined)).not.toThrow();
  });
});

