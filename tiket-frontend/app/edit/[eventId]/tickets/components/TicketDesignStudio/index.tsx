"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import {
  QrCode,
  User,
  Type,
  Calendar,
  MapPin,
  Tag,
  FileText,
  Upload,
  Save,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Copy,
  Info,
  Layers,
  Sparkles,
  Plus,
} from "lucide-react";
import { getSignedUrl, uploadToCDN } from "@/api/events";
import { getImageUrl } from "@/constants/config";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  getTicketTypes,
} from "@/api/tickets";
import { getFormFields } from "@/api/forms";
import type {
  TicketCanvasConfig,
  TicketCanvasElement,
  TicketElementType,
  DocumentTemplate,
  TicketLayerConditionBranch,
  TicketLayerElseBehavior,
} from "./types";
import type { FormField } from "@/types/form";
import type { TicketType } from "@/types/ticketType";
import type { TicketPassData } from "@/types/ticket";
import { resolveTicketLayer } from "@/app/passes/[ticketId]/components/CustomTicketCanvas";
import styles from "./TicketDesignStudio.module.css";

interface TicketDesignStudioProps {
  eventId: string;
}

type ResizeHandleType = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const PRESETS = [
  { label: "Landscape (1200x600)", width: 1200, height: 600 },
  { label: "Vertical (750x1200)", width: 750, height: 1200 },
  { label: "Badge (800x1000)", width: 800, height: 1000 },
];

const FONT_FAMILIES = [
  "Inter, sans-serif",
  "Playfair Display, serif",
  "Space Grotesk, sans-serif",
  "JetBrains Mono, monospace",
  "Cinzel, serif",
  "Plus Jakarta Sans, sans-serif",
];

let elementCounter = 0;
function createUniqueId(prefix = "elem"): string {
  elementCounter += 1;
  return `${prefix}_${elementCounter}`;
}

export default function TicketDesignStudio({ eventId }: TicketDesignStudioProps) {
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("Ticket Template");
  const [canvasWidth, setCanvasWidth] = useState(1200);
  const [canvasHeight, setCanvasHeight] = useState(600);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [elements, setElements] = useState<TicketCanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form Fields & Ticket Types
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);

  // Simulator State
  const [simulatorActive, setSimulatorActive] = useState(false);
  const [simulatedTicketTypeId, setSimulatedTicketTypeId] = useState<string>("");
  const [simulatedAnswers, setSimulatedAnswers] = useState<Record<string, string>>({});

  // Viewport zoom & scale
  const [zoomScale, setZoomScale] = useState(1);
  const [isAutoFit, setIsAutoFit] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Snap guides
  const [snapX, setSnapX] = useState<number | null>(null);
  const [snapY, setSnapY] = useState<number | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ResizeObserver for viewport scaling
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      if (isAutoFit) {
        const padding = 60;
        const width = entry.contentRect.width - padding;
        const height = entry.contentRect.height - padding;
        if (width > 0 && height > 0) {
          const scaleX = width / canvasWidth;
          const scaleY = height / canvasHeight;
          setZoomScale(Math.min(scaleX, scaleY, 1));
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [canvasWidth, canvasHeight, isAutoFit]);

  // Load template, form fields & ticket types on mount
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      // 1. Load active template
      try {
        const templates = await getTemplates(eventId);
        if (!mounted) return;
        const active = templates.find((t: DocumentTemplate) => t.type === "ticket");
        if (active) {
          setTemplateId(active.id);
          setTemplateName(active.name || "Ticket Template");
          setBackgroundImageUrl(active.backgroundImageUrl || null);

          if (active.elementsJson && typeof active.elementsJson === "object") {
            const config = active.elementsJson as Partial<TicketCanvasConfig>;
            if (config.canvasWidth) setCanvasWidth(config.canvasWidth);
            if (config.canvasHeight) setCanvasHeight(config.canvasHeight);
            if (Array.isArray(config.elements)) {
              setElements(config.elements);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load ticket templates:", err);
      }

      // 2. Load Form Fields (graceful fallback)
      try {
        const fields = await getFormFields(eventId);
        if (mounted && Array.isArray(fields)) {
          setFormFields(fields);
        }
      } catch {
        // Fallback or unmocked in test
      }

      // 3. Load Ticket Types (graceful fallback)
      try {
        const types = await getTicketTypes(eventId);
        if (mounted && Array.isArray(types)) {
          setTicketTypes(types);
          if (types.length > 0) {
            setSimulatedTicketTypeId(types[0].id);
          }
        }
      } catch {
        // Fallback or unmocked in test
      }
    };

    void loadData();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  const selectedElement = elements.find((el) => el.id === selectedId) || null;

  // Add Element
  const addElement = (
    type: TicketElementType,
    label: string,
    variableKey?: string,
    customText?: string,
    extraWidth = 280,
    extraHeight = 44,
    fieldId?: string,
    fieldLabel?: string,
    fallbackText?: string,
  ) => {
    const newId = createUniqueId("elem");
    const newElement: TicketCanvasElement = {
      id: newId,
      type,
      label,
      variableKey,
      customText,
      fieldId,
      fieldLabel,
      fallbackText,
      x: Math.round(canvasWidth / 2 - extraWidth / 2),
      y: Math.round(canvasHeight / 2 - extraHeight / 2),
      width: extraWidth,
      height: extraHeight,
      rotation: 0,
      zIndex: elements.length + 1,
      style: {
        fontFamily: "Inter, sans-serif",
        fontSize: type === "qr" ? 140 : type === "badge" ? 14 : 20,
        fontWeight: type === "qr" ? 400 : 600,
        color: "#ffffff",
        textAlign: type === "badge" ? "center" : "left",
        autoFitText: false,
        qrFgColor: "#000000",
        qrBgColor: "#ffffff",
        backgroundColor:
          type === "badge" ? "rgba(40, 167, 69, 0.25)" : undefined,
        borderRadius: type === "badge" ? 6 : undefined,
      },
    };
    setElements((prev) => [...prev, newElement]);
    setSelectedId(newId);
  };

  const addFormFieldElement = (field: FormField) => {
    addElement(
      "form_field",
      field.label,
      `{{form.${field.label}}}`,
      `[${field.label}]`,
      260,
      40,
      field.id,
      field.label,
      "",
    );
  };

  const addBadgeElement = () => {
    addElement(
      "badge",
      "Badge",
      undefined,
      "VIP PASS",
      140,
      36,
    );
  };

  // Update selected element property
  const updateSelected = (updates: Partial<TicketCanvasElement>) => {
    if (!selectedId) return;
    setElements((prev) =>
      prev.map((el) => (el.id === selectedId ? { ...el, ...updates } : el)),
    );
  };

  const updateSelectedStyle = (styleUpdates: Partial<TicketCanvasElement["style"]>) => {
    if (!selectedId) return;
    setElements((prev) =>
      prev.map((el) =>
        el.id === selectedId
          ? { ...el, style: { ...el.style, ...styleUpdates } }
          : el,
      ),
    );
  };

  // Remove element
  const deleteElement = (id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // Duplicate element
  const duplicateElement = (id: string) => {
    const target = elements.find((el) => el.id === id);
    if (!target) return;
    const copyId = createUniqueId("elem");
    const copy: TicketCanvasElement = {
      ...target,
      id: copyId,
      x: target.x + 20,
      y: target.y + 20,
      zIndex: elements.length + 1,
    };
    setElements((prev) => [...prev, copy]);
    setSelectedId(copyId);
  };

  // Condition Rules Management
  const addConditionRule = () => {
    if (!selectedElement) return;
    const defaultSourceKey = ticketTypes[0]?.name || "VIP";
    const defaultBranch: TicketLayerConditionBranch = {
      id: createUniqueId("rule"),
      sourceType: "ticketType",
      sourceKey: defaultSourceKey,
      operator: "equals",
      value: defaultSourceKey,
      thenEffect: {
        visible: true,
        textOverride: "",
        colorOverride: "",
        bgColorOverride: "",
      },
    };
    const currentRules = selectedElement.conditionalRules || [];
    updateSelected({
      conditionalRules: [...currentRules, defaultBranch],
      elseBehavior: selectedElement.elseBehavior || {
        visible: true,
        textOverride: "",
        colorOverride: "",
        bgColorOverride: "",
      },
    });
  };

  const updateConditionRule = (
    ruleId: string,
    updates: Partial<TicketLayerConditionBranch>,
  ) => {
    if (!selectedElement || !selectedElement.conditionalRules) return;
    const updated = selectedElement.conditionalRules.map((rule) => {
      if (rule.id !== ruleId) return rule;
      return {
        ...rule,
        ...updates,
        thenEffect: {
          ...rule.thenEffect,
          ...(updates.thenEffect || {}),
        },
      };
    });
    updateSelected({ conditionalRules: updated });
  };

  const deleteConditionRule = (ruleId: string) => {
    if (!selectedElement || !selectedElement.conditionalRules) return;
    const updated = selectedElement.conditionalRules.filter((r) => r.id !== ruleId);
    updateSelected({ conditionalRules: updated });
  };

  const updateElseBehavior = (updates: Partial<TicketLayerElseBehavior>) => {
    if (!selectedElement) return;
    updateSelected({
      elseBehavior: {
        visible: selectedElement.elseBehavior?.visible ?? true,
        textOverride: selectedElement.elseBehavior?.textOverride,
        colorOverride: selectedElement.elseBehavior?.colorOverride,
        bgColorOverride: selectedElement.elseBehavior?.bgColorOverride,
        ...updates,
      },
    });
  };

  // Background Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast.info("Uploading ticket background...");
    try {
      const contentType = file.type || "image/png";
      const { url: signedUrl, max_size } = await getSignedUrl(file.name, contentType);

      if (file.size / 1024 / 1024 > max_size) {
        toast.error(`Image exceeds ${max_size}MB limit`);
        setIsUploading(false);
        return;
      }

      const { filename } = await uploadToCDN(signedUrl, file);
      const fullUrl = getImageUrl(filename);
      setBackgroundImageUrl(fullUrl);

      // Auto-read natural dimensions
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          setCanvasWidth(img.naturalWidth);
          setCanvasHeight(img.naturalHeight);
          toast.success(
            `Background updated: Canvas adjusted to ${img.naturalWidth}x${img.naturalHeight}px`,
          );
        }
      };
      img.src = fullUrl;
    } catch (err) {
      console.error("Failed to upload background image:", err);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Preset Selection
  const applyPreset = (w: number, h: number) => {
    setCanvasWidth(w);
    setCanvasHeight(h);
    setIsAutoFit(true);
  };

  // Drag Pointer Handling
  const handleElementPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    elementId: string,
  ) => {
    e.stopPropagation();
    setSelectedId(elementId);

    const elem = elements.find((el) => el.id === elementId);
    if (!elem) return;

    const startPointerX = e.clientX;
    const startPointerY = e.clientY;
    const startX = elem.x;
    const startY = elem.y;

    const onPointerMove = (moveEvt: PointerEvent) => {
      const deltaX = (moveEvt.clientX - startPointerX) / zoomScale;
      const deltaY = (moveEvt.clientY - startPointerY) / zoomScale;

      let nextX = Math.round(startX + deltaX);
      let nextY = Math.round(startY + deltaY);

      // Alignment Snap Guides (horizontal & vertical center)
      const elementCenterX = nextX + elem.width / 2;
      const elementCenterY = nextY + elem.height / 2;
      const artboardCenterX = canvasWidth / 2;
      const artboardCenterY = canvasHeight / 2;

      if (Math.abs(elementCenterX - artboardCenterX) < 7) {
        nextX = Math.round(artboardCenterX - elem.width / 2);
        setSnapX(artboardCenterX);
      } else {
        setSnapX(null);
      }

      if (Math.abs(elementCenterY - artboardCenterY) < 7) {
        nextY = Math.round(artboardCenterY - elem.height / 2);
        setSnapY(artboardCenterY);
      } else {
        setSnapY(null);
      }

      setElements((prev) =>
        prev.map((el) => (el.id === elementId ? { ...el, x: nextX, y: nextY } : el)),
      );
    };

    const onPointerUp = () => {
      setSnapX(null);
      setSnapY(null);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // 8-Handle Resize Pointer Handling
  const handleResizePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    handle: ResizeHandleType,
  ) => {
    e.stopPropagation();
    if (!selectedElement) return;

    const startPointerX = e.clientX;
    const startPointerY = e.clientY;
    const startX = selectedElement.x;
    const startY = selectedElement.y;
    const startW = selectedElement.width;
    const startH = selectedElement.height;
    const isQr = selectedElement.type === "qr";

    const onPointerMove = (moveEvt: PointerEvent) => {
      const deltaX = (moveEvt.clientX - startPointerX) / zoomScale;
      const deltaY = (moveEvt.clientY - startPointerY) / zoomScale;

      let newX = startX;
      let newY = startY;
      let newW = startW;
      let newH = startH;

      if (handle.includes("e")) newW = Math.max(30, Math.round(startW + deltaX));
      if (handle.includes("s")) newH = Math.max(20, Math.round(startH + deltaY));
      if (handle.includes("w")) {
        const potentialW = Math.max(30, Math.round(startW - deltaX));
        newX = startX + (startW - potentialW);
        newW = potentialW;
      }
      if (handle.includes("n")) {
        const potentialH = Math.max(20, Math.round(startH - deltaY));
        newY = startY + (startH - potentialH);
        newH = potentialH;
      }

      // Preserve aspect ratio for QR Code
      if (isQr) {
        const side = Math.max(newW, newH);
        newW = side;
        newH = side;
      }

      updateSelected({ x: newX, y: newY, width: newW, height: newH });
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // Rotation Handle Pointer Handling (with 15° shift snap)
  const handleRotatePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!selectedElement) return;

    const elemDom = document.getElementById(`ticket-element-${selectedElement.id}`);
    if (!elemDom) return;

    const rect = elemDom.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const onPointerMove = (moveEvt: PointerEvent) => {
      const rad = Math.atan2(moveEvt.clientY - centerY, moveEvt.clientX - centerX);
      let deg = Math.round((rad * 180) / Math.PI + 90);

      if (moveEvt.shiftKey) {
        deg = Math.round(deg / 15) * 15;
      }

      if (deg > 180) deg -= 360;
      if (deg < -180) deg += 360;

      updateSelected({ rotation: deg });
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // Save Canvas Config
  const handleSave = async () => {
    setIsSaving(true);
    const canvasConfig: TicketCanvasConfig = {
      canvasWidth,
      canvasHeight,
      elements,
    };

    try {
      if (templateId) {
        await updateTemplate(templateId, {
          name: templateName,
          backgroundImageUrl,
          elementsJson: canvasConfig,
        });
        toast.success("Ticket template saved successfully");
      } else {
        const created = await createTemplate(eventId, {
          name: templateName,
          type: "ticket",
          backgroundImageUrl,
          elementsJson: canvasConfig,
        });
        setTemplateId(created.id);
        toast.success("Ticket template created successfully");
      }
    } catch (err) {
      console.error("Failed to save ticket template:", err);
      toast.error("Failed to save template. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset Canvas
  const handleReset = () => {
    if (confirm("Reset ticket design back to empty canvas?")) {
      setElements([]);
      setSelectedId(null);
      setBackgroundImageUrl(null);
      setCanvasWidth(1200);
      setCanvasHeight(600);
      toast.info("Ticket design reset.");
    }
  };

  // Simulated pass data for "Preview As..." mode
  const simulatedPass: Partial<TicketPassData> = useMemo(() => {
    const selectedTier =
      ticketTypes.find((tt) => tt.id === simulatedTicketTypeId) ||
      (ticketTypes.length > 0
        ? ticketTypes[0]
        : {
            id: "tt-sim",
            name: "VIP Pass",
            price: "1000",
            isTransferable: true,
            isRefundable: true,
          });

    const responses = Object.entries(simulatedAnswers).map(([label, value]) => ({
      label,
      value,
    }));

    return {
      id: "sim-ticket-1",
      qrCode: "https://tiket.app/passes/preview",
      status: "active" as const,
      createdAt: new Date().toISOString(),
      ticketType: selectedTier,
      attendee: {
        id: "sim-user-1",
        name: "Alex Johnson",
        email: "alex@example.com",
      },
      responses,
    };
  }, [ticketTypes, simulatedTicketTypeId, simulatedAnswers]);

  return (
    <div className={styles.studioContainer} data-testid="ticket-design-studio">
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            style={{ display: "none" }}
          />
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload size={16} />
            <span>{isUploading ? "Uploading..." : "Upload Background"}</span>
          </button>

          {/* Dimension Presets */}
          <div className={styles.presetGroup}>
            {PRESETS.map((p) => {
              const isActive = canvasWidth === p.width && canvasHeight === p.height;
              return (
                <button
                  key={p.label}
                  type="button"
                  className={`${styles.presetBtn} ${isActive ? styles.presetBtnActive : ""}`}
                  onClick={() => applyPreset(p.width, p.height)}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setShowGuide((prev) => !prev)}
            title="Figma Dimension Guide"
          >
            <Info size={16} />
          </button>
        </div>

        <div className={styles.topBarRight}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleReset}
            title="Reset Canvas"
          >
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>

          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save size={16} />
            <span>{isSaving ? "Saving..." : "Save Template"}</span>
          </button>
        </div>
      </div>

      {/* "Preview As..." Simulator Bar */}
      <div className={styles.simulatorBar} data-testid="simulator-bar">
        <div className={styles.simulatorControls}>
          <button
            type="button"
            className={`${styles.btnSecondary} ${simulatorActive ? styles.simBadgeActive : ""}`}
            onClick={() => setSimulatorActive((prev) => !prev)}
            data-testid="toggle-simulator-btn"
          >
            <Sparkles size={14} />
            <span>
              {simulatorActive ? "Preview Active" : "Preview As (Simulator)"}
            </span>
          </button>

          {simulatorActive && (
            <>
              {/* Ticket Tier Simulation */}
              <div className={styles.simFieldRow}>
                <span>Tier:</span>
                <select
                  className={styles.selectField}
                  style={{ width: "auto", minWidth: 140 }}
                  value={simulatedTicketTypeId}
                  onChange={(e) => setSimulatedTicketTypeId(e.target.value)}
                  data-testid="sim-tier-select"
                >
                  {ticketTypes.map((tt) => (
                    <option key={tt.id} value={tt.id}>
                      {tt.name}
                    </option>
                  ))}
                  {ticketTypes.length === 0 && (
                    <option value="sim_vip">VIP Pass</option>
                  )}
                </select>
              </div>

              {/* Form Fields Simulation */}
              {formFields.map((field) => (
                <div key={field.id} className={styles.simFieldRow}>
                  <span>{field.label}:</span>
                  <input
                    type="text"
                    className={styles.simFieldInput}
                    value={simulatedAnswers[field.label] || ""}
                    placeholder="Simulate answer"
                    data-testid={`sim-input-${field.label.toLowerCase().replace(/\s+/g, "-")}`}
                    onChange={(e) =>
                      setSimulatedAnswers((prev) => ({
                        ...prev,
                        [field.label]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}

              <button
                type="button"
                className={styles.btnSecondary}
                style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                onClick={() => {
                  setSimulatedAnswers({});
                  if (ticketTypes.length > 0) {
                    setSimulatedTicketTypeId(ticketTypes[0].id);
                  }
                }}
              >
                Clear Answers
              </button>
            </>
          )}
        </div>
      </div>

      {/* Figma Guide Banner */}
      {showGuide && (
        <div className={styles.guideCard}>
          <strong>📐 Figma Ticket Dimension & Export Guide:</strong>
          <div>
            • <strong>Landscape Pass:</strong> Design at <code>1200 x 600 px</code> (2:1 aspect ratio). Best for PDF passes and wallet landscape views.
          </div>
          <div>
            • <strong>Vertical Pass:</strong> Design at <code>750 x 1200 px</code> (9:16 approx). Best for Apple Wallet / Google Wallet mobile styles.
          </div>
          <div>
            • <strong>Export format:</strong> Export your frame from Figma as <code>PNG</code> or <code>JPEG</code> at 1x or 2x, then upload as the background image. All dynamic placeholders will render sharply on top.
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className={styles.mainLayout}>
        {/* Workspace Card */}
        <div className={styles.viewportCard}>
          <div className={styles.viewportToolbar}>
            <div className={styles.viewportInfo}>
              <span>Canvas: {canvasWidth} x {canvasHeight} px</span>
              <span>•</span>
              <span>{elements.length} Element{elements.length === 1 ? "" : "s"}</span>
            </div>

            <div className={styles.zoomGroup}>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => {
                  setIsAutoFit(false);
                  setZoomScale((z) => Math.max(0.15, z - 0.1));
                }}
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <span className={styles.zoomLevel}>{Math.round(zoomScale * 100)}%</span>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => {
                  setIsAutoFit(false);
                  setZoomScale((z) => Math.min(2.5, z + 0.1));
                }}
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => {
                  setIsAutoFit(true);
                  if (viewportRef.current) {
                    const width = viewportRef.current.clientWidth - 60;
                    const height = viewportRef.current.clientHeight - 60;
                    if (width > 0 && height > 0) {
                      setZoomScale(Math.min(width / canvasWidth, height / canvasHeight, 1));
                    }
                  }
                }}
                title="Fit to Screen"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>

          {/* Interactive Artboard Viewport */}
          <div
            ref={viewportRef}
            className={styles.canvasViewport}
            onClick={() => setSelectedId(null)}
          >
            <div
              className={styles.artboardContainer}
              style={{
                width: canvasWidth,
                height: canvasHeight,
                transform: `scale(${zoomScale})`,
              }}
            >
              <div
                className={styles.artboard}
                style={{
                  width: canvasWidth,
                  height: canvasHeight,
                  backgroundImage: backgroundImageUrl ? `url("${backgroundImageUrl}")` : undefined,
                }}
              >
                {/* Visual Placeholder if background is missing */}
                {!backgroundImageUrl && elements.length === 0 && (
                  <div className={styles.artboardEmpty}>
                    <Upload size={32} />
                    <span>Upload a Figma background image or add dynamic placeholders</span>
                  </div>
                )}

                {/* Alignment Snap Guides */}
                {snapX !== null && (
                  <div className={styles.snapGuideLineX} style={{ left: snapX }} />
                )}
                {snapY !== null && (
                  <div className={styles.snapGuideLineY} style={{ top: snapY }} />
                )}

                {/* Render Canvas Elements */}
                {elements.map((el) => {
                  const isSelected = el.id === selectedId;

                  // Conditional resolution when simulating
                  const resolved = simulatorActive
                    ? resolveTicketLayer(el, simulatedPass)
                    : {
                        visible: true,
                        text: el.customText || el.variableKey || el.label,
                        color: el.style.color || "#ffffff",
                        bgColor: el.style.backgroundColor || el.style.bgColor,
                      };

                  const isHiddenInSim = simulatorActive && !resolved.visible;

                  return (
                    <div
                      key={el.id}
                      id={`ticket-element-${el.id}`}
                      data-testid={`canvas-element-${el.id}`}
                      className={`${styles.canvasElement} ${
                        isSelected ? styles.canvasElementSelected : ""
                      }`}
                      style={{
                        left: el.x,
                        top: el.y,
                        width: el.width,
                        height: el.height,
                        zIndex: el.zIndex,
                        transform: `rotate(${el.rotation || 0}deg)`,
                        opacity: isHiddenInSim ? (isSelected ? 0.45 : 0.2) : 1,
                      }}
                      onPointerDown={(e) => handleElementPointerDown(e, el.id)}
                    >
                      {/* Element Content */}
                      {el.type === "qr" ? (
                        <div
                          className={styles.qrContainer}
                          style={{
                            backgroundColor:
                              resolved.bgColor || el.style.qrBgColor || "#ffffff",
                            padding: 6,
                            borderRadius: el.style.borderRadius || 6,
                          }}
                        >
                          <QRCode
                            value="https://tiket.app/passes/sample-ticket"
                            size={Math.max(20, Math.min(el.width, el.height) - 12)}
                            fgColor={
                              resolved.color || el.style.qrFgColor || "#000000"
                            }
                            bgColor={
                              resolved.bgColor || el.style.qrBgColor || "#ffffff"
                            }
                          />
                        </div>
                      ) : (
                        <div
                          className={styles.elementContent}
                          style={{
                            fontFamily: el.style.fontFamily || "Inter, sans-serif",
                            fontSize: `${el.style.fontSize || 20}px`,
                            fontWeight: el.style.fontWeight || 600,
                            color: resolved.color || el.style.color || "#ffffff",
                            backgroundColor:
                              resolved.bgColor ||
                              el.style.backgroundColor ||
                              el.style.bgColor ||
                              (el.type === "badge"
                                ? "rgba(40, 167, 69, 0.25)"
                                : undefined),
                            borderRadius:
                              el.style.borderRadius ||
                              (el.type === "badge" ? 6 : undefined),
                            padding:
                              el.style.padding ||
                              (el.type === "badge" ? "4px 8px" : undefined),
                            justifyContent:
                              el.style.textAlign === "center"
                                ? "center"
                                : el.style.textAlign === "right"
                                  ? "flex-end"
                                  : "flex-start",
                          }}
                        >
                          {resolved.text || el.customText || el.variableKey || el.label}
                        </div>
                      )}

                      {/* Hidden Overlay Indicator during simulation */}
                      {isHiddenInSim && (
                        <div className={styles.hiddenOverlay}>
                          Hidden by Condition
                        </div>
                      )}

                      {/* 8 Resize Handles & Rotation Handle if Selected */}
                      {isSelected && (
                        <>
                          <div
                            className={`${styles.resizeHandle} ${styles.handleNW}`}
                            onPointerDown={(e) => handleResizePointerDown(e, "nw")}
                          />
                          <div
                            className={`${styles.resizeHandle} ${styles.handleN}`}
                            onPointerDown={(e) => handleResizePointerDown(e, "n")}
                          />
                          <div
                            className={`${styles.resizeHandle} ${styles.handleNE}`}
                            onPointerDown={(e) => handleResizePointerDown(e, "ne")}
                          />
                          <div
                            className={`${styles.resizeHandle} ${styles.handleE}`}
                            onPointerDown={(e) => handleResizePointerDown(e, "e")}
                          />
                          <div
                            className={`${styles.resizeHandle} ${styles.handleSE}`}
                            onPointerDown={(e) => handleResizePointerDown(e, "se")}
                          />
                          <div
                            className={`${styles.resizeHandle} ${styles.handleS}`}
                            onPointerDown={(e) => handleResizePointerDown(e, "s")}
                          />
                          <div
                            className={`${styles.resizeHandle} ${styles.handleSW}`}
                            onPointerDown={(e) => handleResizePointerDown(e, "sw")}
                          />
                          <div
                            className={`${styles.resizeHandle} ${styles.handleW}`}
                            onPointerDown={(e) => handleResizePointerDown(e, "w")}
                          />

                          <div className={styles.rotateStalk} />
                          <div
                            className={styles.rotateHandle}
                            title="Drag to rotate (Hold Shift for 15° snap)"
                            onPointerDown={handleRotatePointerDown}
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Toolbar & Inspector */}
        <div className={styles.sidebarCard}>
          {/* Add Elements Section */}
          <div className={styles.sidebarSection}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Add Placeholder</h3>
            </div>
            <div className={styles.toolsGrid}>
              <button
                type="button"
                className={styles.toolBtn}
                onClick={() => addElement("qr", "Ticket QR Code", undefined, undefined, 140, 140)}
              >
                <QrCode size={15} />
                <span>QR Code</span>
              </button>

              <button
                type="button"
                className={styles.toolBtn}
                onClick={() =>
                  addElement(
                    "variable",
                    "Attendee Name",
                    "{{attendee.name}}",
                    "Alex Johnson",
                    320,
                    46,
                  )
                }
              >
                <User size={15} />
                <span>Name</span>
              </button>

              <button
                type="button"
                className={styles.toolBtn}
                onClick={() =>
                  addElement(
                    "variable",
                    "Event Title",
                    "{{event.title}}",
                    "Tech Summit 2026",
                    360,
                    52,
                  )
                }
              >
                <Type size={15} />
                <span>Event Title</span>
              </button>

              <button
                type="button"
                className={styles.toolBtn}
                onClick={() =>
                  addElement(
                    "variable",
                    "Ticket Tier",
                    "{{ticket.type}}",
                    "VIP Pass",
                    220,
                    40,
                  )
                }
              >
                <Tag size={15} />
                <span>Ticket Tier</span>
              </button>

              <button
                type="button"
                className={styles.toolBtn}
                onClick={() =>
                  addElement(
                    "variable",
                    "Event Date",
                    "{{event.date}}",
                    "Oct 24, 2026 • 10:00 AM",
                    280,
                    38,
                  )
                }
              >
                <Calendar size={15} />
                <span>Event Date</span>
              </button>

              <button
                type="button"
                className={styles.toolBtn}
                onClick={() =>
                  addElement(
                    "variable",
                    "Location",
                    "{{event.location}}",
                    "Moscone Center, SF",
                    280,
                    38,
                  )
                }
              >
                <MapPin size={15} />
                <span>Location</span>
              </button>

              <button
                type="button"
                className={styles.toolBtn}
                onClick={() =>
                  addElement(
                    "text",
                    "Static Text",
                    undefined,
                    "Admit One",
                    200,
                    38,
                  )
                }
              >
                <Type size={15} />
                <span>Static Text</span>
              </button>

              <button
                type="button"
                className={styles.toolBtn}
                onClick={addBadgeElement}
              >
                <Tag size={15} />
                <span>Badge</span>
              </button>
            </div>
          </div>

          {/* Form Elements Section */}
          <div className={styles.sidebarSection}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Form Elements</h3>
            </div>
            {formFields.length > 0 ? (
              <div className={styles.toolsGrid}>
                {formFields.map((field) => (
                  <button
                    key={field.id}
                    type="button"
                    className={styles.toolBtn}
                    onClick={() => addFormFieldElement(field)}
                    title={`Add ${field.label} layer`}
                  >
                    <FileText size={15} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {field.label}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.toolsGrid}>
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={() =>
                    addElement(
                      "form_field",
                      "Dietary Preference",
                      "{{form.Dietary Preference}}",
                      "Vegetarian",
                      260,
                      38,
                      "f-diet",
                      "Dietary Preference",
                      "",
                    )
                  }
                >
                  <FileText size={15} />
                  <span>Dietary Preference</span>
                </button>
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={() =>
                    addElement(
                      "form_field",
                      "T-Shirt Size",
                      "{{form.T-Shirt Size}}",
                      "Large",
                      220,
                      38,
                      "f-shirt",
                      "T-Shirt Size",
                      "",
                    )
                  }
                >
                  <FileText size={15} />
                  <span>T-Shirt Size</span>
                </button>
              </div>
            )}
          </div>

          {/* Inspector Section */}
          {selectedElement ? (
            <div className={styles.sidebarSection}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  Inspector: {selectedElement.label}
                </h3>
                <div className={styles.layerActions}>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => duplicateElement(selectedElement.id)}
                    title="Duplicate"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => deleteElement(selectedElement.id)}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Transform Inputs */}
              <div className={styles.inspectorGrid}>
                <div className={styles.inputGroup}>
                  <label htmlFor="inspector-x" className={styles.inputLabel}>X (px)</label>
                  <input
                    id="inspector-x"
                    type="number"
                    className={styles.inputField}
                    value={selectedElement.x}
                    onChange={(e) =>
                      updateSelected({ x: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor="inspector-y" className={styles.inputLabel}>Y (px)</label>
                  <input
                    id="inspector-y"
                    type="number"
                    className={styles.inputField}
                    value={selectedElement.y}
                    onChange={(e) =>
                      updateSelected({ y: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor="inspector-w" className={styles.inputLabel}>Width (px)</label>
                  <input
                    id="inspector-w"
                    type="number"
                    className={styles.inputField}
                    value={selectedElement.width}
                    onChange={(e) =>
                      updateSelected({
                        width: Math.max(20, parseInt(e.target.value, 10) || 20),
                      })
                    }
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor="inspector-h" className={styles.inputLabel}>Height (px)</label>
                  <input
                    id="inspector-h"
                    type="number"
                    className={styles.inputField}
                    value={selectedElement.height}
                    onChange={(e) =>
                      updateSelected({
                        height: Math.max(20, parseInt(e.target.value, 10) || 20),
                      })
                    }
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor="inspector-rot" className={styles.inputLabel}>Rotation (°)</label>
                  <input
                    id="inspector-rot"
                    type="number"
                    className={styles.inputField}
                    value={selectedElement.rotation || 0}
                    onChange={(e) =>
                      updateSelected({
                        rotation: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </div>
                <div className={styles.inputGroup} style={{ justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    style={{ padding: "0.38rem" }}
                    onClick={() => updateSelected({ rotation: 0 })}
                  >
                    Reset 0°
                  </button>
                </div>
              </div>

              {/* Form Field Specific Settings */}
              {selectedElement.type === "form_field" && (
                <div className={styles.inputGroup} style={{ marginTop: "0.4rem" }}>
                  <label className={styles.inputLabel}>Fallback Text (if blank)</label>
                  <input
                    type="text"
                    className={styles.inputField}
                    value={selectedElement.fallbackText || ""}
                    placeholder="e.g. Not Specified"
                    onChange={(e) => updateSelected({ fallbackText: e.target.value })}
                  />
                </div>
              )}

              {/* Text / Variable Inspector */}
              {selectedElement.type !== "qr" && (
                <>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Font Family</label>
                    <select
                      className={styles.selectField}
                      value={selectedElement.style.fontFamily || FONT_FAMILIES[0]}
                      onChange={(e) =>
                        updateSelectedStyle({ fontFamily: e.target.value })
                      }
                    >
                      {FONT_FAMILIES.map((f) => (
                        <option key={f} value={f}>
                          {f.split(",")[0]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.inspectorGrid}>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Font Size (px)</label>
                      <input
                        type="number"
                        className={styles.inputField}
                        value={selectedElement.style.fontSize || 20}
                        onChange={(e) =>
                          updateSelectedStyle({
                            fontSize: Math.max(8, parseInt(e.target.value, 10) || 8),
                          })
                        }
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Weight</label>
                      <select
                        className={styles.selectField}
                        value={selectedElement.style.fontWeight || 600}
                        onChange={(e) =>
                          updateSelectedStyle({ fontWeight: e.target.value })
                        }
                      >
                        <option value="400">Regular (400)</option>
                        <option value="500">Medium (500)</option>
                        <option value="600">Semibold (600)</option>
                        <option value="700">Bold (700)</option>
                        <option value="800">Extra Bold (800)</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Text Color</label>
                    <div className={styles.colorRow}>
                      <input
                        type="color"
                        className={styles.colorPicker}
                        value={selectedElement.style.color || "#ffffff"}
                        onChange={(e) =>
                          updateSelectedStyle({ color: e.target.value })
                        }
                      />
                      <input
                        type="text"
                        className={styles.inputField}
                        value={selectedElement.style.color || "#ffffff"}
                        onChange={(e) =>
                          updateSelectedStyle({ color: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {/* Background Color & Radius for Badge or custom background */}
                  <div className={styles.inspectorGrid}>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Bg Color</label>
                      <div className={styles.colorRow}>
                        <input
                          type="color"
                          className={styles.colorPicker}
                          value={
                            selectedElement.style.backgroundColor ||
                            selectedElement.style.bgColor ||
                            "#28a745"
                          }
                          onChange={(e) =>
                            updateSelectedStyle({
                              backgroundColor: e.target.value,
                              bgColor: e.target.value,
                            })
                          }
                        />
                        <input
                          type="text"
                          className={styles.inputField}
                          placeholder="#hex"
                          value={
                            selectedElement.style.backgroundColor ||
                            selectedElement.style.bgColor ||
                            ""
                          }
                          onChange={(e) =>
                            updateSelectedStyle({
                              backgroundColor: e.target.value,
                              bgColor: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Radius (px)</label>
                      <input
                        type="number"
                        className={styles.inputField}
                        value={selectedElement.style.borderRadius ?? 0}
                        onChange={(e) =>
                          updateSelectedStyle({
                            borderRadius: parseInt(e.target.value, 10) || 0,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Alignment</label>
                    <div className={styles.presetGroup}>
                      {(["left", "center", "right"] as const).map((align) => (
                        <button
                          key={align}
                          type="button"
                          className={`${styles.presetBtn} ${
                            selectedElement.style.textAlign === align
                              ? styles.presetBtnActive
                              : ""
                          }`}
                          onClick={() => updateSelectedStyle({ textAlign: align })}
                        >
                          {align.charAt(0).toUpperCase() + align.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>Auto-Fit Long Text</span>
                    <input
                      type="checkbox"
                      checked={!!selectedElement.style.autoFitText}
                      onChange={(e) =>
                        updateSelectedStyle({ autoFitText: e.target.checked })
                      }
                    />
                  </div>
                </>
              )}

              {/* QR Code Colors */}
              {selectedElement.type === "qr" && (
                <>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>QR Foreground</label>
                    <div className={styles.colorRow}>
                      <input
                        type="color"
                        className={styles.colorPicker}
                        value={selectedElement.style.qrFgColor || "#000000"}
                        onChange={(e) =>
                          updateSelectedStyle({ qrFgColor: e.target.value })
                        }
                      />
                      <input
                        type="text"
                        className={styles.inputField}
                        value={selectedElement.style.qrFgColor || "#000000"}
                        onChange={(e) =>
                          updateSelectedStyle({ qrFgColor: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>QR Background</label>
                    <div className={styles.colorRow}>
                      <input
                        type="color"
                        className={styles.colorPicker}
                        value={selectedElement.style.qrBgColor || "#ffffff"}
                        onChange={(e) =>
                          updateSelectedStyle({ qrBgColor: e.target.value })
                        }
                      />
                      <input
                        type="text"
                        className={styles.inputField}
                        value={selectedElement.style.qrBgColor || "#ffffff"}
                        onChange={(e) =>
                          updateSelectedStyle({ qrBgColor: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Conditions (If / Else) Panel */}
              <div className={styles.sidebarSection} style={{ marginTop: "0.75rem" }}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Conditions (If / Else)</h3>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                    onClick={addConditionRule}
                    data-testid="add-condition-rule-btn"
                  >
                    <Plus size={12} />
                    <span>Add Rule</span>
                  </button>
                </div>

                <div className={styles.conditionsContainer}>
                  {(!selectedElement.conditionalRules ||
                    selectedElement.conditionalRules.length === 0) ? (
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      No conditional rules. This layer displays by default.
                    </div>
                  ) : (
                    selectedElement.conditionalRules.map((rule, idx) => (
                      <div
                        key={rule.id}
                        className={styles.conditionCard}
                        data-testid={`condition-card-${rule.id}`}
                      >
                        <div className={styles.conditionCardHeader}>
                          <span>IF Branch #{idx + 1}</span>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            style={{ width: 22, height: 22 }}
                            onClick={() => deleteConditionRule(rule.id)}
                            title="Delete Rule"
                            data-testid={`delete-rule-${rule.id}`}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>

                        <div className={styles.inspectorGrid}>
                          <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>Source</label>
                            <select
                              className={styles.selectField}
                              value={rule.sourceType}
                              data-testid={`rule-source-${rule.id}`}
                              onChange={(e) =>
                                updateConditionRule(rule.id, {
                                  sourceType: e.target.value as
                                    | "ticketType"
                                    | "formField",
                                  sourceKey:
                                    e.target.value === "ticketType"
                                      ? ticketTypes[0]?.name || "VIP"
                                      : formFields[0]?.label || "Field",
                                })
                              }
                            >
                              <option value="ticketType">Ticket Tier</option>
                              <option value="formField">Form Field</option>
                            </select>
                          </div>

                          <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>
                              {rule.sourceType === "ticketType" ? "Tier Name" : "Field Name"}
                            </label>
                            {rule.sourceType === "ticketType" ? (
                              ticketTypes.length > 0 ? (
                                <select
                                  className={styles.selectField}
                                  value={rule.sourceKey}
                                  data-testid={`rule-sourcekey-${rule.id}`}
                                  onChange={(e) =>
                                    updateConditionRule(rule.id, {
                                      sourceKey: e.target.value,
                                    })
                                  }
                                >
                                  {ticketTypes.map((t) => (
                                    <option key={t.id} value={t.name}>
                                      {t.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  className={styles.inputField}
                                  value={rule.sourceKey}
                                  data-testid={`rule-sourcekey-${rule.id}`}
                                  placeholder="e.g. Early Bird VIP"
                                  onChange={(e) =>
                                    updateConditionRule(rule.id, {
                                      sourceKey: e.target.value,
                                    })
                                  }
                                />
                              )
                            ) : formFields.length > 0 ? (
                              <select
                                className={styles.selectField}
                                value={rule.sourceKey}
                                data-testid={`rule-sourcekey-${rule.id}`}
                                onChange={(e) =>
                                  updateConditionRule(rule.id, {
                                    sourceKey: e.target.value,
                                  })
                                }
                              >
                                {formFields.map((f) => (
                                  <option key={f.id} value={f.label}>
                                    {f.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                className={styles.inputField}
                                value={rule.sourceKey}
                                data-testid={`rule-sourcekey-${rule.id}`}
                                placeholder="e.g. Food"
                                onChange={(e) =>
                                  updateConditionRule(rule.id, {
                                    sourceKey: e.target.value,
                                  })
                                }
                              />
                            )}
                          </div>
                        </div>

                        <div className={styles.inspectorGrid}>
                          <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>Operator</label>
                            <select
                              className={styles.selectField}
                              value={rule.operator}
                              data-testid={`rule-operator-${rule.id}`}
                              onChange={(e) =>
                                updateConditionRule(rule.id, {
                                  operator: e.target.value as
                                    | "equals"
                                    | "not_equals"
                                    | "contains",
                                })
                              }
                            >
                              <option value="equals">equals</option>
                              <option value="contains">contains</option>
                              <option value="not_equals">not equals</option>
                            </select>
                          </div>

                          <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>Value</label>
                            <input
                              type="text"
                              className={styles.inputField}
                              value={rule.value}
                              data-testid={`rule-value-${rule.id}`}
                              placeholder="Value to match"
                              onChange={(e) =>
                                updateConditionRule(rule.id, {
                                  value: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>

                        {/* Then Action */}
                        <div className={styles.inputGroup}>
                          <label className={styles.inputLabel}>THEN Effect</label>
                          <div className={styles.presetGroup}>
                            <button
                              type="button"
                              className={`${styles.presetBtn} ${
                                rule.thenEffect.visible
                                  ? styles.presetBtnActive
                                  : ""
                              }`}
                              data-testid={`rule-show-${rule.id}`}
                              onClick={() =>
                                updateConditionRule(rule.id, {
                                  thenEffect: {
                                    ...rule.thenEffect,
                                    visible: true,
                                  },
                                })
                              }
                            >
                              Show
                            </button>
                            <button
                              type="button"
                              className={`${styles.presetBtn} ${
                                !rule.thenEffect.visible
                                  ? styles.presetBtnActive
                                  : ""
                              }`}
                              data-testid={`rule-hide-${rule.id}`}
                              onClick={() =>
                                updateConditionRule(rule.id, {
                                  thenEffect: {
                                    ...rule.thenEffect,
                                    visible: false,
                                  },
                                })
                              }
                            >
                              Hide
                            </button>
                          </div>
                        </div>

                        {rule.thenEffect.visible && (
                          <>
                            <div className={styles.inputGroup}>
                              <label className={styles.inputLabel}>Text Override</label>
                              <input
                                type="text"
                                className={styles.inputField}
                                value={rule.thenEffect.textOverride || ""}
                                data-testid={`rule-text-override-${rule.id}`}
                                placeholder="e.g. EARLY BIRD VIP"
                                onChange={(e) =>
                                  updateConditionRule(rule.id, {
                                    thenEffect: {
                                      ...rule.thenEffect,
                                      textOverride: e.target.value,
                                    },
                                  })
                                }
                              />
                            </div>

                            <div className={styles.inspectorGrid}>
                              <div className={styles.inputGroup}>
                                <label className={styles.inputLabel}>Text Color</label>
                                <input
                                  type="text"
                                  className={styles.inputField}
                                  value={rule.thenEffect.colorOverride || ""}
                                  data-testid={`rule-color-override-${rule.id}`}
                                  placeholder="#FFD700"
                                  onChange={(e) =>
                                    updateConditionRule(rule.id, {
                                      thenEffect: {
                                        ...rule.thenEffect,
                                        colorOverride: e.target.value,
                                      },
                                    })
                                  }
                                />
                              </div>

                              <div className={styles.inputGroup}>
                                <label className={styles.inputLabel}>Bg Color</label>
                                <input
                                  type="text"
                                  className={styles.inputField}
                                  value={rule.thenEffect.bgColorOverride || ""}
                                  data-testid={`rule-bgcolor-override-${rule.id}`}
                                  placeholder="#28a745"
                                  onChange={(e) =>
                                    updateConditionRule(rule.id, {
                                      thenEffect: {
                                        ...rule.thenEffect,
                                        bgColorOverride: e.target.value,
                                      },
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}

                  {/* ELSE Fallback Behavior */}
                  {selectedElement.conditionalRules &&
                    selectedElement.conditionalRules.length > 0 && (
                      <div className={styles.elseCard} data-testid="else-card">
                        <div className={styles.conditionCardHeader}>
                          <span style={{ color: "var(--color-text-soft)" }}>
                            ELSE (Fallback Behavior)
                          </span>
                        </div>

                        <div className={styles.presetGroup}>
                          <button
                            type="button"
                            className={`${styles.presetBtn} ${
                              selectedElement.elseBehavior?.visible ?? true
                                ? styles.presetBtnActive
                                : ""
                            }`}
                            data-testid="else-show-btn"
                            onClick={() => updateElseBehavior({ visible: true })}
                          >
                            Show
                          </button>
                          <button
                            type="button"
                            className={`${styles.presetBtn} ${
                              selectedElement.elseBehavior?.visible === false
                                ? styles.presetBtnActive
                                : ""
                            }`}
                            data-testid="else-hide-btn"
                            onClick={() => updateElseBehavior({ visible: false })}
                          >
                            Hide
                          </button>
                        </div>

                        {selectedElement.elseBehavior?.visible !== false && (
                          <>
                            <div className={styles.inputGroup}>
                              <label className={styles.inputLabel}>Fallback Text</label>
                              <input
                                type="text"
                                className={styles.inputField}
                                value={selectedElement.elseBehavior?.textOverride || ""}
                                data-testid="else-text-override"
                                placeholder="e.g. REGULAR"
                                onChange={(e) =>
                                  updateElseBehavior({ textOverride: e.target.value })
                                }
                              />
                            </div>

                            <div className={styles.inspectorGrid}>
                              <div className={styles.inputGroup}>
                                <label className={styles.inputLabel}>Fallback Color</label>
                                <input
                                  type="text"
                                  className={styles.inputField}
                                  value={selectedElement.elseBehavior?.colorOverride || ""}
                                  data-testid="else-color-override"
                                  placeholder="#ffffff"
                                  onChange={(e) =>
                                    updateElseBehavior({ colorOverride: e.target.value })
                                  }
                                />
                              </div>

                              <div className={styles.inputGroup}>
                                <label className={styles.inputLabel}>Fallback BgColor</label>
                                <input
                                  type="text"
                                  className={styles.inputField}
                                  value={selectedElement.elseBehavior?.bgColorOverride || ""}
                                  data-testid="else-bgcolor-override"
                                  placeholder="#000000"
                                  onChange={(e) =>
                                    updateElseBehavior({ bgColorOverride: e.target.value })
                                  }
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.sidebarSection}>
              <h3 className={styles.sectionTitle}>Inspector</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Click any placeholder or QR code on the canvas to configure its position,
                dimensions, typography, styling, and If / Else conditional rules.
              </p>
            </div>
          )}

          {/* Layers List */}
          <div className={styles.sidebarSection}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                <Layers size={13} style={{ display: "inline", marginRight: 4 }} />
                Layers ({elements.length})
              </h3>
            </div>
            <div className={styles.layersList}>
              {elements.length === 0 ? (
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  No elements added yet.
                </div>
              ) : (
                elements.map((el) => {
                  const isActive = el.id === selectedId;
                  return (
                    <div
                      key={el.id}
                      className={`${styles.layerItem} ${
                        isActive ? styles.layerItemActive : ""
                      }`}
                      onClick={() => setSelectedId(el.id)}
                    >
                      <span>{el.label}</span>
                      <div className={styles.layerActions}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          style={{ width: 24, height: 24 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteElement(el.id);
                          }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
