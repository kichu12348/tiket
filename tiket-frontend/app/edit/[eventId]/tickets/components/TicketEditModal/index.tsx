import { useState, useEffect } from "react";
import { createTicketType, updateTicketType } from "@/api/tickets";
import { getFormFields } from "@/api/forms";
import type { TicketType } from "@/types/ticketType";
import type { FormField, ConditionGroup } from "@/types/form";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
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

function TicketEditModalContent({
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
  const [name, setName] = useState(ticket?.name ?? "");
  const [description, setDescription] = useState(ticket?.description ?? "");
  const [price, setPrice] = useState(ticket?.price.toString() ?? "0");
  const [quantityLimit, setQuantityLimit] = useState(
    ticket?.quantityLimit?.toString() ?? "",
  );
  const [isHidden, setIsHidden] = useState(ticket?.isHidden ?? false);
  const [isRefundable, setIsRefundable] = useState(
    ticket?.isRefundable ?? false,
  );
  const [isTransferable, setIsTransferable] = useState(
    ticket?.isTransferable ?? true,
  );
  const [maxTransfers, setMaxTransfers] = useState(
    ticket?.maxTransfers?.toString() ?? "1",
  );
  const [saleStart, setSaleStart] = useState(
    () =>
      ticket?.saleStart || eventRegistrationStart || new Date().toISOString(),
  );
  const [saleEnd, setSaleEnd] = useState(
    () =>
      ticket?.saleEnd ||
      eventRegistrationEnd ||
      eventEndDate ||
      new Date(Date.now() + 86400000).toISOString(),
  );
  const [poolName, setPoolName] = useState(ticket?.poolName ?? "");
  const [poolCapacity, setPoolCapacity] = useState(
    ticket?.poolCapacity?.toString() ?? "",
  );
  const [hasEligibility, setHasEligibility] = useState(
    Boolean(
      ticket?.eligibilityRules &&
        ticket.eligibilityRules.rules &&
        ticket.eligibilityRules.rules.length > 0,
    ),
  );
  const [eligibilityFieldId, setEligibilityFieldId] = useState(
    ticket?.eligibilityRules?.rules?.[0]?.sourceId ?? "",
  );
  const [eligibilityOperator, setEligibilityOperator] = useState<
    "equals" | "not_equals" | "contains" | "in"
  >(
    (ticket?.eligibilityRules?.rules?.[0]?.operator as
      | "equals"
      | "not_equals"
      | "contains"
      | "in") ?? "equals",
  );
  const [eligibilityValue, setEligibilityValue] = useState(
    Array.isArray(ticket?.eligibilityRules?.rules?.[0]?.value)
      ? ticket?.eligibilityRules?.rules?.[0]?.value.join(", ")
      : (ticket?.eligibilityRules?.rules?.[0]?.value ?? ""),
  );
  const [availableFields, setAvailableFields] = useState<FormField[]>([]);

  useEffect(() => {
    getFormFields(eventId)
      .then((fields) => setAvailableFields(fields || []))
      .catch(() => {});
  }, [eventId]);

  const [isSubmitting, setIsSubmitting] = useState(false);

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
      let eligibilityRules: ConditionGroup | null = null;
      if (
        hasEligibility &&
        eligibilityFieldId.trim() &&
        eligibilityValue.trim()
      ) {
        const val =
          eligibilityOperator === "in"
            ? eligibilityValue
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : eligibilityValue.trim();
        eligibilityRules = {
          match: "all",
          rules: [
            {
              sourceType: "field",
              sourceId: eligibilityFieldId.trim(),
              operator: eligibilityOperator,
              value: val,
            },
          ],
        };
      }

      const payload = {
        name,
        description,
        price: Number(price),
        quantityLimit: quantityLimit ? parseInt(quantityLimit, 10) : null,
        poolName: poolName.trim() || null,
        poolCapacity: poolCapacity ? parseInt(poolCapacity, 10) : null,
        eligibilityRules,
        isHidden,
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
    } catch (error: unknown) {
      console.error("Failed to save ticket type", error);
      toast.error(getErrorMessage(error) || "Failed to save ticket type.");
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
              data-testid="ticket-name-input"
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
              data-testid="ticket-description-input"
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
              data-testid="ticket-price-input"
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
              data-testid="ticket-quantity-input"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Shared Capacity Pool (Optional)</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Category A or Student Pool"
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
              data-testid="ticket-pool-name-input"
            />
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginTop: "0.25rem",
                display: "block",
              }}
            >
              Share pool capacity across multiple tiers (e.g. Early Bird + Regular).
            </span>
          </div>
          {poolName.trim() && (
            <div className={styles.formGroup}>
              <label>Shared Pool Capacity</label>
              <input
                type="number"
                className={styles.input}
                placeholder="Total capacity for this pool (e.g. 60)"
                value={poolCapacity}
                onChange={(e) => setPoolCapacity(e.target.value)}
                min="1"
                data-testid="ticket-pool-capacity-input"
              />
            </div>
          )}
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
            <span>Require an access code</span>
            <Switch
              id="ticket-hidden-switch"
              checked={isHidden}
              onChange={setIsHidden}
            />
          </div>
          <div className={styles.switchRow}>
            <span>Allow Refunds</span>
            <Switch
              id="ticket-refundable-switch"
              checked={isRefundable}
              onChange={setIsRefundable}
            />
          </div>
          <div className={styles.switchRow}>
            <span>Allow Transfers</span>
            <Switch
              id="ticket-transferable-switch"
              checked={isTransferable}
              onChange={setIsTransferable}
            />
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
                data-testid="ticket-max-transfers-input"
              />
            </div>
          )}
          <div className={styles.switchRow}>
            <span>Require Form Eligibility</span>
            <Switch
              id="ticket-eligibility-switch"
              checked={hasEligibility}
              onChange={setHasEligibility}
            />
          </div>
          {hasEligibility && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                padding: "0.85rem",
                background: "rgba(255, 255, 255, 0.03)",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                marginBottom: "0.5rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                Eligible only IF Form Question matches:
              </span>
              <div className={styles.formGroup}>
                <label style={{ fontSize: "0.75rem" }}>Form Question</label>
                {availableFields.length > 0 ? (
                  <select
                    className={styles.input}
                    value={eligibilityFieldId}
                    onChange={(e) => setEligibilityFieldId(e.target.value)}
                    style={{ background: "#1c1c1e", color: "#fff" }}
                    data-testid="ticket-eligibility-field-select"
                  >
                    <option value="">Select a question...</option>
                    {availableFields.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label} ({f.name})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Field ID or name (e.g. role)"
                    value={eligibilityFieldId}
                    onChange={(e) => setEligibilityFieldId(e.target.value)}
                    data-testid="ticket-eligibility-field-input"
                  />
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.75rem" }}>Operator</label>
                  <select
                    className={styles.input}
                    value={eligibilityOperator}
                    onChange={(e) =>
                      setEligibilityOperator(
                        e.target.value as
                          | "equals"
                          | "not_equals"
                          | "contains"
                          | "in",
                      )
                    }
                    style={{ background: "#1c1c1e", color: "#fff" }}
                    data-testid="ticket-eligibility-operator-select"
                  >
                    <option value="equals">Equals</option>
                    <option value="not_equals">Does not equal</option>
                    <option value="contains">Contains</option>
                    <option value="in">In list</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.75rem" }}>Expected Value</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Student"
                    value={eligibilityValue}
                    onChange={(e) => setEligibilityValue(e.target.value)}
                    data-testid="ticket-eligibility-value-input"
                  />
                </div>
              </div>
            </div>
          )}
          <div className={styles.footer}>
            <button
              className={styles.submitBtn}
              onClick={handleSave}
              disabled={isSubmitting}
              data-testid="ticket-submit-btn"
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

export default function TicketEditModal(props: TicketEditModalProps) {
  return props.isOpen ? (
    <TicketEditModalContent key={props.ticket?.id ?? "new"} {...props} />
  ) : null;
}
