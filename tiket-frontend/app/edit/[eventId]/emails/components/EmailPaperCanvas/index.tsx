"use client";

import React, { useState } from "react";
import type {
  EmailTemplate,
  AvailableVariables,
  EmailNodeJSON,
} from "@/types/email";
import { useTipTapSync } from "@/hooks/useTipTapSync";

import TopControlBar from "./components/TopControlBar";
import SubjectBox from "./components/SubjectBox";
import InspectorSidebar from "./components/InspectorSidebar";
import CanvasViewport from "./components/CanvasViewport";
import ActionFooter from "./components/ActionFooter";
import CtaModal from "./components/Modals/CtaModal";
import LinkModal from "./components/Modals/LinkModal";
import ImageModal from "./components/Modals/ImageModal";

import {
  useEmailEditor,
  useEmailModals,
  useInspectorAttributes,
} from "./hooks";
import {
  computePreviewData,
  buildEmailSavePayload,
  insertVariable,
  insertCtaButton,
  deleteCta,
  updateCtaStyleAttribute,
  updateCtaAttributes,
  applyLink,
  removeLink,
  deleteLink,
  insertOrUpdateImage,
  updateImageSrc,
  updateImageAlt,
  updateImageWidth,
  updateImageHref,
  updateImageAlignment,
  updateBlockAttribute,
  unwrapContainer,
  deleteContainer,
  updateContainerStyleAttribute,
  setEditorFontWeight,
} from "./functions";

import styles from "./EmailPaperCanvas.module.css";

export interface EmailPaperCanvasProps {
  template: EmailTemplate;
  variables: AvailableVariables | null;
  onSave: (updated: Partial<EmailTemplate>) => Promise<void>;
  onReset: () => Promise<void>;
  onDelete?: () => Promise<void>;
  onOpenSendTest: () => void;
  onOpenSendBatch: () => void;
  isSaving: boolean;
  eventId?: string;
}

export default function EmailPaperCanvas({
  template,
  variables,
  onSave,
  onReset,
  onDelete,
  onOpenSendTest,
  onOpenSendBatch,
  isSaving,
  eventId,
}: EmailPaperCanvasProps) {
  const [name, setName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject || "");
  const [isActive, setIsActive] = useState(template.isActive);
  const [deviceView, setDeviceView] = useState<"desktop" | "mobile">("desktop");
  const [canvasMode, setCanvasMode] = useState<"edit" | "preview" | "code">(
    "edit",
  );

  const [prevTemplate, setPrevTemplate] = useState(template);
  if (template !== prevTemplate) {
    setPrevTemplate(template);
    setName(template.name);
    setSubject(template.subject || "");
    setIsActive(template.isActive);
  }

  // TipTap editor & sync hooks
  const { editor, selectionTick } = useEmailEditor(template);
  const tipTapSync = useTipTapSync(editor);

  // Inspector attributes hook
  const inspectorAttrs = useInspectorAttributes(editor, selectionTick);

  // Modals management hook
  const modals = useEmailModals(editor);

  if (!editor) return null;

  // Computed preview data (interpolated variables, sample values, compiled HTML)
  const previewData = computePreviewData({
    template,
    subject,
    editorJson: editor.getJSON() as EmailNodeJSON,
    variables,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildEmailSavePayload({
      name,
      subject,
      isActive,
      editor,
      template,
    });
    await onSave(payload);
  };

  const handleInsertCta = () => {
    insertCtaButton(
      editor,
      modals.savedSelectionRef.current,
      modals.ctaLabel,
      modals.ctaUrl,
    );
    modals.handleCloseCtaModal();
  };

  const handleApplyLink = (urlOverride?: string, textOverride?: string) => {
    applyLink(
      editor,
      modals.savedSelectionRef.current,
      urlOverride !== undefined ? urlOverride : modals.linkUrl,
      textOverride !== undefined ? textOverride : modals.linkText,
    );
    modals.handleCloseLinkModal();
  };

  const handleRemoveLink = () => {
    removeLink(editor, modals.savedSelectionRef.current);
    modals.handleCloseLinkModal();
  };

  const handleDeleteLink = () => {
    deleteLink(editor, modals.savedSelectionRef.current);
    modals.handleCloseLinkModal();
  };

  const handleInsertImage = () => {
    insertOrUpdateImage(editor, modals.savedSelectionRef.current, {
      src: modals.imageUrl,
      alt: modals.imageAlt,
      width: modals.imageWidth,
      href: modals.imageLinkUrl,
    });
    modals.handleCloseImageModal();
  };

  return (
    <form className={styles.workspaceCard} onSubmit={handleSave}>
      {/* Upper Control Bar */}
      <TopControlBar
        name={name}
        setName={setName}
        templateType={template.type}
        editor={editor}
        deviceView={deviceView}
        setDeviceView={setDeviceView}
        canvasMode={canvasMode}
        setCanvasMode={setCanvasMode}
        isActive={isActive}
        setIsActive={setIsActive}
      />

      {/* Dedicated Subject Line Input Box with Variable Insertion */}
      <SubjectBox
        subject={subject}
        setSubject={setSubject}
        canvasMode={canvasMode}
        previewSubject={previewData.previewSubject}
        variables={previewData.allVars}
      />

      {/* Main Two-Column Editor Body */}
      <div className={styles.editorBodyLayout}>
        {/* Left Inspector Sidebar */}
        <InspectorSidebar
          editor={editor}
          allVars={previewData.allVars}
          onOpenCtaModal={modals.handleOpenCtaModal}
          onOpenLinkModal={modals.handleOpenLinkModal}
          onRemoveLink={handleRemoveLink}
          onDeleteLink={handleDeleteLink}
          onOpenImageModal={modals.handleOpenImageModal}
          currentFontFamily={inspectorAttrs.currentFontFamily}
          currentFontWeight={inspectorAttrs.currentFontWeight}
          currentTextColor={inspectorAttrs.currentTextColor}
          currentHighlightColor={inspectorAttrs.currentHighlightColor}
          currentBlockBgColor={inspectorAttrs.currentBlockBgColor}
          currentBorderStyle={inspectorAttrs.currentBorderStyle}
          currentBorderWidth={inspectorAttrs.currentBorderWidth}
          currentBorderColor={inspectorAttrs.currentBorderColor}
          currentBorderRadius={inspectorAttrs.currentBorderRadius}
          currentPadding={inspectorAttrs.currentPadding}
          currentMarginTop={inspectorAttrs.currentMarginTop}
          currentMarginBottom={inspectorAttrs.currentMarginBottom}
          currentElementType={inspectorAttrs.currentElementType}
          updateBlockAttribute={(attrName, attrVal) =>
            updateBlockAttribute(
              editor,
              inspectorAttrs.activeBlockType,
              attrName,
              attrVal,
            )
          }
          isImageActive={inspectorAttrs.isImageActive}
          currentImageSrc={inspectorAttrs.currentImageSrc}
          currentImageAlt={inspectorAttrs.currentImageAlt}
          currentImageWidth={inspectorAttrs.currentImageWidth}
          currentImageHref={inspectorAttrs.currentImageHref}
          currentImageAlignment={inspectorAttrs.currentImageAlignment}
          updateImageSrc={(newSrc) => updateImageSrc(editor, newSrc)}
          updateImageAlt={(newAlt) => updateImageAlt(editor, newAlt)}
          updateImageWidth={(newWidth) => updateImageWidth(editor, newWidth)}
          updateImageHref={(newHref) => updateImageHref(editor, newHref)}
          updateImageAlignment={(alignment) =>
            updateImageAlignment(editor, alignment)
          }
          handleInsertVariable={(varKey) => insertVariable(editor, varKey)}
          isCtaActive={inspectorAttrs.isCtaActive}
          currentCtaLabel={inspectorAttrs.currentCtaLabel}
          currentCtaUrl={inspectorAttrs.currentCtaUrl}
          currentCtaButtonColor={inspectorAttrs.currentCtaButtonColor}
          currentCtaTextColor={inspectorAttrs.currentCtaTextColor}
          currentCtaBorderRadius={inspectorAttrs.currentCtaBorderRadius}
          currentCtaAlignment={inspectorAttrs.currentCtaAlignment}
          currentCtaPadding={inspectorAttrs.currentCtaPadding}
          currentCtaFontSize={inspectorAttrs.currentCtaFontSize}
          currentCtaFontWeight={inspectorAttrs.currentCtaFontWeight}
          currentCtaHeight={inspectorAttrs.currentCtaHeight}
          currentCtaWidth={inspectorAttrs.currentCtaWidth}
          currentCtaMarginTop={inspectorAttrs.currentCtaMarginTop}
          currentCtaMarginBottom={inspectorAttrs.currentCtaMarginBottom}
          updateCtaAttributes={(attrs) => updateCtaAttributes(editor, attrs)}
          updateCtaStyleAttribute={(key, val) =>
            updateCtaStyleAttribute(editor, key, val)
          }
          onDeleteCta={() => deleteCta(editor)}
          isContainerActive={inspectorAttrs.isContainerActive}
          currentContainerBgColor={inspectorAttrs.currentContainerBgColor}
          currentContainerBorderStyle={
            inspectorAttrs.currentContainerBorderStyle
          }
          currentContainerBorderWidth={
            inspectorAttrs.currentContainerBorderWidth
          }
          currentContainerBorderColor={
            inspectorAttrs.currentContainerBorderColor
          }
          currentContainerBorderRadius={
            inspectorAttrs.currentContainerBorderRadius
          }
          currentContainerPadding={inspectorAttrs.currentContainerPadding}
          currentContainerMarginTop={inspectorAttrs.currentContainerMarginTop}
          currentContainerMarginBottom={
            inspectorAttrs.currentContainerMarginBottom
          }
          updateContainerStyleAttribute={(styleKey, val) =>
            updateContainerStyleAttribute(editor, styleKey, val)
          }
          onUnwrapContainer={() => unwrapContainer(editor)}
          onDeleteContainer={() => deleteContainer(editor)}
          onToggleBold={() => tipTapSync.toggleBoldUnified()}
          onSetFontWeight={(val) => setEditorFontWeight(editor, val)}
        />

        {/* Right Viewport Canvas */}
        <CanvasViewport
          canvasMode={canvasMode}
          deviceView={deviceView}
          editor={editor}
          compiledRawHtml={previewData.compiledRawHtml}
          previewBodyHtml={previewData.previewBodyHtml}
          documentJson={previewData.currentDocModel}
        />
      </div>

      {/* Bottom Actions Footer */}
      <ActionFooter
        templateType={template.type}
        onReset={onReset}
        onDelete={onDelete}
        onOpenSendTest={onOpenSendTest}
        onOpenSendBatch={onOpenSendBatch}
        isSaving={isSaving}
      />

      {/* Modals */}
      <CtaModal
        isOpen={modals.isCtaModalOpen}
        onClose={modals.handleCloseCtaModal}
        ctaLabel={modals.ctaLabel}
        setCtaLabel={modals.setCtaLabel}
        ctaUrl={modals.ctaUrl}
        setCtaUrl={modals.setCtaUrl}
        handleInsertCtaButton={handleInsertCta}
      />

      <LinkModal
        isOpen={modals.isLinkModalOpen}
        onClose={modals.handleCloseLinkModal}
        linkUrl={modals.linkUrl}
        setLinkUrl={modals.setLinkUrl}
        linkText={modals.linkText}
        setLinkText={modals.setLinkText}
        handleApplyLink={handleApplyLink}
        isEditing={modals.isEditingLink}
        onRemoveLink={handleRemoveLink}
      />

      <ImageModal
        isOpen={modals.isImageModalOpen}
        onClose={modals.handleCloseImageModal}
        imageUrl={modals.imageUrl}
        setImageUrl={modals.setImageUrl}
        imageLinkUrl={modals.imageLinkUrl}
        setImageLinkUrl={modals.setImageLinkUrl}
        imageAlt={modals.imageAlt}
        setImageAlt={modals.setImageAlt}
        imageWidth={modals.imageWidth}
        setImageWidth={modals.setImageWidth}
        handleInsertImage={handleInsertImage}
        eventId={eventId}
      />
    </form>
  );
}
