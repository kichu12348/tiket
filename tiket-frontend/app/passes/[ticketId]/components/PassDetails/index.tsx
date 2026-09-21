import React from "react";
import { User, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { TicketPassAttendee, TicketPassEvent } from "@/types/ticket";
import { formatLocation } from "../../utils/formatLocation";
import styles from "./PassDetails.module.css";

interface PassDetailsProps {
  attendee: TicketPassAttendee;
  event: TicketPassEvent;
}

export function PassDetails({ attendee, event }: PassDetailsProps) {
  const { dateString, timeString } = (() => {
    try {
      const d = new Date(event.startDate);
      return {
        dateString: format(d, "EEE, MMM d, yyyy"),
        timeString: format(d, "h:mm a"),
      };
    } catch {
      return { dateString: event.startDate, timeString: "" };
    }
  })();

  const formattedLocation = formatLocation(event.locationType, event.locationDetails);

  return (
    <div className={styles.detailsGrid}>
      <div className={styles.detailItem}>
        <div className={styles.labelRow}>
          <User size={12} className={styles.icon} />
          <span>Attendee</span>
        </div>
        <span className={styles.value}>{attendee.name}</span>
      </div>

      <div className={styles.detailItem}>
        <div className={styles.labelRow}>
          <Calendar size={12} className={styles.icon} />
          <span>Date & Time</span>
        </div>
        <div className={styles.dateTimeWrapper}>
          <span className={styles.value}>{dateString}</span>
          {timeString && <span className={styles.subValue}>{timeString}</span>}
        </div>
      </div>

      <div className={`${styles.detailItem} ${styles.fullWidth}`}>
        <div className={styles.labelRow}>
          <MapPin size={12} className={styles.icon} />
          <span>Location</span>
        </div>
        <span className={styles.value}>{formattedLocation}</span>
      </div>
    </div>
  );
}
