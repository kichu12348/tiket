"use client";

import { useCallback } from "react";
import type { TicketDesignerLayer } from "../types";
import type { StudioMode } from "../types";

export type ResizeHandle =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w";

interface UseLayerInteractionParams {
  artboardW: number;
  artboardH: number;
  mode: StudioMode;
  setLayers: React.Dispatch<React.SetStateAction<TicketDesignerLayer[]>>;
  setSelectedLayerId: (id: string | null) => void;
}

export function useLayerInteraction({
  artboardW,
  artboardH,
  mode,
  setLayers,
  setSelectedLayerId,
}: UseLayerInteractionParams) {
  // Move layer via drag
  const handleLayerMouseDown = useCallback(
    (
      e: React.MouseEvent,
      layerId: string,
      initialX: number,
      initialY: number,
      currentScale = 1,
    ) => {
      if (mode === "preview") return;
      e.stopPropagation();
      setSelectedLayerId(layerId);

      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const effectiveScale = currentScale > 0 ? currentScale : 1;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const dx = (moveEvent.clientX - startMouseX) / effectiveScale;
        const dy = (moveEvent.clientY - startMouseY) / effectiveScale;

        setLayers((prev) =>
          prev.map((l) => {
            if (l.id !== layerId) return l;
            const w = l.width || (l.type === "qr" ? l.size : 320);
            const h = l.height || (l.type === "qr" ? l.size : 80);
            const newX = Math.max(
              0,
              Math.min(artboardW - w, Math.round(initialX + dx)),
            );
            const newY = Math.max(
              0,
              Math.min(artboardH - h, Math.round(initialY + dy)),
            );
            return {
              ...l,
              x: newX,
              y: newY,
            };
          }),
        );
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [mode, artboardW, artboardH, setLayers, setSelectedLayerId],
  );

  // Resize layer via 8 Figma-style handles (horizontal & vertical independent pulling)
  const handleResizeMouseDown = useCallback(
    (
      e: React.MouseEvent,
      layer: TicketDesignerLayer,
      handle: ResizeHandle,
      currentScale = 1,
    ) => {
      if (mode === "preview") return;
      e.stopPropagation();
      e.preventDefault();
      setSelectedLayerId(layer.id);

      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const effectiveScale = currentScale > 0 ? currentScale : 1;

      const startX = layer.x;
      const startY = layer.y;
      const isQr = layer.type === "qr";
      const startW = layer.width || (isQr ? layer.size : 320);
      const startH = layer.height || (isQr ? layer.size : 80);
      const minW = 20;
      const minH = 20;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const dx = (moveEvent.clientX - startMouseX) / effectiveScale;
        const dy = (moveEvent.clientY - startMouseY) / effectiveScale;

        setLayers((prev) =>
          prev.map((l) => {
            if (l.id !== layer.id) return l;

            let newX = startX;
            let newY = startY;
            let newW = startW;
            let newH = startH;

            // Horizontal pulling: only moves the targeted horizontal side
            if (handle === "e" || handle === "se" || handle === "ne") {
              newW = Math.max(minW, Math.min(artboardW - startX, Math.round(startW + dx)));
            } else if (handle === "w" || handle === "sw" || handle === "nw") {
              const rightEdge = startX + startW;
              const candidateX = Math.round(startX + dx);
              const clampedX = Math.max(0, Math.min(rightEdge - minW, candidateX));
              newX = clampedX;
              newW = rightEdge - clampedX;
            }

            // Vertical pulling: only moves the targeted vertical side
            if (handle === "s" || handle === "se" || handle === "sw") {
              newH = Math.max(minH, Math.min(artboardH - startY, Math.round(startH + dy)));
            } else if (handle === "n" || handle === "ne" || handle === "nw") {
              const bottomEdge = startY + startH;
              const candidateY = Math.round(startY + dy);
              const clampedY = Math.max(0, Math.min(bottomEdge - minH, candidateY));
              newY = clampedY;
              newH = bottomEdge - clampedY;
            }

            if (isQr) {
              const qrSize = Math.max(minW, Math.min(newW, newH));
              return {
                ...l,
                x: newX,
                y: newY,
                width: newW,
                height: newH,
                size: qrSize,
              };
            }

            // Text layer: independent height and width adjustment (Figma style)
            return {
              ...l,
              x: newX,
              y: newY,
              width: newW,
              height: newH,
            };
          }),
        );
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [mode, artboardW, artboardH, setLayers, setSelectedLayerId],
  );

  return {
    handleLayerMouseDown,
    handleResizeMouseDown,
  };
}
