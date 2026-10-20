"use client";

import { useParams } from "next/navigation";
import { useOperations } from "@/hooks/useOperations";
import { useLiveStore } from "@/store/useLiveStore";
import { useAvailability } from "@/hooks/useAvailability";
import FinancePanel from "./components/FinancePanel";
import CouponPanel from "./components/CouponPanel";
import MailConnection from "./components/MailConnection";
import DoorScanner from "./components/DoorScanner";
import {
  AlertCircle,
  Users,
  Clock,
  UserCheck,
  CheckCircle2,
  Check,
  X,
  Ticket,
} from "lucide-react";
import styles from "./Operations.module.css";

export default function OperationsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const ops = useOperations(eventId);
  const live = useLiveStore((state) => state.status);
  const availability = useAvailability(eventId);

  const capacityDisplay =
    availability?.remaining === null
      ? "Unlimited capacity"
      : availability
        ? `${availability.remaining} spots available`
        : "Checking capacity…";

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <header className={styles.header}>
        <div
          className={styles.liveBadge}
          data-status={live === "live" ? "live" : "polling"}
        >
          <span
            className={live === "live" ? styles.pulseDot : styles.pollingDot}
          />
          <span>
            {live === "live" ? "Live Sync Connected" : "Polling every 15s"}
          </span>
        </div>

        <div>
          <h1 className={styles.title}>Event Operations</h1>
          <p className={styles.subtitle}>
            Real-time door check-in scanning, guest registration approvals,
            financial settlement, and delivery settings.
          </p>
        </div>

        <div className={styles.metaBar}>
          <div className={styles.metaPill}>
            <Users size={14} className={styles.metaIcon} />
            <span>{capacityDisplay}</span>
          </div>

          {ops.permissions.includes("manage_guests") && (
            <div className={styles.metaPill}>
              <Clock size={14} className={styles.metaIcon} />
              <span>{ops.approvals.length} Pending Approval</span>
            </div>
          )}

          {ops.permissions.includes("manage_tickets") && (
            <div className={styles.metaPill}>
              <Ticket size={14} className={styles.metaIcon} />
              <span>{ops.coupons.length} Active Promo Codes</span>
            </div>
          )}
        </div>
      </header>

      {/* Error Banner */}
      {ops.error && (
        <div role="alert" className={styles.errorBanner}>
          <AlertCircle size={18} className="shrink-0" />
          <span>{ops.error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {ops.loading ? (
        <>
          <div className={styles.skeletonCard}>
            <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
            <div
              className={`${styles.skeletonLine} ${styles.skeletonSubtitle}`}
            />
            <div className={styles.skeletonBlock} />
          </div>
          <div className={styles.skeletonCard}>
            <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
            <div
              className={`${styles.skeletonLine} ${styles.skeletonSubtitle}`}
            />
            <div className={styles.skeletonBlock} />
          </div>
        </>
      ) : (
        <>
          {/* Door Ticket Scanner */}
          {ops.permissions.includes("scan_tickets") && (
            <DoorScanner disabled={ops.busy} scan={ops.scan} />
          )}

          {/* Pending Guest Approvals */}
          {ops.permissions.includes("manage_guests") && (
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.headerLeft}>
                  <div className={styles.iconBox}>
                    <UserCheck size={20} />
                  </div>
                  <div className={styles.headerText}>
                    <h2 className={styles.cardTitle}>Awaiting Approval</h2>
                    <p className={styles.cardSubtitle}>
                      Paid registrations reserving capacity that require host
                      confirmation. Declining releases the ticket spot and
                      initiates a full refund.
                    </p>
                  </div>
                </div>
                <div className={styles.counterBadge}>
                  <Clock size={14} />
                  <span>{ops.approvals.length} Pending</span>
                </div>
              </div>

              {ops.approvals.length === 0 ? (
                <div className={styles.emptyState}>
                  <CheckCircle2 size={32} className={styles.emptyIcon} />
                  <h4 className={styles.emptyTitle}>All Caught Up</h4>
                  <p className={styles.emptyDesc}>
                    There are no registrations awaiting approval at this time.
                  </p>
                </div>
              ) : (
                <div className={styles.approvalsList}>
                  {ops.approvals.map((item) => {
                    const initials = item.name
                      ? item.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : "??";

                    return (
                      <div key={item.id} className={styles.approvalItem}>
                        <div className={styles.attendeeLeft}>
                          <div className={styles.avatar}>{initials}</div>
                          <div className={styles.attendeeDetails}>
                            <span className={styles.attendeeName}>
                              {item.name || "Anonymous Guest"}
                            </span>
                            <span className={styles.attendeeEmail}>
                              {item.email}
                            </span>
                          </div>
                        </div>

                        <div className={styles.approvalActions}>
                          <button
                            type="button"
                            className={styles.approveBtn}
                            disabled={ops.busy}
                            onClick={() => ops.decide(item.id, "approve")}
                          >
                            <Check size={15} />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            className={styles.declineBtn}
                            disabled={ops.busy}
                            onClick={() => ops.decide(item.id, "decline")}
                          >
                            <X size={15} />
                            <span>Decline & Refund</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Finance Panel */}
          {ops.finance && (
            <FinancePanel
              data={ops.finance}
              canRefund={ops.permissions.includes("manage_refunds")}
              disabled={ops.busy}
              onRefund={ops.refund}
            />
          )}

          {/* Coupons & Access Codes */}
          {ops.permissions.includes("manage_tickets") && (
            <CouponPanel
              coupons={ops.coupons}
              tiers={availability?.tiers || []}
              disabled={ops.busy}
              save={ops.saveCoupon}
            />
          )}

          {/* Mail Connection Settings */}
          {ops.owner && (
            <MailConnection
              custom={ops.customMail}
              disabled={ops.busy}
              save={ops.saveMail}
              reset={ops.resetMail}
            />
          )}
        </>
      )}
    </div>
  );
}
