import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = date ? new Date(date) : null;
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Disable going back before the current month
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
    if (isBefore(day, startOfDay(new Date()))) return; // Prevent selecting past dates

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
      const isPast = isBefore(day, today);
      const isSelected = selectedDate && isSameDay(day, selectedDate);
      const isCurrentMonth = isSameMonth(day, monthStart);
      const cloneDay = day;

      let btnClass = styles.dayBtn;
      if (!isCurrentMonth) {
        btnClass += ` ${styles.dayDimmed}`;
      } else if (isPast) {
        btnClass += ` ${styles.dayDimmed}`;
      } else if (isSelected) {
        btnClass += ` ${styles.daySelected}`;
      }

      days.push(
        <button
          key={day.toString()}
          className={btnClass}
          onClick={() =>
            !isPast && isCurrentMonth && handleSelectDate(cloneDay)
          }
          disabled={isPast || !isCurrentMonth}
        >
          {format(day, dateFormat)}
        </button>,
      );
      day = addDays(day, 1);
    }

    // Always render 42 grid items so popup height doesn't shift
    while (days.length < 42) {
      days.push(
        <button
          key={day.toString()}
          className={`${styles.dayBtn} ${styles.dayDimmed}`}
          disabled
        >
          {format(day, dateFormat)}
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
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.triggerBtn}
        onClick={() => setIsOpen(!isOpen)}
      >
        {formatDateLabel()}
      </button>

      {isOpen && (
        <div className={styles.popover}>
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
              <button onClick={handlePrevMonth} className={styles.navBtn}>
                <ChevronLeft size={16} />
              </button>
              <button
                className={styles.dot}
                onClick={bringToCurrentDay}
              ></button>
              <button onClick={handleNextMonth} className={styles.navBtn}>
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
        </div>
      )}
    </div>
  );
}
