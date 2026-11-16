"use client";

import Link from "next/link";
import styles from "./LandingHero.module.css";

export interface LandingHeroProps {
  isAuthenticated?: boolean;
}

export default function LandingHero({
  isAuthenticated = false,
}: LandingHeroProps) {
  return (
    <div className={styles.heroWrapper} data-testid="landing-hero">
      <h1 className={styles.title}>
        Events? Just <span className={styles.brandGradient}>start here</span>
      </h1>

      <p className={styles.subtitle}>
        Create, manage and run events with a ticketing platform that just works.
      </p>

      <div className={styles.ctaGroup}>
        <Link
          href={isAuthenticated ? "/create" : "/signin"}
          className={styles.primaryBtn}
        >
          Create event
        </Link>
      </div>
    </div>
  );
}
