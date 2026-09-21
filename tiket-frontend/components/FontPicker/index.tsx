import { useEffect } from "react";
import { Check } from "lucide-react";
import Dropdown from "../Dropdown";
import styles from "./FontPicker.module.css";

interface FontOption {
  name: string;
  family: string;
}

const FONT_OPTIONS: FontOption[] = [
  { name: "Inter", family: "'Inter', sans-serif" },
  { name: "Playfair Display", family: "'Playfair Display', serif" },
  { name: "Space Grotesk", family: "'Space Grotesk', sans-serif" },
  { name: "Sora", family: "'Sora', sans-serif" },
  { name: "DM Serif Display", family: "'DM Serif Display', serif" },
  { name: "Outfit", family: "'Outfit', sans-serif" },
  { name: "Bricolage Grotesque", family: "'Bricolage Grotesque', sans-serif" },
  { name: "Libre Baskerville", family: "'Libre Baskerville', serif" },
  { name: "Space Mono", family: "'Space Mono', monospace" },
  { name: "Bebas Neue", family: "'Bebas Neue', sans-serif" },
];

const DROPDOWN_OPTIONS = FONT_OPTIONS.map((f) => ({
  label: f.name,
  value: f.family,
}));

// Build a Google Fonts URL to preload all the fonts
const GOOGLE_FONTS_URL = `https://fonts.googleapis.com/css2?${FONT_OPTIONS.map(
  (f) => `family=${f.name.replace(/ /g, "+")}:wght@400;500;600;700`,
).join("&")}&display=swap`;

interface FontPickerProps {
  value: string;
  onChange: (family: string) => void;
}

export default function FontPicker({ value, onChange }: FontPickerProps) {
  // Load Google Fonts stylesheet once
  useEffect(() => {
    if (document.querySelector(`link[href="${GOOGLE_FONTS_URL}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_URL;
    document.head.appendChild(link);
  }, []);

  const selectedFont =
    FONT_OPTIONS.find((f) => f.family === value) || FONT_OPTIONS[0];

  return (
    <Dropdown
      options={DROPDOWN_OPTIONS}
      value={value}
      onChange={onChange}
      popoverPosition="top"
      maxHeight="320px"
      width="100%"
      btnWidth="100%"
      renderTriggerContent={() => (
        <div className={styles.triggerInfo}>
          <span
            className={styles.fontPreview}
            style={{ fontFamily: selectedFont.family }}
          >
            Aa
          </span>
          <div className={styles.triggerLabel}>
            <span>Font</span>
            <span>{selectedFont.name}</span>
          </div>
        </div>
      )}
      renderOption={(option, isSelected) => (
        <>
          <span style={{ fontFamily: option.value, flex: 1 }}>
            {option.label}
          </span>
          {isSelected && (
            <Check
              size={14}
              style={{ color: "rgba(255,255,255,0.5)", flexShrink: 0 }}
            />
          )}
        </>
      )}
    />
  );
}
