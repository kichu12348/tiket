import React from "react";
import styles from "./PassSkeleton.module.css";

export function PassSkeleton() {
  return (
    <div className={styles.skeletonCard} aria-busy="true" aria-label="Loading ticket pass">
      <div className={styles.mainSkeleton}>
        <div className={styles.headerSkeleton}>
          <div className={`${styles.badgeSkeleton} ${styles.shimmer}`} />
          <div className={`${styles.titleSkeleton} ${styles.shimmer}`} />
        </div>

        <div className={styles.gridSkeleton}>
          <div className={styles.itemSkeleton}>
            <div className={`${styles.labelSkeleton} ${styles.shimmer}`} />
            <div className={`${styles.valueSkeleton} ${styles.shimmer}`} />
          </div>
          <div className={styles.itemSkeleton}>
            <div className={`${styles.labelSkeleton} ${styles.shimmer}`} />
            <div className={`${styles.valueSkeleton} ${styles.shimmer}`} />
          </div>
          <div className={`${styles.itemSkeleton} ${styles.fullWidth}`}>
            <div className={`${styles.labelSkeleton} ${styles.shimmer}`} />
            <div className={`${styles.valueSkeleton} ${styles.shimmer}`} />
          </div>
        </div>
      </div>

      <div className={styles.perforationSkeleton} />

      <div className={styles.stubSkeleton}>
        <div className={`${styles.qrCodeBlock} ${styles.shimmer}`} />
        <div className={`${styles.subTextSkeleton} ${styles.shimmer}`} />
      </div>

      <div className={styles.tornEdge} />
    </div>
  );
}
