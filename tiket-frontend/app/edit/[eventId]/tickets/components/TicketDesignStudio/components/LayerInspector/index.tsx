"use client";

import React from "react";
import { Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { TicketDesignerLayer } from "../../types";
import type { FormField } from "@/types/form";
import TokenPicker from "../TokenPicker";
import styles from "./LayerInspector.module.css";

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
          <p style={{ fontSize: "0.75rem", marginTop: "0.25rem", color: "var(--text-muted)" }}>
            Click any layer on the canvas or in the Layers list above to edit its properties.
          </p>
        </div>
      </div>
    );
  }

  const isQr = selectedLayer.type === "qr";
  const currentWidth = selectedLayer.width || (isQr ? selectedLayer.size : 320);
  const currentHeight = selectedLayer.height || (isQr ? selectedLayer.size : 80);

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
                onUpdateLayer({
                  width: val,
                  ...(isQr ? { size: val, height: currentHeight } : {}),
                });
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
                onUpdateLayer({
                  height: val,
                  ...(isQr ? { size: val, width: currentWidth } : {}),
                });
              }}
              className="h-9 text-xs"
              data-testid={isQr ? "input-qr-height" : "input-height"}
            />
          </div>
        </div>

        {/* Text Layer Properties: text, font size, color */}
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
