import styles from "./EmptyNotice.module.css";

export default function EmptyNotice() {
  return (
    <div className={styles.emptyNotice}>
      No form questions created yet. Create a form question first to base
      conditions on it.
    </div>
  );
}

