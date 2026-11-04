"use client";
import { getErrorMessage } from "@/lib/errors";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEventStore } from "@/store/useEventStore";
import { updateEvent, updateEventSlug } from "@/api/events";
import api from "@/lib/api";
import { API_ENDPOINTS } from "@/constants/config";
import { confirm } from "@/components/ConfirmModal";
import { toast } from "sonner";
import { Activity, Globe, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import Switch from "@/components/Switch";
import Dropdown from "@/components/Dropdown";
import styles from "./Settings.module.css";
import type { Event } from "@/types/event";

type EventStatus = Event["status"];

interface SettingsEvent extends Event {
  maxTicketsPerUser?: number | null;
  overbookingLimit?: number;
}

function SettingsForm({ event }: { event: Event }) {
  const router = useRouter();
  const { updateEventLocally } = useEventStore();
  const settingsEvent = event as SettingsEvent;

  const [slug, setSlug] = useState(event.slug);
  const [requireApproval, setRequireApproval] = useState(event.requireApproval);
  const [status, setStatus] = useState<EventStatus>(event.status);
  const [maxTicketsPerUser, setMaxTicketsPerUser] = useState<number | "">(
    settingsEvent.maxTicketsPerUser ?? "",
  );
  const [overbookingLimit, setOverbookingLimit] = useState<number>(
    settingsEvent.overbookingLimit ?? 0,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingSlug, setIsSubmittingSlug] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasChanges = () => {
    if (!event) return false;
    const initialMax = settingsEvent.maxTicketsPerUser ?? "";
    const initialOverbooking = settingsEvent.overbookingLimit ?? 0;
    return (
      status !== event.status ||
      requireApproval !== event.requireApproval ||
      maxTicketsPerUser !== initialMax ||
      overbookingLimit !== initialOverbooking
    );
  };

  const handleSaveSlug = async () => {
    if (!event || slug === event.slug) return;

    if (!slug.trim()) {
      toast.error("Slug cannot be empty.");
      return;
    }

    let newSlug = slug.trim();
    if (newSlug.startsWith("-")) {
      newSlug = newSlug.slice(1);
    }
    if (newSlug.endsWith("-")) {
      newSlug = newSlug.slice(0, -1);
    }

    if (newSlug.length < 3) {
      toast.error("Slug must be at least 3 characters long.");
      return;
    }

    setSlug(newSlug);
    if (newSlug === event.slug) {
      return;
    }

    try {
      setIsSubmittingSlug(true);
      const { message, slug: newSlugVal } = await updateEventSlug(
        event.id,
        newSlug,
      );
      updateEventLocally({ slug: newSlugVal });
      toast.success(message);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Failed to update slug.");
    } finally {
      setIsSubmittingSlug(false);
    }
  };

  const handleSave = async () => {
    if (!event) return;

    try {
      setIsSubmitting(true);

      const payload = {
        requireApproval,
        status,
        maxTicketsPerUser:
          maxTicketsPerUser === "" ? null : Number(maxTicketsPerUser),
        overbookingLimit: Number(overbookingLimit) || 0,
      };

      const updated = await updateEvent(event.id, payload);
      updateEventLocally({ ...updated });
      toast.success("Settings updated successfully!");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Failed to update settings.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;

    await confirm(
      "Are you sure you want to permanently delete this event? This action cannot be undone.",
      {
        confirmText: "Delete Event",
        cancelText: "Cancel",
        danger: true,
        onConfirm: async () => {
          try {
            setIsDeleting(true);
            await api.delete(API_ENDPOINTS.EVENTS.UPDATE(event.id));
            toast.success("Event deleted successfully.");
            router.push("/home");
          } catch (error: unknown) {
            toast.error(getErrorMessage(error) || "Failed to delete event.");
          } finally {
            setIsDeleting(false);
          }
        },
      },
    );
  };

  if (!event) return null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Custom URL Slug</h2>
            <span className={styles.sectionSubtitle}>
              Personalize the link to your event page.
            </span>
          </div>
        </div>
        <div className={styles.formGroup}>
          <div className={styles.slugContainer}>
            <div className={styles.slugInputWrapper}>
              <span className={styles.slugPrefix}>{"Event URL /"}</span>
              <input
                type="text"
                className={styles.slugInput}
                value={slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/\s/g, "-")
                      .replace(/-{2,}/g, "-")
                      .replace(/[^a-z0-9-]/g, ""),
                  )
                }
                placeholder="my-awesome-event"
              />
            </div>
            <button
              className={styles.slugSaveBtn}
              onClick={handleSaveSlug}
              disabled={isSubmittingSlug || slug === event.slug}
            >
              {isSubmittingSlug ? "Saving..." : "Update"}
            </button>
          </div>
          <span className={styles.helpText}>
            Only alphanumeric characters and hyphens allowed.
          </span>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Event Status</h2>
            <span className={styles.sectionSubtitle}>
              Manage the visibility and registration state of your event.
            </span>
          </div>
          <div style={{ maxWidth: "200px" }}>
            <Dropdown
              options={[
                {
                  label: "Draft",
                  value: "draft",
                  LeftComponent: <Activity size={14} />,
                },
                {
                  label: "Published",
                  value: "published",
                  LeftComponent: <Globe size={14} />,
                },
                {
                  label: "Completed",
                  value: "completed",
                  LeftComponent: <CheckCircle2 size={14} />,
                },
                {
                  label: "Cancelled",
                  value: "cancelled",
                  LeftComponent: <XCircle size={14} />,
                },
              ]}
              value={status}
              onChange={(value: EventStatus) => setStatus(value)}
            />
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.switchGroup}>
          <div className={styles.switchInfo}>
            <span
              style={{
                fontSize: "0.95rem",
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              Require Manual Approval
            </span>
            <p className={styles.helpText} style={{ marginTop: "0.25rem" }}>
              If enabled, attendees must be manually approved by the organizer
              before receiving a ticket.
            </p>
          </div>
          <Switch checked={requireApproval} onChange={setRequireApproval} />
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Ticket Limits & Overbooking</h2>
            <span className={styles.sectionSubtitle}>
              Configure maximum tickets per attendee and overbooking buffers.
            </span>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.sectionLabel}>
            Max Tickets Per Attendee
          </label>
          <div className={styles.slugInputWrapper}>
            <input
              type="number"
              min={1}
              className={styles.slugInput}
              value={maxTicketsPerUser}
              onChange={(e) =>
                setMaxTicketsPerUser(
                  e.target.value === ""
                    ? ""
                    : Math.max(1, parseInt(e.target.value, 10) || 1),
                )
              }
              placeholder="Unlimited (leave blank)"
            />
          </div>
          <span className={styles.helpText}>
            Limit how many total tickets a single account can purchase or hold
            for this event. Leave blank for no limit.
          </span>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.sectionLabel}>Overbooking Limit</label>
          <div className={styles.slugInputWrapper}>
            <input
              type="number"
              min={0}
              className={styles.slugInput}
              value={overbookingLimit}
              onChange={(e) =>
                setOverbookingLimit(
                  Math.max(0, parseInt(e.target.value, 10) || 0),
                )
              }
              placeholder="0"
            />
          </div>
          <span className={styles.helpText}>
            Additional registrations allowed beyond the event capacity before
            checkout is cut off. Default is 0.
          </span>
        </div>
      </div>

      <button
        className={styles.saveBtn}
        onClick={handleSave}
        disabled={isSubmitting || !hasChanges()}
      >
        {isSubmitting ? "Saving..." : "Save Changes"}
      </button>

      {/* Danger Zone */}
      <div className={styles.card} style={{ marginTop: "1rem" }}>
        <div className={styles.cardHeader}>
          <div>
            <h2
              className={styles.sectionTitle}
              style={{ color: "var(--status-danger)" }}
            >
              Danger Zone
            </h2>
            <span className={styles.sectionSubtitle}>
              Permanently delete this event. Events with orders or registration
              files must be cancelled, not deleted.
            </span>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              background: "var(--status-danger-bg)",
              color: "var(--status-danger)",
              border: "none",
              borderRadius: "var(--radius-md, 8px)",
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: isDeleting ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              opacity: isDeleting ? 0.6 : 1,
              transition: "all 0.2s ease",
            }}
          >
            <Trash2 size={16} />
            {isDeleting ? "Deleting..." : "Delete Event"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditSettingsPage() {
  const event = useEventStore((state) => state.event);
  return event ? <SettingsForm key={event.id} event={event} /> : null;
}
