"use client";

import { useState, useEffect } from "react";
import { getRoles, createRole, updateRole, deleteRole } from "@/api/team";
import { EventRole } from "@/types/team";
import { toast } from "sonner";
import {
  CheckCircle2,
  Edit2,
  Plus,
  ShieldAlert,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import styles from "./RolesTab.module.css";
import { confirm } from "@/components/ConfirmModal";
import Modal from "@/components/Modal";
import { Checkbox } from "@/components/ui/checkbox";

const AVAILABLE_PERMISSIONS = [
  { id: "manage_tickets", label: "Manage Tickets" },
  { id: "manage_forms", label: "Manage Forms" },
  { id: "view_guests", label: "View Guests" },
  { id: "manage_guests", label: "Manage Guests" },
  { id: "scan_tickets", label: "Scan Tickets" },
  { id: "manage_settings", label: "Manage Settings" },
  { id: "view_analytics", label: "View Analytics" },
  { id: "manage_team", label: "Manage Team" },
];

export default function RolesTab({ eventId }: { eventId: string }) {
  const [roles, setRoles] = useState<EventRole[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<EventRole | null>(null);
  const [expandedRoles, setExpandedRoles] = useState<string[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  useEffect(() => {
    fetchRoles();
  }, [eventId]);

  const fetchRoles = async () => {
    try {
      setIsLoading(true);
      const data = await getRoles(eventId);
      setRoles(data);
    } catch (error) {
      toast.error("Failed to load roles");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (roleId: string) => {
    setExpandedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId],
    );
  };

  const openModal = (role?: EventRole) => {
    if (role) {
      setEditingRole(role);
      setName(role.name);
      setSelectedPerms(role.permissions || []);
    } else {
      setEditingRole(null);
      setName("");
      setSelectedPerms([]);
    }
    setIsModalOpen(true);
  };

  const togglePermission = (permId: string) => {
    if (selectedPerms.includes(permId)) {
      setSelectedPerms(selectedPerms.filter((p) => p !== permId));
    } else {
      setSelectedPerms([...selectedPerms, permId]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingRole) {
        await updateRole(eventId, editingRole.id, {
          name,
          permissions: selectedPerms,
        });
        toast.success("Role updated successfully");
      } else {
        await createRole(eventId, {
          name,
          permissions: selectedPerms,
        });
        toast.success("Role created successfully");
      }
      setIsModalOpen(false);
      fetchRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to save role");
    }
  };

  const handleDelete = async (roleId: string) => {
    await confirm("Are you sure you want to delete this role?", {
      confirmText: "Delete Role",
      cancelText: "Cancel",
      danger: true,
      onConfirm: async () => {
        try {
          await deleteRole(eventId, roleId);
          toast.success("Role deleted");
          fetchRoles();
        } catch (error: any) {
          toast.error(error.response?.data?.error || "Failed to delete role");
        }
      },
    });
  };

  if (isLoading) {
    return (
      <div style={{ color: "var(--text-secondary)" }}>Loading roles...</div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.sectionTitle}>Event Roles</h3>
        <button className={styles.primaryBtn} onClick={() => openModal()}>
          <Plus size={18} /> Create Role
        </button>
      </div>

      <div className={styles.grid}>
        {roles.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrapper}>
              <ShieldAlert size={32} strokeWidth={1.5} />
            </div>
            <p className={styles.emptyTitle}>No roles created yet</p>
            <p className={styles.emptyDesc}>
              Create roles and assign permissions to build your team.
            </p>
          </div>
        ) : (
          roles.map((role) => (
            <div key={role.id} className={styles.roleCard}>
              <div className={styles.roleHeader}>
                <span className={styles.roleName}>{role.name}</span>
                <div className={styles.actions}>
                  <button
                    className={styles.iconBtn}
                    onClick={() => openModal(role)}
                    title="Edit Role"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                    onClick={() => handleDelete(role.id)}
                    title="Delete Role"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <button
                className={styles.expandBtn}
                onClick={() => toggleExpand(role.id)}
              >
                {expandedRoles.includes(role.id) ? (
                  <>
                    <ChevronUp size={16} /> Hide Permissions
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} /> View Permissions
                  </>
                )}
              </button>

              {expandedRoles.includes(role.id) && (
                <div className={styles.permList}>
                  {role.permissions?.length > 0 ? (
                    role.permissions.map((p) => {
                      const label =
                        AVAILABLE_PERMISSIONS.find((ap) => ap.id === p)
                          ?.label || p;
                      return (
                        <div key={p} className={styles.permItem}>
                          <CheckCircle2
                            size={14}
                            className={styles.checkIcon}
                          />
                          <span>{label}</span>
                        </div>
                      );
                    })
                  ) : (
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.9rem",
                      }}
                    >
                      No permissions assigned.
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRole ? "Edit Role" : "Create New Role"}
        width={465}
        className={styles.modalContent}
        headerClassName={styles.modalHeaderStyle}
      >
        <div className={styles.modalScrollWrapper}>
          <div className={styles.formBody}>
            <div className={styles.formGroup}>
              <label>Role Name</label>
              <input
                type="text"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Volunteer"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label style={{ marginBottom: "0.5rem", display: "block" }}>
                Permissions
              </label>
              <div className={styles.permissionsGrid}>
                {AVAILABLE_PERMISSIONS.map((perm) => (
                  <label key={perm.id} className={styles.checkboxLabel}>
                    <Checkbox
                      id={perm.id}
                      checked={selectedPerms.includes(perm.id)}
                      onCheckedChange={() => togglePermission(perm.id)}
                    />
                    <span className={styles.permName}>{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.footer}>
              <button
                type="submit"
                className={styles.submitBtn}
                onClick={handleSave}
              >
                {editingRole ? "Save Changes" : "Create Role"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
