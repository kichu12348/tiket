import { useState, useEffect } from "react";
import { createTicketType, updateTicketType } from "@/api/tickets";
import { TicketType } from "@/types/ticketType";
import { toast } from "sonner";
import { Globe, CalendarIcon, Clock } from "lucide-react";
import Modal from "@/components/Modal";
import Switch from "@/components/Switch";
import styles from "./TicketEditModal.module.css";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import Dropdown from "@/components/Dropdown";

const TIME_OPTIONS = Array.from({ length: 48 }).map((_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? "00" : "30";
  const label = `${hours.toString().padStart(2, "0")}:${minutes}`;
  return { label, value: label, LeftComponent: <Clock size={14} /> };
});

const updateTime = (
  dateStr: string,
  timeValue: string,
  setDate: (d: string) => void,
) => {
  if (!dateStr) return;
  const [hours, minutes] = timeValue.split(":").map(Number);
  const newDate = new Date(dateStr);
  newDate.setHours(hours, minutes, 0, 0);
  setDate(newDate.toISOString());
};

const updateDate = (
  dateStr: string,
  newDate: Date | undefined,
  setDate: (d: string) => void,
) => {
  if (!newDate) return;
  const currentDate = dateStr ? new Date(dateStr) : new Date();
  currentDate.setFullYear(
    newDate.getFullYear(),
    newDate.getMonth(),
    newDate.getDate(),
  );
  setDate(currentDate.toISOString());
};

interface TicketEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  ticket?: TicketType | null;
  onSave: () => void;
  timezone: string;
  eventRegistrationStart?: string | null;
  eventRegistrationEnd?: string | null;
  eventEndDate?: string | null;
}

export default function TicketEditModal({
  isOpen,
  onClose,
  eventId,
  ticket,
  onSave,
  timezone,
  eventRegistrationStart,
  eventRegistrationEnd,
  eventEndDate,
}: TicketEditModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantityLimit, setQuantityLimit] = useState("");
  const [isRefundable, setIsRefundable] = useState(false);
  const [isTransferable, setIsTransferable] = useState(true);
  const [maxTransfers, setMaxTransfers] = useState("1");
  const [saleStart, setSaleStart] = useState("");
  const [saleEnd, setSaleEnd] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (ticket) {
        setName(ticket.name);
        setDescription(ticket.description || "");
        setPrice(ticket.price.toString());
        setQuantityLimit(
          ticket.quantityLimit ? ticket.quantityLimit.toString() : "",
        );
        setIsRefundable(ticket.isRefundable ?? false);
        setIsTransferable(ticket.isTransferable ?? true);
        setMaxTransfers(
          ticket.maxTransfers !== undefined
            ? ticket.maxTransfers.toString()
            : "1",
        );
        setSaleStart(
          ticket.saleStart ||
            eventRegistrationStart ||
            new Date().toISOString(),
        );
        setSaleEnd(
          ticket.saleEnd ||
            eventRegistrationEnd ||
            new Date(Date.now() + 86400000).toISOString(),
        );
      } else {
        setName("");
        setDescription("");
        setPrice("");
        setQuantityLimit("");
        setIsRefundable(false);
        setIsTransferable(true);
        setMaxTransfers("1");
        setSaleStart(eventRegistrationStart || new Date().toISOString());
        setSaleEnd(
          eventRegistrationEnd || new Date(Date.now() + 86400000).toISOString(),
        );
      }
    }
  }, [isOpen, ticket, eventRegistrationStart, eventRegistrationEnd]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Ticket name is required.");
      return;
    }
    if (price === "" || isNaN(Number(price)) || Number(price) < 0) {
      toast.error("Please enter a valid price (0 for free).");
      return;
    }
    if (!saleStart || !saleEnd) {
      toast.error("Sale start and end dates are required.");
      return;
    }
    if (new Date(saleStart) >= new Date(saleEnd)) {
      toast.error("Sale start date must be before end date.");
      return;
    }
    const maxDate = eventRegistrationEnd || eventEndDate;
    if (maxDate && new Date(saleEnd) > new Date(maxDate)) {
      toast.error(
        "Sale end date cannot be after the event or registration ends.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name,
        description,
        price: Number(price),
        quantityLimit: quantityLimit ? parseInt(quantityLimit, 10) : null,
        isRefundable,
        isTransferable,
        maxTransfers: isTransferable ? parseInt(maxTransfers, 10) || 1 : 0,
        saleStart,
        saleEnd,
      };

      if (ticket) {
        await updateTicketType(eventId, ticket.id, payload);
        toast.success("Ticket type updated.");
      } else {
        await createTicketType(eventId, payload);
        toast.success("Ticket type created.");
      }
      onSave();
      onClose();
    } catch (error) {
      console.error("Failed to save ticket type", error);
      toast.error("Failed to save ticket type.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={ticket ? "Edit Ticket Type" : "Create Ticket Type"}
      width={465}
      className={styles.modalContent}
      headerClassName={styles.modalHeaderStyle}
    >
      <div className={styles.modalScrollWrapper}>
        <div className={styles.formBody}>
          <div className={styles.formGroup}>
            <label>Ticket Name</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. General Admission"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              className={styles.input}
              placeholder="e.g. Access to all sessions and workshops"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ resize: "vertical", minHeight: "80px" }}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Price (₹)</label>
            <input
              type="number"
              className={styles.input}
              placeholder="0.00 for free"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Quantity Limit</label>
            <input
              type="number"
              className={styles.input}
              placeholder="Leave empty for unlimited"
              value={quantityLimit}
              onChange={(e) => setQuantityLimit(e.target.value)}
              min="1"
            />
          </div>
          <div className={styles.formGroup}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <label style={{ margin: 0 }}>Sales Period</label>
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <Globe size={12} /> {timezone}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "1rem" }}
              >
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    width: "35px",
                  }}
                >
                  Start
                </span>
                <div className={styles.pickersBox}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className={styles.datePickerBtn}>
                        <CalendarIcon size={14} />
                        {saleStart ? (
                          format(new Date(saleStart), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 z-[9999]"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={saleStart ? new Date(saleStart) : undefined}
                        onSelect={(date) =>
                          updateDate(saleStart, date, setSaleStart)
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  <Dropdown
                    options={TIME_OPTIONS}
                    value={
                      saleStart ? format(new Date(saleStart), "HH:mm") : "00:00"
                    }
                    onChange={(val) =>
                      updateTime(saleStart, val as string, setSaleStart)
                    }
                    btnColor="transparent"
                    maxHeight="250px"
                  />
                </div>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "1rem" }}
              >
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    width: "35px",
                  }}
                >
                  End
                </span>
                <div className={styles.pickersBox}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className={styles.datePickerBtn}>
                        <CalendarIcon size={14} />
                        {saleEnd ? (
                          format(new Date(saleEnd), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 z-[9999]"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={saleEnd ? new Date(saleEnd) : undefined}
                        onSelect={(date) =>
                          updateDate(saleEnd, date, setSaleEnd)
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  <Dropdown
                    options={TIME_OPTIONS}
                    value={
                      saleEnd ? format(new Date(saleEnd), "HH:mm") : "00:00"
                    }
                    onChange={(val) =>
                      updateTime(saleEnd, val as string, setSaleEnd)
                    }
                    btnColor="transparent"
                    maxHeight="250px"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className={styles.switchRow}>
            <span>Allow Refunds</span>
            <Switch checked={isRefundable} onChange={setIsRefundable} />
          </div>
          <div className={styles.switchRow}>
            <span>Allow Transfers</span>
            <Switch checked={isTransferable} onChange={setIsTransferable} />
          </div>
          {isTransferable && (
            <div className={styles.formGroup}>
              <label>Maximum Transfers Allowed</label>
              <input
                type="number"
                className={styles.input}
                placeholder="e.g. 1"
                value={maxTransfers}
                onChange={(e) => setMaxTransfers(e.target.value)}
                min="1"
              />
            </div>
          )}
          <div className={styles.footer}>
            <button
              className={styles.submitBtn}
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : ticket
                  ? "Save Changes"
                  : "Create Ticket"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
