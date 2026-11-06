"use client";

import React, { useEffect } from "react";
import { Palette, Bold, Italic, Underline } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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
    if (typeof document === "undefined" || process.env.NODE_ENV === "test") return;
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
              color: "var(--text-muted)",
            }}
          >
            Click any layer on the canvas or in the Layers list above to edit its
            properties.
          </p>
        </div>
      </div>
    );
  }

  const isQr = selectedLayer.type === "qr";
  const currentWidth = selectedLayer.width || (isQr ? selectedLayer.size : 320);
  const currentHeight = selectedLayer.height || (isQr ? selectedLayer.size : 80);

  const currentWeight = selectedLayer.fontWeight || "600";
  const isBold =
    currentWeight === "bold" || parseInt(currentWeight, 10) >= 700;
  const isItalic = selectedLayer.fontStyle === "italic";
  const isUnderline = selectedLayer.textDecoration === "underline";

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
              className="h-9 text-xs"
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
              className="h-9 text-xs"
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
              className="h-9 text-xs"
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
              className="h-9 text-xs"
              data-testid={isQr ? "input-qr-height" : "input-height"}
            />
          </div>
        </div>

        {/* QR Code Properties: Foreground & Background Color */}
        {isQr && (
          <>
            <div className={styles.formField}>
              <label className={styles.formLabel}>QR CODE COLOR</label>
              <div className={styles.colorPickerRow}>
                <input
                  type="color"
                  value={
                    selectedLayer.qrColor ||
                    selectedLayer.color ||
                    selectedLayer.fontColor ||
                    "#000000"
                  }
                  onChange={(e) =>
                    onUpdateLayer({
                      qrColor: e.target.value,
                      color: e.target.value,
                      fontColor: e.target.value,
                    })
                  }
                  className={styles.colorInputSwatch}
                  data-testid="input-qr-color-swatch"
                />
                <Input
                  type="text"
                  value={
                    selectedLayer.qrColor ||
                    selectedLayer.color ||
                    selectedLayer.fontColor ||
                    "#000000"
                  }
                  onChange={(e) =>
                    onUpdateLayer({
                      qrColor: e.target.value,
                      color: e.target.value,
                      fontColor: e.target.value,
                    })
                  }
                  className="h-9 text-xs flex-1 font-mono uppercase"
                  placeholder="#000000"
                  data-testid="input-qr-color"
                />
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>QR BACKGROUND COLOR</label>
              <div className={styles.colorPickerRow}>
                <input
                  type="color"
                  value={selectedLayer.qrBgColor || "#ffffff"}
                  onChange={(e) =>
                    onUpdateLayer({
                      qrBgColor: e.target.value,
                    })
                  }
                  className={styles.colorInputSwatch}
                  data-testid="input-qr-bg-color-swatch"
                />
                <Input
                  type="text"
                  value={selectedLayer.qrBgColor || "#ffffff"}
                  onChange={(e) =>
                    onUpdateLayer({
                      qrBgColor: e.target.value,
                    })
                  }
                  className="h-9 text-xs flex-1 font-mono uppercase"
                  placeholder="#ffffff"
                  data-testid="input-qr-bg-color"
                />
              </div>
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
                  className="h-9 text-xs flex-1"
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

            {/* Font Family */}
            <div className={styles.formField}>
              <label className={styles.formLabel}>FONT FAMILY</label>
              <Select
                value={selectedLayer.fontFamily || "'Inter', sans-serif"}
                onValueChange={(val) => onUpdateLayer({ fontFamily: val })}
              >
                <SelectTrigger
                  className="h-9 text-xs"
                  data-testid="select-font-family"
                >
                  <SelectValue placeholder="Select font family" />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map((f) => (
                    <SelectItem
                      key={f.value}
                      value={f.value}
                      style={{ fontFamily: f.value }}
                    >
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  className="h-9 text-xs"
                  data-testid="input-font-size"
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>FONT WEIGHT</label>
                <Select
                  value={selectedLayer.fontWeight || "600"}
                  onValueChange={(val) => onUpdateLayer({ fontWeight: val })}
                >
                  <SelectTrigger
                    className="h-9 text-xs"
                    data-testid="select-font-weight"
                  >
                    <SelectValue placeholder="Select weight" />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_WEIGHTS.map((w) => (
                      <SelectItem key={w.value} value={w.value}>
                        {w.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  className="h-9 text-xs"
                  data-testid="input-max-lines"
                />
              </div>
            </div>

            {/* Font Color */}
            <div className={styles.formField}>
              <label className={styles.formLabel}>FONT COLOR</label>
              <div className={styles.colorPickerRow}>
                <input
                  type="color"
                  value={selectedLayer.color || "#ffffff"}
                  onChange={(e) =>
                    onUpdateLayer({
                      color: e.target.value,
                      fontColor: e.target.value,
                    })
                  }
                  className={styles.colorInputSwatch}
                  data-testid="input-font-color-swatch"
                />
                <Input
                  type="text"
                  value={selectedLayer.color || "#ffffff"}
                  onChange={(e) =>
                    onUpdateLayer({
                      color: e.target.value,
                      fontColor: e.target.value,
                    })
                  }
                  className="h-9 text-xs flex-1 font-mono uppercase"
                  data-testid="input-font-color-hex"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
