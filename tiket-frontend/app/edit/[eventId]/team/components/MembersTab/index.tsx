"use client";

import { useState, useEffect } from "react";
import {
  getTeamMembers,
  getRoles,
  addTeamMember,
  removeTeamMember,
} from "@/api/team";
import { TeamMember, EventRole } from "@/types/team";
import { toast } from "sonner";
import { Plus, Trash2, Mail, Users } from "lucide-react";
import styles from "./MembersTab.module.css";
import { confirm } from "@/components/ConfirmModal";
import Modal from "@/components/Modal";
import Dropdown from "@/components/Dropdown";

export default function MembersTab({ eventId }: { eventId: string }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<EventRole[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [membersData, rolesData] = await Promise.all([
        getTeamMembers(eventId),
        getRoles(eventId),
      ]);
      setMembers(membersData);
      setRoles(rolesData);
      if (rolesData.length > 0 && !selectedRoleId) {
        setSelectedRoleId(rolesData[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load team data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !selectedRoleId) return;
    try {
      await addTeamMember(eventId, { email, roleId: selectedRoleId });
      toast.success("Team member added successfully");
      setIsModalOpen(false);
      setEmail("");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to invite member");
    }
  };

  const handleRemove = async (memberId: string) => {
    await confirm(
      "Are you sure you want to remove this member from the event?",
      {
        confirmText: "Remove Member",
        cancelText: "Cancel",
        danger: true,
        onConfirm: async () => {
          try {
            await removeTeamMember(eventId, memberId);
            toast.success("Member removed");
            fetchData();
          } catch (error) {
            toast.error("Failed to remove member");
          }
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div style={{ color: "var(--text-secondary)" }}>
        Loading team members...
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.sectionTitle}>Event Staff & Collaborators</h3>
        <button
          className={styles.primaryBtn}
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={18} /> Invite Member
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.list}>
          {members.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIconWrapper}>
                <Users size={32} strokeWidth={1.5} />
              </div>
              <p className={styles.emptyTitle}>No team members yet</p>
              <p className={styles.emptyDesc}>
                Invite someone to help manage your event!
              </p>
            </div>
          ) : (
            members.map((member) => (
              <div key={member.id} className={styles.item}>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{member.user.name}</span>
                  <span className={styles.userEmail}>{member.user.email}</span>
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "1rem" }}
                >
                  <span className={styles.roleBadge}>{member.role.name}</span>
                  <div className={styles.actions}>
                    <button
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      onClick={() => handleRemove(member.id)}
                      title="Remove Member"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Invite Team Member"
        width={465}
        className={styles.modalContent}
        headerClassName={styles.modalHeaderStyle}
      >
        <div className={styles.modalScrollWrapper}>
          <div className={styles.formBody}>
            <div className={styles.formGroup}>
              <label>User Email Address</label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={16}
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--color-text-primary)",
                  }}
                />
                <input
                  type="email"
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  style={{ paddingLeft: "32px" }}
                  required
                />
              </div>
            </div>
            <div className={styles.switchRow}>
              <label>Assign Role</label>
              <Dropdown
                options={roles.map((role) => ({
                  label: role.name,
                  value: role.id,
                }))}
                value={selectedRoleId}
                onChange={(val) => setSelectedRoleId(val as string)}
                placeholder="Select a role"
                btnWidth="maxContent"
              />
            </div>
            {roles.length === 0 && (
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "var(--status-warning)",
                  marginTop: "-0.5rem",
                }}
              >
                You need to create a Role first.
              </span>
            )}
            <div className={styles.footer}>
              <button
                type="submit"
                className={styles.submitBtn}
                onClick={handleInvite}
                disabled={roles.length === 0}
              >
                Send Invite
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
