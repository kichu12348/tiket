import { usePathname } from "next/navigation";
import styles from "./SkeletonLoader.module.css";

export default function SkeletonLoader() {
  const pathname = usePathname();
  const isDetailsPage = pathname?.endsWith("/details");

  if (isDetailsPage) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={`${styles.skeleton} ${styles.backButton}`} />
        </div>
        <div className={styles.detailsContainer}>
          {/* Left Pane */}
          <div className={styles.leftPane}>
            <div className={`${styles.skeleton} ${styles.imageBlock}`} />
            <div className={`${styles.skeleton} ${styles.fontPickerBlock}`} />
            <div className={`${styles.skeleton} ${styles.fontPickerBlock}`} />
          </div>

          {/* Right Pane */}
          <div className={styles.rightPane}>
            <div className={styles.topToggles}>
              <div className={`${styles.skeleton} ${styles.toggleBlock}`} />
              <div className={`${styles.skeleton} ${styles.toggleBlock}`} />
            </div>
            <div className={`${styles.skeleton} ${styles.titleBlock}`} />

            <div className={`${styles.skeleton} ${styles.labelBlock}`} />
            <div className={`${styles.skeleton} ${styles.contentBlock}`} />

            <div className={`${styles.skeleton} ${styles.labelBlock}`} />
            <div className={`${styles.skeleton} ${styles.contentBlock}`} />

            <div className={`${styles.skeleton} ${styles.labelBlock}`} />
            <div className={`${styles.skeleton} ${styles.contentBlockLocation}`} />

            <div className={`${styles.skeleton} ${styles.labelBlock}`} />
            <div className={`${styles.skeleton} ${styles.contentBlockDescription}`} />

            <div className={`${styles.skeleton} ${styles.buttonBlock}`} />
          </div>
        </div>
      </div>
    );
  }

  // Default / Overview Skeleton
  return (
    <div className={styles.page}>
      <div className={styles.overviewHeader}>
        <div className={styles.headerLeft}>
          <div className={`${styles.skeleton} ${styles.overviewTitle}`} />
          <div className={`${styles.skeleton} ${styles.overviewBadge}`} />
        </div>
        <div className={styles.headerRight}>
          <div className={`${styles.skeleton} ${styles.overviewBtn}`} />
          <div className={`${styles.skeleton} ${styles.overviewBtn}`} />
        </div>
      </div>

      <div className={styles.card}>
        <div className={`${styles.skeleton} ${styles.cardHeader}`} />
        <div className={styles.recapGrid}>
          <div className={`${styles.skeleton} ${styles.recapItem}`} />
          <div className={`${styles.skeleton} ${styles.recapItem}`} />
          <div className={`${styles.skeleton} ${styles.recapItem}`} />
        </div>
      </div>

      <div className={styles.card}>
        <div className={`${styles.skeleton} ${styles.cardHeader}`} />
        <div className={`${styles.skeleton} ${styles.glanceStats}`} />
      </div>

      <div className={styles.card}>
        <div className={`${styles.skeleton} ${styles.cardHeader}`} />
        <div className={`${styles.skeleton} ${styles.emptyState}`} />
      </div>
    </div>
  );
}
