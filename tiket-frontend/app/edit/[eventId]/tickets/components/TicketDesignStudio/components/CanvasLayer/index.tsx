"use client";

import React from "react";
import QRCode from "react-qr-code";
import { QrCode } from "lucide-react";
import type { TicketDesignerLayer } from "../../types";
import type { StudioMode } from "../../types";
import type { ResizeHandle } from "../../hooks/useLayerInteraction";
import { interpolateSamplePreview } from "../../utils/interpolate";
import styles from "./CanvasLayer.module.css";

interface CanvasLayerProps {
  layer: TicketDesignerLayer;
  isSelected: boolean;
  mode: StudioMode;
  ticketName: string;
  eventTitle: string;
  onSelect: (id: string) => void;
  onLayerMouseDown: (
    e: React.MouseEvent,
    id: string,
    x: number,
    y: number,
  ) => void;
  onResizeMouseDown?: (
    e: React.MouseEvent,
    layer: TicketDesignerLayer,
    handle: ResizeHandle,
  ) => void;
}

export default function CanvasLayer({
  layer,
  isSelected,
  mode,
  ticketName,
  eventTitle,
  onSelect,
  onLayerMouseDown,
  onResizeMouseDown,
}: CanvasLayerProps) {
  const isQr = layer.type === "qr";
  const activeSelection = mode === "edit" && isSelected;

  const width = layer.width || (isQr ? layer.size : 320);
  const height = layer.height || (isQr ? layer.size : 80);

  const displayText =
    mode === "preview"
      ? interpolateSamplePreview(
          layer.text || "{{name}}",
          ticketName,
          eventTitle,
        )
      : layer.text || "Text";

  return (
    <div
      className={`${styles.layerItem} ${activeSelection ? styles.layerSelected : ""}`}
      style={{
        left: `${layer.x}px`,
        top: `${layer.y}px`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: activeSelection ? 40 : 10,
      }}
      onMouseDown={(e) => onLayerMouseDown(e, layer.id, layer.x, layer.y)}
      onClick={(e) => {
        e.stopPropagation();
        if (mode === "edit") {
          onSelect(layer.id);
        }
      }}
      data-testid={`layer-box-${layer.id}`}
    >
      {/* Floating Coordinate Badge */}
      {activeSelection && (
        <div className={styles.coordBadge} data-testid="coord-badge">
          X:{layer.x} Y:{layer.y} • W:{width} H:{height}
        </div>
      )}

      {/* 8 Figma-style Transform Handles */}
      {activeSelection && onResizeMouseDown && (
        <>
          {/* 4 Corners */}
          <div
            className={`${styles.resizeHandle} ${styles.handleNw}`}
            onMouseDown={(e) => onResizeMouseDown(e, layer, "nw")}
            title="Resize top-left"
            data-testid={`resize-handle-nw-${layer.id}`}
          />
          <div
            className={`${styles.resizeHandle} ${styles.handleNe}`}
            onMouseDown={(e) => onResizeMouseDown(e, layer, "ne")}
            title="Resize top-right"
            data-testid={`resize-handle-ne-${layer.id}`}
          />
          <div
            className={`${styles.resizeHandle} ${styles.handleSe}`}
            onMouseDown={(e) => onResizeMouseDown(e, layer, "se")}
            title="Resize bottom-right"
            data-testid={`resize-handle-se-${layer.id}`}
          />
          <div
            className={`${styles.resizeHandle} ${styles.handleSw}`}
            onMouseDown={(e) => onResizeMouseDown(e, layer, "sw")}
            title="Resize bottom-left"
            data-testid={`resize-handle-sw-${layer.id}`}
          />

          {/* 4 Edge Center Handles */}
          <div
            className={`${styles.resizeHandle} ${styles.handleN}`}
            onMouseDown={(e) => onResizeMouseDown(e, layer, "n")}
            title="Resize height from top"
            data-testid={`resize-handle-n-${layer.id}`}
          />
          <div
            className={`${styles.resizeHandle} ${styles.handleS}`}
            onMouseDown={(e) => onResizeMouseDown(e, layer, "s")}
            title="Resize height from bottom"
            data-testid={`resize-handle-s-${layer.id}`}
          />
          <div
            className={`${styles.resizeHandle} ${styles.handleW}`}
            onMouseDown={(e) => onResizeMouseDown(e, layer, "w")}
            title="Resize width from left"
            data-testid={`resize-handle-w-${layer.id}`}
          />
          <div
            className={`${styles.resizeHandle} ${styles.handleE}`}
            onMouseDown={(e) => onResizeMouseDown(e, layer, "e")}
            title="Resize width from right"
            data-testid={`resize-handle-e-${layer.id}`}
          />
        </>
      )}

      {/* Layer Content */}
      {isQr ? (
        mode === "preview" ? (
          <div className={styles.qrLayerBox}>
            <QRCode
              value="TIK-9842-X7"
              size={Math.max(16, Math.min(width, height) - 24)}
              fgColor="#000000"
              bgColor="#ffffff"
            />
          </div>
        ) : (
          <div
            className={styles.qrLayerBox}
            data-testid="qr-placeholder"
          >
            <QrCode size={Math.min(64, Math.max(20, Math.round(Math.min(width, height) * 0.4)))} />
            <span className={styles.qrPlaceholderText}>QR Code</span>
          </div>
        )
      ) : (
        <div
          className={styles.textLayerBox}
          style={{
            fontSize: `${layer.size}px`,
            color: layer.color || "#ffffff",
            lineHeight: 1.2,
          }}
        >
          <span className={styles.textClamped}>
            {displayText}
          </span>
        </div>
      )}
    </div>
  );
}
