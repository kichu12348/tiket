import { useLiveEvent } from "@/hooks/useLiveEvent";
import { useToken } from "@/hooks/useToken";
import { useEffect, useState } from "react";
import {
  createFileRoute,
  redirect,
  Outlet,
  useParams,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import SidebarNav from "@/components/SidebarNav";
import { getEvent } from "@/api/events";
import api from "@/lib/api";
import { API_ENDPOINTS } from "@/constants/config";
import { useEventStore } from "@/store/useEventStore";
import SkeletonLoader from "@/app/edit/components/SkeletonLoader";
import FormsSkeletonLoader from "@/app/edit/forms/components/SkeletonLoader";
import styles from "@/app/edit/EditLayout.module.css";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { getToken } from "@/lib/getToken";

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

export const Route = createFileRoute("/edit/$eventId")({
  ssr: false,
  beforeLoad: async () => {
    const token = await getToken();
    if (!token) {
      throw redirect({ to: "/signin" });
    }
  },
  component: EditEventLayout,
});

function EditEventLayout() {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const pathname = useLocation({ select: (l) => l.pathname });
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
        navigate({ to: "/home" });
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
  }, [eventId, setEvent, setIsLoading, setPermissions, navigate]);

  useEffect(() => {
    if (!permissionsLoaded || isOwner || !eventId) return;

    for (const [tab, requiredPerm] of Object.entries(TAB_PERMISSIONS)) {
      if (pathname?.includes(`/edit/${eventId}/${tab}`)) {
        const hasPerm = Array.isArray(requiredPerm)
          ? requiredPerm.some((p) => permissions.includes(p))
          : permissions.includes(requiredPerm);

        if (!hasPerm) {
          toast.error("You do not have permission to access this page.");
          navigate({ to: `/edit/${eventId}/overview`, replace: true });
          break;
        }
      }
    }
  }, [pathname, permissions, isOwner, permissionsLoaded, eventId, navigate]);

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
        <div className={`${styles.layout} scrollbar`}>
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
      <div className={`${styles.layout} scrollbar`}>
        {!isDetailsPage && <SidebarNav eventId={eventId} />}
        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
