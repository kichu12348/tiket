"use client";

import React, { useState } from "react";
import { Braces } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import type { FormField } from "@/types/form";
import type { TicketLayoutLayer } from "@/types/ticketType";
import styles from "./TokenPicker.module.css";

interface TokenPickerProps {
  formFields: FormField[];
  onSelectToken: (fields: Partial<TicketLayoutLayer>) => void;
}

export default function TokenPicker({
  formFields,
  onSelectToken,
}: TokenPickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (tokenOrText: string, name: string) => {
    onSelectToken({ tokenOrText, name });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={styles.tokenPickerBtn}
          data-testid="token-picker-trigger"
        >
          <Braces size={13} />
          <span>Tokens</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={`${styles.popoverTokenList} scrollbar`}
        align="end"
      >
        <span className={styles.tokenSectionTitle}>STANDARD TOKENS</span>
        <button
          type="button"
          className={styles.tokenItemBtn}
          onClick={() => handleSelect("{{name}}", "Delegate Name")}
        >
          <span className={styles.tokenItemLabel}>Delegate Name</span>
          <span className={styles.tokenItemToken}>{"{{name}}"}</span>
        </button>

        <button
          type="button"
          className={styles.tokenItemBtn}
          onClick={() => handleSelect("{{email}}", "Delegate Email")}
        >
          <span className={styles.tokenItemLabel}>Delegate Email</span>
          <span className={styles.tokenItemToken}>{"{{email}}"}</span>
        </button>

        <button
          type="button"
          className={styles.tokenItemBtn}
          onClick={() => handleSelect("{{ticket_code}}", "Ticket Code")}
        >
          <span className={styles.tokenItemLabel}>Ticket Code</span>
          <span className={styles.tokenItemToken}>{"{{ticket_code}}"}</span>
        </button>

        <button
          type="button"
          className={styles.tokenItemBtn}
          onClick={() => handleSelect("{{ticket_type}}", "Ticket Title")}
        >
          <span className={styles.tokenItemLabel}>Ticket Title</span>
          <span className={styles.tokenItemToken}>{"{{ticket_type}}"}</span>
        </button>

        <button
          type="button"
          className={styles.tokenItemBtn}
          onClick={() => handleSelect("{{event_title}}", "Event Title")}
        >
          <span className={styles.tokenItemLabel}>Event Title</span>
          <span className={styles.tokenItemToken}>{"{{event_title}}"}</span>
        </button>

        {formFields.length > 0 && (
          <>
            <span className={styles.tokenSectionTitle}>EVENT FORM FIELDS</span>
            {formFields.map((field) => (
              <button
                key={field.id}
                type="button"
                className={styles.tokenItemBtn}
                onClick={() =>
                  handleSelect(`{{form.${field.label}}}`, field.label)
                }
              >
                <span className={styles.tokenItemLabel}>{field.label}</span>
                <span className={styles.tokenItemToken}>
                  {`{{form.${field.label}}}`}
                </span>
              </button>
            ))}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

