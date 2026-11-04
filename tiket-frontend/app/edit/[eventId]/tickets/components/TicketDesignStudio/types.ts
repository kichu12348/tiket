export type TicketElementType = "qr" | "variable" | "text";

export interface TicketElementStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  color?: string;
  textAlign?: "left" | "center" | "right";
  autoFitText?: boolean;
  qrFgColor?: string;
  qrBgColor?: string;
}

export interface TicketCanvasElement {
  id: string;
  type: TicketElementType;
  label: string;
  variableKey?: string;
  customText?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
  zIndex: number;
  style: TicketElementStyle;
}

export interface TicketCanvasConfig {
  canvasWidth: number;
  canvasHeight: number;
  elements: TicketCanvasElement[];
}

export interface DocumentTemplate {
  id: string;
  eventId: string;
  type: "ticket" | "certificate";
  name: string;
  backgroundImageUrl?: string | null;
  elementsJson?: TicketCanvasConfig | unknown;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTemplatePayload {
  name: string;
  type: "ticket" | "certificate";
  backgroundImageUrl?: string | null;
  elementsJson?: TicketCanvasConfig | unknown;
}

export interface UpdateTemplatePayload {
  name?: string;
  backgroundImageUrl?: string | null;
  elementsJson?: TicketCanvasConfig | unknown;
}

