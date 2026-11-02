import type { AuthenticatedUser } from "../../api/eventApi";
import styles from "./RegistrationCard.module.css";
import type { Event } from "@/types/event";
import type { Availability } from "@/types/commerce";
import {
  FaUserCheck,
  FaCog,
  FaClock,
  FaBan,
  FaTicketAlt,
} from "react-icons/fa";
import Link from "next/link";
import { formatFriendlyDate } from "../../utils/formatters";

interface RegistrationCardProps {
  event: Event;
  user: AuthenticatedUser | null;
  isAssociated?: boolean;
  availability?: Availability | null;
}

export default function RegistrationCard({
  event,
  user,
  isAssociated = false,
  availability,
}: RegistrationCardProps) {
  const now = new Date();
  const registrationStart = event.registrationStart
    ? new Date(event.registrationStart)
    : null;
  const registrationEnd = event.registrationEnd
    ? new Date(event.registrationEnd)
    : null;
  const eventEnd = event.endDate ? new Date(event.endDate) : null;

  const isNotStarted = Boolean(registrationStart && registrationStart > now);
  const isEnded = Boolean(
    (registrationEnd && registrationEnd <= now) ||
      (eventEnd && eventEnd <= now),
  );

  const isSoldOut =
    availability?.remaining !== null &&
    availability?.remaining !== undefined &&
    availability.remaining <= 0;

  const allTiersExhausted = Boolean(
    availability?.tiers &&
      availability.tiers.length > 0 &&
      availability.tiers.every(
        (t) => t.remaining !== null && t.remaining <= 0,
      ),
  );

  const effectiveSoldOut = isSoldOut || allTiersExhausted;
  const isOpen = !isNotStarted && !isEnded && !effectiveSoldOut;

  return (
    <div className={styles.registrationCard}>
      <div className={styles.regHeader}>
        {isAssociated ? "Event Dashboard" : "Registration"}
      </div>

      {isAssociated ? (
        <div className={styles.approvalBanner}>
          <div className={styles.approvalIconWrapper}>
            <FaCog size={18} />
          </div>
          <div className={styles.metaText}>
            <span className={styles.metaPrimary}>Host / Handler Access</span>
            <span className={styles.metaSecondary}>
              You are associated with this event team.
            </span>
          </div>
        </div>
      ) : isNotStarted ? (
        <div className={styles.approvalBanner}>
          <div className={styles.approvalIconWrapper}>
            <FaClock size={18} />
          </div>
          <div className={styles.metaText}>
            <span className={styles.metaPrimary}>Registration Not Started</span>
            <span className={styles.metaSecondary}>
              {event.registrationStart
                ? `Registration opens on ${formatFriendlyDate(event.registrationStart)}.`
                : "Registration is not open yet."}
            </span>
          </div>
        </div>
      ) : isEnded ? (
        <div className={styles.approvalBanner}>
          <div className={styles.approvalIconWrapper}>
            <FaBan size={18} />
          </div>
          <div className={styles.metaText}>
            <span className={styles.metaPrimary}>Registration Closed</span>
            <span className={styles.metaSecondary}>
              Registration for this event has ended.
            </span>
          </div>
        </div>
      ) : effectiveSoldOut ? (
        <div className={styles.approvalBanner}>
          <div className={styles.approvalIconWrapper}>
            <FaTicketAlt size={18} />
          </div>
          <div className={styles.metaText}>
            <span className={styles.metaPrimary}>Sold Out</span>
            <span className={styles.metaSecondary}>
              All available tickets for this event have been claimed.
            </span>
          </div>
        </div>
      ) : (
        event.requireApproval && (
          <div className={styles.approvalBanner}>
            <div className={styles.approvalIconWrapper}>
              <FaUserCheck size={18} />
            </div>
            <div className={styles.metaText}>
              <span className={styles.metaPrimary}>Approval Required</span>
              <span className={styles.metaSecondary}>
                Your registration is subject to host approval.
              </span>
            </div>
          </div>
        )
      )}

      <div className={styles.bottomSection}>
        {isAssociated ? (
          <>
            <div className={styles.welcomeText}>
              You are managing this event as a host or team handler.
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>
                {user?.name ? user?.name.charAt(0).toUpperCase() : ":)"}
              </div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{user?.name}</span>
                <span className={styles.userEmail}>{user?.email}</span>
              </div>
            </div>
            <Link
              href={`/edit/${event.id}/overview`}
              className={styles.joinBtn}
              style={{
                textAlign: "center",
              }}
            >
              Manage Event
            </Link>
          </>
        ) : !isOpen ? (
          <>
            <div className={styles.welcomeText}>
              {isNotStarted
                ? "Tickets are not yet available for purchase."
                : isEnded
                  ? "This event is no longer accepting new registrations."
                  : "All available tickets have been claimed."}
            </div>
            <button
              type="button"
              disabled
              className={styles.joinBtn}
              style={{
                textAlign: "center",
                opacity: 0.5,
                cursor: "not-allowed",
              }}
            >
              {isNotStarted
                ? "Registration Not Started"
                : isEnded
                  ? "Registration Closed"
                  : "Sold Out"}
            </button>
          </>
        ) : user ? (
          <>
            <div className={styles.welcomeText}>
              Welcome, {user?.name?.split(" ")[0] || "User"}! To join the event,
              please register below.
              {availability?.remaining !== null &&
                availability?.remaining !== undefined && (
                  <span
                    style={{
                      display: "block",
                      marginTop: "0.25rem",
                      fontSize: "0.85rem",
                      color: "rgba(255, 255, 255, 0.6)",
                    }}
                  >
                    {availability.remaining} spot
                    {availability.remaining === 1 ? "" : "s"} remaining
                  </span>
                )}
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>
                {user?.name ? user?.name.charAt(0).toUpperCase() : ":)"}
              </div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{user?.name}</span>
                <span className={styles.userEmail}>{user?.email}</span>
              </div>
            </div>
            <Link
              href={`/${event.slug}/form`}
              className={styles.joinBtn}
              style={{
                textAlign: "center",
              }}
            >
              {event.requireApproval ? "Request to Join" : "Register"}
            </Link>
          </>
        ) : (
          <>
            <div className={styles.welcomeText}>
              Please sign in or register to join this event.
              {availability?.remaining !== null &&
                availability?.remaining !== undefined && (
                  <span
                    style={{
                      display: "block",
                      marginTop: "0.25rem",
                      fontSize: "0.85rem",
                      color: "rgba(255, 255, 255, 0.6)",
                    }}
                  >
                    {availability.remaining} spot
                    {availability.remaining === 1 ? "" : "s"} remaining
                  </span>
                )}
            </div>
            <Link
              href={`/signin?redirect=/${event.slug}/form`}
              className={styles.joinBtn}
              style={{ textAlign: "center" }}
            >
              Sign In to Register
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
