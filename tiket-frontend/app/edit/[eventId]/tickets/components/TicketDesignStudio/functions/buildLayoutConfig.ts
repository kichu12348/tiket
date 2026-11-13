import type { TicketLayoutConfig } from "@/types/ticketType";
import type { TicketDesignOutput } from "../types";
import {
  DEFAULT_ARTBOARD_WIDTH,
  DEFAULT_ARTBOARD_HEIGHT,
} from "../hooks/useTicketDesignState";

/**
 * Transforms canvas design output into the canonical TicketLayoutConfig format.
 */
export function buildTicketLayoutConfig(
  designOutput: TicketDesignOutput,
): TicketLayoutConfig {
  return {
    canvasWidth: Math.round(
      designOutput.artboardW || DEFAULT_ARTBOARD_WIDTH,
    ),
    canvasHeight: Math.round(
      designOutput.artboardH || DEFAULT_ARTBOARD_HEIGHT,
    ),
    layers: designOutput.layers.map((l) => ({
      id: l.id,
      type: l.type,
      name: l.name || (l.type === "qr" ? "QR Code" : l.text || "Text"),
      tokenOrText:
        l.tokenOrText ||
        l.text ||
        (l.type === "qr" ? "{{ticket_code}}" : "Text"),
      x: Math.round(l.x),
      y: Math.round(l.y),
      width: Math.round(
        l.width || (l.type === "qr" ? l.size : Math.max(120, l.size * 5)),
      ),
      height: Math.round(
        l.height ||
          (l.type === "qr" ? l.size : Math.max(30, Math.round(l.size * 1.4))),
      ),
      fontSize: Math.round(
        l.type === "text" ? l.size || l.fontSize || 48 : 14,
      ),
      fontColor:
        l.color ||
        l.fontColor ||
        (l.type === "qr" ? l.qrColor || "#000000" : "#ffffff"),
      maxLines: l.maxLines || 1,
      lineSpacing: l.lineSpacing || 0,
      fontWeight: l.fontWeight || (l.type === "text" ? "600" : undefined),
      fontFamily:
        l.fontFamily || (l.type === "text" ? "'Inter', sans-serif" : undefined),
      fontStyle: l.fontStyle || (l.type === "text" ? "normal" : undefined),
      textDecoration:
        l.textDecoration || (l.type === "text" ? "none" : undefined),
      qrColor:
        l.type === "qr"
          ? l.qrColor || l.color || l.fontColor || "#000000"
          : undefined,
      qrBgColor: l.type === "qr" ? l.qrBgColor || "#ffffff" : undefined,
    })),
  };
}
