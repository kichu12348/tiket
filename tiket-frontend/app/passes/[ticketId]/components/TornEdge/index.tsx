import React from "react";
import styles from "./TornEdge.module.css";

export function TornEdge() {
  return (
    <div className={styles.tornEdge}>
      <svg
        className={styles.tornSvg}
        width="100%"
        height="10"
        viewBox="0 0 310 10"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="torn-teeth-pattern"
            x="0"
            y="0"
            width="14"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <path d="M0 0 L7 10 L14 0 Z" fill="#ffffff" />
          </pattern>
        </defs>
        <rect width="100%" height="10" fill="url(#torn-teeth-pattern)" />
      </svg>
    </div>
  );
}
