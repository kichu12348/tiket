import type { TicketLayoutLayer } from "@/types/ticketType";

let layerCounter = 0;
export function generateLayerId(prefix = "layer"): string {
  layerCounter += 1;
  return `${prefix}_${Date.now()}_${layerCounter}`;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function calculateFitScale(
  viewportWidth: number,
  viewportHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  paddingX = 48,
  paddingY = 48,
): number {
  if (!viewportWidth || !viewportHeight || !canvasWidth || !canvasHeight) {
    return Math.min(0.2, 400 / (canvasWidth || 2082));
  }
  const availW = Math.max(48, viewportWidth - paddingX);
  const availH = Math.max(48, viewportHeight - paddingY);
  const scale = Math.min(availW / canvasWidth, availH / canvasHeight);
  return Math.max(0.01, Math.min(2, Number(scale.toFixed(4))));
}

export function createDefaultTextLayer(
  canvasWidth: number,
  canvasHeight: number,
): TicketLayoutLayer {
  const defaultW = Math.min(
    600,
    Math.max(220, Math.round(canvasWidth * 0.3)),
  );
  const defaultH = Math.min(
    100,
    Math.max(40, Math.round(canvasHeight * 0.16)),
  );
  const defaultFs = Math.min(
    64,
    Math.max(20, Math.round(canvasHeight * 0.08)),
  );
  return {
    id: generateLayerId("text"),
    type: "text",
    name: "Delegate Name",
    tokenOrText: "{{name}}",
    x: Math.round(canvasWidth * 0.1),
    y: Math.round(canvasHeight * 0.35),
    width: defaultW,
    height: defaultH,
    fontSize: defaultFs,
    maxLines: 1,
    lineSpacing: 0,
    fontColor: "#ffffff",
  };
}

export function createDefaultQrLayer(
  canvasWidth: number,
  canvasHeight: number,
): TicketLayoutLayer {
  const size = Math.min(260, Math.max(80, Math.round(canvasHeight * 0.48)));
  return {
    id: generateLayerId("qr"),
    type: "qr",
    name: "QR Code",
    tokenOrText: "{{ticket_code}}",
    x: Math.max(0, Math.round(canvasWidth - size - canvasWidth * 0.07)),
    y: Math.max(0, Math.round((canvasHeight - size) / 2)),
    width: size,
    height: size,
    fontSize: 14,
    maxLines: 1,
    lineSpacing: 0,
    fontColor: "#000000",
  };
}

