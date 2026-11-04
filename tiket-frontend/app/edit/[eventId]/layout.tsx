"use client";

import { useLiveEvent } from "@/hooks/useLiveEvent";
import { useToken } from "@/hooks/useToken";
import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import SidebarNav from "@/components/SidebarNav";
import { getEvent } from "@/api/events";
import api from "@/lib/api";
import { API_ENDPOINTS } from "@/constants/config";
import { useEventStore } from "@/store/useEventStore";
import SkeletonLoader from "./components/SkeletonLoader";
import FormsSkeletonLoader from "./forms/components/SkeletonLoader";
import styles from "./EditLayout.module.css";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

const TAB_PERMISSIONS: Record<string, string | string[]> = {
  details: "manage_settings",
  tickets: "manage_tickets",
  attendees: ["view_guests", "manage_guests"],
  operations: ["scan_tickets", "view_payments", "manage_refunds"],
  forms: "manage_forms",
  emails: "manage_emails",
  team: "manage_team",
  settings: "manage_settings",
};

export default function EditEventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const eventId = params.eventId as string;
  useLiveEvent(eventId);
  const { logout } = useToken();

  const {
    setEvent,
    isLoading,
    setIsLoading,
    permissions,
    isOwner,
    setPermissions,
  } = useEventStore();
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;

      try {
        setIsLoading(true);
        const eventData = await getEvent(eventId);
        document.title = `${eventData.title}`;
        setEvent(eventData);
      } catch (error) {
        console.error("Failed to fetch event data", error);
        toast.error("Failed to load event data.");
        document.title = `Error - Event Not Found`;
        router.push("/home");
      } finally {
        setIsLoading(false);
      }
    };

    const fetchPermissions = async () => {
      if (!eventId) return;

      try {
        const res = await api.get<{ owner: boolean; permissions: string[] }>(
          API_ENDPOINTS.COMMERCE.PERMISSIONS(eventId),
        );
        if (res.data) {
          setPermissions(res.data.permissions || [], Boolean(res.data.owner));
        }
      } catch (err) {
        console.error("Failed to load permissions", err);
      } finally {
        setPermissionsLoaded(true);
      }
    };

    fetchEvent();
    fetchPermissions();
  }, [eventId, setEvent, setIsLoading, setPermissions, router]);

  useEffect(() => {
    if (!permissionsLoaded || isOwner || !eventId) return;

    for (const [tab, requiredPerm] of Object.entries(TAB_PERMISSIONS)) {
      if (pathname?.includes(`/edit/${eventId}/${tab}`)) {
        const hasPerm = Array.isArray(requiredPerm)
          ? requiredPerm.some((p) => permissions.includes(p))
          : permissions.includes(requiredPerm);

        if (!hasPerm) {
          toast.error("You do not have permission to access this page.");
          router.replace(`/edit/${eventId}/overview`);
          break;
        }
      }
    }
  }, [pathname, permissions, isOwner, permissionsLoaded, eventId, router]);

  const hiddenTabHrefs: string[] = [];
  if (permissionsLoaded && !isOwner) {
    Object.entries(TAB_PERMISSIONS).forEach(([tab, requiredPerm]) => {
      const hasPerm = Array.isArray(requiredPerm)
        ? requiredPerm.some((p) => permissions.includes(p))
        : permissions.includes(requiredPerm);
      if (!hasPerm) {
        hiddenTabHrefs.push(`/edit/${eventId}/${tab}`);
      }
    });
  }

  const isDetailsPage = pathname?.endsWith("/details");
  const isFormsPage = pathname?.endsWith("/forms");

  if (isLoading) {
    const CurrentSkeleton = isFormsPage ? FormsSkeletonLoader : SkeletonLoader;

    return (
      <div className={styles.pageWrapper}>
        <div className={styles.background} />
        {!isDetailsPage && (
          <Navbar
            isAuthenticated={true}
            borderBottom={true}
            onSignOut={logout}
          />
        )}
        <div className={styles.layout}>
          {!isDetailsPage && <SidebarNav eventId={eventId} />}
          <main className={styles.mainContent}>
            <CurrentSkeleton />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.background} />
      {hiddenTabHrefs.length > 0 && (
        <style
          dangerouslySetInnerHTML={{
            __html: hiddenTabHrefs
              .map((href) => `a[href="${href}"] { display: none !important; }`)
              .join("\n"),
          }}
        />
      )}
      <div style={{ position: "relative", zIndex: 20 }}>
        {!isDetailsPage && (
          <Navbar
            isAuthenticated={true}
            borderBottom={true}
            onSignOut={logout}
          />
        )}
      </div>
      <div className={styles.layout}>
        {!isDetailsPage && <SidebarNav eventId={eventId} />}
        <main className={styles.mainContent}>{children}</main>
      </div>
    </div>
  );
}
