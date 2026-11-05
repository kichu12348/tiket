"use client";

import React from "react";
import QRCode from "react-qr-code";
import { Lock } from "lucide-react";
import type {
  TicketPassData,
  TicketPassTemplate,
} from "@/types/ticket";
import type {
  TicketCanvasConfig,
  TicketCanvasElement,
  ResolvedTicketLayer,
} from "@/app/edit/[eventId]/tickets/components/TicketDesignStudio/types";
import { formatLocation } from "../../utils/formatLocation";
import styles from "./CustomTicketCanvas.module.css";

export interface CustomTicketCanvasProps {
  pass: TicketPassData;
  template?: TicketPassTemplate | null;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function formatEventDate(dateString?: string | null): string {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export function resolveVariable(key: string, pass: Partial<TicketPassData>): string {
  const normalizedKey = key.replace(/[{}]/g, "").trim().toLowerCase();

  switch (normalizedKey) {
    case "attendee.name":
    case "attendee_name":
    case "name":
      return pass.attendee?.name || "";
    case "attendee.email":
    case "attendee_email":
    case "email":
      return pass.attendee?.email || "";
    case "event.title":
    case "event_title":
    case "title":
      return pass.event?.title || "";
    case "tickettype.name":
    case "ticket.type":
    case "ticket_type":
    case "tickettype":
    case "type":
      return pass.ticketType?.name || "";
    case "event.startdate":
    case "event.date":
    case "event_date":
    case "date":
      return formatEventDate(pass.event?.startDate);
    case "event.enddate":
    case "event.end_date":
      return formatEventDate(pass.event?.endDate);
    case "event.locationdetails":
    case "event.location":
    case "location":
      return formatLocation(pass.event?.locationType, pass.event?.locationDetails);
    case "ticket.id":
    case "ticketid":
    case "id":
      return pass.id || "";
    case "ticket_code":
    case "ticket.code":
    case "code":
      return pass.qrCode || pass.id || "";
    case "order.id":
    case "orderid":
    case "order_id":
      return pass.order?.id || "";
    default: {
      const cleanKey = normalizedKey
        .replace(/^responses?\./, "")
        .replace(/^form\./, "");
      const match = pass.responses?.find((r) => {
        const cleanLabel = r.label.trim().toLowerCase();
        return (
          cleanLabel === cleanKey ||
          cleanLabel === normalizedKey ||
          r.label.toLowerCase() === cleanKey
        );
      });
      if (match && match.value) {
        return match.value;
      }
      return "";
    }
  }
}

export function interpolateText(text: string, pass: Partial<TicketPassData>): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    return resolveVariable(key, pass);
  });
}

export function getElementText(
  el: TicketCanvasElement,
  pass: Partial<TicketPassData>,
): string {
  // If element is a form field
  if (el.type === "form_field") {
    // 1. If content or variableKey is present, resolve that first
    if (el.content) {
      const text = interpolateText(el.content, pass);
      if (text) return text;
    }
    if (el.variableKey) {
      const text = resolveVariable(el.variableKey, pass);
      if (text) return text;
    }
    // 2. Search responses directly by fieldLabel or label or fieldId
    const targetLabel = (el.fieldLabel || el.label || "").trim().toLowerCase();
    const match = pass?.responses?.find(
      (r) => r.label.trim().toLowerCase() === targetLabel,
    );
    if (match && match.value) {
      return match.value;
    }
    // 3. If optional form field was left blank / unanswered, return fallbackText
    return el.fallbackText || "";
  }

  // If badge element
  if (el.type === "badge") {
    if (el.content) return interpolateText(el.content, pass);
    if (el.customText) return interpolateText(el.customText, pass);
    return el.label || "";
  }

  if (el.content) {
    return interpolateText(el.content, pass);
  }
  if (el.variableKey) {
    return resolveVariable(el.variableKey, pass);
  }
  if (el.customText) {
    return interpolateText(el.customText, pass);
  }
  return el.label || "";
}

/**
 * Pure evaluator for element If / Else conditions against pass data.
 */
export function resolveTicketLayer(
  element: TicketCanvasElement,
  passData: Partial<TicketPassData>,
): ResolvedTicketLayer {
  const defaultText = getElementText(element, passData);
  const defaultColor = element.style?.color;
  const defaultBgColor =
    element.style?.backgroundColor || element.style?.bgColor;

  // 1. If no rules exist, default to visible with existing text and styles
  if (!element.conditionalRules || element.conditionalRules.length === 0) {
    return {
      visible: true,
      text: defaultText,
      color: defaultColor,
      bgColor: defaultBgColor,
    };
  }

  // 2. Evaluate sequential branches (first matching rule wins)
  for (const branch of element.conditionalRules) {
    let actualValue = "";

    if (branch.sourceType === "ticketType") {
      actualValue =
        passData.ticketType?.name || passData.ticketType?.id || "";
    } else if (branch.sourceType === "formField") {
      const cleanSourceKey = branch.sourceKey
        .replace(/[{}]/g, "")
        .replace(/^form\./i, "")
        .replace(/^responses?\./i, "")
        .trim()
        .toLowerCase();

      const matchedResponse = passData.responses?.find((r) => {
        const cleanLabel = r.label
          .replace(/[{}]/g, "")
          .replace(/^form\./i, "")
          .replace(/^responses?\./i, "")
          .trim()
          .toLowerCase();
        return (
          cleanLabel === cleanSourceKey ||
          r.label.toLowerCase() === branch.sourceKey.toLowerCase()
        );
      });

      actualValue = matchedResponse?.value || "";
    }

    const normActual = actualValue.trim().toLowerCase();
    const normExpected = (branch.value || "").trim().toLowerCase();

    let matched = false;
    switch (branch.operator) {
      case "equals":
        matched = normActual === normExpected;
        break;
      case "not_equals":
        matched = normActual !== normExpected;
        break;
      case "contains":
        matched = normActual.includes(normExpected);
        break;
      default:
        matched = false;
    }

    if (matched) {
      return {
        visible: branch.thenEffect.visible,
        text:
          branch.thenEffect.textOverride !== undefined &&
          branch.thenEffect.textOverride !== ""
            ? branch.thenEffect.textOverride
            : defaultText,
        color: branch.thenEffect.colorOverride || defaultColor,
        bgColor: branch.thenEffect.bgColorOverride || defaultBgColor,
      };
    }
  }

  // 3. Fallback to elseBehavior if defined
  if (element.elseBehavior) {
    return {
      visible: element.elseBehavior.visible,
      text:
        element.elseBehavior.textOverride !== undefined &&
        element.elseBehavior.textOverride !== ""
          ? element.elseBehavior.textOverride
          : defaultText,
      color: element.elseBehavior.colorOverride || defaultColor,
      bgColor: element.elseBehavior.bgColorOverride || defaultBgColor,
    };
  }

  // 4. Default if no branch matched and no elseBehavior
  return {
    visible: true,
    text: defaultText,
    color: defaultColor,
    bgColor: defaultBgColor,
  };
}

function calculateAutoFitFontSize(
  text: string,
  baseFontSize: number,
  maxWidth: number,
  fontFamily: string = "sans-serif",
  fontWeight: string | number = "normal",
): number {
  if (typeof window === "undefined" || !text || maxWidth <= 0) {
    return baseFontSize;
  }
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx && typeof ctx.measureText === "function") {
      ctx.font = `${fontWeight} ${baseFontSize}px ${fontFamily}`;
      const measured = ctx.measureText(text).width;
      if (measured > maxWidth) {
        const scale = maxWidth / measured;
        return Math.max(8, Math.floor(baseFontSize * scale));
      }
    }
  } catch {
    // Graceful fallback
  }
  return baseFontSize;
}

export function CustomTicketCanvas({
  pass,
  template,
  containerRef: externalContainerRef,
}: CustomTicketCanvasProps) {
  const localContainerRef = React.useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef || localContainerRef;

  const perTicketConfig = pass.ticketType?.templateConfig;
  const isPerTicket = Boolean(
    perTicketConfig && Array.isArray(perTicketConfig.layers),
  );

  const elementsJson = template?.elementsJson;
  const parsedConfig: TicketCanvasConfig = React.useMemo(() => {
    if (isPerTicket && perTicketConfig) {
      return {
        canvasWidth: perTicketConfig.canvasWidth || 800,
        canvasHeight: perTicketConfig.canvasHeight || 400,
        elements: [],
      };
    }
    if (!elementsJson) {
      return { canvasWidth: 600, canvasHeight: 300, elements: [] };
    }
    if (typeof elementsJson === "string") {
      try {
        return JSON.parse(elementsJson) as TicketCanvasConfig;
      } catch {
        return { canvasWidth: 600, canvasHeight: 300, elements: [] };
      }
    }
    return elementsJson as TicketCanvasConfig;
  }, [isPerTicket, perTicketConfig, elementsJson]);

  const canvasWidth = isPerTicket
    ? perTicketConfig?.canvasWidth || 800
    : parsedConfig.canvasWidth || 600;
  const canvasHeight = isPerTicket
    ? perTicketConfig?.canvasHeight || 400
    : parsedConfig.canvasHeight || 300;
  const backgroundImageUrl = isPerTicket
    ? pass.ticketType?.templateImageUrl || template?.backgroundImageUrl
    : template?.backgroundImageUrl;
  const elements = parsedConfig.elements || [];
  const perTicketLayers = perTicketConfig?.layers || [];

  const [containerWidth, setContainerWidth] = React.useState<number>(canvasWidth);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const width = el.getBoundingClientRect().width;
      if (width > 0) {
        setContainerWidth(width);
      }
    };

    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          if (width > 0) {
            setContainerWidth(width);
          }
        }
      });
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, [canvasWidth, containerRef]);

  const scale = canvasWidth > 0 ? containerWidth / canvasWidth : 1;
  const containerHeight = canvasHeight * scale;

  return (
    <div
      ref={containerRef}
      className={styles.canvasContainer}
      style={{
        width: "100%",
        height: `${containerHeight}px`,
      }}
      data-testid="custom-ticket-container"
    >
      <div
        className={styles.canvasArtboard}
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
        data-testid="custom-ticket-artboard"
      >
        {/* Background Image filling canonical artboard */}
        {backgroundImageUrl && (
          <img
            src={backgroundImageUrl}
            alt="Ticket Background"
            className={styles.canvasBackground}
            data-testid="custom-ticket-bg"
          />
        )}

        {/* Per-Ticket Layout Layers */}
        {isPerTicket
          ? perTicketLayers.map((layer) => {
              const isQr = layer.type === "qr";
              const rotation = layer.rotation ?? 0;

              if (isQr) {
                const isScannable =
                  pass.status === "active" || pass.status === "used";

                const elementStyle: React.CSSProperties = {
                  position: "absolute",
                  left: `${layer.x}px`,
                  top: `${layer.y}px`,
                  width: `${layer.width}px`,
                  height: `${layer.height}px`,
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                };

                if (isScannable) {
                  return (
                    <div
                      key={layer.id}
                      className={styles.elementWrapper}
                      style={elementStyle}
                      data-testid="qr-container"
                    >
                      <div
                        className={styles.qrContainer}
                        style={{
                          backgroundColor: "#ffffff",
                          borderRadius: 6,
                          padding: 6,
                        }}
                      >
                        <QRCode
                          value={pass.qrCode}
                          size={Math.max(
                            20,
                            Math.min(layer.width, layer.height) - 12,
                          )}
                          fgColor="#000000"
                          bgColor="#ffffff"
                          className={styles.qrSvg}
                        />
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={layer.id}
                    className={styles.elementWrapper}
                    style={elementStyle}
                    data-testid="locked-qr-badge"
                  >
                    <div className={styles.lockedQrBadge}>
                      <Lock size={16} className={styles.lockedQrIcon} />
                      <span className={styles.lockedQrText}>
                        {pass.status === "pending_approval"
                          ? "PENDING APPROVAL"
                          : "LOCKED"}
                      </span>
                      <span className={styles.lockedQrSubtext}>
                        QR Unscannable
                      </span>
                    </div>
                  </div>
                );
              }

              // Text Layer
              const rawText = interpolateText(layer.tokenOrText, pass);

              return (
                <div
                  key={layer.id}
                  className={styles.elementWrapper}
                  style={{
                    position: "absolute",
                    left: `${layer.x}px`,
                    top: `${layer.y}px`,
                    width: `${layer.width}px`,
                    height: `${layer.height}px`,
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: "center center",
                    color: layer.fontColor || "inherit",
                    fontSize: `${layer.fontSize}px`,
                    letterSpacing: `${layer.lineSpacing}px`,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "flex-start",
                    overflow: "hidden",
                    wordBreak: "break-word",
                    lineHeight: 1.2,
                    boxSizing: "border-box",
                  }}
                  data-testid={`custom-element-${layer.id}`}
                >
                  <div
                    style={{
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: layer.maxLines || 1,
                      overflow: "hidden",
                      width: "100%",
                      textAlign: "left",
                    }}
                  >
                    {rawText}
                  </div>
                </div>
              );
            })
          : elements.map((el) => {
          const resolved = resolveTicketLayer(el, pass);
          if (!resolved.visible) {
            return null;
          }

          const isQr = el.type === "qr";
          const rotation = el.rotation ?? 0;

          if (isQr) {
            const isScannable =
              pass.status === "active" || pass.status === "used";

            const elementStyle: React.CSSProperties = {
              position: "absolute",
              left: `${el.x}px`,
              top: `${el.y}px`,
              width: `${el.width}px`,
              height: `${el.height}px`,
              transform: `rotate(${rotation}deg)`,
              transformOrigin: "center center",
              zIndex: el.zIndex,
            };

            if (isScannable) {
              return (
                <div
                  key={el.id}
                  className={styles.elementWrapper}
                  style={elementStyle}
                  data-testid="qr-container"
                >
                  <div
                    className={styles.qrContainer}
                    style={{
                      backgroundColor:
                        resolved.bgColor || el.style?.qrBgColor || "#ffffff",
                      borderRadius: el.style?.borderRadius || 6,
                      padding: 6,
                    }}
                  >
                    <QRCode
                      value={pass.qrCode}
                      size={Math.max(20, Math.min(el.width, el.height) - 12)}
                      fgColor={resolved.color || el.style?.qrFgColor || "#000000"}
                      bgColor={
                        resolved.bgColor || el.style?.qrBgColor || "#ffffff"
                      }
                      className={styles.qrSvg}
                    />
                  </div>
                </div>
              );
            }

            return (
              <div
                key={el.id}
                className={styles.elementWrapper}
                style={elementStyle}
                data-testid="locked-qr-badge"
              >
                <div className={styles.lockedQrBadge}>
                  <Lock size={16} className={styles.lockedQrIcon} />
                  <span className={styles.lockedQrText}>
                    {pass.status === "pending_approval"
                      ? "PENDING APPROVAL"
                      : "LOCKED"}
                  </span>
                  <span className={styles.lockedQrSubtext}>QR Unscannable</span>
                </div>
              </div>
            );
          }

          const rawText = resolved.text ?? getElementText(el, pass);
          const baseFontSize = el.style?.fontSize ?? 16;
          const isVariable =
            el.type === "variable" ||
            el.type === "form_field" ||
            Boolean(el.variableKey);
          const autoFit =
            el.style?.autoFitText ?? (isVariable ? true : false);

          const finalFontSize = autoFit
            ? calculateAutoFitFontSize(
                rawText,
                baseFontSize,
                el.width,
                el.style?.fontFamily,
                el.style?.fontWeight,
              )
            : baseFontSize;

          const isBadge = el.type === "badge";

          const elementStyle: React.CSSProperties = {
            position: "absolute",
            left: `${el.x}px`,
            top: `${el.y}px`,
            width: `${el.width}px`,
            height: `${el.height}px`,
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "center center",
            color: resolved.color || el.style?.color || "inherit",
            backgroundColor:
              resolved.bgColor ||
              el.style?.backgroundColor ||
              el.style?.bgColor ||
              (isBadge ? "rgba(255, 255, 255, 0.15)" : undefined),
            borderRadius:
              el.style?.borderRadius ?? (isBadge ? 8 : undefined),
            fontFamily: el.style?.fontFamily,
            fontWeight: el.style?.fontWeight,
            fontSize: `${finalFontSize}px`,
            textAlign: el.style?.textAlign,
            opacity: el.style?.opacity,
            lineHeight: el.style?.lineHeight,
            letterSpacing: el.style?.letterSpacing,
            textTransform: el.style?.textTransform,
            zIndex: el.zIndex,
            display: "flex",
            alignItems: "center",
            justifyContent:
              el.style?.textAlign === "center"
                ? "center"
                : el.style?.textAlign === "right"
                  ? "flex-end"
                  : "flex-start",
            boxSizing: "border-box",
            padding:
              el.style?.padding ?? (isBadge ? "4px 8px" : undefined),
          };

          return (
            <div
              key={el.id}
              className={styles.elementWrapper}
              style={elementStyle}
              data-testid={`custom-element-${el.id || el.type}`}
              data-variable-key={el.variableKey}
            >
              <div
                className={styles.textContent}
                style={{
                  textAlign: el.style?.textAlign || "left",
                  width: "100%",
                }}
              >
                {rawText}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CustomTicketCanvas;
