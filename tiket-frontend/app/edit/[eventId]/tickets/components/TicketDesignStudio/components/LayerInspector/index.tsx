"use client";

import React, { useEffect } from "react";
import {
  Palette,
  Bold,
  Italic,
  Underline,
  ChevronDown,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ColorPicker } from "@/components/ui/color-picker";
import { cn } from "@/lib/utils";
import type { TicketDesignerLayer } from "../../types";
import type { FormField } from "@/types/form";
import TokenPicker from "../TokenPicker";
import styles from "./LayerInspector.module.css";

const FONT_FAMILIES = [
  { name: "Inter", value: "'Inter', sans-serif" },
  { name: "Playfair Display", value: "'Playfair Display', serif" },
  { name: "Space Grotesk", value: "'Space Grotesk', sans-serif" },
  { name: "Sora", value: "'Sora', sans-serif" },
  { name: "DM Serif Display", value: "'DM Serif Display', serif" },
  { name: "Outfit", value: "'Outfit', sans-serif" },
  { name: "Bricolage Grotesque", value: "'Bricolage Grotesque', sans-serif" },
  { name: "Libre Baskerville", value: "'Libre Baskerville', serif" },
  { name: "Space Mono", value: "'Space Mono', monospace" },
  { name: "Bebas Neue", value: "'Bebas Neue', sans-serif" },
  { name: "Arial", value: "Arial, sans-serif" },
  { name: "Times New Roman", value: "'Times New Roman', serif" },
  { name: "Courier New", value: "'Courier New', monospace" },
];

const FONT_WEIGHTS = [
  { label: "300 - Light", value: "300" },
  { label: "400 - Regular", value: "400" },
  { label: "500 - Medium", value: "500" },
  { label: "600 - Semibold", value: "600" },
  { label: "700 - Bold", value: "700" },
  { label: "800 - Extra Bold", value: "800" },
  { label: "900 - Black", value: "900" },
];

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Bricolage+Grotesque:wght@400;500;600;700&family=DM+Serif+Display&family=Inter:wght@300;400;500;600;700;800;900&family=Libre+Baskerville:wght@400;700&family=Outfit:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Sora:wght@400;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap";

interface LayerInspectorProps {
  selectedLayer: TicketDesignerLayer | null;
  formFields: FormField[];
  onUpdateLayer: (fields: Partial<TicketDesignerLayer>) => void;
}

export default function LayerInspector({
  selectedLayer,
  formFields,
  onUpdateLayer,
}: LayerInspectorProps) {
  useEffect(() => {
    if (typeof document === "undefined" || process.env.NODE_ENV === "test")
      return;
    try {
      if (document.querySelector(`link[href="${GOOGLE_FONTS_URL}"]`)) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = GOOGLE_FONTS_URL;
      document.head.appendChild(link);
    } catch {
      // Ignore stylesheet loading errors in non-browser/test environments
    }
  }, []);

  if (!selectedLayer) {
    return (
      <div className={styles.card}>
        <div className={styles.emptyInspector}>
          <Palette
            size={24}
            style={{ margin: "0 auto 0.5rem", opacity: 0.4 }}
          />
          <p style={{ fontSize: "0.85rem", fontWeight: 500 }}>
            No layer selected
          </p>
          <p
            style={{
              fontSize: "0.75rem",
              marginTop: "0.25rem",
              color: "var(--color-text-muted)",
            }}
          >
            Click any layer on the canvas or in the Layers list above to edit
            its properties.
          </p>
        </div>
      </div>
    );
  }

  const isQr = selectedLayer.type === "qr";
  const currentWidth = selectedLayer.width || (isQr ? selectedLayer.size : 320);
  const currentHeight =
    selectedLayer.height || (isQr ? selectedLayer.size : 80);

  const currentWeight = selectedLayer.fontWeight || "600";
  const isBold = currentWeight === "bold" || parseInt(currentWeight, 10) >= 700;
  const isItalic = selectedLayer.fontStyle === "italic";
  const isUnderline = selectedLayer.textDecoration === "underline";

  const selectedFontFamily = selectedLayer.fontFamily || "'Inter', sans-serif";
  const displayFontFamilyName =
    FONT_FAMILIES.find((f) => f.value === selectedFontFamily)?.name ||
    selectedFontFamily.replace(/['",]/g, "").split(" ")[0] ||
    "Inter";

  const selectedFontWeight = selectedLayer.fontWeight || "600";
  const displayFontWeightLabel =
    FONT_WEIGHTS.find((w) => w.value === selectedFontWeight)?.label ||
    selectedFontWeight;

  return (
    <div className={styles.card} data-testid="inspector-card">
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          INSPECTOR: {isQr ? "QR Code" : "Text Layer"}
        </span>
      </div>

      <div className={styles.inspectorForm}>
        {/* Coordinates: X and Y */}
        <div className={styles.grid2Col}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>X (px)</label>
            <Input
              type="number"
              value={selectedLayer.x}
              onChange={(e) =>
                onUpdateLayer({
                  x: parseInt(e.target.value, 10) || 0,
                })
              }
              className={cn(
                "h-9 text-xs rounded-[var(--radius-md)]",
                styles.inspectorInput,
              )}
              data-testid="input-x"
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Y (px)</label>
            <Input
              type="number"
              value={selectedLayer.y}
              onChange={(e) =>
                onUpdateLayer({
                  y: parseInt(e.target.value, 10) || 0,
                })
              }
              className={cn(
                "h-9 text-xs rounded-[var(--radius-md)]",
                styles.inspectorInput,
              )}
              data-testid="input-y"
            />
          </div>
        </div>

        {/* Dimensions: Width and Height */}
        <div className={styles.grid2Col}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>WIDTH (px)</label>
            <Input
              type="number"
              min="20"
              max="4000"
              value={currentWidth}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 20;
                onUpdateLayer(
                  isQr
                    ? { width: val, height: val, size: val }
                    : { width: val },
                );
              }}
              className={cn(
                "h-9 text-xs rounded-[var(--radius-md)]",
                styles.inspectorInput,
              )}
              data-testid={isQr ? "input-qr-width" : "input-width"}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>HEIGHT (px)</label>
            <Input
              type="number"
              min="20"
              max="2000"
              value={currentHeight}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 20;
                onUpdateLayer(
                  isQr
                    ? { width: val, height: val, size: val }
                    : { height: val },
                );
              }}
              className={cn(
                "h-9 text-xs rounded-[var(--radius-md)]",
                styles.inspectorInput,
              )}
              data-testid={isQr ? "input-qr-height" : "input-height"}
            />
          </div>
        </div>

        {/* QR Code Properties: Foreground & Background Color */}
        {isQr && (
          <>
            <div className={styles.formField}>
              <label className={styles.formLabel}>QR CODE COLOR</label>
              <ColorPicker
                value={
                  selectedLayer.qrColor ||
                  selectedLayer.color ||
                  selectedLayer.fontColor ||
                  "#000000"
                }
                onChange={(val) =>
                  onUpdateLayer({
                    qrColor: val,
                    color: val,
                    fontColor: val,
                  })
                }
                swatchTestId="input-qr-color-swatch"
                inputTestId="input-qr-color"
                dropperTestId="btn-qr-color-dropper"
                placeholder="#000000"
                allowAlpha
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>QR BACKGROUND COLOR</label>
              <ColorPicker
                value={selectedLayer.qrBgColor || "#ffffff"}
                onChange={(val) =>
                  onUpdateLayer({
                    qrBgColor: val,
                  })
                }
                swatchTestId="input-qr-bg-color-swatch"
                inputTestId="input-qr-bg-color"
                dropperTestId="btn-qr-bg-color-dropper"
                placeholder="#ffffff"
                allowAlpha
              />
            </div>
          </>
        )}

        {/* Text Layer Properties: text, font family, font size, weight, styles, color */}
        {!isQr && (
          <>
            <div className={styles.formField}>
              <label className={styles.formLabel}>TEXT / TOKEN</label>
              <div className={styles.tokenInputRow}>
                <Input
                  type="text"
                  value={selectedLayer.text || ""}
                  onChange={(e) =>
                    onUpdateLayer({
                      text: e.target.value,
                      tokenOrText: e.target.value,
                    })
                  }
                  className={cn(
                    "h-9 text-xs flex-1 rounded-[var(--radius-md)]",
                    styles.inspectorInput,
                  )}
                  placeholder="e.g. {{name}}"
                  data-testid="input-text-token"
                />

                <TokenPicker
                  formFields={formFields}
                  onSelectToken={(tokenFields) => {
                    const token = tokenFields.tokenOrText;
                    if (token) {
                      onUpdateLayer({
                        text: token,
                        tokenOrText: token,
                      });
                    }
                  }}
                />
              </div>
            </div>

            {/* Font Family Dropdown */}
            <div className={styles.formField}>
              <label className={styles.formLabel}>FONT FAMILY</label>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={styles.dropdownTrigger}
                    data-testid="select-font-family"
                  >
                    <span
                      className={styles.dropdownValue}
                      style={{ fontFamily: selectedFontFamily }}
                    >
                      {displayFontFamilyName}
                    </span>
                    <ChevronDown size={14} className={styles.dropdownChevron} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className={cn(styles.dropdownContent, "scrollbar")}
                  align="start"
                >
                  {FONT_FAMILIES.map((f) => {
                    const isSelected = selectedFontFamily === f.value;
                    return (
                      <DropdownMenuItem
                        key={f.value}
                        onSelect={() => onUpdateLayer({ fontFamily: f.value })}
                        onClick={() => onUpdateLayer({ fontFamily: f.value })}
                        className={cn(
                          styles.dropdownItem,
                          isSelected && styles.dropdownItemSelected,
                        )}
                        style={{ fontFamily: f.value }}
                      >
                        <span>{f.name}</span>
                        {isSelected && (
                          <Check size={14} className={styles.itemCheckIcon} />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Font Size & Font Weight */}
            <div className={styles.grid2Col}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>FONT SIZE (px)</label>
                <Input
                  type="number"
                  min="8"
                  max="300"
                  value={selectedLayer.size}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 16;
                    onUpdateLayer({
                      size: val,
                      fontSize: val,
                    });
                  }}
                  className={cn(
                    "h-9 text-xs rounded-[var(--radius-md)]",
                    styles.inspectorInput,
                  )}
                  data-testid="input-font-size"
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>FONT WEIGHT</label>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={styles.dropdownTrigger}
                      data-testid="select-font-weight"
                    >
                      <span className={styles.dropdownValue}>
                        {displayFontWeightLabel?.split("-")[1]?.trim() ||
                          displayFontWeightLabel}
                      </span>
                      <ChevronDown
                        size={14}
                        className={styles.dropdownChevron}
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className={cn(styles.dropdownContent, "scrollbar")}
                    align="start"
                  >
                    {FONT_WEIGHTS.map((w) => {
                      const isSelected = selectedFontWeight === w.value;
                      return (
                        <DropdownMenuItem
                          key={w.value}
                          onSelect={() =>
                            onUpdateLayer({ fontWeight: w.value })
                          }
                          onClick={() => onUpdateLayer({ fontWeight: w.value })}
                          className={cn(
                            styles.dropdownItem,
                            isSelected && styles.dropdownItemSelected,
                          )}
                        >
                          <span>{w.label}</span>
                          {isSelected && (
                            <Check size={14} className={styles.itemCheckIcon} />
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Style (Bold, Italic, Underline) & Max Lines */}
            <div className={styles.grid2Col}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>STYLE</label>
                <div className={styles.formatToolbar}>
                  <button
                    type="button"
                    className={`${styles.formatBtn} ${isBold ? styles.formatBtnActive : ""}`}
                    onClick={() =>
                      onUpdateLayer({
                        fontWeight: isBold ? "400" : "700",
                      })
                    }
                    title="Bold"
                    data-testid="btn-format-bold"
                  >
                    <Bold size={15} />
                  </button>

                  <button
                    type="button"
                    className={`${styles.formatBtn} ${isItalic ? styles.formatBtnActive : ""}`}
                    onClick={() =>
                      onUpdateLayer({
                        fontStyle: isItalic ? "normal" : "italic",
                      })
                    }
                    title="Italic"
                    data-testid="btn-format-italic"
                  >
                    <Italic size={15} />
                  </button>

                  <button
                    type="button"
                    className={`${styles.formatBtn} ${isUnderline ? styles.formatBtnActive : ""}`}
                    onClick={() =>
                      onUpdateLayer({
                        textDecoration: isUnderline ? "none" : "underline",
                      })
                    }
                    title="Underline"
                    data-testid="btn-format-underline"
                  >
                    <Underline size={15} />
                  </button>
                </div>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>MAX LINES</label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={selectedLayer.maxLines || 1}
                  onChange={(e) =>
                    onUpdateLayer({
                      maxLines: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className={cn(
                    "h-9 text-xs rounded-[var(--radius-md)]",
                    styles.inspectorInput,
                  )}
                  data-testid="input-max-lines"
                />
              </div>
            </div>

            {/* Font Color */}
            <div className={styles.formField}>
              <label className={styles.formLabel}>FONT COLOR</label>
              <ColorPicker
                value={selectedLayer.color || "#ffffff"}
                onChange={(val) =>
                  onUpdateLayer({
                    color: val,
                    fontColor: val,
                  })
                }
                swatchTestId="input-font-color-swatch"
                inputTestId="input-font-color-hex"
                dropperTestId="btn-font-color-dropper"
                placeholder="#ffffff"
                allowAlpha
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
