"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import {
  QrCode,
  Type,
  Trash2,
  Upload,
  Palette,
  ExternalLink,
  Plus,
  Braces,
  Sparkles,
  Ticket,
} from "lucide-react";
import { getSignedUrl, uploadToCDN } from "@/api/events";
import { getImageUrl } from "@/constants/config";
import { getTicketTypes, updateTicketType } from "@/api/tickets";
import { getFormFields } from "@/api/forms";
import { useEventStore } from "@/store/useEventStore";
import { getErrorMessage } from "@/lib/errors";
import type { FormField } from "@/types/form";
import type {
  TicketType,
  TicketLayoutConfig,
  TicketLayoutLayer,
} from "@/types/ticketType";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import styles from "./TicketDesignStudio.module.css";

export interface TicketDesignStudioProps {
  eventId: string;
  ticket?: TicketType | null;
  onClose?: () => void;
  onSaved?: (updatedTicket: TicketType) => void;
}

let layerCounter = 0;
function generateLayerId(prefix = "layer"): string {
  layerCounter += 1;
  return `${prefix}_${Date.now()}_${layerCounter}`;
}

export function interpolateSamplePreview(
  text: string,
  ticketName: string,
  eventTitle: string,
): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim().toLowerCase();
    switch (key) {
      case "name":
      case "attendee.name":
      case "attendee_name":
        return "Alex Morgan";
      case "email":
      case "attendee.email":
      case "attendee_email":
        return "alex.morgan@example.com";
      case "ticket_code":
      case "code":
      case "ticket.code":
        return "TIK-9842-X7";
      case "ticket_type":
      case "ticket.type":
      case "tickettype":
        return ticketName || "General Admission";
      case "event_title":
      case "event.title":
      case "title":
        return eventTitle || "Tech Summit 2026";
      default:
        if (key.startsWith("form.")) {
          const field = key.replace("form.", "").toLowerCase();
          if (field.includes("college") || field.includes("university")) {
            return "Stanford University";
          }
          if (field.includes("t-shirt") || field.includes("tshirt")) {
            return "Size L";
          }
          if (field.includes("designation") || field.includes("role")) {
            return "Staff Engineer";
          }
          return "VIP Delegate";
        }
        return "Sample Value";
    }
  });
}

export default function TicketDesignStudio({
  eventId,
  ticket: initialTicket,
  onClose,
  onSaved,
}: TicketDesignStudioProps) {
  const storeEvent = useEventStore((state) => state.event);

  // Tickets state
  const [ticketTypesList, setTicketTypesList] = useState<TicketType[]>([]);
  const [activeTicket, setActiveTicket] = useState<TicketType | null>(
    initialTicket ?? null,
  );

  // Editor mode & Zoom
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [zoom, setZoom] = useState<string>("Fit");
  const [viewportSize, setViewportSize] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });

  // Canvas dimensions & template
  const [templateImageUrl, setTemplateImageUrl] = useState<string | null>(
    initialTicket?.templateImageUrl ?? null,
  );
  const [canvasWidth, setCanvasWidth] = useState<number>(
    initialTicket?.templateConfig?.canvasWidth ?? 800,
  );
  const [canvasHeight, setCanvasHeight] = useState<number>(
    initialTicket?.templateConfig?.canvasHeight ?? 400,
  );

  // Layers
  const [layers, setLayers] = useState<TicketLayoutLayer[]>(
    initialTicket?.templateConfig?.layers ?? [],
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    initialTicket?.templateConfig?.layers?.[0]?.id ?? null,
  );

  // Form fields for token picker
  const [formFields, setFormFields] = useState<FormField[]>([]);

  // Async state
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tokenPopoverOpen, setTokenPopoverOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Measure viewport size for auto-fit zoom
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;

    const updateSize = () => {
      setViewportSize({
        width: el.clientWidth,
        height: el.clientHeight,
      });
    };

    updateSize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          setViewportSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      });
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, []);

  // Fetch ticket types if not provided
  useEffect(() => {
    let isMounted = true;
    if (!initialTicket) {
      getTicketTypes(eventId)
        .then((data) => {
          if (!isMounted) return;
          setTicketTypesList(data || []);
          if (data && data.length > 0 && !activeTicket) {
            const first = data[0];
            setActiveTicket(first);
            setTemplateImageUrl(first.templateImageUrl ?? null);
            setCanvasWidth(first.templateConfig?.canvasWidth ?? 800);
            setCanvasHeight(first.templateConfig?.canvasHeight ?? 400);
            setLayers(first.templateConfig?.layers ?? []);
            setSelectedLayerId(first.templateConfig?.layers?.[0]?.id ?? null);
          }
        })
        .catch((err) => {
          console.error("Failed to load tickets", err);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [eventId, initialTicket, activeTicket]);

  // Fetch form fields for token autocomplete
  useEffect(() => {
    let isMounted = true;
    getFormFields(eventId)
      .then((fields) => {
        if (isMounted) setFormFields(fields || []);
      })
      .catch((err) => {
        console.error("Failed to load form fields", err);
      });
    return () => {
      isMounted = false;
    };
  }, [eventId]);

  // Sync state if active ticket changes
  const switchTicket = useCallback((t: TicketType) => {
    setActiveTicket(t);
    setTemplateImageUrl(t.templateImageUrl ?? null);
    setCanvasWidth(t.templateConfig?.canvasWidth ?? 800);
    setCanvasHeight(t.templateConfig?.canvasHeight ?? 400);
    setLayers(t.templateConfig?.layers ?? []);
    setSelectedLayerId(t.templateConfig?.layers?.[0]?.id ?? null);
  }, []);

  const selectedLayer = useMemo(() => {
    return layers.find((l) => l.id === selectedLayerId) || null;
  }, [layers, selectedLayerId]);

  // Zoom calculation
  const zoomScale = useMemo(() => {
    if (zoom === "Fit") {
      if (!viewportSize.width || !viewportSize.height) return 1;
      const paddingX = 80;
      const paddingY = 80;
      const availW = Math.max(100, viewportSize.width - paddingX);
      const availH = Math.max(100, viewportSize.height - paddingY);
      const scale = Math.min(1, availW / canvasWidth, availH / canvasHeight);
      return Math.max(0.1, Number(scale.toFixed(2)));
    }
    switch (zoom) {
      case "50%":
        return 0.5;
      case "75%":
        return 0.75;
      case "125%":
        return 1.25;
      default:
        return 1;
    }
  }, [zoom, viewportSize, canvasWidth, canvasHeight]);

  // Upload Template Image
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const { url } = await getSignedUrl(file.name, file.type);
      const { filename } = await uploadToCDN(url, file);
      const fullUrl = getImageUrl(filename || "");

      // Read natural width and height, fitting proportionally if too large
      const img = new Image();
      img.onload = () => {
        let naturalW = img.naturalWidth || img.width || 800;
        let naturalH = img.naturalHeight || img.height || 400;

        const MAX_CANVAS_WIDTH = 1200;
        const MAX_CANVAS_HEIGHT = 800;
        if (naturalW > MAX_CANVAS_WIDTH || naturalH > MAX_CANVAS_HEIGHT) {
          const ratio = Math.min(
            MAX_CANVAS_WIDTH / naturalW,
            MAX_CANVAS_HEIGHT / naturalH,
          );
          naturalW = Math.round(naturalW * ratio);
          naturalH = Math.round(naturalH * ratio);
        }

        setCanvasWidth(naturalW);
        setCanvasHeight(naturalH);
        setTemplateImageUrl(fullUrl);
        setZoom("Fit");
        toast.success("Template image uploaded.");
        setIsUploading(false);
      };
      img.onerror = () => {
        setTemplateImageUrl(fullUrl);
        setZoom("Fit");
        toast.success("Template image uploaded.");
        setIsUploading(false);
      };
      img.src = fullUrl;
    } catch (error) {
      console.error("Upload failed", error);
      toast.error("Failed to upload image template.");
      setIsUploading(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveTemplate = () => {
    setTemplateImageUrl(null);
    toast.info("Template image removed.");
  };

  // Add Layers
  const handleAddTextLayer = () => {
    const newLayer: TicketLayoutLayer = {
      id: generateLayerId("text"),
      type: "text",
      name: "Delegate Name",
      tokenOrText: "{{name}}",
      x: Math.round(canvasWidth / 2 - 120),
      y: Math.round(canvasHeight / 2 - 25),
      width: 240,
      height: 50,
      fontSize: 32,
      maxLines: 1,
      lineSpacing: 0,
      fontColor: "#000000",
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const handleAddQrLayer = () => {
    const newLayer: TicketLayoutLayer = {
      id: generateLayerId("qr"),
      type: "qr",
      name: "QR Code",
      tokenOrText: "{{ticket_code}}",
      x: Math.round(canvasWidth - 170),
      y: Math.round(canvasHeight / 2 - 60),
      width: 120,
      height: 120,
      fontSize: 14,
      maxLines: 1,
      lineSpacing: 0,
      fontColor: "#000000",
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const handleDeleteLayer = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedLayerId === id) {
      setSelectedLayerId(null);
    }
  };

  const updateSelectedLayer = (fields: Partial<TicketLayoutLayer>) => {
    if (!selectedLayerId) return;
    setLayers((prev) =>
      prev.map((l) => (l.id === selectedLayerId ? { ...l, ...fields } : l)),
    );
  };

  // Layer Dragging
  const handleLayerMouseDown = (
    e: React.MouseEvent,
    layerId: string,
    initialX: number,
    initialY: number,
  ) => {
    if (mode === "preview") return;
    e.stopPropagation();
    setSelectedLayerId(layerId);

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startMouseX) / zoomScale;
      const dy = (moveEvent.clientY - startMouseY) / zoomScale;
      setLayers((prev) =>
        prev.map((l) =>
          l.id === layerId
            ? {
                ...l,
                x: Math.max(0, Math.round(initialX + dx)),
                y: Math.max(0, Math.round(initialY + dy)),
              }
            : l,
        ),
      );
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Corner Resize
  const handleResizeMouseDown = (
    e: React.MouseEvent,
    layer: TicketLayoutLayer,
    handle: "nw" | "ne" | "se" | "sw",
  ) => {
    if (mode === "preview") return;
    e.stopPropagation();

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const { x: startX, y: startY, width: startW, height: startH } = layer;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startMouseX) / zoomScale;
      const dy = (moveEvent.clientY - startMouseY) / zoomScale;

      let newX = startX;
      let newY = startY;
      let newW = startW;
      let newH = startH;

      if (handle === "se") {
        newW = Math.max(20, Math.round(startW + dx));
        newH = Math.max(20, Math.round(startH + dy));
      } else if (handle === "sw") {
        newW = Math.max(20, Math.round(startW - dx));
        newH = Math.max(20, Math.round(startH + dy));
        newX = startX + (startW - newW);
      } else if (handle === "ne") {
        newW = Math.max(20, Math.round(startW + dx));
        newH = Math.max(20, Math.round(startH - dy));
        newY = startY + (startH - newH);
      } else if (handle === "nw") {
        newW = Math.max(20, Math.round(startW - dx));
        newH = Math.max(20, Math.round(startH - dy));
        newX = startX + (startW - newW);
        newY = startY + (startH - newH);
      }

      setLayers((prev) =>
        prev.map((l) =>
          l.id === layer.id
            ? { ...l, x: newX, y: newY, width: newW, height: newH }
            : l,
        ),
      );
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Save / Update to Backend
  const handleUpdate = async () => {
    if (!activeTicket) {
      toast.error("No ticket tier selected.");
      return;
    }

    try {
      setIsSaving(true);
      const config: TicketLayoutConfig = {
        canvasWidth,
        canvasHeight,
        layers,
      };

      const updated = await updateTicketType(eventId, activeTicket.id, {
        templateImageUrl,
        templateConfig: config,
      });

      toast.success("Ticket layout updated.");
      if (onSaved) {
        onSaved(updated);
      }
    } catch (error: unknown) {
      console.error("Failed to update ticket layout", error);
      toast.error(getErrorMessage(error) || "Failed to save ticket layout.");
    } finally {
      setIsSaving(false);
    }
  };

  const eventTitle = storeEvent?.title || "Tech Summit 2026";
  const activeTicketName = activeTicket?.name || "General Admission";

  return (
    <div className={styles.studioContainer} data-testid="ticket-design-studio">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUploadImage}
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        style={{ display: "none" }}
        data-testid="template-image-input"
      />

      {/* TOP HEADER & MODE SWITCHER */}
      <div className={styles.topHeader}>
        <div className={styles.topLeftControls}>
          {/* Segmented Mode Switcher */}
          <div className={styles.modeSwitcher} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "edit"}
              className={`${styles.modeBtn} ${mode === "edit" ? styles.modeBtnActive : ""}`}
              onClick={() => setMode("edit")}
              data-testid="mode-edit-btn"
            >
              Edit Layout
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "preview"}
              className={`${styles.modeBtn} ${mode === "preview" ? styles.modeBtnActive : ""}`}
              onClick={() => {
                setMode("preview");
                setSelectedLayerId(null);
              }}
              data-testid="mode-preview-btn"
            >
              <Sparkles
                size={13}
                style={{ display: "inline", marginRight: "4px" }}
              />
              Sample Preview
            </button>
          </div>

          {/* Ticket Tier Info or Selector */}
          {initialTicket ? (
            <div className={styles.ticketBadge}>
              <Ticket size={14} />
              <span>{initialTicket.name}</span>
            </div>
          ) : ticketTypesList.length > 0 ? (
            <div className={styles.tierSelectTrigger}>
              <Select
                value={activeTicket?.id || ""}
                onValueChange={(val) => {
                  const found = ticketTypesList.find((t) => t.id === val);
                  if (found) switchTicket(found);
                }}
              >
                <SelectTrigger className="h-[34px] text-xs">
                  <SelectValue placeholder="Select ticket tier" />
                </SelectTrigger>
                <SelectContent>
                  {ticketTypesList.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        {/* Status / Zoom hint */}
        <div style={{ fontSize: "0.8rem", color: "#a1a1aa" }}>
          {canvasWidth} × {canvasHeight} px Artboard
        </div>
      </div>

      {/* MAIN BODY: VIEWPORT + SIDEBAR */}
      <div className={styles.mainBody}>
        {/* LEFT VIEWPORT */}
        <div className={styles.viewportContainer}>
          {/* Viewport Top Toolbar */}
          <div className={styles.viewportToolbar}>
            <div className={styles.viewportToolbarLeft}>
              <div className={styles.zoomBox}>
                <span className={styles.zoomLabel}>ZOOM</span>
                <Select value={zoom} onValueChange={(val) => setZoom(val)}>
                  <SelectTrigger
                    className="w-[85px] h-[30px] text-xs bg-transparent border-0 text-white"
                    data-testid="zoom-select-trigger"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fit">Fit</SelectItem>
                    <SelectItem value="50%">50%</SelectItem>
                    <SelectItem value="75%">75%</SelectItem>
                    <SelectItem value="100%">100%</SelectItem>
                    <SelectItem value="125%">125%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={styles.viewportToolbarRight}>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-white text-black hover:bg-white/90 shadow-sm transition-all"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                data-testid="upload-template-btn"
              >
                <Upload size={14} />
                <span>{isUploading ? "Uploading..." : "Upload Template"}</span>
              </button>

              {templateImageUrl && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/15 text-white/90 border border-white/10 shadow-sm transition-all"
                  onClick={handleRemoveTemplate}
                  data-testid="remove-template-btn"
                >
                  <span>Remove Template</span>
                </button>
              )}
            </div>
          </div>

          {/* Dark Checkerboard Canvas Area */}
          <div
            ref={scrollAreaRef}
            className={styles.canvasScrollArea}
            onClick={(e) => {
              if (e.target === e.currentTarget && mode === "edit") {
                setSelectedLayerId(null);
              }
            }}
          >
            <div
              className={styles.artboardWrapper}
              style={{
                width: `${canvasWidth * zoomScale}px`,
                height: `${canvasHeight * zoomScale}px`,
              }}
            >
              <div
                className={styles.artboard}
                style={{
                  width: `${canvasWidth}px`,
                  height: `${canvasHeight}px`,
                  transform: `scale(${zoomScale})`,
                }}
                data-testid="ticket-artboard"
                onClick={(e) => {
                  if (e.target === e.currentTarget && mode === "edit") {
                    setSelectedLayerId(null);
                  }
                }}
              >
                {/* Background Ticket Image */}
                {templateImageUrl ? (
                  <img
                    src={templateImageUrl}
                    alt="Ticket Template Background"
                    className={styles.artboardBgImage}
                    data-testid="template-bg-image"
                  />
                ) : (
                  <div className={styles.emptyArtboardState}>
                    <Upload size={28} style={{ opacity: 0.5 }} />
                    <p className={styles.emptyArtboardTitle}>
                      No Template Image
                    </p>
                    <p className={styles.emptyArtboardSubtitle}>
                      Upload a ticket background image (PNG, JPG) to start placing
                      your ticket elements.
                    </p>
                  </div>
                )}

                {/* Render Draggable Layers */}
                {layers.map((layer) => {
                  const isSelected =
                    mode === "edit" && selectedLayerId === layer.id;
                  const isQr = layer.type === "qr";

                  return (
                    <div
                      key={layer.id}
                      className={`${styles.layerItem} ${isSelected ? styles.layerSelected : ""}`}
                      style={{
                        left: `${layer.x}px`,
                        top: `${layer.y}px`,
                        width: `${layer.width}px`,
                        height: `${layer.height}px`,
                        zIndex: isSelected ? 40 : 10,
                      }}
                      onMouseDown={(e) =>
                        handleLayerMouseDown(e, layer.id, layer.x, layer.y)
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        if (mode === "edit") {
                          setSelectedLayerId(layer.id);
                        }
                      }}
                      data-testid={`layer-box-${layer.id}`}
                    >
                    {/* Floating Coordinate Badge */}
                    {isSelected && (
                      <div
                        className={styles.coordBadge}
                        data-testid="coord-badge"
                      >
                        X:{layer.x} Y:{layer.y}
                      </div>
                    )}

                    {/* Resize Handles */}
                    {isSelected && (
                      <>
                        <div
                          className={`${styles.resizeHandle} ${styles.handleNw}`}
                          onMouseDown={(e) =>
                            handleResizeMouseDown(e, layer, "nw")
                          }
                        />
                        <div
                          className={`${styles.resizeHandle} ${styles.handleNe}`}
                          onMouseDown={(e) =>
                            handleResizeMouseDown(e, layer, "ne")
                          }
                        />
                        <div
                          className={`${styles.resizeHandle} ${styles.handleSe}`}
                          onMouseDown={(e) =>
                            handleResizeMouseDown(e, layer, "se")
                          }
                        />
                        <div
                          className={`${styles.resizeHandle} ${styles.handleSw}`}
                          onMouseDown={(e) =>
                            handleResizeMouseDown(e, layer, "sw")
                          }
                        />
                      </>
                    )}

                    {/* Layer Content */}
                    {isQr ? (
                      mode === "preview" ? (
                        <div className={styles.qrLayerBox}>
                          <QRCode
                            value="TIK-9842-X7"
                            size={Math.max(
                              16,
                              Math.min(layer.width, layer.height) - 12,
                            )}
                            fgColor="#000000"
                            bgColor="#ffffff"
                          />
                        </div>
                      ) : (
                        <div
                          className={styles.qrLayerBox}
                          data-testid="qr-placeholder"
                        >
                          <QrCode
                            size={Math.max(
                              18,
                              Math.min(36, layer.width / 2.5),
                            )}
                          />
                          <span className={styles.qrPlaceholderText}>QR</span>
                        </div>
                      )
                    ) : (
                      <div className={styles.textLayerBox}>
                        <div
                          className={styles.textClamped}
                          style={{
                            fontSize: `${layer.fontSize}px`,
                            color: layer.fontColor,
                            letterSpacing: `${layer.lineSpacing}px`,
                            WebkitLineClamp: layer.maxLines,
                            lineHeight: 1.2,
                            fontFamily: "inherit",
                            fontWeight: 600,
                          }}
                        >
                          {mode === "preview"
                            ? interpolateSamplePreview(
                                layer.tokenOrText,
                                activeTicketName,
                                eventTitle,
                              )
                            : layer.tokenOrText}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

        {/* RIGHT SIDEBAR (2 STACKED CARDS) */}
        <div className={styles.sidebar}>
          {/* CARD 1 — LAYERS */}
          <div className={styles.card} data-testid="layers-card">
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>LAYERS</span>
              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={styles.cardActionBtn}
                  onClick={handleAddTextLayer}
                  data-testid="add-text-layer-btn"
                >
                  <Plus size={13} />
                  <span>Text Layer</span>
                </button>
                <button
                  type="button"
                  className={styles.cardActionBtn}
                  onClick={handleAddQrLayer}
                  data-testid="add-qr-layer-btn"
                >
                  <Plus size={13} />
                  <span>QR Layer</span>
                </button>
              </div>
            </div>

            <div className={styles.layersList}>
              {layers.length === 0 ? (
                <div className={styles.emptyLayers}>
                  No layers added yet. Click <strong>+ Text Layer</strong> or{" "}
                  <strong>+ QR Layer</strong> above.
                </div>
              ) : (
                layers.map((l) => {
                  const isActive = selectedLayerId === l.id;
                  const isQr = l.type === "qr";
                  const title = isQr ? "QR Code" : l.tokenOrText || "Text Layer";
                  const subtitle = isQr ? "QR Layer" : "Text Layer";

                  return (
                    <div
                      key={l.id}
                      className={`${styles.layerRow} ${isActive ? styles.layerRowActive : ""}`}
                      onClick={() => {
                        setMode("edit");
                        setSelectedLayerId(l.id);
                      }}
                      data-testid={`layer-row-${l.id}`}
                    >
                      <div className={styles.layerRowInfo}>
                        <div className={styles.layerRowIcon}>
                          {isQr ? <QrCode size={15} /> : <Type size={15} />}
                        </div>
                        <div className={styles.layerRowText}>
                          <span className={styles.layerRowName}>{title}</span>
                          <span className={styles.layerRowSubtitle}>
                            {subtitle}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={styles.layerDeleteBtn}
                        onClick={(e) => handleDeleteLayer(l.id, e)}
                        title="Delete layer"
                        data-testid={`delete-layer-${l.id}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CARD 2 — INSPECTOR */}
          {selectedLayer ? (
            <div className={styles.card} data-testid="inspector-card">
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>
                  INSPECTOR:{" "}
                  {selectedLayer.type === "qr" ? "QR Code" : "Text Layer"}
                </span>
              </div>

              <div className={styles.inspectorForm}>
                {/* 2-Column: X and Y */}
                <div className={styles.grid2Col}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>X (px)</label>
                    <Input
                      type="number"
                      value={selectedLayer.x}
                      onChange={(e) =>
                        updateSelectedLayer({
                          x: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="h-9 text-xs"
                      data-testid="input-x"
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Y (px)</label>
                    <Input
                      type="number"
                      value={selectedLayer.y}
                      onChange={(e) =>
                        updateSelectedLayer({
                          y: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="h-9 text-xs"
                      data-testid="input-y"
                    />
                  </div>
                </div>

                {/* Text Layer Properties */}
                {selectedLayer.type === "text" && (
                  <>
                    {/* TEXT / TOKEN with Radix UI Token Popover */}
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>TEXT / TOKEN</label>
                      <div className={styles.tokenInputRow}>
                        <Input
                          type="text"
                          value={selectedLayer.tokenOrText}
                          onChange={(e) =>
                            updateSelectedLayer({
                              tokenOrText: e.target.value,
                            })
                          }
                          className="h-9 text-xs flex-1"
                          placeholder="e.g. {{name}}"
                          data-testid="input-text-token"
                        />

                        {/* Token Picker Popover */}
                        <Popover
                          open={tokenPopoverOpen}
                          onOpenChange={setTokenPopoverOpen}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className={styles.tokenPickerBtn}
                              data-testid="token-picker-trigger"
                            >
                              <Braces size={13} />
                              <span>Tokens</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            className={styles.popoverTokenList}
                            align="end"
                          >
                            <span className={styles.tokenSectionTitle}>
                              STANDARD TOKENS
                            </span>
                            <button
                              type="button"
                              className={styles.tokenItemBtn}
                              onClick={() => {
                                updateSelectedLayer({
                                  tokenOrText: "{{name}}",
                                  name: "Delegate Name",
                                });
                                setTokenPopoverOpen(false);
                              }}
                            >
                              <span className={styles.tokenItemLabel}>
                                Delegate Name
                              </span>
                              <span className={styles.tokenItemToken}>
                                {"{{name}}"}
                              </span>
                            </button>

                            <button
                              type="button"
                              className={styles.tokenItemBtn}
                              onClick={() => {
                                updateSelectedLayer({
                                  tokenOrText: "{{email}}",
                                  name: "Delegate Email",
                                });
                                setTokenPopoverOpen(false);
                              }}
                            >
                              <span className={styles.tokenItemLabel}>
                                Delegate Email
                              </span>
                              <span className={styles.tokenItemToken}>
                                {"{{email}}"}
                              </span>
                            </button>

                            <button
                              type="button"
                              className={styles.tokenItemBtn}
                              onClick={() => {
                                updateSelectedLayer({
                                  tokenOrText: "{{ticket_code}}",
                                  name: "Ticket Code",
                                });
                                setTokenPopoverOpen(false);
                              }}
                            >
                              <span className={styles.tokenItemLabel}>
                                Ticket Code
                              </span>
                              <span className={styles.tokenItemToken}>
                                {"{{ticket_code}}"}
                              </span>
                            </button>

                            <button
                              type="button"
                              className={styles.tokenItemBtn}
                              onClick={() => {
                                updateSelectedLayer({
                                  tokenOrText: "{{ticket_type}}",
                                  name: "Ticket Title",
                                });
                                setTokenPopoverOpen(false);
                              }}
                            >
                              <span className={styles.tokenItemLabel}>
                                Ticket Title
                              </span>
                              <span className={styles.tokenItemToken}>
                                {"{{ticket_type}}"}
                              </span>
                            </button>

                            <button
                              type="button"
                              className={styles.tokenItemBtn}
                              onClick={() => {
                                updateSelectedLayer({
                                  tokenOrText: "{{event_title}}",
                                  name: "Event Title",
                                });
                                setTokenPopoverOpen(false);
                              }}
                            >
                              <span className={styles.tokenItemLabel}>
                                Event Title
                              </span>
                              <span className={styles.tokenItemToken}>
                                {"{{event_title}}"}
                              </span>
                            </button>

                            {/* Custom Event Form Fields */}
                            {formFields.length > 0 && (
                              <>
                                <span className={styles.tokenSectionTitle}>
                                  EVENT FORM FIELDS
                                </span>
                                {formFields.map((field) => (
                                  <button
                                    key={field.id}
                                    type="button"
                                    className={styles.tokenItemBtn}
                                    onClick={() => {
                                      updateSelectedLayer({
                                        tokenOrText: `{{form.${field.label}}}`,
                                        name: field.label,
                                      });
                                      setTokenPopoverOpen(false);
                                    }}
                                  >
                                    <span className={styles.tokenItemLabel}>
                                      {field.label}
                                    </span>
                                    <span className={styles.tokenItemToken}>
                                      {`{{form.${field.label}}}`}
                                    </span>
                                  </button>
                                ))}
                              </>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* FONT SIZE and MAX LINES (2-Col Grid) */}
                    <div className={styles.grid2Col}>
                      <div className={styles.formField}>
                        <label className={styles.formLabel}>
                          FONT SIZE (px)
                        </label>
                        <Input
                          type="number"
                          min="8"
                          max="200"
                          value={selectedLayer.fontSize}
                          onChange={(e) =>
                            updateSelectedLayer({
                              fontSize: parseInt(e.target.value, 10) || 16,
                            })
                          }
                          className="h-9 text-xs"
                          data-testid="input-font-size"
                        />
                      </div>

                      <div className={styles.formField}>
                        <label className={styles.formLabel}>MAX LINES</label>
                        <Input
                          type="number"
                          min="1"
                          max="20"
                          value={selectedLayer.maxLines}
                          onChange={(e) =>
                            updateSelectedLayer({
                              maxLines: parseInt(e.target.value, 10) || 1,
                            })
                          }
                          className="h-9 text-xs"
                          data-testid="input-max-lines"
                        />
                      </div>
                    </div>

                    {/* LINE SPACING */}
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>LINE SPACING</label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={selectedLayer.lineSpacing}
                        onChange={(e) =>
                          updateSelectedLayer({
                            lineSpacing: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="h-9 text-xs"
                        data-testid="input-line-spacing"
                      />
                    </div>

                    {/* FONT COLOR */}
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>FONT COLOR</label>
                      <div className={styles.colorPickerRow}>
                        <input
                          type="color"
                          value={selectedLayer.fontColor || "#000000"}
                          onChange={(e) =>
                            updateSelectedLayer({
                              fontColor: e.target.value,
                            })
                          }
                          className={styles.colorInputSwatch}
                          data-testid="input-font-color-swatch"
                        />
                        <Input
                          type="text"
                          value={selectedLayer.fontColor}
                          onChange={(e) =>
                            updateSelectedLayer({
                              fontColor: e.target.value,
                            })
                          }
                          className="h-9 text-xs flex-1 font-mono uppercase"
                          data-testid="input-font-color-hex"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* QR Layer Properties */}
                {selectedLayer.type === "qr" && (
                  <div className={styles.grid2Col}>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>WIDTH (px)</label>
                      <Input
                        type="number"
                        min="20"
                        max="800"
                        value={selectedLayer.width}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 120;
                          updateSelectedLayer({ width: val, height: val });
                        }}
                        className="h-9 text-xs"
                        data-testid="input-qr-width"
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.formLabel}>HEIGHT (px)</label>
                      <Input
                        type="number"
                        min="20"
                        max="800"
                        value={selectedLayer.height}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 120;
                          updateSelectedLayer({ width: val, height: val });
                        }}
                        className="h-9 text-xs"
                        data-testid="input-qr-height"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              className={styles.card}
              style={{ textAlign: "center", color: "#71717a", padding: "2rem" }}
            >
              <Palette
                size={24}
                style={{ margin: "0 auto 0.5rem", opacity: 0.4 }}
              />
              <p style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                No layer selected
              </p>
              <p style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                Click any layer on the canvas or in the Layers list above to
                inspect and adjust its coordinates, typography, or size.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className={styles.bottomBar}>
        <div className={styles.figmaHelper}>
          <ExternalLink size={14} />
          <span>
            Create custom ticket designs using{" "}
            <a
              href="https://www.figma.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.figmaHelperLink}
            >
              Figma
            </a>
          </span>
        </div>

        <div className={styles.bottomActions}>
          {onClose && (
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              data-testid="cancel-btn"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            className={styles.updateBtn}
            onClick={handleUpdate}
            disabled={isSaving}
            data-testid="save-template-btn"
          >
            <span>{isSaving ? "Saving..." : "Update"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
