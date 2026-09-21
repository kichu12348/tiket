import styles from "./Skeleton.module.css";

export default function SkeletonList({ count = 2 }: { count: number }) {
  return (
    <div className={styles.timeline}>
      <section className={styles.group}>
        <div className={styles.dateHeader}>
          <span className={styles.dot} aria-hidden="true" />
          <div className={styles.skeletonDateLabel} />
          <div className={styles.skeletonWeekday} />
        </div>

        <div className={styles.cards}>
          {[...Array(count)].map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonInfo}>
                <div className={styles.skeletonLine}></div>
                <div className={`${styles.skeletonLine} ${styles.short}`}></div>
                
                <div className={styles.skeletonMetaGroup}>
                  <div className={styles.skeletonIconRow}>
                    <div className={styles.skeletonIcon}></div>
                    <div className={styles.skeletonIconText}></div>
                  </div>
                  <div className={styles.skeletonIconRow}>
                    <div className={styles.skeletonIcon}></div>
                    <div className={styles.skeletonIconText}></div>
                  </div>
                </div>
              </div>
              <div className={styles.imagePlaceholder}></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
