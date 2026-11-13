"use client";

import React, { useState, useMemo } from "react";
import { HexAlphaColorPicker, HexColorPicker } from "react-colorful";
import chroma from "chroma-js";
import { Pipette } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import styles from "./color-picker.module.css";

interface EyeDropperOpenOptions {
  signal?: AbortSignal;
}

interface EyeDropperResult {
  sRGBHex: string;
}

interface EyeDropperInstance {
  open: (options?: EyeDropperOpenOptions) => Promise<EyeDropperResult>;
}

interface EyeDropperConstructor {
  new (): EyeDropperInstance;
}

declare global {
  interface Window {
    EyeDropper?: EyeDropperConstructor;
  }
}

export interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  swatchTestId?: string;
  inputTestId?: string;
  dropperTestId?: string;
  placeholder?: string;
  allowAlpha?: boolean;
  disabled?: boolean;
  showDropper?: boolean;
}

const PRESET_COLORS = [
  "#ffffff",
  "#000000",
  "#64748b",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

function normalizeToHex(color: string, allowAlpha: boolean): string {
  if (!color || color === "transparent") {
    return allowAlpha ? "#00000000" : "#000000";
  }
  if (chroma.valid(color)) {
    try {
      const hex = chroma(color).hex();
      if (allowAlpha) {
        return hex.length === 7 ? `${hex}ff` : hex;
      }
      return hex.length > 7 ? hex.slice(0, 7) : hex;
    } catch {
      return allowAlpha ? "#000000ff" : "#000000";
    }
  }
  return allowAlpha ? "#000000ff" : "#000000";
}

export function ColorPicker({
  value,
  onChange,
  className,
  swatchTestId,
  inputTestId,
  dropperTestId,
  placeholder = "#000000",
  allowAlpha = true,
  disabled = false,
  showDropper = true,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [previousValue, setPreviousValue] = useState(value);
  const [inputValue, setInputValue] = useState(value || "");

  if (value !== previousValue) {
    setPreviousValue(value);
    setInputValue(value || "");
  }

  const pickerColor = useMemo(
    () => normalizeToHex(inputValue || value || "", allowAlpha),
    [inputValue, value, allowAlpha],
  );

  const displayColor = useMemo(() => {
    if (!value || value === "transparent" || value === "#00000000") {
      return "transparent";
    }
    if (chroma.valid(value)) {
      return value;
    }
    return "transparent";
  }, [value]);

  const isTransparent =
    !value ||
    value === "transparent" ||
    value.toLowerCase() === "#00000000" ||
    (value.startsWith("#") && value.length === 9 && value.endsWith("00"));

  const handlePickerChange = (newColor: string) => {
    let finalColor = newColor;
    if (allowAlpha && newColor.length === 9 && newColor.endsWith("ff")) {
      finalColor = newColor.slice(0, 7);
    }
    setInputValue(finalColor);
    onChange(finalColor);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
  };

  const handlePresetSelect = (preset: string) => {
    setInputValue(preset);
    onChange(preset);
  };

  const handleEyeDropper = async () => {
    if (typeof window === "undefined" || !window.EyeDropper) {
      toast.error(
        "EyeDropper is not supported in this browser. Please use a Chromium browser (Chrome or Edge).",
      );
      return;
    }

    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      if (result?.sRGBHex) {
        setInputValue(result.sRGBHex);
        onChange(result.sRGBHex);
      }
    } catch {
      // User cancelled sampling or pressed Escape
    }
  };

  return (
    <div className={cn(styles.colorPickerContainer, className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={styles.colorSwatchTrigger}
            data-testid={swatchTestId}
            aria-label="Pick color"
          >
            {/* Checkerboard layer for transparency */}
            <span className={styles.checkerboard} />
            {/* Actual color overlay */}
            <span
              className={styles.colorOverlay}
              style={{ backgroundColor: displayColor }}
            />
            {isTransparent && <span className={styles.transparentSlash} />}
          </button>
        </PopoverTrigger>

        <PopoverContent
          className={cn(styles.popoverContent, "scrollbar")}
          align="start"
          sideOffset={8}
        >
          {allowAlpha ? (
            <HexAlphaColorPicker
              color={pickerColor}
              onChange={handlePickerChange}
              className={styles.reactColorful}
            />
          ) : (
            <HexColorPicker
              color={pickerColor.slice(0, 7)}
              onChange={handlePickerChange}
              className={styles.reactColorful}
            />
          )}

          {/* Action Row: Dropper + Transparent */}
          <div className={styles.actionRow}>
            {showDropper && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleEyeDropper}
                className={styles.actionBtn}
                title="Pick color from template"
                data-testid={dropperTestId ? `${dropperTestId}-popover` : undefined}
              >
                <Pipette size={13} />
                <span>Dropper</span>
              </Button>
            )}

            {allowAlpha && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePresetSelect("transparent")}
                className={styles.actionBtn}
                title="Set transparent"
              >
                <span className={styles.checkerboardMini} />
                <span>Transparent</span>
              </Button>
            )}
          </div>

          {/* Preset Swatches */}
          <div className={styles.presetGrid}>
            {allowAlpha && (
              <button
                type="button"
                className={styles.presetSwatch}
                onClick={() => handlePresetSelect("transparent")}
                title="Transparent"
                aria-label="Preset transparent"
              >
                <span className={styles.checkerboardMini} />
                <span className={styles.transparentSlash} />
              </button>
            )}
            {PRESET_COLORS.map((preset) => (
              <button
                type="button"
                key={preset}
                className={styles.presetSwatch}
                style={{ backgroundColor: preset }}
                onClick={() => handlePresetSelect(preset)}
                title={preset}
                aria-label={`Preset ${preset}`}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={cn(
          "h-9 text-xs flex-1 font-mono uppercase rounded-[var(--radius-md)]",
          styles.colorInput,
        )}
        data-testid={inputTestId}
        disabled={disabled}
      />

      {showDropper && (
        <button
          type="button"
          onClick={handleEyeDropper}
          disabled={disabled}
          className={styles.dropperBtn}
          title="Pick color from template"
          data-testid={dropperTestId}
          aria-label="Pick color from template"
        >
          <Pipette size={15} />
        </button>
      )}
    </div>
  );
}

export default ColorPicker;
