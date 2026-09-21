import { Users, UserCheck, DollarSign, IndianRupee } from "lucide-react";
import { AttendeeStatsData } from "@/types/attendee";
import styles from "./AttendeeStats.module.css";

interface AttendeeStatsProps {
  stats: AttendeeStatsData | null;
  isLoading: boolean;
}

export default function AttendeeStats({
  stats,
  isLoading,
}: AttendeeStatsProps) {
  if (isLoading || !stats) {
    return null;
  }

  const checkInPercent =
    stats.totalAttendees > 0
      ? Math.round((stats.checkedInCount / stats.totalAttendees) * 100)
      : 0;

  return (
    <div className={styles.grid}>
      {/* Total Registered */}
      <div className={styles.card}>
        <div className={styles.cardInfo}>
          <span className={styles.label}>Total Registered</span>
          <div className={styles.valueRow}>
            <span className={styles.value}>{stats.totalAttendees}</span>
            <span className={styles.subtext}>Attendees</span>
          </div>
        </div>
        <div className={styles.iconWrapper}>
          <Users size={16} className={styles.icon} />
        </div>
      </div>

      {/* Checked In */}
      <div className={styles.card}>
        <div className={styles.cardInfo}>
          <span className={styles.label}>Checked In</span>
          <div className={styles.valueRow}>
            <span className={styles.value}>{stats.checkedInCount}</span>
            <span className={styles.percentBadge}>
              {checkInPercent}% checked in
            </span>
          </div>
        </div>
        <div className={styles.iconWrapperSuccess}>
          <UserCheck size={16} className={styles.iconSuccess} />
        </div>
      </div>

      {/* Total Revenue */}
      <div className={styles.card}>
        <div className={styles.cardInfo}>
          <span className={styles.label}>Total Revenue</span>
          <div className={styles.valueRow}>
            <span className={styles.value}>
              ₹
              {stats.totalRevenue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className={styles.subtext}>Gross Sales</span>
          </div>
        </div>
        <div className={styles.iconWrapper}>
          <IndianRupee size={16} className={styles.icon} />
        </div>
      </div>
    </div>
  );
}
