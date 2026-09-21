import React, { useState, useRef, useEffect } from "react";
import { Pipette } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import styles from "./ColorPicker.module.css";
import { useDebounced } from "@/lib/clientUtils";
import { TRANSPARENT_BG } from "@/constants/util";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  bgRef?: React.RefObject<HTMLDivElement | null>;
  styleVar?: string;
  reset?: () => void;
}

const PRESET_COLORS = [
  "#f44336",
  "#e91e63",
  "#9c27b0",
  "#673ab7",
  "#3f51b5",
  "#2196f3",
  "#03a9f4",
  "#00bcd4",
  "#009688",
  "#4caf50",
  "#8bc34a",
  "#cddc39",
  "#ffeb3b",
  "#ffc107",
  "#ff9800",
  "#ff5722",
  "#795548",
  "#607d8b",
  "#000000",
  "#ffffff",
];

export default function ColorPicker({
  value,
  onChange,
  bgRef,
  styleVar,
  reset,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hexInput, setHexInput] = useState(value?.replace("#", "") || "000000");

  const debouncedOnChange = useDebounced(onChange, 500);

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

  // Sync internal hex input when value changes externally
  useEffect(() => {
    if (value && value.replace("#", "") !== hexInput) {
      setHexInput(value.replace("#", ""));
    }
  }, [value]);

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value.replace(/[^0-9A-Fa-f]/g, "");
    setHexInput(newHex);
    if (newHex.length === 6 || newHex.length === 3) {
      const color = `#${newHex}`;
      debouncedOnChange(color);
      if (bgRef?.current && styleVar) {
        bgRef.current.style.setProperty(styleVar, color);
      }
    }
  };

  const handleColorChange = (newColor: string) => {
    debouncedOnChange(newColor);
    setHexInput(newColor.replace("#", ""));
    if (bgRef?.current && styleVar) {
      bgRef.current.style.setProperty(styleVar, newColor);
    }
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.triggerBtn}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={styles.triggerInfo}>
          <div
            className={styles.colorPreview}
            style={{
              backgroundColor:
                value && value === TRANSPARENT_BG ? "transparent" : value,
            }}
          />
          <div className={styles.triggerLabel}>
            <span>Theme Color</span>
            <span>
              {value && value === TRANSPARENT_BG
                ? "transparent"
                : value || "Default"}
            </span>
          </div>
        </div>
        <Pipette size={16} className={styles.icon} />
      </button>

      {isOpen && (
        <div className={styles.popover}>
          <HexColorPicker
            color={
              value && value === TRANSPARENT_BG ? "#000000" : value || "#000000"
            }
            onChange={handleColorChange}
          />

          <div className={styles.hexRow}>
            <span className={styles.hexHash}>#</span>
            <input
              type="text"
              className={styles.hexInput}
              value={
                hexInput === TRANSPARENT_BG
                  ? "transparent"
                  : hexInput || "#000000"
              }
              onChange={handleHexInputChange}
              maxLength={6}
            />
          </div>

          <div className={styles.presets}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={styles.presetSwatch}
                style={{ backgroundColor: c }}
                onClick={() => handleColorChange(c)}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
          <button
            onClick={() => {
              handleColorChange(TRANSPARENT_BG);
              setHexInput(TRANSPARENT_BG);
            }}
            className={styles.resetBtn}
          >
            Transparent Background
          </button>
          {reset && (
            <button onClick={reset} className={styles.resetBtn}>
              Reset to Image Color
            </button>
          )}
        </div>
      )}
    </div>
  );
}
