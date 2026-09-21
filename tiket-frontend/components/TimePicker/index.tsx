import { useState, useRef, useEffect } from "react";
import styles from "./TimePicker.module.css";

interface TimePickerProps {
  date: string; // ISO string
  onChange: (date: string) => void;
}

export default function TimePicker({ date, onChange }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = date ? new Date(date) : new Date();

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

  const formattedLabel = selectedDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Find index of currently selected time (roughly)
  const selectedHour = selectedDate.getHours();
  const selectedMinute = selectedDate.getMinutes() < 30 ? 0 : 30;

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.triggerBtn}
        onClick={() => setIsOpen(!isOpen)}
      >
        {formattedLabel}
      </button>

      {isOpen && (
        <div className={styles.popover}>
          <div className={styles.scrollArea}>
            {times.map((t, i) => {
              const isSelected = t.h === selectedHour && t.m === selectedMinute;
              return (
                <button
                  key={i}
                  className={`${styles.timeItem} ${isSelected ? styles.selectedItem : ""}`}
                  onClick={() => handleSelect(t.h, t.m)}
                >
                  {t.timeStr}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
