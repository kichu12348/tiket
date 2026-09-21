import React from "react";
import styles from "./SkeletonLoader.module.css";
import pageStyles from "../../Forms.module.css";

export default function SkeletonLoader() {
  return (
    <div className={pageStyles.page}>
      {/* Header Skeleton */}
      <div className={pageStyles.header}>
        <div className={`${styles.skeleton} ${styles.titleBlock}`} />
        <div className={`${styles.skeleton} ${styles.subtitleBlock}`} />
      </div>

      {/* Personal Info Skeleton */}
      <div className={pageStyles.section}>
        <div className={styles.sectionHeader}>
          <div className={`${styles.skeleton} ${styles.iconBlock}`} />
          <div className={`${styles.skeleton} ${styles.sectionTitleBlock}`} />
        </div>
        <div className={styles.personalGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`${styles.skeleton} ${styles.standardCardBlock}`}
            />
          ))}
        </div>
      </div>

      {/* Custom Questions Skeleton */}
      <div className={pageStyles.section} style={{ marginTop: "1rem" }}>
        <div className={styles.sectionHeader}>
          <div className={`${styles.skeleton} ${styles.iconBlock}`} />
          <div className={`${styles.skeleton} ${styles.sectionTitleBlock}`} />
        </div>

        <div className={styles.pageTabs}>
          <div className={`${styles.skeleton} ${styles.tabBlock}`} />
          <div
            className={`${styles.skeleton} ${styles.tabBlock}`}
            style={{ width: "36px" }}
          />
        </div>

        <div className={styles.fieldsList}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`${styles.skeleton} ${styles.customCardBlock}`}
            />
          ))}
        </div>

        <div className={`${styles.skeleton} ${styles.addBtnBlock}`} />
      </div>
    </div>
  );
}
