"use client";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, X } from "lucide-react";
import styles from "./DateTimeControl.module.css";

const times = Array.from({ length: 48 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, "0");
  const minutes = index % 2 ? "30" : "00";
  return `${hours}:${minutes}`;
});

interface DateTimeControlProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export default function DateTimeControl({
  label,
  value,
  onChange,
}: DateTimeControlProps) {
  const date = value ? new Date(value) : undefined;
  const time = date
    ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
    : "12:00";

  const changeDate = (selected?: Date) => {
    if (!selected) return;
    const [hours, minutes] = time.split(":").map(Number);
    selected.setHours(hours, minutes, 0, 0);
    onChange(selected.toISOString());
  };

  const changeTime = (selected: string) => {
    const next = date || new Date();
    const [hours, minutes] = selected.split(":").map(Number);
    next.setHours(hours, minutes, 0, 0);
    onChange(next.toISOString());
  };

  return (
    <div className={styles.container}>
      <span className={styles.label}>{label}</span>
      <div className={styles.controls}>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={styles.dateTrigger}
              aria-label={`${label} date`}
            >
              <CalendarIcon size={15} className={styles.dateIcon} />
              <span>
                {date
                  ? date.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Select date"}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date} onSelect={changeDate} />
          </PopoverContent>
        </Popover>

        <Select value={time} onValueChange={changeTime}>
          <SelectTrigger
            aria-label={`${label} time`}
            className={styles.timeTrigger}
          >
            <Clock size={14} className={styles.dateIcon} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-56">
            {times.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {value && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => onChange("")}
            title="Clear date"
            aria-label="Clear date"
          >
            <X size={14} />
            <span>Clear</span>
          </button>
        )}
      </div>
    </div>
  );
}
