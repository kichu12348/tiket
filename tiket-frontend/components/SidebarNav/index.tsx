"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const { isCollapsed, setIsCollapsed } = useSidebarStore();

  const links = [
    {
      href: `/edit/${eventId}/overview`,
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      href: `/edit/${eventId}/details`,
      label: "Details",
      icon: AppWindowMac,
    },
    { href: `/edit/${eventId}/tickets`, label: "Tickets", icon: Ticket },
    { href: `/edit/${eventId}/attendees`, label: "Attendees", icon: Users },
    { href: `/edit/${eventId}/forms`, label: "Forms", icon: ClipboardList },
    { href: `/edit/${eventId}/emails`, label: "Emails", icon: Mail },
    { href: `/edit/${eventId}/team`, label: "Team", icon: UsersRound },
    { href: `/edit/${eventId}/settings`, label: "Settings", icon: Settings },
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
              const isActive = pathname === link.href;
              const Icon = link.icon;

              return (
                <li key={link.href} className={styles.navItemWrapper}>
                  <Link
                    href={link.href}
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
              href="/home"
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
