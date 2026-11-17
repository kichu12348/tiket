import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Ticket,
  ClipboardList,
  Settings,
  ChevronLeft,
  AppWindowMac,
  UsersRound,
  Users,
  Mail,
} from "lucide-react";
import styles from "./SidebarNav.module.css";
import { useSidebarStore } from "@/store/useSidebarStore";

interface SidebarNavProps {
  eventId: string;
}

export default function SidebarNav({ eventId }: SidebarNavProps) {
  const pathname = useLocation({ select: (l) => l.pathname });
  const { isCollapsed, setIsCollapsed } = useSidebarStore();

  const links = [
    {
      to: "/edit/$eventId/overview" as const,
      path: `/edit/${eventId}/overview`,
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      to: "/edit/$eventId/details" as const,
      path: `/edit/${eventId}/details`,
      label: "Details",
      icon: AppWindowMac,
    },
    {
      to: "/edit/$eventId/tickets" as const,
      path: `/edit/${eventId}/tickets`,
      label: "Tickets",
      icon: Ticket,
    },
    {
      to: "/edit/$eventId/attendees" as const,
      path: `/edit/${eventId}/attendees`,
      label: "Attendees",
      icon: Users,
    },
    {
      to: "/edit/$eventId/operations" as const,
      path: `/edit/${eventId}/operations`,
      label: "Operations",
      icon: Ticket,
    },
    {
      to: "/edit/$eventId/forms" as const,
      path: `/edit/${eventId}/forms`,
      label: "Forms",
      icon: ClipboardList,
    },
    {
      to: "/edit/$eventId/emails" as const,
      path: `/edit/${eventId}/emails`,
      label: "Emails",
      icon: Mail,
    },
    {
      to: "/edit/$eventId/team" as const,
      path: `/edit/${eventId}/team`,
      label: "Team",
      icon: UsersRound,
    },
    {
      to: "/edit/$eventId/settings" as const,
      path: `/edit/${eventId}/settings`,
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <nav
      className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : styles.expanded}`}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>Manage Event</h2>
        <button
          className={styles.toggleBtn}
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label="Toggle Sidebar"
          title="Toggle Sidebar"
        >
          <ChevronLeft size={18} className={styles.chevron} />
          <span className={styles.mobileMenuText}>Menu</span>
        </button>
      </div>

      <div className={styles.menuContent}>
        <div className={styles.menuInner}>
          <ul className={styles.navList}>
            {links.map((link) => {
              const isActive = pathname === link.path;
              const Icon = link.icon;

              return (
                <li key={link.to} className={styles.navItemWrapper}>
                  <Link
                    to={link.to}
                    params={{ eventId }}
                    className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                    title={link.label}
                  >
                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.5 : 2}
                      className={styles.icon}
                    />
                    <span className={styles.label}>{link.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className={styles.footer}>
            <Link
              to="/home"
              className={styles.backToDashboard}
              title="Back to Dashboard"
            >
              <ChevronLeft size={18} strokeWidth={2} className={styles.icon} />
              <span className={styles.label}>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
