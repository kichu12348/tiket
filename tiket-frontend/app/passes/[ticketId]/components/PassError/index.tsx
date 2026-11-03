import React from "react";
import Link from "next/link";
import { AlertCircle, Lock, KeyRound, HelpCircle, LogIn } from "lucide-react";
import styles from "./PassError.module.css";

interface PassErrorProps {
  title?: string;
  message?: string;
  statusCode?: number;
}

export function PassError({ title, message, statusCode }: PassErrorProps) {
  const lowerMsg = (message || "").toLowerCase();

  const isForbidden =
    statusCode === 403 ||
    lowerMsg.includes("permission") ||
    lowerMsg.includes("forbidden");
  const isUnauthorized =
    statusCode === 401 ||
    lowerMsg.includes("unauthorized") ||
    lowerMsg.includes("authentication") ||
    lowerMsg.includes("sign in");
  const isNotFound = statusCode === 404 || lowerMsg.includes("not found");

  const displayTitle =
    title ||
    (isForbidden
      ? "Access Restricted"
      : isUnauthorized
        ? "Authentication Required"
        : isNotFound
          ? "Ticket Not Found"
          : "Unable to Access Ticket");

  const Icon = isForbidden
    ? Lock
    : isUnauthorized
      ? KeyRound
      : isNotFound
        ? AlertCircle
        : HelpCircle;

  const redirectPath =
    typeof window !== "undefined"
      ? encodeURIComponent(window.location.pathname + window.location.search)
      : "";

  return (
    <div className={styles.errorCard} role="alert">
      <div className={styles.iconWrapper}>
        <Icon size={24} />
      </div>
      <h2 className={styles.title}>{displayTitle}</h2>
      <p className={styles.description}>
        {message ||
          (isUnauthorized
            ? "You must be signed in to view this ticket pass."
            : isForbidden
              ? "You do not have permission to view this ticket pass."
              : isNotFound
                ? "The ticket pass you are looking for does not exist or has been removed."
                : "The ticket pass you are looking for is currently unavailable.")}
      </p>

      {isUnauthorized && (
        <Link
          href={`/signin?redirect=${redirectPath}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            backgroundColor: "var(--btn-primary-bg, #ffffff)",
            color: "var(--btn-primary-text, #000000)",
            padding: "0.55rem 1.15rem",
            borderRadius: "var(--radius-md, 10px)",
            fontWeight: 600,
            fontSize: "0.88rem",
            textDecoration: "none",
            marginTop: "0.5rem",
            transition: "opacity 0.2s ease",
          }}
        >
          <LogIn size={16} />
          <span>Sign In to Tiket</span>
        </Link>
      )}
    </div>
  );
}

