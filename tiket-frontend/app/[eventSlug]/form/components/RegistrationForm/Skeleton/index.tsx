import styles from "./Skeleton.module.css";

export default function RegistrationFormSkeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonCard}>
        <div className={`${styles.skeletonLine} ${styles.skeletonLineTitle}`} />
        <div className={styles.skeletonTicketList}>
          {[0, 1].map((i) => (
            <div key={i} className={styles.skeletonTicketCard} />
          ))}
        </div>
      </div>

      <div className={styles.skeletonCard}>
        <div className={`${styles.skeletonLine} ${styles.skeletonLineTitle}`} />
        <div className={styles.skeletonFieldList}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.skeletonField}>
              <div className={`${styles.skeletonLine} ${styles.skeletonLineLabel}`} />
              <div className={styles.skeletonInput} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
