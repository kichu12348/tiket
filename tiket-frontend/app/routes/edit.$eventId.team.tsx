import { useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import styles from "@/app/edit/team/TeamPage.module.css";
import MembersTab from "@/app/edit/team/components/MembersTab";
import RolesTab from "@/app/edit/team/components/RolesTab";

export const Route = createFileRoute("/edit/$eventId/team")({
  ssr: false,
  component: TeamPage,
});

function TeamPage() {
  const params = useParams({ strict: false });
  const eventId = params.eventId as string;
  const [activeTab, setActiveTab] = useState<"members" | "roles">("members");

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Team Management</h1>
        <p className={styles.subtitle}>
          Invite team members, assign roles, and manage permissions.
        </p>
      </div>

      <div className={styles.tabs}>
        <button
          className={styles.tab}
          data-active={activeTab === "members"}
          onClick={() => setActiveTab("members")}
        >
          Team Members
        </button>
        <button
          className={styles.tab}
          data-active={activeTab === "roles"}
          onClick={() => setActiveTab("roles")}
        >
          Roles & Permissions
        </button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === "members" ? (
          <MembersTab eventId={eventId} />
        ) : (
          <RolesTab eventId={eventId} />
        )}
      </div>
    </div>
  );
}
