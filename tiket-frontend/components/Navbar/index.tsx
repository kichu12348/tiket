import Link from "next/link";
import styles from "./Navbar.module.css";

export default function Navbar({
  isAuthenticated,
  borderBottom,
}: {
  isAuthenticated?: boolean;
  borderBottom?: boolean;
}) {
  return (
    <header
      className={`${styles.header} ${borderBottom ? styles.borderBottom : ""}`}
    >
      <Link href="/" className={styles.logo}>
        Tiket<span className={styles.dot}>.</span>
      </Link>
      {isAuthenticated ? (
        <Link href="/home" className={styles.avatarBtn} aria-label="Go to Home">
          :)
        </Link>
      ) : (
        <Link href="/signin" className={styles.signInBtn}>
          Sign In
        </Link>
      )}
    </header>
  );
}
