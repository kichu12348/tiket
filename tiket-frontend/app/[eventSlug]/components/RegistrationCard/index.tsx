import styles from "./RegistrationCard.module.css";
import { Event } from "@/types/event";
import { FaUserCheck, FaCog } from "react-icons/fa";
import Link from "next/link";

interface RegistrationCardProps {
  event: Event;
  user: any;
  isAssociated?: boolean;
}

export default function RegistrationCard({
  event,
  user,
  isAssociated = false,
}: RegistrationCardProps) {
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
                {user.name ? user.name.charAt(0).toUpperCase() : ":)"}
              </div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{user.name}</span>
                <span className={styles.userEmail}>{user.email}</span>
              </div>
            </div>
            <Link
              href={`/edit/${event.id}`}
              className={styles.joinBtn}
              style={{
                textAlign: "center",
              }}
            >
              Manage Event
            </Link>
          </>
        ) : user ? (
          <>
            <div className={styles.welcomeText}>
              Welcome, {user.name?.split(" ")[0] || "User"}! To join the event,
              please register below.
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>
                {user.name ? user.name.charAt(0).toUpperCase() : ":)"}
              </div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{user.name}</span>
                <span className={styles.userEmail}>{user.email}</span>
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
            </div>
            <Link href="/signin" className={styles.joinBtn} style={{ textAlign: "center" }}>
              Sign In to Register
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
