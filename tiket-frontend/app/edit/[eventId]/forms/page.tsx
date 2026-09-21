"use client";

import { useMemo } from "react";
import { useEventStore } from "@/store/useEventStore";
import { Plus, User, Mail, Phone, HelpCircle, X, Layers } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";

import styles from "./Forms.module.css";
import { LocalField } from "./types";

import StandardFieldCard from "./components/StandardFieldCard";
import SortableFieldCard from "./components/SortableFieldCard";
import FieldModal from "./components/FieldModal";
import SkeletonLoader from "./components/SkeletonLoader";

import { useFormData } from "./hooks/useFormData";
import { useFormUI } from "./hooks/useFormUI";
import { getActivePageFields } from "./functions/formHelpers";

export default function EditFormsPage() {
  const { event } = useEventStore();

  /* ── Core Data & DB Actions ── */
  const {
    customFields,
    standardFields,
    isLoading,
    pages,
    updateStandardField,
    saveCustomField,
    deleteCustomField,
    reorderCustomFields,
    deletePageFromDB,
  } = useFormData(event?.id);

  /* ── Local UI State & Handlers ── */
  const {
    activePage,
    setActivePage,
    setActiveDragId,
    isModalOpen,
    modalMode,
    editingField,
    addPage,
    confirmDeletePage,
    openAddModal,
    openEditModal,
    closeFieldModal,
  } = useFormUI(pages, deletePageFromDB);

  /* ── Drag & Drop Configuration ── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  /* ── Derived Data ── */
  const activePageFields = useMemo(
    () => getActivePageFields(customFields, activePage),
    [customFields, activePage],
  );

  /* ── Handlers ── */
  const handleModalSave = async (
    fieldData: Omit<LocalField, "isEditing" | "localId">,
  ) => {
    await saveCustomField(
      fieldData,
      modalMode === "edit",
      editingField?.localId,
      activePage,
    );
    closeFieldModal();
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragId(e.active.id as string);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const activeIdx = activePageFields.findIndex(
      (f) => f.localId === active.id,
    );
    const overIdx = activePageFields.findIndex((f) => f.localId === over.id);

    if (activeIdx === -1 || overIdx === -1) return;

    const reordered = arrayMove(activePageFields, activeIdx, overIdx);
    const updated = reordered.map((f, i) => ({ ...f, sortOrder: i }));

    await reorderCustomFields(updated, activePageFields, activePage);
  };

  /* ── Render ── */
  if (!event) return null;
  if (isLoading) {
    return <SkeletonLoader />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Registration Questions</h1>
        <p className={styles.subtitle}>
          We will ask guests the following questions when they register for the
          event.
        </p>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <User size={18} className={styles.iconPersonal} />
          <span>Personal Information</span>
        </div>
        <div className={styles.personalGrid}>
          {standardFields.map((field) => (
            <StandardFieldCard
              key={field.name}
              field={field}
              onChange={(status) => updateStandardField(field.name, status)}
            />
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader} style={{ marginTop: "1rem" }}>
          <HelpCircle size={18} className={styles.iconCustom} />
          <span>Custom Questions</span>
        </div>

        {pages.length > 0 && (
          <div className={styles.pageTabs}>
            {pages.map((pageNum) => (
              <div
                key={pageNum}
                style={{ display: "flex", alignItems: "center" }}
              >
                <button
                  className={styles.pageTab}
                  data-active={activePage === pageNum ? "true" : "false"}
                  onClick={() => setActivePage(pageNum)}
                >
                  <Layers size={13} style={{ marginRight: 6, opacity: 0.6 }} />
                  Page {pageNum}
                </button>
                {pages.length > 1 && (
                  <button
                    className={styles.deletePageBtn}
                    onClick={() => confirmDeletePage(pageNum)}
                    title={`Delete Page ${pageNum}`}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            <button
              className={styles.addPageBtn}
              onClick={addPage}
              title="Add Page"
              style={{ marginLeft: "0.25rem" }}
            >
              <Plus size={14} />
            </button>
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext
            items={activePageFields.map((f) => f.localId)}
            strategy={verticalListSortingStrategy}
          >
            <div className={styles.fieldsList}>
              {activePageFields.length === 0 && (
                <div className={styles.emptyState}>
                  No custom questions added to this page yet.
                </div>
              )}
              {activePageFields.map((field) => (
                <SortableFieldCard
                  key={field.localId}
                  field={field}
                  onEdit={() => openEditModal(field)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <button className={styles.addQuestionBtn} onClick={openAddModal}>
          <Plus size={16} />
          Add Question
        </button>
      </div>

      <FieldModal
        isOpen={isModalOpen}
        onClose={closeFieldModal}
        mode={modalMode}
        initialField={editingField}
        onSave={handleModalSave}
        onDelete={
          modalMode === "edit" && editingField
            ? async () => {
                await deleteCustomField(editingField.localId);
                closeFieldModal();
              }
            : undefined
        }
      />
    </div>
  );
}
