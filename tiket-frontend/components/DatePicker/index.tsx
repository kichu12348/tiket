import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import styles from "./DatePicker.module.css";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isBefore,
  startOfDay,
  isSameMonth,
  isSameDay,
  addDays,
  setHours,
  setMinutes,
} from "date-fns";

interface DatePickerProps {
  date: string;
  onChange: (date: string) => void;
}

const DAYS_OF_WEEK = ["S", "M", "T", "W", "T", "F", "S"];

export default function DatePicker({ date, onChange }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedDate = date ? new Date(date) : null;
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      isSameMonth(viewDate, new Date()) ||
      isBefore(viewDate, startOfMonth(new Date()))
    ) {
      return;
    }
    setViewDate(subMonths(viewDate, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(addMonths(viewDate, 1));
  };

  const bringToCurrentDay = () => {
    setViewDate(new Date());
  };

  const handleSelectDate = (day: Date) => {
    if (isBefore(day, startOfDay(new Date()))) return;

    let newDate = day;
    if (selectedDate) {
      newDate = setHours(newDate, selectedDate.getHours());
      newDate = setMinutes(newDate, selectedDate.getMinutes());
    } else {
      const now = new Date();
      newDate = setHours(newDate, now.getHours());
      newDate = setMinutes(newDate, now.getMinutes());
    }
    onChange(newDate.toISOString());
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const days = [];
    let day = startDate;

    const today = startOfDay(new Date());

    while (day <= endDate) {
      const currentDay = day;
      const isPast = isBefore(currentDay, today);
      const isSelected = selectedDate && isSameDay(currentDay, selectedDate);
      const isCurrentMonth = isSameMonth(currentDay, monthStart);

      days.push(
        <button
          key={currentDay.toISOString()}
          type="button"
          onClick={() => handleSelectDate(currentDay)}
          disabled={isPast}
          className={`${styles.dayBtn} ${
            !isCurrentMonth ? styles.dayDimmed : ""
          } ${isSelected ? styles.daySelected : ""} ${
            isSameDay(currentDay, today) ? styles.dayToday : ""
          }`}
        >
          {format(currentDay, dateFormat)}
        </button>,
      );
      day = addDays(day, 1);
    }

    return days;
  };

  const formatDateLabel = () => {
    if (!selectedDate) return "Select date";
    if (selectedDate.getFullYear() !== new Date().getFullYear()) {
      return format(selectedDate, "dd/MM/yyyy");
    }
    return format(selectedDate, "E, MMM d");
  };

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={styles.triggerBtn}
          data-empty={!selectedDate}
        >
          {formatDateLabel()}
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className={styles.popover}
          align="start"
          side="bottom"
          sideOffset={6}
        >
          <div className={styles.header}>
            <span className={styles.monthLabel}>
              {format(viewDate, "MMMM")}
              {viewDate.getFullYear() !== new Date().getFullYear() && (
                <span style={{ opacity: 0.7, fontWeight: "500" }}>
                  {" "}
                  {format(viewDate, "yyyy")}
                </span>
              )}
            </span>
            <div className={styles.navBtns}>
              <button
                type="button"
                onClick={handlePrevMonth}
                className={styles.navBtn}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className={styles.dot}
                onClick={bringToCurrentDay}
              ></button>
              <button
                type="button"
                onClick={handleNextMonth}
                className={styles.navBtn}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className={styles.weekdays}>
            {DAYS_OF_WEEK.map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>

          <div className={styles.grid}>{renderCalendar()}</div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
