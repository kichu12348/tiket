"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getSignedUrl, uploadToCDN } from "@/api/events";
import { getImageUrl } from "@/constants/config";
import {
  getTicketTypes,
  createTicketType,
  updateTicketType,
} from "@/api/tickets";
import { getFormFields } from "@/api/forms";
import { useEventStore } from "@/store/useEventStore";
import { getErrorMessage } from "@/lib/errors";
import type { FormField } from "@/types/form";
import type {
  TicketType,
  TicketLayoutConfig,
} from "@/types/ticketType";
import type { StudioMode } from "./types";
import { interpolateSamplePreview } from "./utils/interpolate";
import {
  useTicketDesignState,
  DEFAULT_ARTBOARD_WIDTH,
  DEFAULT_ARTBOARD_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
} from "./hooks/useTicketDesignState";
import { useTicketSettingsState } from "./hooks/useTicketSettingsState";
import { useLayerInteraction } from "./hooks/useLayerInteraction";
import StudioHeader from "./components/StudioHeader";
import CanvasViewport from "./components/CanvasViewport";
import StudioSidebar from "./components/StudioSidebar";
import TicketSettingsPanel from "./components/TicketSettingsPanel";
import styles from "./TicketDesignStudio.module.css";

export {
  DEFAULT_ARTBOARD_WIDTH,
  DEFAULT_ARTBOARD_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  interpolateSamplePreview,
};

export interface TicketDesignStudioProps {
  eventId: string;
  ticket?: TicketType | null;
  initialMode?: StudioMode;
  onClose?: () => void;
  onSaved?: (updatedTicket: TicketType) => void;
}

export default function TicketDesignStudio({
  eventId,
  ticket: initialTicket,
  initialMode,
  onClose,
  onSaved,
}: TicketDesignStudioProps) {
  const storeEvent = useEventStore((state) => state.event);
  const effectiveFeeBps = storeEvent?.platformFeeBps ?? 400;

  const [ticketTypesList, setTicketTypesList] = useState<TicketType[]>([]);
  const [activeTicket, setActiveTicket] = useState<TicketType | null>(
    initialTicket ?? null,
  );
  const [mode, setMode] = useState<StudioMode>(() => {
    if (initialMode) return initialMode;
    return initialTicket ? "edit" : "settings";
  });
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Design state hook
  const design = useTicketDesignState({ initialTicket });

  // Settings state hook
  const settings = useTicketSettingsState({
    initialTicket,
    registrationStart: storeEvent?.registrationStart,
    registrationEnd: storeEvent?.registrationEnd,
    eventEndDate: storeEvent?.endDate,
    platformFeeBps: effectiveFeeBps,
  });

  const [prevTicketProp, setPrevTicketProp] = useState<
    TicketType | null | undefined
  >(initialTicket);
  if (initialTicket !== prevTicketProp) {
    setPrevTicketProp(initialTicket);
    setActiveTicket(initialTicket ?? null);
    if (initialTicket) {
      design.resetDesignState(initialTicket);
      settings.resetSettingsState(initialTicket);
    }
  }

  // Layer interaction hook
  const interaction = useLayerInteraction({
    artboardW: design.canvasWidth,
    artboardH: design.canvasHeight,
    mode,
    setLayers: design.setLayers,
    setSelectedLayerId: design.setSelectedLayerId,
  });

  // Load ticket types for switcher
  useEffect(() => {
    let isMounted = true;
    getTicketTypes(eventId)
      .then((data) => {
        if (!isMounted) return;
        const list = data || [];
        setTicketTypesList(list);

        // In pass designer mode ("edit"), auto-select the first tier if none was passed
        // so the user's saved pass layout and template image are immediately loaded
        if (!activeTicket && list.length > 0 && mode === "edit") {
          const first = list[0];
          setActiveTicket(first);
          design.resetDesignState(first);
          settings.resetSettingsState(first);
        }
      })
      .catch((err) => {
        console.error("Failed to load tickets", err);
      });
    return () => {
      isMounted = false;
    };
  }, [eventId]);



  // Load form fields for tokens
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

  // Switch to an existing ticket tier
  const handleSwitchTicket = useCallback(
    (t: TicketType) => {
      setActiveTicket(t);
      design.resetDesignState(t);
      settings.resetSettingsState(t);
    },
    [design, settings],
  );

  // Start new ticket creation
  const handleStartNewTicket = useCallback(() => {
    setActiveTicket(null);
    design.resetDesignState(null);
    settings.resetSettingsState(null);
    setMode("settings");
  }, [design, settings]);

  // Master Save / Update
  const handleSaveAll = async () => {
    const { valid, error } = settings.validateSettings();
    if (!valid && error) {
      toast.error(error);
      return;
    }

    try {
      setIsSaving(true);
      let finalImageUrl = design.templateImageUrl;

      // Upload local image file to CDN only upon Update/Save click
      if (design.pendingImageFile) {
        try {
          const { url } = await getSignedUrl(
            design.pendingImageFile.name,
            design.pendingImageFile.type,
          );
          const { filename } = await uploadToCDN(url, design.pendingImageFile);
          finalImageUrl = getImageUrl(filename || "");
          design.setPendingImageFile(null);
          design.setTemplateImageUrl(finalImageUrl);
        } catch (uploadErr) {
          console.error("Failed to upload image to CDN", uploadErr);
          toast.error("Failed to upload ticket image.");
          setIsSaving(false);
          return;
        }
      } else if (finalImageUrl && finalImageUrl.startsWith("blob:")) {
        // Fallback for stale blob URL when file handle has been released
        finalImageUrl = activeTicket?.templateImageUrl || null;
      }

      const parsedTags = settings.tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const validConditions = settings.conditions.filter(
        (c) => c.fieldId && c.allowedValues.length > 0,
      );

      const designOutput = design.getDesign();

      const config: TicketLayoutConfig = {
        canvasWidth: Math.round(
          designOutput.artboardW || DEFAULT_ARTBOARD_WIDTH,
        ),
        canvasHeight: Math.round(
          designOutput.artboardH || DEFAULT_ARTBOARD_HEIGHT,
        ),
        layers: designOutput.layers.map((l) => ({
          id: l.id,
          type: l.type,
          name: l.name || (l.type === "qr" ? "QR Code" : l.text || "Text"),
          tokenOrText:
            l.tokenOrText ||
            l.text ||
            (l.type === "qr" ? "{{ticket_code}}" : "Text"),
          x: Math.round(l.x),
          y: Math.round(l.y),
          width: Math.round(
            l.width || (l.type === "qr" ? l.size : Math.max(120, l.size * 5)),
          ),
          height: Math.round(
            l.height ||
            (l.type === "qr" ? l.size : Math.max(30, Math.round(l.size * 1.4))),
          ),
          fontSize: Math.round(
            l.type === "text" ? l.size || l.fontSize || 48 : 14,
          ),
          fontColor:
            l.color ||
            l.fontColor ||
            (l.type === "qr" ? l.qrColor || "#000000" : "#ffffff"),
          maxLines: l.maxLines || 1,
          lineSpacing: l.lineSpacing || 0,
          fontWeight: l.fontWeight || (l.type === "text" ? "600" : undefined),
          fontFamily:
            l.fontFamily || (l.type === "text" ? "'Inter', sans-serif" : undefined),
          fontStyle: l.fontStyle || (l.type === "text" ? "normal" : undefined),
          textDecoration:
            l.textDecoration || (l.type === "text" ? "none" : undefined),
          qrColor:
            l.type === "qr"
              ? l.qrColor || l.color || l.fontColor || "#000000"
              : undefined,
          qrBgColor: l.type === "qr" ? l.qrBgColor || "#ffffff" : undefined,
        })),
      };

      const payload = {
        name: settings.name.trim(),
        description: settings.description.trim() || undefined,
        price: settings.isPaid ? Number(settings.price) : 0,
        passFeeToCustomer: settings.isPaid
          ? settings.passFeeToCustomer
          : false,
        quantityLimit:
          settings.hasLimitCapacity && settings.quantityLimit
            ? parseInt(settings.quantityLimit, 10)
            : null,
        maxPerUser:
          settings.hasMaxPerUser && settings.maxPerUser
            ? parseInt(settings.maxPerUser, 10)
            : null,
        enableWaitlist: settings.enableWaitlist,
        multiDayCheckIn: settings.multiDayCheckIn,
        isFixedDefault: settings.isFixedDefault,
        collectGst: settings.isPaid ? settings.collectGst : false,
        isClosed: settings.isClosed,
        isHidden: settings.isHidden,
        category: settings.category.trim() || null,
        poolName: settings.category.trim() || null,
        poolCapacity: settings.poolCapacity
          ? parseInt(settings.poolCapacity, 10)
          : null,
        tags: parsedTags,
        conditions: validConditions.length > 0 ? validConditions : null,
        saleStart: settings.saleStart,
        saleEnd: settings.saleEnd,
        isRefundable: settings.isRefundable,
        isTransferable: settings.isTransferable,
        maxTransfers: settings.isTransferable
          ? parseInt(settings.maxTransfers, 10) || 1
          : 0,
        templateImageUrl: finalImageUrl,
        templateConfig: config,
      };

      let resultTicket: TicketType;

      if (activeTicket) {
        resultTicket = await updateTicketType(
          eventId,
          activeTicket.id,
          payload,
        );
        toast.success("Ticket type updated.");
      } else {
        resultTicket = await createTicketType(eventId, payload);
        toast.success("Ticket type created.");
      }

      setActiveTicket(resultTicket);
      setTicketTypesList((prev) => {
        const idx = prev.findIndex((t) => t.id === resultTicket.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = resultTicket;
          return next;
        }
        return [...prev, resultTicket];
      });
      design.resetDesignState(resultTicket);
      settings.resetSettingsState(resultTicket);

      if (onSaved) {
        onSaved(resultTicket);
      }
    } catch (error: unknown) {
      console.error("Failed to save ticket", error);
      toast.error(getErrorMessage(error) || "Failed to save ticket.");
    } finally {
      setIsSaving(false);
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const eventSlug = storeEvent?.slug || "event";
  const directTicketUrl = activeTicket?.id
    ? `${origin}/${eventSlug}?ticket_id=${activeTicket.id}`
    : "";

  const eventTitle = storeEvent?.title || "Tech Summit 2026";
  const timezone =
    storeEvent?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const eventCapacityDisplay =
    typeof storeEvent?.capacity === "number" && storeEvent.capacity > 0
      ? storeEvent.capacity
      : "Unlimited";

  return (
    <div className={styles.studioContainer} data-testid="ticket-design-studio">
      <input
        type="file"
        ref={fileInputRef}
        onChange={design.handleUploadImage}
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        style={{ display: "none" }}
        data-testid="template-image-input"
      />

      {/* TOP HEADER */}
      <StudioHeader
        activeTicket={activeTicket}
        mode={mode}
        ticketTypesList={ticketTypesList}
        canvasWidth={design.canvasWidth}
        canvasHeight={design.canvasHeight}
        isSaving={isSaving}
        onClose={onClose}
        onModeChange={setMode}
        onSwitchTicket={handleSwitchTicket}
        onStartNewTicket={handleStartNewTicket}
        onSave={handleSaveAll}
      />

      {/* VIEW: TICKET DETAILS (SETTINGS) */}
      {mode === "settings" && (
        <TicketSettingsPanel
          name={settings.name}
          setName={settings.setName}
          description={settings.description}
          setDescription={settings.setDescription}
          isPaid={settings.isPaid}
          setIsPaid={settings.setIsPaid}
          price={settings.price}
          setPrice={settings.setPrice}
          collectGst={settings.collectGst}
          setCollectGst={settings.setCollectGst}
          passFeeToCustomer={settings.passFeeToCustomer}
          setPassFeeToCustomer={settings.setPassFeeToCustomer}
          hasLimitCapacity={settings.hasLimitCapacity}
          setHasLimitCapacity={settings.setHasLimitCapacity}
          quantityLimit={settings.quantityLimit}
          setQuantityLimit={settings.setQuantityLimit}
          hasMaxPerUser={settings.hasMaxPerUser}
          setHasMaxPerUser={settings.setHasMaxPerUser}
          maxPerUser={settings.maxPerUser}
          setMaxPerUser={settings.setMaxPerUser}
          isFixedDefault={settings.isFixedDefault}
          setIsFixedDefault={settings.setIsFixedDefault}
          enableWaitlist={settings.enableWaitlist}
          setEnableWaitlist={settings.setEnableWaitlist}
          multiDayCheckIn={settings.multiDayCheckIn}
          setMultiDayCheckIn={settings.setMultiDayCheckIn}
          isClosed={settings.isClosed}
          setIsClosed={settings.setIsClosed}
          isHidden={settings.isHidden}
          setIsHidden={settings.setIsHidden}
          saleStart={settings.saleStart}
          setSaleStart={settings.setSaleStart}
          saleEnd={settings.saleEnd}
          setSaleEnd={settings.setSaleEnd}
          isRefundable={settings.isRefundable}
          setIsRefundable={settings.setIsRefundable}
          isTransferable={settings.isTransferable}
          setIsTransferable={settings.setIsTransferable}
          maxTransfers={settings.maxTransfers}
          setMaxTransfers={settings.setMaxTransfers}
          category={settings.category}
          setCategory={settings.setCategory}
          poolCapacity={settings.poolCapacity}
          setPoolCapacity={settings.setPoolCapacity}
          tagsInput={settings.tagsInput}
          setTagsInput={settings.setTagsInput}
          conditions={settings.conditions}
          setConditions={settings.setConditions}
          formFields={formFields}
          feePercent={settings.feePercent}
          gatewayFeePercent={settings.gatewayFeePercent}
          parsedPrice={settings.parsedPrice}
          feeRupees={settings.feeRupees}
          formatRupees={settings.formatRupees}
          totalPriceForUser={settings.totalPriceForUser}
          timezone={timezone}
          eventCapacityDisplay={eventCapacityDisplay}
          directTicketUrl={directTicketUrl}
          onSwitchToDesign={() => setMode("edit")}
        />
      )}

      {/* VIEW: PASS DESIGNER & SAMPLE PREVIEW */}
      {(mode === "edit" || mode === "preview") && (
        <div className={styles.mainBody}>
          <CanvasViewport
            mode={mode}
            zoom={design.zoom}
            templateImageUrl={design.templateImageUrl}
            canvasWidth={design.canvasWidth}
            canvasHeight={design.canvasHeight}
            layers={design.layers}
            selectedLayerId={design.selectedLayerId}
            ticketName={settings.name || "General Admission"}
            eventTitle={eventTitle}
            isSaving={isSaving}
            hasPendingImage={Boolean(design.pendingImageFile)}
            onZoomChange={design.setZoom}
            onUploadClick={() => fileInputRef.current?.click()}
            onRemoveTemplate={design.handleRemoveTemplate}
            onSelectLayer={design.setSelectedLayerId}
            onLayerMouseDown={interaction.handleLayerMouseDown}
            onResizeMouseDown={interaction.handleResizeMouseDown}
            onDeleteSelectedLayer={design.deleteSelectedLayer}
            onDimensionsUpdate={(w, h) => {
              design.setCanvasWidth(w);
              design.setCanvasHeight(h);
            }}
          />

          <StudioSidebar
            layers={design.layers}
            selectedLayerId={design.selectedLayerId}
            selectedLayer={design.selectedLayer}
            formFields={formFields}
            ticketName={settings.name}
            isPaid={settings.isPaid}
            price={settings.price}
            hasLimitCapacity={settings.hasLimitCapacity}
            quantityLimit={settings.quantityLimit}
            onSelectLayer={(id) => {
              setMode("edit");
              design.setSelectedLayerId(id);
            }}
            onAddTextLayer={design.addTextLayer}
            onAddQrLayer={design.addQrLayer}
            onDeleteLayer={design.deleteLayer}
            onUpdateLayer={design.updateSelectedLayer}
            onSwitchToSettings={() => setMode("settings")}
          />
        </div>
      )}

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
      </div>
    </div>
  );
}
