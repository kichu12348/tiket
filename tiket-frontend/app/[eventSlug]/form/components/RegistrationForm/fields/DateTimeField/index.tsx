import { Controller } from "react-hook-form";
import { CalendarIcon, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Dropdown from "@/components/Dropdown";
import { format } from "date-fns";
import { FieldRendererProps } from "../../types";
import styles from "./DateTimeField.module.css";

const TIME_OPTIONS = Array.from({ length: 48 }).map((_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? "00" : "30";
  const label = `${hours.toString().padStart(2, "0")}:${minutes}`;
  return { label, value: label, LeftComponent: <Clock size={14} /> };
});

export default function DateTimeField({
  field,
  control,
  error,
}: FieldRendererProps) {
  const isTimeOnly = field.fieldType === "time";
  const isDateOnly = field.fieldType === "date";
  const isDateTime = field.fieldType === "datetime";

  return (
    <Controller
      name={field.id}
      control={control}
      defaultValue=""
      render={({ field: f }) => {
        const currentDate = f.value ? new Date(f.value) : null;
        const validDate =
          currentDate && !isNaN(currentDate.getTime()) ? currentDate : null;

        const handleDateSelect = (newDate: Date | undefined) => {
          if (!newDate) return;
          const baseDate = validDate ? new Date(validDate) : new Date();
          baseDate.setFullYear(
            newDate.getFullYear(),
            newDate.getMonth(),
            newDate.getDate()
          );
          f.onChange(baseDate.toISOString());
        };

        const handleTimeSelect = (timeValue: string) => {
          const [hours, minutes] = timeValue.split(":").map(Number);
          const baseDate = validDate ? new Date(validDate) : new Date();
          baseDate.setHours(hours, minutes, 0, 0);
          f.onChange(isTimeOnly ? timeValue : baseDate.toISOString());
        };

        const currentTimeString = isTimeOnly
          ? f.value || "09:00"
          : validDate
          ? format(validDate, "HH:mm")
          : "09:00";

        return (
          <div className={styles.pickersBox}>
            {!isTimeOnly && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`${styles.datePickerBtn} ${
                      error ? styles.inputError : ""
                    }`}
                  >
                    <CalendarIcon size={16} className={styles.icon} />
                    {validDate ? (
                      format(validDate, "PPP")
                    ) : (
                      <span className={styles.placeholder}>Pick a date</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                  <Calendar
                    mode="single"
                    selected={validDate || undefined}
                    onSelect={handleDateSelect}
                  />
                </PopoverContent>
              </Popover>
            )}

            {(isDateTime || isTimeOnly) && (
              <Dropdown
                options={TIME_OPTIONS}
                value={currentTimeString}
                onChange={(val) => handleTimeSelect(val as string)}
                btnColor="transparent"
                maxHeight="250px"
              />
            )}
          </div>
        );
      }}
    />
  );
}
