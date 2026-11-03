import React from "react";
import { User, Calendar, MapPin, Mail, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import type {
  TicketPassAttendee,
  TicketPassEvent,
  TicketFormResponseItem,
} from "@/types/ticket";
import { formatLocation } from "../../utils/formatLocation";
import styles from "./PassDetails.module.css";

interface PassDetailsProps {
  attendee: TicketPassAttendee;
  event: TicketPassEvent;
  responses?: TicketFormResponseItem[];
}

export function PassDetails({ attendee, event, responses }: PassDetailsProps) {
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

  const formattedLocation = formatLocation(
    event.locationType,
    event.locationDetails,
  );

  return (
    <div className={styles.detailsGrid}>
      <div className={styles.detailItem}>
        <div className={styles.labelRow}>
          <User size={12} className={styles.icon} />
          <span>Attendee</span>
        </div>
        <span className={styles.value}>{attendee.name}</span>
        {attendee.email && (
          <span
            className={styles.subValue}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              marginTop: "0.15rem",
              wordBreak: "break-all",
            }}
          >
            <Mail size={10} style={{ opacity: 0.7 }} />
            {attendee.email}
          </span>
        )}
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

      {responses && responses.length > 0 && (
        <div
          className={`${styles.detailItem} ${styles.fullWidth}`}
          data-testid="pass-custom-responses"
          style={{
            borderTop: "1px dashed var(--ticket-card-border-dashed, #e5e7eb)",
            paddingTop: "0.6rem",
            marginTop: "0.2rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.45rem",
          }}
        >
          <div className={styles.labelRow}>
            <ClipboardList size={12} className={styles.icon} />
            <span>Registration Details</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.4rem 0.6rem",
            }}
          >
            {responses.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.1rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.62rem",
                    color: "var(--ticket-card-text-muted, #6b7280)",
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </span>
                <span
                  className={styles.value}
                  style={{
                    fontSize: "0.76rem",
                    color: "var(--ticket-card-text-primary, #111827)",
                  }}
                >
                  {item.value || "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

