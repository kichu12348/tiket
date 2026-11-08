"use client";

import React from "react";
import { Plus, QrCode, Type, Trash2 } from "lucide-react";
import type { TicketDesignerLayer } from "../../types";
import styles from "./LayersList.module.css";

interface LayersListProps {
  layers: TicketDesignerLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onAddTextLayer: () => void;
  onAddQrLayer: () => void;
  onDeleteLayer: (id: string, e?: React.MouseEvent) => void;
}

export default function LayersList({
  layers,
  selectedLayerId,
  onSelectLayer,
  onAddTextLayer,
  onAddQrLayer,
  onDeleteLayer,
}: LayersListProps) {
  const hasQrLayer = layers.some((l) => l.type === "qr");

  return (
    <div className={styles.card} data-testid="layers-card">
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>LAYERS</span>
        <div className={styles.cardActions}>
          <button
            type="button"
            className={styles.cardActionBtn}
            onClick={onAddTextLayer}
            data-testid="add-text-layer-btn"
          >
            <Plus size={13} />
            <span>Text</span>
          </button>
          <button
            type="button"
            className={styles.cardActionBtn}
            onClick={onAddQrLayer}
            disabled={hasQrLayer}
            title={hasQrLayer ? "Only one QR code layer allowed" : "Add QR"}
            data-testid="add-qr-layer-btn"
          >
            <Plus size={13} />
            <span>QR</span>
          </button>
        </div>
      </div>

      <div className={`${styles.layersList} scrollbar`}>
        {layers.length === 0 ? (
          <div className={styles.emptyLayers}>
            No layers added yet. Click <strong>+ Text</strong> or{" "}
            <strong>+ QR</strong> above.
          </div>
        ) : (
          layers.map((l) => {
            const isActive = selectedLayerId === l.id;
            const isQr = l.type === "qr";
            const title = isQr ? "QR Code" : l.text || "Text";
            const subtitle = isQr ? `QR • ${l.size}px` : `Text • ${l.size}px`;

            return (
              <div
                key={l.id}
                className={`${styles.layerRow} ${isActive ? styles.layerRowActive : ""}`}
                onClick={() => onSelectLayer(l.id)}
                data-testid={`layer-row-${l.id}`}
              >
                <div className={styles.layerRowInfo}>
                  <div className={styles.layerRowIcon}>
                    {isQr ? <QrCode size={15} /> : <Type size={15} />}
                  </div>
                  <div className={styles.layerRowText}>
                    <span className={styles.layerRowName}>{title}</span>
                    <span className={styles.layerRowSubtitle}>{subtitle}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.layerDeleteBtn}
                  onClick={(e) => onDeleteLayer(l.id, e)}
                  title="Delete layer"
                  data-testid={`delete-layer-${l.id}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
