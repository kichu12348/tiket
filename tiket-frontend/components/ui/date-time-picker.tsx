"use client";

import * as React from "react";
import { format, isValid, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";

export interface DateTimePickerProps {
  value?: string | Date | null;
  onChange: (isoString: string) => void;
  label?: string;
  timezone?: string;
  minDate?: Date;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES_5 = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0"),
);

export function DateTimePicker({
  value,
  onChange,
  label,
  timezone,
  minDate,
  disabled = false,
  placeholder = "Pick date and time",
  className,
  id,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Parse initial date
  const parsedDate = React.useMemo<Date | null>(() => {
    if (!value) return null;
    if (value instanceof Date) return isValid(value) ? value : null;
    try {
      const parsed = parseISO(value);
      return isValid(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }, [value]);

  // Internal time state
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    parsedDate || undefined,
  );

  const [hours, setHours] = React.useState<string>(() => {
    if (!parsedDate) return "12";
    const h = parsedDate.getHours() % 12;
    return String(h === 0 ? 12 : h);
  });

  const [minutes, setMinutes] = React.useState<string>(() => {
    if (!parsedDate) return "00";
    const m = Math.floor(parsedDate.getMinutes() / 5) * 5;
    return String(m).padStart(2, "0");
  });

  const [ampm, setAmpm] = React.useState<"AM" | "PM">(() => {
    if (!parsedDate) return "AM";
    return parsedDate.getHours() >= 12 ? "PM" : "AM";
  });

  // Sync internal state during render when external parsedDate changes
  const [prevParsedDate, setPrevParsedDate] = React.useState(parsedDate);
  if (parsedDate !== prevParsedDate) {
    setPrevParsedDate(parsedDate);
    setSelectedDate(parsedDate || undefined);
    if (parsedDate) {
      const h = parsedDate.getHours() % 12;
      setHours(String(h === 0 ? 12 : h));
      const m = Math.floor(parsedDate.getMinutes() / 5) * 5;
      setMinutes(String(m).padStart(2, "0"));
      setAmpm(parsedDate.getHours() >= 12 ? "PM" : "AM");
    }
  }

  // Construct ISO string and trigger onChange
  const updateDateTime = (
    newDate: Date | undefined,
    newHours: string,
    newMinutes: string,
    newAmpm: "AM" | "PM",
  ) => {
    if (!newDate) return;

    let h = parseInt(newHours, 10);
    if (newAmpm === "PM" && h < 12) h += 12;
    if (newAmpm === "AM" && h === 12) h = 0;

    const m = parseInt(newMinutes, 10);

    const merged = new Date(newDate);
    merged.setHours(h);
    merged.setMinutes(m);
    merged.setSeconds(0);
    merged.setMilliseconds(0);

    onChange(merged.toISOString());
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      updateDateTime(date, hours, minutes, ampm);
    }
  };

  const handleHoursChange = (newHours: string) => {
    setHours(newHours);
    const baseDate = selectedDate || minDate || new Date();
    setSelectedDate(baseDate);
    updateDateTime(baseDate, newHours, minutes, ampm);
  };

  const handleMinutesChange = (newMinutes: string) => {
    setMinutes(newMinutes);
    const baseDate = selectedDate || minDate || new Date();
    setSelectedDate(baseDate);
    updateDateTime(baseDate, hours, newMinutes, ampm);
  };

  const handleAmpmChange = (newAmpm: "AM" | "PM") => {
    setAmpm(newAmpm);
    const baseDate = selectedDate || minDate || new Date();
    setSelectedDate(baseDate);
    updateDateTime(baseDate, hours, minutes, newAmpm);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(undefined);
    onChange("");
  };

  const isDateDisabled = (day: Date) => {
    if (!minDate) return false;
    const startOfMinDate = new Date(
      minDate.getFullYear(),
      minDate.getMonth(),
      minDate.getDate(),
    );
    const startOfDay = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
    );
    return startOfDay < startOfMinDate;
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal bg-white/[0.05] border-white/10 text-white hover:bg-white/10 hover:text-white rounded-lg h-9 px-3 gap-2",
              !parsedDate && "text-muted-foreground",
            )}
          >
            <CalendarIcon size={15} className="shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate">
              {parsedDate ? (
                <>
                  {format(parsedDate, "PPP p")}
                  {timezone && (
                    <span className="ml-1.5 text-xs text-muted-foreground font-mono">
                      ({timezone})
                    </span>
                  )}
                </>
              ) : (
                <span>{placeholder}</span>
              )}
            </span>
            {parsedDate && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear date"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleClear(e as unknown as React.MouseEvent);
                }}
                className="shrink-0 rounded-sm p-0.5 hover:bg-white/10 text-muted-foreground hover:text-white"
              >
                <X size={14} />
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-auto p-0 bg-[#18191d] border border-white/10 backdrop-blur-2xl rounded-xl shadow-2xl z-[1100]"
        >
          <div className="p-1">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={isDateDisabled}
            />
          </div>

          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 bg-white/[0.02]">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={14} />
              <span>Time</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Select value={hours} onValueChange={handleHoursChange}>
                <SelectTrigger className="h-8 w-[60px] bg-white/[0.05] border-white/10 text-xs">
                  <SelectValue placeholder="HH" />
                </SelectTrigger>
                <SelectContent className="max-h-48 bg-[#1a1b20] border-white/10 text-xs">
                  {HOURS_12.map((h) => (
                    <SelectItem key={h} value={h} className="text-xs">
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-muted-foreground font-bold">:</span>

              <Select value={minutes} onValueChange={handleMinutesChange}>
                <SelectTrigger className="h-8 w-[60px] bg-white/[0.05] border-white/10 text-xs">
                  <SelectValue placeholder="MM" />
                </SelectTrigger>
                <SelectContent className="max-h-48 bg-[#1a1b20] border-white/10 text-xs">
                  {MINUTES_5.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={ampm}
                onValueChange={(val) => handleAmpmChange(val as "AM" | "PM")}
              >
                <SelectTrigger className="h-8 w-[64px] bg-white/[0.05] border-white/10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1b20] border-white/10 text-xs">
                  <SelectItem value="AM" className="text-xs">
                    AM
                  </SelectItem>
                  <SelectItem value="PM" className="text-xs">
                    PM
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default DateTimePicker;
