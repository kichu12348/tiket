
import React, { useState } from "react";
import type { TicketType } from "@/types/ticketType";
import { Ticket, ChevronsUpDown, X } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import styles from "./TicketSelector.module.css";

interface TicketSelectorProps {
  ticketTypes: TicketType[];
  selectedTicketIds: string[];
  onChange: (ticketIds: string[]) => void;
  appliesTo: "all" | "specific";
  onAppliesToChange: (mode: "all" | "specific") => void;
}

export default function TicketSelector({
  ticketTypes,
  selectedTicketIds,
  onChange,
  appliesTo,
  onAppliesToChange,
}: TicketSelectorProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleSelectAll = () => {
    onChange(ticketTypes.map((t) => t.id));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const handleToggleTicket = (ticketId: string) => {
    if (selectedTicketIds.includes(ticketId)) {
      onChange(selectedTicketIds.filter((id) => id !== ticketId));
    } else {
      onChange([...selectedTicketIds, ticketId]);
    }
  };

  const handleRemoveTicket = (ticketId: string) => {
    onChange(selectedTicketIds.filter((id) => id !== ticketId));
  };

  const triggerLabel =
    selectedTicketIds.length === 0
      ? "Select tickets to discount..."
      : `${selectedTicketIds.length} ticket${
          selectedTicketIds.length > 1 ? "s" : ""
        } selected`;

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <label className={styles.label}>Applicable Tickets</label>
      </div>

      {/* Scope Selector: All vs Specific */}
      <div className={styles.scopeSelector} role="radiogroup" aria-label="Applicable Tickets">
        <button
          type="button"
          className={cn(
            styles.scopeBtn,
            appliesTo === "all" && styles.scopeBtnActive,
          )}
          onClick={() => {
            onAppliesToChange("all");
            onChange([]);
          }}
          data-testid="coupon-scope-all"
        >
          All Tickets
        </button>
        <button
          type="button"
          className={cn(
            styles.scopeBtn,
            appliesTo === "specific" && styles.scopeBtnActive,
          )}
          onClick={() => onAppliesToChange("specific")}
          data-testid="coupon-scope-specific"
        >
          Specific Tickets
        </button>
      </div>

      {appliesTo === "all" ? (
        <p className={styles.helperText}>
          This discount code will apply across all ticket tiers in this event.
        </p>
      ) : ticketTypes.length === 0 ? (
        <div className={styles.emptyNotice}>
          <Ticket size={16} />
          <span>No ticket tiers found. Create ticket tiers in the Tickets tab.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Popover Ticket Picker */}
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={styles.pickerTrigger}
                data-testid="coupon-ticket-picker-trigger"
                aria-label="Select applicable tickets"
              >
                <div
                  className={cn(
                    styles.triggerText,
                    selectedTicketIds.length === 0 && styles.triggerPlaceholder,
                  )}
                >
                  <Ticket size={15} />
                  <span>{triggerLabel}</span>
                </div>
                <ChevronsUpDown size={15} className="text-white/40" />
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="start"
              sideOffset={6}
              className={styles.popoverContent}
            >
              <div className={styles.popoverHeader}>
                <span className={styles.popoverTitle}>Ticket Tiers</span>
                <div className={styles.popoverActions}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={handleSelectAll}
                    data-testid="select-all-tickets-btn"
                  >
                    Select all
                  </button>
                  <span className={styles.actionDivider}>•</span>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={handleClearAll}
                    data-testid="clear-all-tickets-btn"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className={`${styles.optionsList} scrollbar`}>
                {ticketTypes.map((ticket) => {
                  const isChecked = selectedTicketIds.includes(ticket.id);
                  const priceNum = Number(ticket.price);
                  const priceLabel = priceNum > 0 ? `₹${ticket.price}` : "Free";

                  return (
                    <label
                      key={ticket.id}
                      className={cn(
                        styles.optionItem,
                        isChecked && styles.optionItemSelected,
                      )}
                      data-testid={`ticket-option-${ticket.id}`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleToggleTicket(ticket.id)}
                        aria-label={ticket.name}
                      />
                      <span className={styles.optionName}>{ticket.name}</span>
                      <span className={styles.optionPrice}>{priceLabel}</span>
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Selected Chips */}
          {selectedTicketIds.length > 0 ? (
            <div className={styles.chipsContainer}>
              {selectedTicketIds.map((id) => {
                const ticket = ticketTypes.find((t) => t.id === id);
                const name = ticket ? ticket.name : id;
                const priceNum = ticket ? Number(ticket.price) : 0;
                const priceLabel = ticket
                  ? priceNum > 0
                    ? `₹${ticket.price}`
                  : "Free"
                  : "";

                return (
                  <div
                    key={id}
                    className={styles.chip}
                    data-testid={`selected-ticket-chip-${id}`}
                  >
                    <span className={styles.chipName}>{name}</span>
                    {priceLabel && (
                      <span className={styles.chipPrice}>{priceLabel}</span>
                    )}
                    <button
                      type="button"
                      className={styles.removeChipBtn}
                      onClick={() => handleRemoveTicket(id)}
                      aria-label={`Remove ${name}`}
                      data-testid={`remove-ticket-chip-${id}`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={styles.warningText} role="alert">
              Please select at least one ticket tier, or switch to All Tickets.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
