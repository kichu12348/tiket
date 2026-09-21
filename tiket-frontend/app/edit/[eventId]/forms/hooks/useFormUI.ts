import { useState } from "react";
import { toast } from "sonner";
import { confirm } from "@/components/ConfirmModal";
import { LocalField } from "../types";

export function useFormUI(pages: number[], deletePageFromDB: (pageNum: number) => Promise<void>) {
  const [activePage, setActivePage] = useState(1);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  /* ── Modal State ── */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingField, setEditingField] = useState<LocalField | null>(null);


  const addPage = () => {
    const maxPage = pages.length > 0 ? Math.max(...pages) : 0;
    const newPage = maxPage + 1;
    setActivePage(newPage);
  };

  const confirmDeletePage = async (pageNum: number) => {
    if (pages.length <= 1) {
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
          if (activePage === pageNum) {
            setActivePage(Math.max(1, pageNum - 1));
          } else if (activePage > pageNum) {
            setActivePage(activePage - 1);
          }
          toast.success(`Page ${pageNum} deleted.`);
        },
      }
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
