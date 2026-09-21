import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import styles from "./TimezonePicker.module.css";
import { timezones } from "./timeZones.json";

const POPULAR_TIMEZONES = timezones.map((tz) => ({
  label: `${tz.name} - ${tz.id.split("/").pop()?.replace(/_/g, " ")}`,
  offset: `GMT${tz.utc_offset}`,
}));

interface TimezonePickerProps {
  value?: string;
  disabled?: boolean;
  onChange?: (tz: string) => void;
}

export default function TimezonePicker({
  value,
  disabled = false,
  onChange,
}: TimezonePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

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

  const filteredTz = POPULAR_TIMEZONES.filter(
    (tz) =>
      tz.label.toLowerCase().includes(search.toLowerCase()) ||
      tz.offset.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedTz =
    POPULAR_TIMEZONES.find((t) => t.offset === value) ||
    POPULAR_TIMEZONES.find((t) => t.offset === "GMT+05:30") ||
    POPULAR_TIMEZONES[0];

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.triggerBtn}
        onClick={() => disabled || setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <Globe
          size={16}
          style={{ color: "var(--color-text-secondary)", flexShrink: 0 }}
        />
        <div className={styles.tzInfo}>
          <span className={styles.tzText}>{selectedTz.offset}</span>
          <span className={styles.tzSub}>
            {selectedTz.label.split(" - ")[1]}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className={styles.popover}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search for a timezone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className={styles.scrollArea}>
            {filteredTz.map((tz, i) => (
              <button
                key={i}
                className={styles.tzItem}
                onClick={() => {
                  onChange?.(tz.offset);
                  setIsOpen(false);
                }}
              >
                <span className={styles.tzLabel}>{tz.label}</span>
                <span className={styles.tzOffset}>{tz.offset}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
