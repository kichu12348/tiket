import { Link } from "@tanstack/react-router";
import styles from "./Navbar.module.css";

export default function Navbar({
  isAuthenticated,
  borderBottom,
  onSignOut,
  user,
  noHorizontalPadding = false,
}: {
  isAuthenticated?: boolean;
  borderBottom?: boolean;
  onSignOut?: () => void | Promise<void>;
  user?: { name?: string; avatarUrl?: string | null } | null;
  noHorizontalPadding?: boolean;
}) {
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : ":)";

  console.log(user);

  return (
    <header
      className={`${styles.header} ${borderBottom ? styles.borderBottom : ""} ${noHorizontalPadding ? styles.headerNoPadding : ""}`}
    >
      <Link to="/" className={styles.logo}>
        Tiket<span className={styles.dot}>.</span>
      </Link>

      {isAuthenticated ? (
        <div className={styles.authContainer}>
          <Link
            to="/home"
            className={styles.avatarBtn}
            aria-label="Go to Home"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name || "User avatar"}
                referrerPolicy="no-referrer"
                className={styles.avatarImg}
              />
            ) : (
              <span>{initials}</span>
            )}
          </Link>
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className={styles.signInBtn}
            >
              Sign out
            </button>
          )}
        </div>
      ) : (
        <Link to="/signin" className={styles.signInBtn}>
          Sign In
        </Link>
      )}
    </header>
  );
}
