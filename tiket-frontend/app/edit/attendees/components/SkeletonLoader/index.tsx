import styles from "./SkeletonLoader.module.css";

export default function AttendeeSkeletonLoader() {
  return (
    <div className={styles.container}>
      {/* Header Skeleton */}
      <div className={styles.header}>
        <div className={styles.titleSkeleton} />
        <div className={styles.subtitleSkeleton} />
      </div>

      {/* Stats Cards Skeleton */}
      <div className={styles.statsGrid}>
        <div className={styles.statCardSkeleton} />
        <div className={styles.statCardSkeleton} />
        <div className={styles.statCardSkeleton} />
        <div className={styles.statCardSkeleton} />
      </div>

      {/* Filters Skeleton */}
      <div className={styles.filtersSkeleton}>
        <div className={styles.searchSkeleton} />
        <div className={styles.selectSkeleton} />
        <div className={styles.selectSkeleton} />
        <div className={styles.btnSkeleton} />
      </div>

      {/* Table Skeleton */}
      <div className={styles.tableCardSkeleton}>
        <div className={styles.rowSkeleton} />
        <div className={styles.rowSkeleton} />
        <div className={styles.rowSkeleton} />
        <div className={styles.rowSkeleton} />
        <div className={styles.rowSkeleton} />
      </div>
    </div>
  );
}
