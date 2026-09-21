import React from "react";
import { Download } from "lucide-react";
import styles from "./PassActions.module.css";

export function PassActions({
  handleDownload,
}: {
  handleDownload: () => void;
}) {
  return (
    <div className={styles.actionsRow}>
      <button
        type="button"
        onClick={handleDownload}
        className={styles.btnDownload}
      >
        <Download size={16} />
        <span>Download Pass</span>
      </button>
    </div>
  );
}
