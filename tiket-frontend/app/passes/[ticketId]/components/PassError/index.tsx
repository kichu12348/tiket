import React from "react";
import { AlertCircle, Lock, KeyRound, HelpCircle } from "lucide-react";
import styles from "./PassError.module.css";

interface PassErrorProps {
  title?: string;
  message?: string;
  statusCode?: number;
}

export function PassError({ title, message, statusCode }: PassErrorProps) {
  const lowerMsg = (message || "").toLowerCase();

  const isForbidden =
    statusCode === 403 || lowerMsg.includes("permission") || lowerMsg.includes("forbidden");
  const isUnauthorized =
    statusCode === 401 || lowerMsg.includes("unauthorized");
  const isNotFound =
    statusCode === 404 || lowerMsg.includes("not found");

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

  return (
    <div className={styles.errorCard}>
      <div className={styles.iconWrapper}>
        <Icon size={24} />
      </div>
      <h2 className={styles.title}>{displayTitle}</h2>
      <p className={styles.description}>
        {message || "The ticket pass you are looking for is currently unavailable."}
      </p>
    </div>
  );
}
