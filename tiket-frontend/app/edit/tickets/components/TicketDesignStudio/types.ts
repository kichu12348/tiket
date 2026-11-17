export type { TicketLayoutLayer, TicketLayoutConfig } from "@/types/ticketType";

export type StudioMode = "edit" | "settings" | "preview";

export interface TicketDesignerLayer {
  id: string;
  type: "text" | "qr";
  x: number;
  y: number;
  size: number;
  text?: string;
  color?: string;
  // Compatibility with TicketLayoutLayer
  name?: string;
  tokenOrText?: string;
  fontSize?: number;
  fontColor?: string;
  width?: number;
  height?: number;
  maxLines?: number;
  lineSpacing?: number;
  fontWeight?: string;
  fontFamily?: string;
  fontStyle?: string;
  textDecoration?: string;
  qrColor?: string;
  qrBgColor?: string;
}

export interface TicketDesignOutput {
  artboardW: number;
  artboardH: number;
  templateImageUrl: string | null;
  layers: TicketDesignerLayer[];
}

export type TicketElementType =
  | "qr"
  | "variable"
  | "form_field"
  | "text"
  | "badge";

export interface TicketLayerConditionBranch {
  id: string;
  sourceType: "ticketType" | "formField";
  sourceKey: string; // ticketType.name / ticketType.id or formField.label
  operator: "equals" | "not_equals" | "contains";
  value: string;
  thenEffect: {
    visible: boolean;
    textOverride?: string;
    colorOverride?: string;
    bgColorOverride?: string;
  };
}

export interface TicketLayerElseBehavior {
  visible: boolean;
  textOverride?: string;
  colorOverride?: string;
  bgColorOverride?: string;
}

export interface ResolvedTicketLayer {
  visible: boolean;
  text?: string;
  color?: string;
  bgColor?: string;
}

export interface TicketElementStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  color?: string;
  textAlign?: "left" | "center" | "right";
  autoFitText?: boolean;
  qrFgColor?: string;
  qrBgColor?: string;
  backgroundColor?: string;
  bgColor?: string;
  borderRadius?: number;
  padding?: number | string;
  opacity?: number;
  lineHeight?: number | string;
  letterSpacing?: number | string;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
}

export interface TicketCanvasElement {
  id: string;
  type: TicketElementType;
  label?: string;
  variableKey?: string;
  customText?: string;
  content?: string;
  fieldId?: string;
  fieldLabel?: string;
  fallbackText?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // degrees
  zIndex?: number;
  style: TicketElementStyle;
  conditionalRules?: TicketLayerConditionBranch[];
  elseBehavior?: TicketLayerElseBehavior;
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
