"use client";

import { useState, useEffect } from "react";
import { getTicketTypes, deleteTicketType, reorderTicketTypes } from "@/api/tickets";
import { TicketType } from "@/types/ticketType";
import { toast } from "sonner";
import { Plus, Ticket } from "lucide-react";
import styles from "./TicketTypesPanel.module.css";
import { confirm } from "@/components/ConfirmModal";
import { useEventStore } from "@/store/useEventStore";
import TicketEditModal from "../TicketEditModal";
import SortableTicketCard from "./SortableTicketCard";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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

interface Props {
  eventId: string;
}

export default function TicketTypesPanel({ eventId }: Props) {
  const { event } = useEventStore();
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    fetchTicketTypes();
  }, [eventId]);

  const fetchTicketTypes = async () => {
    try {
      setIsLoading(true);
      const data = await getTicketTypes(eventId);
      setTicketTypes(data || []);
    } catch (error) {
      console.error("Failed to fetch ticket types", error);
      toast.error("Failed to load ticket types.");
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (ticket?: TicketType) => {
    setEditingTicket(ticket || null);
    setIsModalOpen(true);
  };

  const handleDelete = async (ticketId: string) => {
    await confirm("Are you sure you want to delete this ticket type?", {
      confirmText: "Delete",
      cancelText: "Cancel",
      danger: true,
      onConfirm: async () => {
        try {
          await deleteTicketType(eventId, ticketId);
          toast.success("Ticket type deleted.");
          fetchTicketTypes();
        } catch (error) {
          console.error("Failed to delete ticket type", error);
          toast.error("Failed to delete ticket type.");
        }
      },
    });
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIndex = ticketTypes.findIndex((t) => t.id === active.id);
    const newIndex = ticketTypes.findIndex((t) => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(ticketTypes, oldIndex, newIndex);
    const updated = reordered.map((t, i) => ({ ...t, sortOrder: i }));

    // Optimistic UI update
    setTicketTypes(updated);

    try {
      await reorderTicketTypes(
        eventId,
        updated.map((t) => ({ id: t.id, sortOrder: t.sortOrder }))
      );
    } catch (error) {
      console.error("Failed to reorder tickets", error);
      toast.error("Failed to save new order.");
      // Revert if it fails
      fetchTicketTypes();
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading ticket types...</div>;
  }

  const timezone =
    event?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Ticket Types</h3>
        <button className={styles.createBtn} onClick={() => openModal()}>
          <Plus size={16} />
          <span>Add Ticket</span>
        </button>
      </div>

      <div className={styles.list}>
        {ticketTypes.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrapper}>
              <Ticket size={32} strokeWidth={1.5} />
            </div>
            <p className={styles.emptyTitle}>No ticket types yet</p>
            <p className={styles.emptyDesc}>
              Create your first ticket tier to start selling.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext
              items={ticketTypes.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {ticketTypes.map((ticket) => (
                <SortableTicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onEdit={() => openModal(ticket)}
                  onDelete={() => handleDelete(ticket.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <TicketEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eventId={eventId}
        ticket={editingTicket}
        onSave={fetchTicketTypes}
        timezone={timezone}
        eventRegistrationStart={event?.registrationStart}
        eventRegistrationEnd={event?.registrationEnd}
        eventEndDate={event?.endDate}
      />
    </div>
  );
}
