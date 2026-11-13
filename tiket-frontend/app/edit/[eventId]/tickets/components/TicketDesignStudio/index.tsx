"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useEventStore } from "@/store/useEventStore";
import { getErrorMessage } from "@/lib/errors";
import type { FormField } from "@/types/form";
import type { TicketType } from "@/types/ticketType";
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
import {
  loadStudioTicketTypes,
  loadStudioFormFields,
  uploadTemplateImage,
  buildTicketLayoutConfig,
  buildTicketPayload,
  persistTicket,
  getStudioEventMetadata,
} from "./functions";
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
    loadStudioTicketTypes(eventId)
      .then((list) => {
        if (!isMounted) return;
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
    loadStudioFormFields(eventId)
      .then((fields) => {
        if (isMounted) setFormFields(fields);
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
          finalImageUrl = await uploadTemplateImage(
            design.pendingImageFile,
            eventId,
          );
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

      const config = buildTicketLayoutConfig(design.getDesign());
      const payload = buildTicketPayload({
        settings,
        finalImageUrl,
        config,
      });

      const resultTicket = await persistTicket({
        eventId,
        activeTicket,
        payload,
      });

      toast.success(
        activeTicket ? "Ticket type updated." : "Ticket type created.",
      );

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

  const { eventTitle, timezone, eventCapacityDisplay, directTicketUrl } =
    getStudioEventMetadata(storeEvent, activeTicket?.id);

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
          codePrefix={settings.codePrefix}
          setCodePrefix={settings.setCodePrefix}
          codeLength={settings.codeLength}
          setCodeLength={settings.setCodeLength}
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
