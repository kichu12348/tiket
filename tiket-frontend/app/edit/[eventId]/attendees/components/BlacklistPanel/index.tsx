"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Search,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getBlacklist,
  addBlacklistEntry,
  removeBlacklistEntry,
} from "@/api/commerce";
import type { BlacklistEntry } from "@/types/commerce";
import { getErrorMessage } from "@/lib/errors";
import AddBlacklistModal, {
  type AddBlacklistPayload,
} from "./components/AddBlacklistModal";
import { formatBlockedDate } from "./functions/blacklistHelpers";
import styles from "./BlacklistPanel.module.css";

interface BlacklistPanelProps {
  eventId: string;
}

export default function BlacklistPanel({ eventId }: BlacklistPanelProps) {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    let isCancelled = false;
    getBlacklist(eventId)
      .then((data) => {
        if (!isCancelled) {
          setEntries(Array.isArray(data) ? data : []);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          const msg =
            getErrorMessage(err) || "Failed to load blacklist entries.";
          setError(msg);
          toast.error(msg);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [eventId]);

  const handleAddEntry = async (payload: AddBlacklistPayload) => {
    try {
      setIsSubmitting(true);
      const newEntry = await addBlacklistEntry(eventId, {
        pattern: payload.pattern,
        reason: payload.reason,
        scope: payload.scope,
        cancelExistingTickets: payload.cancelExistingTickets,
      });

      setEntries((prev) => [newEntry, ...prev]);
      setIsModalOpen(false);
      toast.success(
        payload.cancelExistingTickets
          ? `Pattern '${payload.pattern}' blocked and existing tickets cancelled.`
          : `Pattern '${payload.pattern}' added to blacklist.`,
      );
    } catch (err: unknown) {
      toast.error(
        getErrorMessage(err) || "Failed to add blacklist entry. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveEntry = async (blacklistId: string, pattern?: string | null) => {
    try {
      setDeletingId(blacklistId);
      await removeBlacklistEntry(eventId, blacklistId);
      setEntries((prev) => prev.filter((item) => item.id !== blacklistId));
      toast.success(
        pattern
          ? `Removed '${pattern}' from blacklist.`
          : "Removed from blacklist.",
      );
    } catch (err: unknown) {
      toast.error(
        getErrorMessage(err) || "Failed to remove blacklist entry.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((item) => {
      const patternMatch = item.pattern?.toLowerCase().includes(q);
      const reasonMatch = item.reason?.toLowerCase().includes(q);
      const userMatch = item.user?.email.toLowerCase().includes(q);
      return Boolean(patternMatch || reasonMatch || userMatch);
    });
  }, [entries, search]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h2 className={styles.title}>Blacklist & Blocked Guests</h2>
          <p className={styles.subtitle}>
            Block specific email addresses or entire email domains from purchasing tickets, registering, or checking in.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={16} />
            <span>Add to Blacklist</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Controls Bar */}
      <div className={styles.controlsBar}>
        <div className={styles.searchWrapper}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by email or pattern..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className={styles.countBadge}>
          {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {/* Table / Content */}
      {isLoading ? (
        <div className={styles.tableCard}>
          <div className="flex flex-col gap-3 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-36 rounded" />
                  <Skeleton className="h-4 w-48 rounded" />
                </div>
                <Skeleton className="h-8 w-20 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className={styles.emptyState}>
          <ShieldCheck size={42} className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>
            {search.trim() ? "No matching entries" : "No Blacklisted Entries"}
          </h3>
          <p className={styles.emptySubtitle}>
            {search.trim()
              ? `No blocked patterns or emails match "${search}".`
              : "No emails or domains have been blocked for this event. Legitimate guests will be permitted to register normally."}
          </p>
          {!search.trim() && (
            <button
              type="button"
              className={styles.emptyAddBtn}
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={15} />
              <span>Block an Email or Domain</span>
            </button>
          )}
        </div>
      ) : (
        <div className={styles.tableCard}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pattern</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry) => {
                const displayPattern =
                  entry.pattern || entry.user?.email || "Unknown pattern";
                const isDeleting = deletingId === entry.id;

                return (
                  <TableRow key={entry.id}>
                    {/* Pattern Badge */}
                    <TableCell>
                      <Badge variant="outline" className={styles.patternBadge}>
                        {displayPattern}
                      </Badge>
                    </TableCell>

                    {/* Scope */}
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {entry.eventId ? "Event Only" : "Organization"}
                      </Badge>
                    </TableCell>

                    {/* Reason */}
                    <TableCell>
                      <span className={styles.reasonText} title={entry.reason || ""}>
                        {entry.reason || <span className="text-muted-foreground">—</span>}
                      </span>
                    </TableCell>

                    {/* Created Date */}
                    <TableCell>
                      <span className={styles.dateText}>
                        {formatBlockedDate(entry.createdAt)}
                      </span>
                    </TableCell>

                    {/* 1-Click Remove Button */}
                    <TableCell className="text-right">
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => handleRemoveEntry(entry.id, displayPattern)}
                        disabled={isDeleting}
                        aria-label={`Remove ${displayPattern} from blacklist`}
                      >
                        {isDeleting ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                        <span>Remove</span>
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Modal */}
      <AddBlacklistModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddEntry}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
