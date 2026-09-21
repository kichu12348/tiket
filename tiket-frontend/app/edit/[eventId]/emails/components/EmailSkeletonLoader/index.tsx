"use client";

import React from "react";
import styles from "./EmailSkeletonLoader.module.css";

export function TemplateSelectorSkeleton() {
  return (
    <div className={styles.selectorSkeleton}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`${styles.tabPillSkeleton} ${styles.skeletonPulse}`}
        />
      ))}
    </div>
  );
}

export function EmailEditorSkeleton() {
  return (
    <div className={styles.editorCardSkeleton}>
      {/* Top Bar */}
      <div className={styles.topBarSkeleton}>
        <div className={`${styles.titleBoxSkeleton} ${styles.skeletonPulse}`} />
        <div className={styles.deviceControlsSkeleton}>
          <div className={`${styles.controlPillSkeleton} ${styles.skeletonPulse}`} />
          <div className={`${styles.controlPillSkeleton} ${styles.skeletonPulse}`} />
          <div className={`${styles.controlPillSkeleton} ${styles.skeletonPulse}`} />
        </div>
      </div>

      {/* Subject Box */}
      <div className={styles.subjectBoxSkeleton}>
        <div className={`${styles.subjectLabelSkeleton} ${styles.skeletonPulse}`} />
        <div className={`${styles.subjectInputSkeleton} ${styles.skeletonPulse}`} />
      </div>

      {/* Body: Sidebar + Canvas */}
      <div className={styles.editorBodySkeleton}>
        <div className={styles.sidebarSkeleton}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={`${styles.sidebarItemSkeleton} ${styles.skeletonPulse}`}
            />
          ))}
        </div>
        <div className={styles.paperCanvasSkeleton}>
          <div className={`${styles.paperSheetSkeleton} ${styles.skeletonPulse}`} />
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footerSkeleton}>
        <div className={`${styles.footerBtnSkeleton} ${styles.skeletonPulse}`} />
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <div className={`${styles.footerBtnSkeleton} ${styles.skeletonPulse}`} />
          <div className={`${styles.footerBtnSkeleton} ${styles.skeletonPulse}`} />
        </div>
      </div>
    </div>
  );
}

export function EmailLogsSkeleton() {
  return (
    <div className={styles.logsCardSkeleton}>
      <div className={`${styles.logsHeaderSkeleton} ${styles.skeletonPulse}`} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className={`${styles.logRowSkeleton} ${styles.skeletonPulse}`}
        />
      ))}
    </div>
  );
}

export function EmailPageSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <TemplateSelectorSkeleton />
      <EmailEditorSkeleton />
      <EmailLogsSkeleton />
    </div>
  );
}
