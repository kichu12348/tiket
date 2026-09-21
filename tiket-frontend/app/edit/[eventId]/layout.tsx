"use client";

import { useEffect } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import SidebarNav from "@/components/SidebarNav";
import { getEvent } from "@/api/events";
import { useEventStore } from "@/store/useEventStore";
import SkeletonLoader from "./components/SkeletonLoader";
import FormsSkeletonLoader from "./forms/components/SkeletonLoader";
import styles from "./EditLayout.module.css";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

export default function EditEventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const eventId = params.eventId as string;

  const { setEvent, isLoading, setIsLoading } = useEventStore();

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

    fetchEvent();
  }, [eventId, setEvent, setIsLoading, router]);

  const isDetailsPage = pathname?.endsWith("/details");
  const isFormsPage = pathname?.endsWith("/forms");

  if (isLoading) {
    const CurrentSkeleton = isFormsPage ? FormsSkeletonLoader : SkeletonLoader;

    return (
      <div className={styles.pageWrapper}>
        <div className={styles.background} />
        {!isDetailsPage && (
          <Navbar isAuthenticated={true} borderBottom={true} />
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
      <div style={{ position: "relative", zIndex: 20 }}>
        {!isDetailsPage && (
          <Navbar isAuthenticated={true} borderBottom={true} />
        )}
      </div>
      <div className={styles.layout}>
        {!isDetailsPage && <SidebarNav eventId={eventId} />}
        <main className={styles.mainContent}>{children}</main>
      </div>
    </div>
  );
}
