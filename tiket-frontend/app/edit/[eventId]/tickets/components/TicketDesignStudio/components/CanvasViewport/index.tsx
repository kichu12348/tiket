"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import { Upload } from "lucide-react";
import { getImageUrl } from "@/constants/config";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { TicketDesignerLayer } from "../../types";
import type { StudioMode } from "../../types";
import type { ResizeHandle } from "../../hooks/useLayerInteraction";
import CanvasLayer from "../CanvasLayer";
import styles from "./CanvasViewport.module.css";
import { cn } from "@/lib/utils";

interface CanvasViewportProps {
  mode: StudioMode;
  zoom: string;
  templateImageUrl: string | null;
  canvasWidth: number;
  canvasHeight: number;
  layers: TicketDesignerLayer[];
  selectedLayerId: string | null;
  ticketName: string;
  eventTitle: string;
  isSaving: boolean;
  hasPendingImage: boolean;
  onZoomChange: (val: string) => void;
  onUploadClick: () => void;
  onRemoveTemplate: () => void;
  onSelectLayer: (id: string | null) => void;
  onLayerMouseDown: (
    e: React.MouseEvent,
    id: string,
    x: number,
    y: number,
    scale?: number,
  ) => void;
  onResizeMouseDown?: (
    e: React.MouseEvent,
    layer: TicketDesignerLayer,
    handle: ResizeHandle,
    scale?: number,
  ) => void;
  onDimensionsUpdate: (w: number, h: number) => void;
  onDeleteSelectedLayer?: () => void;
}

export default function CanvasViewport({
  mode,
  zoom,
  templateImageUrl,
  canvasWidth,
  canvasHeight,
  layers,
  selectedLayerId,
  ticketName,
  eventTitle,
  isSaving,
  hasPendingImage,
  onZoomChange,
  onUploadClick,
  onRemoveTemplate,
  onSelectLayer,
  onLayerMouseDown,
  onResizeMouseDown,
  onDimensionsUpdate,
  onDeleteSelectedLayer,
}: CanvasViewportProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });

  // Measure scroll area with ResizeObserver
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;

    const updateSize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        setContainerSize((prev) => {
          if (prev.width === w && prev.height === h) return prev;
          return { width: w, height: h };
        });
      }
    };

    updateSize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        updateSize();
      });
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, []);

  // Compute exact fit scale factor
  const fitScale = useMemo(() => {
    const w = containerSize.width || 800;
    const h = containerSize.height || 400;
    const padding = 48;
    const availW = Math.max(10, w - padding);
    const availH = Math.max(10, h - padding);
    const s = Math.min(availW / canvasWidth, availH / canvasHeight);
    return Math.max(0.01, s);
  }, [containerSize, canvasWidth, canvasHeight]);

  // Exactly one scale factor, for display only
  const scale = useMemo(() => {
    if (zoom === "50%") return 0.5;
    if (zoom === "100%") return 1.0;
    if (zoom === "200%") return 2.0;
    return fitScale; // "Fit" is default
  }, [zoom, fitScale]);

  // Delete or Backspace key removes the selected layer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const active = document.activeElement;
        if (
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement ||
          (active && (active as HTMLElement).isContentEditable)
        ) {
          return;
        }
        if (selectedLayerId && onDeleteSelectedLayer) {
          e.preventDefault();
          onDeleteSelectedLayer();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedLayerId, onDeleteSelectedLayer]);

  return (
    <div className={styles.viewportContainer}>
      {/* Viewport Toolbar */}
      <div className={styles.viewportToolbar}>
        <div className={styles.viewportToolbarLeft}>
          <div className={styles.zoomBox}>
            <span className={styles.zoomLabel}>ZOOM</span>
            <Select value={zoom} onValueChange={onZoomChange}>
              <SelectTrigger
                className={cn(
                  "w-[85px] h-[30px] text-xs",
                  styles.selectTrigger,
                )}
                data-testid="zoom-select-trigger"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fit">Fit</SelectItem>
                <SelectItem value="50%">50%</SelectItem>
                <SelectItem value="100%">100%</SelectItem>
                <SelectItem value="200%">200%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className={styles.viewportToolbarRight}>
          <button
            type="button"
            className={styles.uploadBtn}
            onClick={onUploadClick}
            disabled={isSaving}
            data-testid="upload-template-btn"
          >
            <Upload size={14} />
            <span>{hasPendingImage ? "Change Image" : "Upload Template"}</span>
          </button>

          {templateImageUrl && (
            <button
              type="button"
              className={styles.resetBtn}
              onClick={onRemoveTemplate}
              data-testid="remove-template-btn"
            >
              <span>Reset Template</span>
            </button>
          )}
        </div>
      </div>

      {/* Canvas Scroll Area: Centers the artboard container */}
      <div
        ref={scrollAreaRef}
        className={`${styles.canvasScrollArea} scrollbar`}
        onClick={(e) => {
          if (e.target === e.currentTarget && mode === "edit") {
            onSelectLayer(null);
          }
        }}
      >
        <div
          className={styles.artboardContainer}
          style={{
            width: `${canvasWidth * scale}px`,
            height: `${canvasHeight * scale}px`,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && mode === "edit") {
              onSelectLayer(null);
            }
          }}
        >
          <div
            className={styles.artboard}
            style={
              {
                width: `${canvasWidth}px`,
                height: `${canvasHeight}px`,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                "--zoom-scale": scale,
              } as React.CSSProperties
            }
            data-testid="ticket-artboard"
            onClick={(e) => {
              if (e.target === e.currentTarget && mode === "edit") {
                onSelectLayer(null);
              }
            }}
          >
            {/* Uploaded Background Image: object-fit fill, same size as artboard */}
            {templateImageUrl ? (
              <img
                src={getImageUrl(templateImageUrl)}
                alt="Ticket Template"
                className={styles.artboardBgImage}
                data-testid="template-bg-image"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                    if (
                      img.naturalWidth !== canvasWidth ||
                      img.naturalHeight !== canvasHeight
                    ) {
                      onDimensionsUpdate(img.naturalWidth, img.naturalHeight);
                    }
                  }
                }}
              />
            ) : null}

            {/* Render Layers */}
            {layers.map((layer) => (
              <CanvasLayer
                key={layer.id}
                layer={layer}
                isSelected={selectedLayerId === layer.id}
                mode={mode}
                ticketName={ticketName}
                eventTitle={eventTitle}
                onSelect={onSelectLayer}
                onLayerMouseDown={(e, id, x, y) =>
                  onLayerMouseDown(e, id, x, y, scale)
                }
                onResizeMouseDown={
                  onResizeMouseDown
                    ? (e, l, h) => onResizeMouseDown(e, l, h, scale)
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
