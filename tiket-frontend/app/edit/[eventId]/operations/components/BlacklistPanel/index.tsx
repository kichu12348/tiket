"use client";

import { useEffect, useState } from "react";
import {
  Ban,
  ShieldCheck,
  Trash2,
  Plus,
  Mail,
  User,
  Globe,
  Loader2,
} from "lucide-react";
import {
  getBlacklist,
  createBlacklistEntry,
  deleteBlacklistEntry,
} from "@/api/commerce";
import type { BlacklistEntry } from "@/types/commerce";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";
import styles from "./BlacklistPanel.module.css";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface BlacklistPanelProps {
  eventId: string;
}

export default function BlacklistPanel({ eventId }: BlacklistPanelProps) {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [targetInput, setTargetInput] = useState("");
  const [scope, setScope] = useState<"event" | "organization">("event");
  const [reason, setReason] = useState("");
  const [cancelExisting, setCancelExisting] = useState(true);

  const reload = async () => {
    try {
      const data = await getBlacklist(eventId);
      setEntries(data);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to load blacklist entries.");
    }
  };

  useEffect(() => {
    let active = true;
    void getBlacklist(eventId)
      .then((data) => {
        if (active) {
          setEntries(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          toast.error(
            getErrorMessage(err) || "Failed to load blacklist entries.",
          );
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [eventId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = targetInput.trim();
    if (!trimmed) {
      toast.error("Please enter a User ID, email, or @domain.com pattern.");
      return;
    }

    const isUuid = UUID_REGEX.test(trimmed);

    try {
      setSubmitting(true);
      await createBlacklistEntry(eventId, {
        targetUserId: isUuid ? trimmed : undefined,
        pattern: isUuid ? undefined : trimmed,
        scope,
        reason: reason.trim() || undefined,
        cancelExistingTickets: cancelExisting,
      });

      toast.success(
        cancelExisting
          ? "Blacklist entry added and existing tickets cancelled."
          : "Blacklist entry added successfully.",
      );
      setTargetInput("");
      setReason("");
      await reload();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to add blacklist entry.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (blacklistId: string) => {
    try {
      setDeletingId(blacklistId);
      await deleteBlacklistEntry(eventId, blacklistId);
      toast.success("Entry removed from blacklist.");
      setEntries((prev) => prev.filter((item) => item.id !== blacklistId));
    } catch (err: unknown) {
      toast.error(
        getErrorMessage(err) || "Failed to remove blacklist entry.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.iconBox}>
            <Ban size={20} />
          </div>
          <div className={styles.headerText}>
            <h2 className={styles.cardTitle}>Attendee Blacklist</h2>
            <p className={styles.cardSubtitle}>
              Restrict specific user accounts, email addresses, or entire
              domains (e.g. @competitor.com) from registering or receiving ticket
              transfers.
            </p>
          </div>
        </div>
        <div className={styles.counterBadge}>
          <Ban size={13} />
          <span>{entries.length} Restricted</span>
        </div>
      </div>

      {/* Add Entry Form */}
      <form onSubmit={handleAdd} className={styles.formSection}>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>
              User ID, Email Address, or @domain.com
            </label>
            <input
              type="text"
              className={styles.input}
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder="e.g. user@domain.com, @spam.org, or UUID"
              disabled={submitting}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Restriction Scope</label>
            <select
              className={styles.select}
              value={scope}
              onChange={(e) =>
                setScope(e.target.value as "event" | "organization")
              }
              disabled={submitting}
            >
              <option value="event">This Event Only</option>
              <option value="organization">All Events (Organization)</option>
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Reason for Restriction (Optional)</label>
          <input
            type="text"
            className={styles.input}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Chargeback risk, abusive conduct, competitor"
            disabled={submitting}
          />
        </div>

        <div className={styles.formFooter}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={cancelExisting}
              onChange={(e) => setCancelExisting(e.target.checked)}
              disabled={submitting}
            />
            <span>Cancel existing active & pending tickets for this event</span>
          </label>

          <button
            type="submit"
            className={styles.addBtn}
            disabled={submitting || !targetInput.trim()}
          >
            {submitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Blocking...</span>
              </>
            ) : (
              <>
                <Plus size={15} />
                <span>Add Restriction</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Active Blacklist Entries */}
      {loading ? (
        <div className={styles.emptyState}>
          <Loader2 size={24} className="animate-spin text-muted" />
          <p className={styles.emptyDesc}>Loading blacklist entries...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className={styles.emptyState}>
          <ShieldCheck size={32} className={styles.emptyIcon} />
          <h4 className={styles.emptyTitle}>No Restrictions Active</h4>
          <p className={styles.emptyDesc}>
            No users, emails, or domains are currently restricted from this event.
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {entries.map((entry) => {
            const isDomain = entry.pattern?.startsWith("@");
            const isUser = Boolean(entry.targetUserId);

            return (
              <div key={entry.id} className={styles.item}>
                <div className={styles.itemLeft}>
                  <div className={styles.itemIcon}>
                    {isDomain ? (
                      <Globe size={16} />
                    ) : isUser ? (
                      <User size={16} />
                    ) : (
                      <Mail size={16} />
                    )}
                  </div>

                  <div className={styles.itemDetails}>
                    <div className={styles.patternRow}>
                      <span className={styles.patternText}>
                        {entry.user
                          ? `${entry.user.name} (${entry.user.email})`
                          : entry.pattern || entry.targetUserId}
                      </span>

                      <span
                        className={`${styles.scopeBadge} ${
                          entry.eventId
                            ? styles.scopeBadgeEvent
                            : styles.scopeBadgeOrg
                        }`}
                      >
                        {entry.eventId ? "This Event" : "Organization-Wide"}
                      </span>
                    </div>

                    <div className={styles.itemSub}>
                      {entry.reason && (
                        <>
                          <span className={styles.reasonText}>
                            &ldquo;{entry.reason}&rdquo;
                          </span>
                          <span className={styles.itemMetaDot}>&bull;</span>
                        </>
                      )}
                      <span>
                        Added {new Date(entry.createdAt).toLocaleDateString()}
                      </span>
                      {entry.targetUserId && (
                        <>
                          <span className={styles.itemMetaDot}>&bull;</span>
                          <span>ID: {entry.targetUserId.slice(0, 8)}...</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(entry.id)}
                  disabled={deletingId === entry.id}
                  title="Remove restriction"
                >
                  {deletingId === entry.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Trash2 size={15} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
