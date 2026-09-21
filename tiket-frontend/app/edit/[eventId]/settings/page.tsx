"use client";

import { useState, useEffect } from "react";
import { useEventStore } from "@/store/useEventStore";
import { updateEvent, updateEventSlug } from "@/api/events";
import { toast } from "sonner";
import { Activity, Globe } from "lucide-react";
import Switch from "@/components/Switch";
import Dropdown from "@/components/Dropdown";
import styles from "./Settings.module.css";
import type { Event } from "@/types/event";

type EventStatus = Event["status"];

export default function EditSettingsPage() {
  const { event, updateEventLocally } = useEventStore();

  const [slug, setSlug] = useState("");

  const [requireApproval, setRequireApproval] = useState(false);
  const [status, setStatus] = useState<EventStatus>("draft");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingSlug, setIsSubmittingSlug] = useState(false);

  useEffect(() => {
    if (event) {
      setSlug(event.slug || "");
      setRequireApproval(event.requireApproval || false);
      setStatus(event.status || "draft");
    }
  }, [event]);

  const hasChanges = () => {
    if (!event) return false;
    return status !== event.status || requireApproval !== event.requireApproval;
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
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update slug.");
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
      };

      const updated = await updateEvent(event.id, payload);
      updateEventLocally({ ...updated });
      toast.success("Settings updated successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update settings.");
    } finally {
      setIsSubmitting(false);
    }
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
              <span className={styles.slugPrefix}>
                {window.location.origin.replace(/.*?\/\//, "") + "/"}
              </span>
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

      <button
        className={styles.saveBtn}
        onClick={handleSave}
        disabled={isSubmitting || !hasChanges()}
      >
        {isSubmitting ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
