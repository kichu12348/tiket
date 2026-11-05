"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { TicketType, TicketLayoutLayer } from "@/types/ticketType";
import type { TicketDesignerLayer, TicketDesignOutput } from "../types";
import { toast } from "sonner";

export const DEFAULT_ARTBOARD_WIDTH = 2082;
export const DEFAULT_ARTBOARD_HEIGHT = 576;
export const DEFAULT_CANVAS_WIDTH = DEFAULT_ARTBOARD_WIDTH;
export const DEFAULT_CANVAS_HEIGHT = DEFAULT_ARTBOARD_HEIGHT;

function normalizeLayer(
  l: TicketLayoutLayer | TicketDesignerLayer,
): TicketDesignerLayer {
  const isQr = l.type === "qr";
  const rawSize =
    "size" in l && typeof l.size === "number" ? l.size : undefined;
  const rawText =
    "text" in l && typeof l.text === "string" ? l.text : undefined;
  const rawColor =
    "color" in l && typeof l.color === "string" ? l.color : undefined;

  const size =
    rawSize ||
    (isQr
      ? (l as TicketLayoutLayer).width || 300
      : (l as TicketLayoutLayer).fontSize || 48);
  const text =
    rawText ??
    (l as TicketLayoutLayer).tokenOrText ??
    (isQr ? undefined : "Text");
  const color =
    rawColor ?? (l as TicketLayoutLayer).fontColor ?? "#ffffff";

  return {
    id: l.id,
    type: l.type,
    x: l.x,
    y: l.y,
    size,
    text,
    color,
    name: (l as TicketLayoutLayer).name || (isQr ? "QR Code" : text || "Text"),
    tokenOrText: text || (isQr ? "{{ticket_code}}" : "Text"),
    fontSize: isQr ? 14 : size,
    fontColor: color,
    width: isQr ? size : Math.max(120, size * 5),
    height: isQr ? size : Math.max(30, Math.round(size * 1.4)),
    maxLines: (l as TicketLayoutLayer).maxLines || 1,
    lineSpacing: (l as TicketLayoutLayer).lineSpacing || 0,
  };
}

interface UseTicketDesignStateParams {
  initialTicket?: TicketType | null;
}

export function useTicketDesignState({
  initialTicket,
}: UseTicketDesignStateParams) {
  const [templateImageUrl, setTemplateImageUrl] = useState<string | null>(
    initialTicket?.templateImageUrl || null,
  );
  const [canvasWidth, setCanvasWidth] = useState<number>(
    initialTicket?.templateConfig?.canvasWidth ?? DEFAULT_ARTBOARD_WIDTH,
  );
  const [canvasHeight, setCanvasHeight] = useState<number>(
    initialTicket?.templateConfig?.canvasHeight ?? DEFAULT_ARTBOARD_HEIGHT,
  );
  const [layers, setLayers] = useState<TicketDesignerLayer[]>(() => {
    const rawLayers = initialTicket?.templateConfig?.layers ?? [];
    return rawLayers.map(normalizeLayer);
  });
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    initialTicket?.templateConfig?.layers?.[0]?.id ?? null,
  );
  const [zoom, setZoom] = useState<string>("Fit");
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);

  // Revoke object URL on unmount or when image changes
  useEffect(() => {
    return () => {
      if (templateImageUrl && templateImageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(templateImageUrl);
      }
    };
  }, [templateImageUrl]);

  const selectedLayer = useMemo(() => {
    return layers.find((l) => l.id === selectedLayerId) || null;
  }, [layers, selectedLayerId]);

  // Local image file upload: artboard dimensions become image's natural dimensions
  const handleUploadImage = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const localUrl = URL.createObjectURL(file);
        setPendingImageFile(file);
        setTemplateImageUrl(localUrl);

        const img = new Image();
        img.onload = () => {
          const naturalW = img.naturalWidth || DEFAULT_ARTBOARD_WIDTH;
          const naturalH = img.naturalHeight || DEFAULT_ARTBOARD_HEIGHT;
          setCanvasWidth(naturalW);
          setCanvasHeight(naturalH);
          setZoom("Fit");
          toast.info("Image loaded. Click Update to save.");
        };
        img.onerror = () => {
          setCanvasWidth(DEFAULT_ARTBOARD_WIDTH);
          setCanvasHeight(DEFAULT_ARTBOARD_HEIGHT);
          setZoom("Fit");
        };
        img.src = localUrl;
      } catch (err) {
        console.error("Local preview failed", err);
        toast.error("Failed to load local image preview.");
      }
    },
    [],
  );

  // "Reset Template" removes the upload and restores the default size 2082 x 576
  const handleRemoveTemplate = useCallback(() => {
    if (templateImageUrl && templateImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(templateImageUrl);
    }
    setPendingImageFile(null);
    setTemplateImageUrl(null);
    setCanvasWidth(DEFAULT_ARTBOARD_WIDTH);
    setCanvasHeight(DEFAULT_ARTBOARD_HEIGHT);
    setZoom("Fit");
    toast.info("Template reset to default size.");
  }, [templateImageUrl]);

  // "+ Text" adds a text layer at the artboard center with default text "Text"
  const addTextLayer = useCallback(() => {
    const id = `text_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const size = 48; // font size in artboard px
    const estWidth = 200;
    const estHeight = Math.round(size * 1.4);
    const x = Math.max(0, Math.round((canvasWidth - estWidth) / 2));
    const y = Math.max(0, Math.round((canvasHeight - estHeight) / 2));

    const newLayer: TicketDesignerLayer = {
      id,
      type: "text",
      x,
      y,
      size,
      text: "Text",
      color: "#ffffff",
      name: "Text",
      tokenOrText: "Text",
      fontSize: size,
      fontColor: "#ffffff",
      width: estWidth,
      height: estHeight,
      maxLines: 1,
      lineSpacing: 0,
    };

    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(id);
  }, [canvasWidth, canvasHeight]);

  // "+ QR" adds a square placeholder QR layer (size 300) at the artboard center
  const addQrLayer = useCallback(() => {
    const id = `qr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const size = 300; // width = height = 300 in artboard px
    const x = Math.max(0, Math.round((canvasWidth - size) / 2));
    const y = Math.max(0, Math.round((canvasHeight - size) / 2));

    const newLayer: TicketDesignerLayer = {
      id,
      type: "qr",
      x,
      y,
      size,
      name: "QR Code",
      tokenOrText: "{{ticket_code}}",
      fontSize: 14,
      fontColor: "#000000",
      width: size,
      height: size,
      maxLines: 1,
      lineSpacing: 0,
    };

    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(id);
  }, [canvasWidth, canvasHeight]);

  const deleteLayer = useCallback(
    (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setLayers((prev) => prev.filter((l) => l.id !== id));
      if (selectedLayerId === id) {
        setSelectedLayerId(null);
      }
    },
    [selectedLayerId],
  );

  const deleteSelectedLayer = useCallback(() => {
    if (!selectedLayerId) return;
    setLayers((prev) => prev.filter((l) => l.id !== selectedLayerId));
    setSelectedLayerId(null);
  }, [selectedLayerId]);

  const updateSelectedLayer = useCallback(
    (fields: Partial<TicketDesignerLayer>) => {
      if (!selectedLayerId) return;
      setLayers((prev) =>
        prev.map((l) => {
          if (l.id !== selectedLayerId) return l;
          const updated = { ...l, ...fields };

          // Keep size and width/height/fontSize synced
          if (fields.width !== undefined) {
            updated.width = fields.width;
          }
          if (fields.height !== undefined) {
            updated.height = fields.height;
          }
          if (fields.size !== undefined) {
            if (updated.type === "qr") {
              updated.width = fields.size;
              updated.height = fields.size;
            } else {
              updated.fontSize = fields.size;
            }
          }
          if (fields.fontSize !== undefined && updated.type === "text") {
            updated.size = fields.fontSize;
          }
          if (fields.width !== undefined && updated.type === "qr") {
            updated.size = fields.width;
            if (fields.height === undefined) updated.height = fields.width;
          }
          if (fields.height !== undefined && updated.type === "qr") {
            updated.size = fields.height;
            if (fields.width === undefined) updated.width = fields.height;
          }
          if (fields.text !== undefined) {
            updated.tokenOrText = fields.text;
            updated.name = fields.text || "Text";
          }
          if (fields.tokenOrText !== undefined) {
            updated.text = fields.tokenOrText;
            updated.name = fields.tokenOrText || "Text";
          }
          if (fields.color !== undefined) {
            updated.fontColor = fields.color;
          }
          if (fields.fontColor !== undefined) {
            updated.color = fields.fontColor;
          }
          return updated;
        }),
      );
    },
    [selectedLayerId],
  );

  const resetDesignState = useCallback((t?: TicketType | null) => {
    setPendingImageFile(null);
    setTemplateImageUrl(t?.templateImageUrl || null);
    setCanvasWidth(t?.templateConfig?.canvasWidth ?? DEFAULT_ARTBOARD_WIDTH);
    setCanvasHeight(t?.templateConfig?.canvasHeight ?? DEFAULT_ARTBOARD_HEIGHT);
    const rawLayers = t?.templateConfig?.layers ?? [];
    setLayers(rawLayers.map(normalizeLayer));
    setSelectedLayerId(rawLayers[0]?.id ?? null);
    setZoom("Fit");
  }, []);

  // Expose entire design output
  const getDesign = useCallback((): TicketDesignOutput => {
    return {
      artboardW: canvasWidth,
      artboardH: canvasHeight,
      templateImageUrl,
      layers,
    };
  }, [canvasWidth, canvasHeight, templateImageUrl, layers]);

  return {
    templateImageUrl,
    canvasWidth,
    canvasHeight,
    artboardW: canvasWidth,
    artboardH: canvasHeight,
    layers,
    selectedLayerId,
    selectedLayer,
    zoom,
    pendingImageFile,
    setZoom,
    setCanvasWidth,
    setCanvasHeight,
    setLayers,
    setSelectedLayerId,
    setPendingImageFile,
    setTemplateImageUrl,
    handleUploadImage,
    handleRemoveTemplate,
    addTextLayer,
    addQrLayer,
    deleteLayer,
    deleteSelectedLayer,
    updateSelectedLayer,
    resetDesignState,
    getDesign,
  };
}
