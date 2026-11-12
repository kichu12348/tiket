import styles from "./MatchCombinator.module.css";
import type { MatchCombinatorProps } from "../../types";

export default function MatchCombinator({
  match,
  onChange,
}: MatchCombinatorProps) {
  return (
    <div className={styles.matchBar}>
      <span className={styles.matchLabel}>Match:</span>
      <div className={styles.matchPillGroup}>
        <button
          type="button"
          className={`${styles.matchPill} ${
            match === "all" ? styles.matchPillActive : ""
          }`}
          onClick={() => onChange("all")}
        >
          AND (All rules)
        </button>
        <button
          type="button"
          className={`${styles.matchPill} ${
            match === "any" ? styles.matchPillActive : ""
          }`}
          onClick={() => onChange("any")}
        >
          OR (Any rule)
        </button>
      </div>
    </div>
  );
}

