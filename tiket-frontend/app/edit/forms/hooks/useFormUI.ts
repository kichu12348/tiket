import { useState, useMemo } from "react";
import { toast } from "sonner";
import { confirm } from "@/components/ConfirmModal";
import type { LocalField } from "../types";

export function useFormUI(
  pages: number[],
  deletePageFromDB: (pageNum: number) => Promise<void>,
) {
  const [activePage, setActivePage] = useState(1);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [createdPages, setCreatedPages] = useState<number[]>([]);

  /* ── Modal State ── */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingField, setEditingField] = useState<LocalField | null>(null);

  const effectivePages = useMemo(() => {
    const set = new Set<number>([1, ...pages, ...createdPages]);
    return Array.from(set).sort((a, b) => a - b);
  }, [pages, createdPages]);

  const addPage = () => {
    const maxPage = effectivePages.length > 0 ? Math.max(...effectivePages) : 1;
    const newPage = maxPage + 1;
    setCreatedPages((prev) => [...prev, newPage]);
    setActivePage(newPage);
  };

  const confirmDeletePage = async (pageNum: number) => {
    if (effectivePages.length <= 1) {
      toast.error("You need at least one page.");
      return;
    }
    await confirm(
      `Are you sure you want to delete Page ${pageNum} and all its custom questions? This action cannot be undone.`,
      {
        title: "Delete Page",
        confirmText: "Delete Page",
        danger: true,
        onConfirm: async () => {
          await deletePageFromDB(pageNum);
          setCreatedPages((prev) =>
            prev.filter((p) => p !== pageNum).map((p) => (p > pageNum ? p - 1 : p)),
          );
          if (activePage === pageNum) {
            setActivePage(Math.max(1, pageNum - 1));
          } else if (activePage > pageNum) {
            setActivePage(activePage - 1);
          }
          toast.success(`Page ${pageNum} deleted.`);
        },
      },
    );
  };

  const openAddModal = () => {
    setModalMode("add");
    setEditingField(null);
    setIsModalOpen(true);
  };

  const openEditModal = (field: LocalField) => {
    setModalMode("edit");
    setEditingField(field);
    setIsModalOpen(true);
  };

  const closeFieldModal = () => {
    setIsModalOpen(false);
  };

  return {
    activePage,
    setActivePage,
    effectivePages,
    activeDragId,
    setActiveDragId,
    isModalOpen,
    modalMode,
    editingField,
    addPage,
    confirmDeletePage,
    openAddModal,
    openEditModal,
    closeFieldModal,
  };
}
