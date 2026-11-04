"use client";

import { useState } from "react";
import type { MailConfig } from "@/types/commerce";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, ShieldCheck, Check, RotateCcw, AlertCircle } from "lucide-react";
import styles from "./MailConnection.module.css";

interface MailConnectionProps {
  custom: boolean;
  disabled: boolean;
  save: (config: MailConfig) => Promise<boolean>;
  reset: () => Promise<boolean>;
}

export default function MailConnection({
  custom,
  disabled,
  save,
  reset,
}: MailConnectionProps) {
  const [provider, setProvider] = useState<"brevo" | "smtp">("brevo");
  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const emailTrimmed = fromEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setError("Please provide a valid sender email address.");
      return;
    }
    if (fromName.trim().length > 120) {
      setError("Sender display name cannot exceed 120 characters.");
      return;
    }

    if (provider === "brevo") {
      if (!apiKey.trim()) {
        setError("Brevo API key is required.");
        return;
      }
    } else {
      const hostTrimmed = host.trim();
      if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(hostTrimmed)) {
        setError("SMTP host must be a valid domain (e.g. smtp.postmarkapp.com).");
        return;
      }
      const portNum = Number(port);
      if (![465, 587, 2525].includes(portNum)) {
        setError("SMTP port must be 465, 587, or 2525.");
        return;
      }
      if (!username.trim()) {
        setError("SMTP username is required.");
        return;
      }
      if (!password) {
        setError("SMTP password is required.");
        return;
      }
    }

    const config: MailConfig =
      provider === "brevo"
        ? {
            provider,
            apiKey: apiKey.trim(),
            fromEmail: emailTrimmed,
            fromName: fromName.trim() || undefined,
          }
        : {
            provider,
            host: host.trim(),
            port: Number(port),
            secure: port === "465",
            username: username.trim(),
            password,
            fromEmail: emailTrimmed,
            fromName: fromName.trim() || undefined,
          };

    try {
      setIsSubmitting(true);
      const success = await save(config);
      if (success) {
        setApiKey("");
        setPassword("");
        setError("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsResetting(true);
      await reset();
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.iconBox}>
            <Mail size={20} />
          </div>
          <div className={styles.headerText}>
            <h2 className={styles.title}>Email Delivery Service</h2>
            <p className={styles.subtitle}>
              Configure outbound transactional email delivery for ticket passes,
              confirmation receipts, and reminder notifications.
            </p>
          </div>
        </div>
        <div className={styles.statusBadge} data-custom={custom}>
          <span>
            {custom ? "Custom SMTP / Brevo" : "Platform Brevo Default"}
          </span>
        </div>
      </div>

      <div className={styles.infoBanner}>
        <ShieldCheck size={18} className={styles.infoIcon} />
        <div>
          <span>
            Your delivery connection applies globally across all events you
            organize. Credentials are encrypted on the server and never returned
            to the client.
          </span>
        </div>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Delivery Provider</label>
            <Select
              value={provider}
              onValueChange={(val) => {
                if (val === "brevo" || val === "smtp") {
                  setProvider(val);
                }
              }}
              disabled={disabled || isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brevo">Brevo (Recommended)</SelectItem>
                <SelectItem value="smtp">Custom SMTP Server</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Sender Email Address</label>
            <input
              type="email"
              required
              className={styles.input}
              placeholder="e.g. tickets@yourdomain.com"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              disabled={disabled || isSubmitting}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Sender Display Name</label>
            <input
              className={styles.input}
              placeholder="e.g. Tiket Events"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              disabled={disabled || isSubmitting}
            />
          </div>

          {provider === "brevo" ? (
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Brevo API Key</label>
              <input
                type="password"
                autoComplete="new-password"
                required
                className={styles.input}
                placeholder="xkeysib-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={disabled || isSubmitting}
              />
            </div>
          ) : (
            <>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>SMTP Host</label>
                <input
                  required
                  className={styles.input}
                  placeholder="e.g. smtp.postmarkapp.com"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  disabled={disabled || isSubmitting}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>SMTP Port</label>
                <Select
                  value={port}
                  onValueChange={setPort}
                  disabled={disabled || isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="587">587 · STARTTLS</SelectItem>
                    <SelectItem value="465">465 · TLS (SSL)</SelectItem>
                    <SelectItem value="2525">
                      2525 · Alternative STARTTLS
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>SMTP Username</label>
                <input
                  required
                  className={styles.input}
                  placeholder="Username / API login"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={disabled || isSubmitting}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>SMTP Password</label>
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  className={styles.input}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={disabled || isSubmitting}
                />
              </div>
            </>
          )}
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-1.5 text-red-400 text-xs py-1">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className={styles.actionsRow}>
          <button
            type="submit"
            className={styles.saveBtn}
            disabled={disabled || isSubmitting}
          >
            <Check size={16} />
            <span>{isSubmitting ? "Saving..." : "Save Connection"}</span>
          </button>

          {custom && (
            <button
              type="button"
              className={styles.resetBtn}
              disabled={disabled || isResetting}
              onClick={handleReset}
            >
              <RotateCcw size={15} />
              <span>
                {isResetting ? "Restoring..." : "Restore Platform Brevo"}
              </span>
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
