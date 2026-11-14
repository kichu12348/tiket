import { useState } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import styles from "./TimePicker.module.css";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  date: string; // ISO string
  onChange: (date: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function TimePicker({
  date,
  onChange,
  disabled = false,
  placeholder = "--:-- --",
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasDate = Boolean(date && !isNaN(new Date(date).getTime()));
  const selectedDate = hasDate ? new Date(date) : new Date();
  const isDisabled = disabled || !hasDate;

  const generateTimes = () => {
    const times = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const d = new Date();
        d.setHours(h);
        d.setMinutes(m);
        const timeStr = d.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        times.push({ h, m, timeStr });
      }
    }
    return times;
  };

  const times = generateTimes();

  const handleSelect = (h: number, m: number) => {
    const newDate = new Date(selectedDate);
    newDate.setHours(h);
    newDate.setMinutes(m);
    onChange(newDate.toISOString());
    setIsOpen(false);
  };

  const formattedLabel = hasDate
    ? selectedDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : placeholder;

  const selectedHour = selectedDate.getHours();
  const selectedMinute = selectedDate.getMinutes() < 30 ? 0 : 30;

  return (
    <PopoverPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!isDisabled) setIsOpen(open);
      }}
    >
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={styles.triggerBtn}
          disabled={isDisabled}
          data-empty={!hasDate}
        >
          {formattedLabel}
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className={cn(styles.popover, "scrollbar")}
          align="start"
          side="bottom"
          sideOffset={6}
        >
          <div className={styles.scrollArea}>
            {times.map((t, i) => {
              const isSelected = t.h === selectedHour && t.m === selectedMinute;
              return (
                <button
                  key={i}
                  type="button"
                  className={`${styles.timeItem} ${
                    isSelected ? styles.selectedItem : ""
                  }`}
                  onClick={() => handleSelect(t.h, t.m)}
                >
                  {t.timeStr}
                </button>
              );
            })}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
