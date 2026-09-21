import { AttendeePreviewProps } from "../types";
import styles from "./AttendeePreview.module.css";

export default function AttendeePreview({ user }: AttendeePreviewProps) {
  const initial = user.name ? user.name.charAt(0).toUpperCase() : "?";

  return (
    <div className={styles.attendeePreview}>
      <div className={styles.userAvatar}>{initial}</div>
      <div className={styles.userInfo}>
        <span className={styles.userName}>{user.name}</span>
        <span className={styles.userEmail}>{user.email}</span>
      </div>
    </div>
  );
}
