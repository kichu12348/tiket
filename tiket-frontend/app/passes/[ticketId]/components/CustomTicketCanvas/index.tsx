"use client";

import React from "react";
import QRCode from "react-qr-code";
import { Lock } from "lucide-react";
import type {
  TicketPassData,
  TicketPassTemplate,
  TicketCanvasConfig,
  TicketCanvasElement,
} from "@/types/ticket";
import { formatLocation } from "../../utils/formatLocation";
import styles from "./CustomTicketCanvas.module.css";

export interface CustomTicketCanvasProps {
  pass: TicketPassData;
  template: TicketPassTemplate;
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

export function resolveVariable(key: string, pass: TicketPassData): string {
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
    case "order.id":
    case "orderid":
      return pass.order?.id || "";
    default: {
      const cleanKey = normalizedKey.replace(/^responses?\./, "");
      const match = pass.responses?.find(
        (r) =>
          r.label.toLowerCase() === cleanKey ||
          r.label.toLowerCase() === normalizedKey,
      );
      if (match && match.value) {
        return match.value;
      }
      return "";
    }
  }
}

export function interpolateText(text: string, pass: TicketPassData): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    return resolveVariable(key, pass);
  });
}

export function getElementText(
  el: TicketCanvasElement,
  pass: TicketPassData,
): string {
  if (el.content) {
    return interpolateText(el.content, pass);
  }
  if (el.variableKey) {
    return resolveVariable(el.variableKey, pass);
  }
  return "";
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

  const elementsJson = template.elementsJson;
  const parsedConfig: TicketCanvasConfig = React.useMemo(() => {
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
  }, [elementsJson]);

  const canvasWidth = parsedConfig.canvasWidth || 600;
  const canvasHeight = parsedConfig.canvasHeight || 300;
  const elements = parsedConfig.elements || [];

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
        {template.backgroundImageUrl && (
          <img
            src={template.backgroundImageUrl}
            alt="Ticket Background"
            className={styles.canvasBackground}
            data-testid="custom-ticket-bg"
          />
        )}

        {/* Elements mapped over canvas */}
        {elements.map((el) => {
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
            };

            if (isScannable) {
              return (
                <div
                  key={el.id}
                  className={styles.elementWrapper}
                  style={elementStyle}
                  data-testid="qr-container"
                >
                  <div className={styles.qrContainer}>
                    <QRCode
                      value={pass.qrCode}
                      size={Math.min(el.width, el.height)}
                      fgColor={el.style?.qrFgColor || "#000000"}
                      bgColor={el.style?.qrBgColor || "#ffffff"}
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

          const rawText = getElementText(el, pass);
          const baseFontSize = el.style?.fontSize ?? 16;
          const isVariable = el.type === "variable" || Boolean(el.variableKey);
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

          const elementStyle: React.CSSProperties = {
            position: "absolute",
            left: `${el.x}px`,
            top: `${el.y}px`,
            width: `${el.width}px`,
            height: `${el.height}px`,
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "center center",
            color: el.style?.color || "inherit",
            fontFamily: el.style?.fontFamily,
            fontWeight: el.style?.fontWeight,
            fontSize: `${finalFontSize}px`,
            textAlign: el.style?.textAlign,
            opacity: el.style?.opacity,
            lineHeight: el.style?.lineHeight,
            letterSpacing: el.style?.letterSpacing,
            textTransform: el.style?.textTransform,
            justifyContent:
              el.style?.textAlign === "center"
                ? "center"
                : el.style?.textAlign === "right"
                  ? "flex-end"
                  : "flex-start",
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
